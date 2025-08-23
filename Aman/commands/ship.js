module.exports.config = {
  name: "gpt",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Aman",
  description: "Ask ChatGPT anything",
  commandCategory: "ai",
  usages: "gpt <question>",
  cooldowns: 3
};

const axios = require("axios");

module.exports.run = async function ({ api, event, args }) {
  const msg = args.join(" ");
  if (!msg) return api.sendMessage("⚠️ Question likh!", event.threadID, event.messageID);

  try {
    const res = await axios.get(`https://api.vihangayt.asia/gpt4?text=${encodeURIComponent(msg)}`);
    return api.sendMessage("🤖 " + res.data.result, event.threadID, event.messageID);
  } catch (e) {
    return api.sendMessage("❌ Error: " + e.message, event.threadID, event.messageID);
  }
};
