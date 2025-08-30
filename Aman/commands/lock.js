module.exports.config = {
  name: "groupnamelock",
  version: "1.0.0",
  hasPermssion: 2, // admin permission
  credits: "Aman",
  description: "Lock group name",
  commandCategory: "Group",
  usages: "groupnamelock <Group Name>",
  cooldowns: 5
};

const lockedGroups = {}; // Memory me store, restart pe reset hoga. DB me store karo production ke liye.

module.exports.run = async function({ api, event, args }) {
  const groupName = args.join(" ");
  if (!groupName) return api.sendMessage("Please provide a group name to lock!", event.threadID);

  lockedGroups[event.threadID] = groupName;
  return api.sendMessage(`✅ Group name locked as: "${groupName}"`, event.threadID);
};

module.exports.handleEvent = async function({ api, event }) {
  const { threadID, logMessageType, logMessageData } = event;

  // Sirf group name change events
  if (logMessageType !== "log:thread_name") return;

  if (lockedGroups[threadID] && logMessageData.name !== lockedGroups[threadID]) {
    try {
      await api.setTitle(lockedGroups[threadID], threadID);
      return api.sendMessage(`⚠️ Group name is locked! Reverting to: "${lockedGroups[threadID]}"`, threadID);
    } catch (err) {
      console.error(err);
    }
  }
};
