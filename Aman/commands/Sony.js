const axios = require("axios");

module.exports.config = {
  name: "flash",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Google Gemini Flash 2.0 AI",
  commandCategory: "ai",
  usages: "[question]",
  cooldowns: 5
};

//don't change credit fb contact AK47XK 
module.exports.run = async function ({ api, event, args }) {
  const question = args.join(" ");
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

    // Response parse karna safe way se
    let answer = "❌ Flash se koi reply nahi mila.";
    if (response.data?.candidates?.[0]?.content?.parts) {
      answer = response.data.candidates[0].content.parts
        .map(p => p.text || "")
        .join("\n");
    }

    //auther Aman Khan change name reply 
    api.sendMessage(`⚡ Ai reply:\n\n${answer}`, event.threadID, event.messageID);
  } catch (error) {
    console.error(error.response?.data || error.message);
    api.sendMessage("❌ Flash error!", event.threadID, event.messageID);
  }
};
