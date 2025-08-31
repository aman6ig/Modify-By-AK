const axios = require("axios");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");

module.exports = {
  config: {
    name: "video",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "Aman",
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
      // Search for video
      const searchResults = await ytSearch(videoName);
      
      if (!searchResults.videos.length) {
        throw new Error("No videos found!");
      }

      const video = searchResults.videos[0];
      const videoUrl = video.url;

      // Get video info
      const info = await ytdl.getInfo(videoUrl);
      
      // Get the best available format
      const format = ytdl.chooseFormat(info.formats, {
        quality: 'lowest',
        filter: 'audioandvideo'
      });

      if (!format) {
        throw new Error("No downloadable format found");
      }

      api.setMessageReaction("⏬", event.messageID, () => {}, true);

      // Download and send video
      const filename = `video_${Date.now()}.mp4`;
      const filepath = path.join(__dirname, cache);

      const stream = ytdl(videoUrl, { format: format });
      const writeStream = fs.createWriteStream(filepath);

      stream.pipe(writeStream);

      writeStream.on('finish', async () => {
        try {
          await api.sendMessage(
            {
              attachment: fs.createReadStream(filepath),
              body: `🎬 ${video.title}\n⏰ ${video.duration}\n👀 ${video.views}\n\n✅ Video downloaded successfully!`
            },
            event.threadID,
            () => {
              fs.unlinkSync(filepath);
              api.unsendMessage(processingMessage.messageID);
            },
            event.messageID
          );
        } catch (sendError) {
          console.error("Send error:", sendError);
          api.sendMessage(
            `🎬 ${video.title}\n⏰ ${video.duration}\n\n🔗 ${video.url}\n\n❌ Video too large, here's the link!`,
            event.threadID,
            () => {
              fs.unlinkSync(filepath);
              api.unsendMessage(processingMessage.messageID);
            },
            event.messageID
          );
        }
      });

      writeStream.on('error', (error) => {
        throw new Error(`Download failed: ${error.message}`);
      });

    } catch (error) {
      console.error("Video error:", error);
      
      // Fallback to link
      try {
        const searchResults = await ytSearch(videoName);
        if (searchResults.videos.length > 0) {
          const video = searchResults.videos[0];
          api.sendMessage(
            `🎬 ${video.title}\n⏰ ${video.duration}\n👀 ${video.views}\n\n🔗 ${video.url}\n\n❌ ${error.message}`,
            event.threadID,
            () => {
              api.unsendMessage(processingMessage.messageID);
            },
            event.messageID
          );
        } else {
          throw error;
        }
      } catch (fallbackError) {
        api.sendMessage(
          `❌ Error: ${error.message}`,
          event.threadID,
          event.messageID
        );
      }
    }
  }
};
