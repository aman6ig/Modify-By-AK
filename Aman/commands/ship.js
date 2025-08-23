module.exports.config = {
  name: "ship",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Aman",
  description: "Calculates love percentage between two names.",
  commandCategory: "fun",
  usages: ".ship [name1] | [name2]",
  cooldowns: 10
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const text = args.join(" ");
  
  if (!text.includes("|")) {
    return api.sendMessage("गलत format! Aise likhein: .ship [naam1] | [naam2]", threadID, messageID);
  }
  
  const names = text.split("|").map(name => name.trim());
  const name1 = names[0];
  const name2 = names[1];

  if (!name1 || !name2) {
    return api.sendMessage("Dono naam likhna zaroori hai.", threadID, messageID);
  }

  const percentage = Math.floor(Math.random() * 101);
  let message;

  if (percentage < 30) {
    message = `💔 ${name1} aur ${name2} ke beech sirf ${percentage}% pyaar hai. Lagta hai baat nahi banegi.`;
  } else if (percentage < 60) {
    message = `🤔 ${name1} aur ${name2} ke beech ${percentage}% pyaar hai. Thodi koshish aur karni padegi!`;
  } else if (percentage < 90) {
    message = `🥰 ${name1} aur ${name2} ke beech ${percentage}% pyaar hai. Kamaal ki jodi hai!`;
  } else {
    message = `💖 ${name1} aur ${name2} ke beech ${percentage}% pyaar hai! Rab Ne Bana Di Jodi! ✨`;
  }

  api.sendMessage(message, threadID, messageID);
};
