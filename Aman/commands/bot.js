const axios = require("axios");

module.exports.config = {
  name: "bot",
  version: "3.1.0",
  hasPermssion: 0,
  credits: "Aman (Secured by GPT)",
  description: "Bot AI (Pollinations API) with moods + emoji detection",
  commandCategory: "no prefix",
  usages: "no prefix",
  cooldowns: 2,
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body, senderID } = event;
  if (!body || senderID == api.getCurrentUserID()) return;

  const lowerBody = body.toLowerCase();
  const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(body.trim());

  // ❌ Block: agar "sony" aur "bot" dono ek sath ho to return kar do
  if (lowerBody.includes("sony") && lowerBody.includes("bot")) return;

  try {
    api.setMessageReaction("🤖", messageID, () => {}, true);

    const userInfo = await api.getUserInfo(senderID);
    const userName = userInfo[senderID]?.name || "User";

    // Random mood select
    const moods = ["romantic", "funny", "attitude", "naughty"];
    const mood = moods[Math.floor(Math.random() * moods.length)];

    let prompt;

    if (isEmojiOnly) {
      prompt = `User ne sirf emoji bheje hain: "${body}". 
Un emojis ko Ke Hisab se ek ladki ki tarah "${mood}" mood me natural reply kare. 
AI jaisa nhi hol Real Girl ki tarah ho ai ki tarah lamba lamba message nhi ho short aur acha reply ho look like humans girl, emojis zaroor use karo.`;
    } else if (lowerBody.includes("bot")) {
      prompt = `Tum ek ladki ho jiska naam "Bot" hai aur tum abhi "${mood}" mood me ho. 
User ka msg: "${body}". 
Human girl style me jawab do, Ek real Girl ki tarah Jb koi Only Bot Bole to Flirting Line ya shaayri Ya jokes ya Roasting line bhejo Bina kuch bole Direct. Emojis zaroor use karo.`;
    } else {
      return; // ignore if no trigger
    }

    const encoded = encodeURIComponent(prompt);

    // ✅ Pollinations API call
    const res = await axios.get(`https://text.pollinations.ai/${encoded}`, {
      headers: {
        "User-Agent": "BotAI/3.1",
        "Accept": "application/json, text/plain, */*",
      },
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    let reply = typeof res.data === "string" ? res.data.trim() : "Bot ko samajh nahi aaya 😅";

    if (!reply) {
      reply = "Bot soch rahi hai... tum bahut interesting ho 💖";
    }

    const finalMsg = `👤 ${userName}\n\n${reply}`;

    return api.sendMessage(finalMsg, threadID, messageID);
  } catch (error) {
    console.error("Pollinations error:", error);

    const backupReplies = [
      "Server bhi thoda thak gaya, par mai abhi bhi tumse baat karna chahti hu 😘",
      "Reply nahi aayi, par mera dil tumhe yaad kar raha hai 💕",
      "Kabhi kabhi silence bhi bada romantic hota hai 😏",
      "Chalo mai tumhe ek smile bhejti hu 🙂✨",
    ];
    const random = backupReplies[Math.floor(Math.random() * backupReplies.length)];
    return api.sendMessage(random, threadID, messageID);
  }
};

module.exports.run = async function () {
  return;
};
