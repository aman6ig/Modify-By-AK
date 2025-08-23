const axios = require("axios");

module.exports.config = {
  name: "fbprofile",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "YourName",
  description: "Get Facebook profile info",
  commandCategory: "social",
  usages: "[username]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const username = args[0];
  if (!username) return api.sendMessage("❌ Facebook username/ID bhejo!", event.threadID, event.messageID);

  try {
    const response = await axios.get(`https://facebook-profile-info.p.rapidapi.com/profile?username=${username}`, {
      headers: {
        'X-RapidAPI-Key': 'your_api_key_here',
        'X-RapidAPI-Host': 'facebook-profile-info.p.rapidapi.com'
      }
    });

    const profile = response.data;
    const message = `
📘 Facebook Profile:
Name: ${profile.name}
Username: ${profile.username}
ID: ${profile.id}
Followers: ${profile.followers}
Friends: ${profile.friends}
    `;

    api.sendMessage(message, event.threadID, event.messageID);
  } catch (error) {
    console.error(error);
    api.sendMessage("❌ Profile not found!", event.threadID, event.messageID);
  }
};
