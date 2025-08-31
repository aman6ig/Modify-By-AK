const axios = require("axios");
const ytdl = require("ytdl-core");

module.exports = {
  config: {
    name: "video",
    version: "1.0.1", 
    hasPermssion: 0,
    credits: "Aman",
    description: "Search and send YouTube video directly",
    commandCategory: "Media",
    usages: "[videoName]",
    cooldowns: 10,
    dependencies: {
      "axios": "",
      "ytdl-core": ""
    },
  },

  run: async function ({ api, event, args }) {
    if (!args[0]) {
      return api.sendMessage("❌ Please enter video name to search!", event.threadID, event.messageID);
    }

    const videoName = args.join(" ");
    
    const processingMessage = await api.sendMessage(
      "🔍 Searching for video...",
      event.threadID,
      null,
      event.messageID
    );

    try {
      // Search video using your API
      const apiUrl = `https://yt-api-oq4d.onrender.com/api/search?q=${encodeURIComponent(videoName)}`;
      const searchResponse = await axios.get(apiUrl);
      
      if (!searchResponse.data.success || !searchResponse.data.results.length) {
        throw new Error("No videos found for your search.");
      }

      const video = searchResponse.data.results[0];
      
      // Get video info for download
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const videoInfo = await ytdl.getInfo(videoUrl);
      
      // Get highest quality format
      const format = ytdl.chooseFormat(videoInfo.formats, { 
        quality: 'highest',
        filter: 'audioandvideo'
      });
      
      if (!format) {
        throw new Error("No suitable format found for download.");
      }

      api.setMessageReaction("⏬", event.messageID, () => {}, true);
      
      // Send the video directly
      await api.sendMessage(
        {
          attachment: await global.utils.getStreamFromURL(format.url),
          body: `🎬 **${video.title}**\n📺 Channel: ${video.channel}\n⏰ Duration: ${video.duration || 'N/A'}\n\n✅ Downloaded via YouTube API`
        },
        event.threadID,
        () => {
          api.unsendMessage(processingMessage.messageID);
        },
        event.messageID
      );

    } catch (error) {
      console.error("Video error:", error);
      api.sendMessage(
        `❌ Failed to send video: ${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  }
};
