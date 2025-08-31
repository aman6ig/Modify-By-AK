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
    cooldowns: 5,
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
    const type = "video"; // Always video for this command

    const processingMessage = await api.sendMessage(
      "✅ Processing your video request. Please wait...",
      event.threadID,
      null,
      event.messageID
    );

    try {
      // Search for the video on YouTube
      const searchResults = await ytSearch(videoName);
      if (!searchResults || !searchResults.videos.length) {
        throw new Error("No results found for your search query.");
      }

      // Get the top result from the search
      const topResult = searchResults.videos[0];
      const videoId = topResult.videoId;

      // Construct API URL for downloading using YOUR RENDER API
      const apiUrl = `https://yt-api-oq4d.onrender.com/api/download?videoId=${videoId}`;

      api.setMessageReaction("⌛", event.messageID, () => {}, true);

      // Get the direct download URL from your API
      const downloadResponse = await axios.get(apiUrl);
      
      if (!downloadResponse.data || !downloadResponse.data.downloadUrl) {
        throw new Error("Download not available from API");
      }

      const downloadUrl = downloadResponse.data.downloadUrl;

      // Set request headers
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
      };

      const response = await fetch(downloadUrl, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch video. Status code: ${response.status}`);
      }

      // Set the filename based on the video title
      const filename = `${topResult.title}.mp4`;
      const downloadPath = path.join(__dirname, filename);

      const videoBuffer = await response.buffer();

      // Save the video file locally
      fs.writeFileSync(downloadPath, videoBuffer);

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      await api.sendMessage(
        {
          attachment: fs.createReadStream(downloadPath),
          body: `🎬 Title: ${topResult.title}\n⏰ Duration: ${topResult.duration}\n👀 Views: ${topResult.views}\n\nHere is your video 🎥:`,
        },
        event.threadID,
        () => {
          fs.unlinkSync(downloadPath);
          api.unsendMessage(processingMessage.messageID);
        },
        event.messageID
      );
    } catch (error) {
      console.error(`Failed to download and send video: ${error.message}`);
      api.sendMessage(
        `Failed to download video: ${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  },
};
