const axios = require("axios");

module.exports.config = {
  name: "naina",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Aman",
  description: "Naina AI (Pollinations API) with moods + emoji detection",
  commandCategory: "no prefix",
  usages: "no prefix",
  cooldowns: 2,
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body, senderID } = event;
  if (!body || senderID == api.getCurrentUserID()) return;

  const lowerBody = body.toLowerCase();
  const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(body.trim()); // check agar sirf emojis hain

  try {
    api.setMessageReaction("✨", messageID, () => {}, true);

    const userInfo = await api.getUserInfo(senderID);
    const userName = userInfo[senderID]?.name || "User";

    // Random mood choose
    const moods = ["romantic", "funny", "attitude", "naughty"];
    const mood = moods[Math.floor(Math.random() * moods.length)];

    let prompt;

    if (isEmojiOnly) {
      // Agar sirf emojis bheje gaye hain
      prompt = `User ne sirf emoji bheje hain: "${body}". 
Un emojis ko feel kar ke ek real ladki "${mood}" mood me naturally reply karo. 
Human style me likho, emojis use karo, AI jaisa mat lagna.`;
    } else if (lowerBody.includes("naina")) {
      // Agar user ne "Naina" likha hai
      prompt = `Tum ek real ladki ho jiska naam "Naina" hai aur tum abhi "${mood}" mood me ho. 
User ka msg: "${body}". 
Mood ke hisaab se natural aur human style me jawab do, emojis use karo, AI jaisa mat lagna.`;
    } else {
      return; // baaki messages ignore
    }

    const encoded = encodeURIComponent(prompt);

    const res = await axios.get(`https://text.pollinations.ai/${encoded}`);
    const reply = res.data || "Naina thoda confuse ho gayi hai 😅";

    const finalMsg = `💬 ${userName}\n\n${reply}\n\n━━━★ Naina ✨`;

    return api.sendMessage(finalMsg, threadID, messageID);
  } catch (error) {
    console.error("Pollinations error:", error.message);

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
