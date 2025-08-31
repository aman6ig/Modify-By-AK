const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");

module.exports = {
  config: {
    name: "video",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Aman",
    description: "Download and send YouTube videos directly",
    commandCategory: "Media",
    usages: "[videoName]",
    cooldowns: 20,
    dependencies: {
      "axios": "",
      "ytdl-core": "",
      "yt-search": "",
      "fs": "",
      "path": ""
    },
  },

  run: async function ({ api, event, args }) {
    if (!args[0]) {
      return api.sendMessage("❌ Please enter video name!", event.threadID, event.messageID);
    }

    const videoName = args.join(" ");
    
    const processingMessage = await api.sendMessage(
      "🔍 Searching for video... Please wait ⏳",
      event.threadID,
      null,
      event.messageID
    );

    try {
      // Step 1: Search YouTube
      const searchResults = await ytSearch(videoName);
      
      if (!searchResults.videos.length) {
        throw new Error("No videos found for: " + videoName);
      }

      const video = searchResults.videos[0];
      const videoUrl = video.url;

      api.sendMessage(
        `🎬 Found: ${video.title}\n⏰ Duration: ${video.duration}\n⬇️ Downloading...`,
        event.threadID,
        null,
        event.messageID
      );

      // Step 2: Download using ytdl-core
      const filename = `video_${Date.now()}.mp4`;
      const filepath = path.join(__dirname, cache);

      return new Promise((resolve, reject) => {
        const stream = ytdl(videoUrl, {
          quality: 'lowest',
          filter: 'audioandvideo'
        });

        stream.pipe(fs.createWriteStream(filepath));

        stream.on('end', async () => {
          try {
            // Step 3: Send video
            await api.sendMessage(
              {
                attachment: fs.createReadStream(filepath),
                body: `🎥 ${video.title}\n⏰ ${video.duration}\n👀 ${video.views}\n\n✅ Downloaded successfully!`
              },
              event.threadID,
              (err) => {
                // Cleanup
                try {
                  fs.unlinkSync(filepath);
                } catch (e) {}
                api.unsendMessage(processingMessage.messageID);
                if (err) reject(err);
                else resolve();
              }
            );
          } catch (sendError) {
            reject(sendError);
          }
        });

        stream.on('error', (error) => {
          reject(new Error(`Download failed: ${error.message}`));
        });
      });

    } catch (error) {
      console.error("Video error:", error);
      
      // Fallback: Send video link
      try {
        const searchResults = await ytSearch(videoName);
        if (searchResults.videos.length > 0) {
          const video = searchResults.videos[0];
          api.sendMessage(
            `🎬 ${video.title}\n⏰ ${video.duration}\n👀 ${video.views}\n\n🔗 ${video.url}\n\n❌ Download failed: ${error.message}`,
            event.threadID,
            () => {
              api.unsendMessage(processingMessage.messageID);
            }
          );
        }
      } catch (fallbackError) {
        api.sendMessage(
          `❌ Error: ${error.message}`,
          event.threadID,
          () => {
            api.unsendMessage(processingMessage.messageID);
          }
        );
      }
    }
  }
};
