const axios = require("axios");

module.exports.config = {
  name: "flash",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Google Gemini Flash 2.0 AI (No Prefix)",
  commandCategory: "ai",
  usages: "flash [question]",
  cooldowns: 5
};

// No prefix handleEvent
module.exports.handleEvent = async function ({ api, event }) {
  const body = event.body ? event.body.trim() : "";
  if (!body.toLowerCase().startsWith("flash")) return;

  const question = body.slice(5).trim(); // "flash" ke baad ka text
  if (!question) {
    return api.sendMessage("❌ Kuch puchna to likho!", event.threadID, event.messageID);
  }

  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            parts: [{ text: question }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": "AIzaSyD-I6TGcWoFUafug_w3zF8NIokfgUVIHgg"
        }
      }
    );

    let answer = "❌ Flash se koi reply nahi mila.";
    if (response.data?.candidates?.[0]?.content?.parts) {
      answer = response.data.candidates[0].content.parts
        .map(p => p.text || "")
        .join("\n");
    }

    api.sendMessage(`⚡ Flash 2.0:\n\n${answer}\n\n— owner Ak`, event.threadID, event.messageID);
  } catch (error) {
    console.error(error.response?.data || error.message);
    api.sendMessage("❌ Flash error!", event.threadID, event.messageID);
  }
};
