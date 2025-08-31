const fetch = require("node-fetch");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");

module.exports = {
  config: {
    name: "video",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "Aman",
    description: "Download YouTube video from keyword search",
    commandCategory: "Media",
    usages: "[videoName]",
    cooldowns: 10,
    dependencies: {
      "node-fetch": "",
      "yt-search": "",
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
      // Search for the video on YouTube
      const searchResults = await ytSearch(videoName);
      if (!searchResults || !searchResults.videos.length) {
        throw new Error("No videos found for your search.");
      }

      // Get the top result from the search
      const topResult = searchResults.videos[0];
      const videoId = topResult.videoId;

      // Use YOUR RENDER API for download information
      const apiUrl = `https://yt-api-oq4d.onrender.com/api/download?videoId=${videoId}`;

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      // Get download info from your API
      const downloadResponse = await axios.get(apiUrl, { timeout: 15000 });
      
      if (!downloadResponse.data.success) {
        throw new Error("Download service temporarily unavailable");
      }

      const videoInfo = downloadResponse.data.video;
      const downloadUrl = videoInfo.downloadUrl || videoInfo.watchUrl;

      // Check if download URL is available
      if (!downloadUrl) {
        throw new Error("No download URL available");
      }

      // Set request headers
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
      };

      // Try to download the video
      const response = await fetch(downloadUrl, { headers, timeout: 30000 });

      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }

      // Check file size (max 25MB for Messenger)
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 25 * 1024 * 1024) {
        throw new Error("Video is too large for direct download");
      }

      // Create safe filename
      const filename = `video_${videoId}.mp4`;
      const downloadPath = path.join(__dirname, filename);

      // Download and save video
      const videoBuffer = await response.buffer();
      fs.writeFileSync(downloadPath, videoBuffer);

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Send the video
      await api.sendMessage(
        {
          attachment: fs.createReadStream(downloadPath),
          body: `🎬 ${topResult.title}\n⏰ ${topResult.duration}\n👀 ${topResult.views}\n\n✅ Downloaded successfully!`
        },
        event.threadID,
        () => {
          // Clean up: delete the temporary file
          try {
            fs.unlinkSync(downloadPath);
          } catch (cleanupError) {
            console.error("File cleanup error:", cleanupError);
          }
          api.unsendMessage(processingMessage.messageID);
        },
        event.messageID
      );

    } catch (error) {
      console.error("Video command error:", error.message);
      
      // Fallback: Send video information with link
      try {
        const searchResults = await ytSearch(videoName);
        if (searchResults && searchResults.videos.length > 0) {
          const topResult = searchResults.videos[0];
          
          await api.sendMessage(
            `🎬 ${topResult.title}\n⏰ ${topResult.duration}\n👀 ${topResult.views}\n\n🔗 YouTube Link: ${topResult.url}\n\n❌ Note: ${error.message}`,
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
          `❌ Error: ${error.message}\n\nPlease try again later.`,
          event.threadID,
          event.messageID
        );
      }
    }
  },
};
