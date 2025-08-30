const axios = require("axios");

module.exports.config = {
  name: "naina",
  version: "3.1.0",
  hasPermssion: 0,
  credits: "Aman (Secured by GPT)",
  description: "Naina AI (Pollinations API) with moods + emoji detection",
  commandCategory: "no prefix",
  usages: "no prefix",
  cooldowns: 2,
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body, senderID } = event;
  if (!body || senderID == api.getCurrentUserID()) return;

  const lowerBody = body.toLowerCase();
  const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(body.trim());

  try {
    api.setMessageReaction("✨", messageID, () => {}, true);

    const userInfo = await api.getUserInfo(senderID);
    const userName = userInfo[senderID]?.name || "User";

    // Random mood select
    const moods = ["Roasting", "funny", "attitude", "naughty", "sad", "romantic"];
    const mood = moods[Math.floor(Math.random() * moods.length)];

    let prompt;

    if (isEmojiOnly) {
      prompt = `User ne sirf emoji bheje hain: "${body}". 
Un emojis ko use krke emoji ke according  "${mood}" mood me natural reply kare. 
AI jaisa Nhi Real girl ki tarah ho Jiyada bada Nhi Only short reply and intresting ho, emojis zaroor use karo.`;
    } else if (lowerBody.includes("naina")) {
      prompt = `Tum ek ladki ho jiska naam "Naina" hai aur tum abhi "${mood}" mood me ho. 
User ka msg: "${body}". 
Human girl style me jawab do real insan ki tarah , thoda natural aur filmy touch ke sath. Emojis zaroor use karo.`;
    } else {
      return; // ignore
    }

    const encoded = encodeURIComponent(prompt);

    // ✅ Secure axios request with headers + timeout
    const res = await axios.get(`https://text.pollinations.ai/${encoded}`, {
      headers: {
        "User-Agent": "NainaBot/3.1",
        "Accept": "application/json, text/plain, */*",
      },
      timeout: 10000, // 10 sec timeout
      validateStatus: (status) => status >= 200 && status < 300, // reject others
    });

    let reply = typeof res.data === "string" ? res.data.trim() : "Naina ko samajh nahi aaya 😅";

    // Safe fallback agar empty response ho
    if (!reply) {
      reply = "Naina soch rahi hai... tum bahut interesting ho 💖";
    }

    const finalMsg = `💬 ${userName}\n\n${reply}\n\n━━━★ Naina ✨`;

    return api.sendMessage(finalMsg, threadID, messageID);
  } catch (error) {
    console.error("Pollinations error:", error);

    const backupReplies = [
      "Server ne bhi socha, tumhe mai hi handle karu 😘",
      "Reply nahi aayi, par mera dil tumse hi baat kar raha hai 💕",
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
