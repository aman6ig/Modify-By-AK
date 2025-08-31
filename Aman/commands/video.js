const axios = require("axios");
const ytdl = require("ytdl-core");

module.exports = {
  config: {
    name: "video",
    version: "1.0.1", 
    hasPermssion: 0,
    credits: "Aman Khan",
    description: "Search and send YouTube video directly",
    commandCategory: "Media",
    usages: "[videoName]",
    cooldowns: 15,
    dependencies: {
      "axios": "",
      "ytdl-core": "",
      "yt-search": ""
    },
  },

  run: async function ({ api, event, args }) {
    if (!args[0]) {
      return api.sendMessage("❌ Please enter video name!", event.threadID, event.messageID);
    }

    const videoName = args.join(" ");
    
    const processingMessage = await api.sendMessage(
      "🔍 Searching for video...",
      event.threadID,
      null,
      event.messageID
    );

    try {
      // Direct YouTube search
      const ytSearch = require('yt-search');
      const searchResults = await ytSearch(videoName);
      
      if (!searchResults.videos.length) {
        throw new Error("No videos found!");
      }

      const video = searchResults.videos[0];
      const videoUrl = video.url;
      
      // Get video info
      const videoInfo = await ytdl.getInfo(videoUrl);
      
      // Get available format
      const format = ytdl.chooseFormat(videoInfo.formats, {
        quality: 'lowest', // Pehle lowest try karte hain
        filter: 'audioandvideo'
      });
      
      if (!format) {
        // Agar video format nahi mila toh audio format try karo
        const audioFormat = ytdl.chooseFormat(videoInfo.formats, {
          filter: 'audioonly'
        });
        if (!audioFormat) throw new Error("No download format available");
      }

      const downloadUrl = format.url;
      
      api.setMessageReaction("⏬", event.messageID, () => {}, true);
      
      // Send video with timeout
      setTimeout(async () => {
        try {
          await api.sendMessage(
            {
              attachment: await global.utils.getStreamFromURL(downloadUrl),
              body: `🎬 ${video.title}\n⏰ ${video.duration}\n👁️ ${video.views}\n\n✅ Downloaded successfully`
            },
            event.threadID,
            () => {
              api.unsendMessage(processingMessage.messageID);
            }
          );
        } catch (sendError) {
          // Agar video send nahi ho paya toh link bhej do
          await api.sendMessage(
            `🎬 ${video.title}\n⏰ ${video.duration}\n\n📥 Download Link: ${video.url}\n\n❌ Video too large, sending link instead.`,
            event.threadID,
            () => {
              api.unsendMessage(processingMessage.messageID);
            }
          );
        }
      }, 2000);

    } catch (error) {
      console.error("Video error:", error);
      api.sendMessage(
        `❌ Error: ${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  }
};
