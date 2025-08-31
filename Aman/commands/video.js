const axios = require("axios");

module.exports = {
  config: {
    name: "video",
    version: "1.0.1", 
    hasPermssion: 0,
    credits: "Aman",
    description: "Download YouTube video from search",
    commandCategory: "Media",
    usages: "[videoName]",
    cooldowns: 5,
    dependencies: {
      "axios": ""
    },
  },

  run: async function ({ api, event, args }) {
    if (!args[0]) {
      return api.sendMessage("❌ Please enter video name to search!", event.threadID, event.messageID);
    }

    const videoName = args.join(" ");
    
    const processingMessage = await api.sendMessage(
      "✅ Searching for video. Please wait...",
      event.threadID,
      null,
      event.messageID
    );

    try {
      // Use your Render API
      const apiUrl = `https://yt-api-oq4d.onrender.com/api/search?q=${encodeURIComponent(videoName)}`;
      
      const searchResponse = await axios.get(apiUrl);
      
      if (!searchResponse.data.success || !searchResponse.data.results.length) {
        throw new Error("No videos found for your search.");
      }

      const video = searchResponse.data.results[0];
      
      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Send video information with download link
      await api.sendMessage(
        `🎬 **Title:** ${video.title}\n📺 **Channel:** ${video.channel}\n⏰ **Duration:** ${video.duration || 'N/A'}\n\n🔗 **Download:** https://www.youtube.com/watch?v=${video.id}\n\nUse "/video download ${video.id}" to get direct download link`,
        event.threadID,
        () => {
          api.unsendMessage(processingMessage.messageID);
        },
        event.messageID
      );

    } catch (error) {
      console.error("Video search error:", error);
      api.sendMessage(
        `❌ Failed to search video: ${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  }
};
