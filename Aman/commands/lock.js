const fs = require("fs");
const path = require("path");

let lockData = {}; 
// Format: { threadID: { groupName: "original", dp: "path/to/original.jpg", members: { userID: "originalName" } } }

module.exports.config = {
  name: "grouplock",
  version: "1.0.0",
  credits: "Aman + ChatGPT",
  description: "Lock group name, DP, and member names",
  hasPermssion: 1,
  usages: "/grouplock [name|dp|member]",
  commandCategory: "group",
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;

  if (!lockData[threadID]) lockData[threadID] = { members: {} };

  if (args[0] === "name") {
    const info = await api.getThreadInfo(threadID);
    lockData[threadID].groupName = info.threadName;
    return api.sendMessage(`✅ Group name locked to: ${info.threadName}`, threadID);
  }

  if (args[0] === "dp") {
    const info = await api.getThreadInfo(threadID);
    if (info.imageSrc) {
      lockData[threadID].dp = info.imageSrc;
      return api.sendMessage(`✅ Group DP locked`, threadID);
    } else {
      return api.sendMessage(`⚠️ No DP set in this group.`, threadID);
    }
  }

  if (args[0] === "member") {
    const info = await api.getThreadInfo(threadID);
    info.userInfo.forEach(u => {
      lockData[threadID].members[u.id] = u.name;
    });
    return api.sendMessage(`✅ Member names locked`, threadID);
  }

  return api.sendMessage(`❌ Usage: /grouplock [name|dp|member]`, threadID);
};

module.exports.handleEvent = async function({ api, event }) {
  const threadID = event.threadID;
  const senderID = event.author;

  if (!lockData[threadID]) return;

  // Group Name Lock
  if (event.logMessageType === "log:thread-name" && lockData[threadID].groupName) {
    if (event.logMessageData && event.logMessageData.name !== lockData[threadID].groupName) {
      api.setTitle(lockData[threadID].groupName, threadID);
      api.sendMessage(`⚠️ Group name is locked! Reverted to "${lockData[threadID].groupName}"`, threadID);
    }
  }

  // Group DP Lock
  if (event.logMessageType === "log:thread-image" && lockData[threadID].dp) {
    api.changeGroupImage(lockData[threadID].dp, threadID, err => {
      if (!err) {
        api.sendMessage(`⚠️ Group DP is locked! Reverted.`, threadID);
      }
    });
  }

  // Member Name Lock
  if (event.logMessageType === "log:thread-nickname" && lockData[threadID].members) {
    const userID = event.logMessageData.participant_id;
    const oldName = lockData[threadID].members[userID];
    if (oldName && event.logMessageData.nickname !== oldName) {
      api.changeNickname(oldName, threadID, userID);
      api.sendMessage(`⚠️ Name of member is locked! Reverted back to "${oldName}"`, threadID);
    }
  }
};
