const axios = require("axios");

module.exports.config = {
  name: "gemini",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Aman Khan ",
  description: "Google Gemini AI",
  commandCategory: "ai",
  usages: "[question]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const question = args.join(" ");
  if (!question) return api.sendMessage("❌ Kuch pucho!", event.threadID, event.messageID);

  try {
    const response = await axios.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", {
      contents: [{parts: [{text: question}]}]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': 'AIzaSyD-I6TGcWoFUafug_w3zF8NIokfgUVIHgg'
      }
    });

    const answer = response.data.candidates[0].content.parts[0].text;
    api.sendMessage(`🔷 Gemini:\n\n${answer}`, event.threadID, event.messageID);
  } catch (error) {
    console.error(error);
    api.sendMessage("❌ Gemini error!", event.threadID, event.messageID);
  }
};
