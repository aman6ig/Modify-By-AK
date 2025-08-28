const fs = require("fs");
const path = require("path");

const threadFile = path.join(__dirname, "..", "cache", "thread.json");

// thread.json file ensure
if (!fs.existsSync(threadFile)) {
  fs.writeFileSync(threadFile, JSON.stringify({ allowed: [] }, null, 2));
}

function getData() {
  return JSON.parse(fs.readFileSync(threadFile));
}

function saveData(data) {
  fs.writeFileSync(threadFile, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "permission",
  version: "1.0.0",
  hasPermssion: 2, // only ADMINBOT
  credits: "Aman Khan",
  description: "Approval system for bot",
  commandCategory: "system",
  usages: "/approval, /permission, /block, /permissionlist",
  cooldowns: 5
};

// 🔥 sabhi command aur event ke liye yeh check chalega
module.exports.handleEvent = function({ api, event }) {
  try {
    const { threadID, senderID, body } = event;
    const config = require("../../config.json");
    const admins = config.ADMINBOT || [];

    const data = getData();
    if (!data.allowed.includes(threadID)) {
      // agar admin hai to block na ho
      if (!admins.includes(senderID)) {
        return api.sendMessage(
          "❌ Aapke group me bot ki permission nahi hai.\nPehle owner se permission lein: www.facebook.com/Ak47xK",
          threadID
        );
      }
    }
  } catch (e) {
    console.error(e);
  }
};

module.exports.run = function({ api, event, args }) {
  const { threadID, senderID } = event;
  const config = require("../../config.json");
  const admins = config.ADMINBOT || [];

  if (!admins.includes(senderID)) {
    return api.sendMessage("❌ Sirf owner is command ka use kar sakta hai.", threadID);
  }

  const data = getData();
  const cmd = args[0];

  // /approval (group se request owner ko jaye)
  if (cmd === "request" || cmd === "approval") {
    return api.sendMessage(
      `📩 Group ID: ${threadID}\nNe approval request bheji hai.\nAllow karne ke liye: /permission ${threadID}`,
      admins[0] // first owner ko bhejenge
    );
  }

  // /permission <threadID>
  if (cmd === "allow" || cmd === "permission") {
    const id = args[1] || threadID;
    if (!data.allowed.includes(id)) {
      data.allowed.push(id);
      saveData(data);
    }
    return api.sendMessage(`✅ Group ${id} ko ab allowed kar diya gaya hai.`, threadID);
  }

  // /block <threadID>
  if (cmd === "block") {
    const id = args[1] || threadID;
    data.allowed = data.allowed.filter(g => g !== id);
    saveData(data);
    return api.sendMessage(`⛔ Group ${id} ko block kar diya gaya hai.`, threadID);
  }

  // /permissionlist
  if (cmd === "list" || cmd === "permissionlist") {
    if (data.allowed.length === 0) return api.sendMessage("📂 Koi bhi group allowed nahi hai.", threadID);
    return api.sendMessage("📂 Allowed Groups:\n" + data.allowed.join("\n"), threadID);
  }

  return api.sendMessage("❌ Command galat hai.\nUse: /permission [allow|block|list]", threadID);
};
