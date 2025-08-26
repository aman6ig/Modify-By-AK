const axios = require("axios");

module.exports.config = {
  name: "sony",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "Aman",
  description: "Gemini chatbot with sony/bot trigger and reply context",
  commandCategory: "no prefix",
  usages: "no prefix",
  cooldowns: 2
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body, senderID, messageReply } = event;

  if (!body || senderID == api.getCurrentUserID()) return;

  const lowerBody = body.toLowerCase();

  // Trigger words or reply check
  const hasTriggerWords = lowerBody.includes("sony") || lowerBody.includes("bot");
  const isReplyToBot = messageReply && messageReply.senderID == api.getCurrentUserID();

  if (hasTriggerWords || isReplyToBot) {
    try {
      // Reaction 🥰
      api.setMessageReaction("🥰", messageID, (err) => {}, true);

      // Sender name fetch
      const userInfo = await api.getUserInfo(senderID);
      const userName = userInfo[senderID]?.name || "User";

      let finalMessage = body;

      // If replying to bot's message, include context
      if (isReplyToBot && messageReply) {
        const repliedMessage = messageReply.body || "";
        finalMessage = `Previous message: ${repliedMessage} | User's reply: ${body}`;
      }

      // API call with context
      const res = await axios.post("https://api-zd2s.onrender.com/gemini", {
        message: finalMessage
      });

      if (!res.data || !res.data.reply) {
        return api.sendMessage("⚠️ sony ne sahi reply nahi diya.", threadID, messageID);
      }

      // Final message format
      const finalMsg = `👤 ${userName}\n\n${res.data.reply}\n\n*★᭄𝐎𝐰𝐧𝐞𝐫 𝐀 𝐊 ⚔️⏤͟͟͞͞★*`;

      return api.sendMessage(finalMsg, threadID, messageID);

    } catch (error) {
      console.error("Gemini API error:", error.message);

      // Multiple funny/romantic error messages
      const errorMessages = [
        "Ye Duniya Ye Mahfil Meri Kam Ki Nhi 🥺",
        "Aao Chalo Ghum ne Chalte Party Karege Tum hare Pese se🫣",
        "Zindagi Me Khush Rehna Seekho Udas Krne Ke Liye Log He na🙃",
        "4 Log Kya Kahege Is Baat Ki Fikar Tum Kyu Kar Rahe ho😜",
        "Chalo Ib Chalte Hai Ye Log Hame Baat Karne Nhi Dege Sahi se😉",
        "Tum Mujhse Piyar Karte Ho Na Baby Bolo🥲",
        "Ek Chumma Tu Mujhko Udhar dede 🙈",
        "Zindagi Tum Hari Hai To Apni Marzi Se Jio Gulami Kisi ki mat karo ",
        "Aao Mere saath Chalo Tume Pizza 🍕 Khilau ",
        "Me To Gareeb Hu Aap Btao Ameer Logo Kaise Ho",
        "baby Ib chalo na Yaha group me kya Rakha Hai 😂",
      ];

      const randomMsg = errorMessages[Math.floor(Math.random() * errorMessages.length)];

      return api.sendMessage(randomMsg, threadID, messageID);
    }
  }
};

module.exports.run = async function () {
  return;
};
