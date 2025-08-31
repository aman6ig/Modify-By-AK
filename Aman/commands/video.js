const axios = require("axios");

module.exports = {
  config: {
    name: "video",
    version: "1.0.1", 
    hasPermssion: 0,
    credits: "Aman",
    description: "Search and send YouTube video",
    commandCategory: "Media",
    usages: "[videoName]",
    cooldowns: 10,
    dependencies: {
      "axios": ""
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
      // Use your Render API for search
      const searchUrl = `https://yt-api-oq4d.onrender.com/api/search?q=${encodeURIComponent(videoName)}`;
      const searchResponse = await axios.get(searchUrl);
      
      if (!searchResponse.data.success || !searchResponse.data.results.length) {
        throw new Error("No videos found!");
      }

      const video = searchResponse.data.results[0];
      
      // Use third-party API for download (410 error avoid)
      const downloadApiUrl = `https://youtube-downloader8.p.rapidapi.com/?url=https://www.youtube.com/watch?v=${video.id}`;
      
      const downloadResponse = await axios.get(downloadApiUrl, {
        headers: {
          'X-RapidAPI-Key': 'your-rapidapi-key', // RapidAPI se key lena padega
          'X-RapidAPI-Host': 'youtube-downloader8.p.rapidapi.com'
        }
      });

      if (!downloadResponse.data || !downloadResponse.data.video) {
        throw new Error("Download not available");
      }

      const videoUrl = downloadResponse.data.video[0].url; // First quality
      
      api.setMessageReaction("✅", event.messageID, () => {}, true);
      
      // Send video
      await api.sendMessage(
        {
          attachment: await global.utils.getStreamFromURL(videoUrl),
          body: `🎬 ${video.title}\n📺 ${video.channel}\n\n✅ Downloaded via YouTube API`
        },
        event.threadID,
        () => {
          api.unsendMessage(processingMessage.messageID);
        },
        event.messageID
      );

    } catch (error) {
      console.error("Video error:", error);
      
      // Fallback: Send video link only
      if (searchResponse && searchResponse.data.results.length > 0) {
        const video = searchResponse.data.results[0];
        await api.sendMessage(
          `🎬 ${video.title}\n📺 ${video.channel}\n\n🔗 YouTube Link: https://www.youtube.com/watch?v=${video.id}\n\n❌ Video download failed, but here's the link!`,
          event.threadID,
          () => {
            api.unsendMessage(processingMessage.messageID);
          },
          event.messageID
        );
      } else {
        api.sendMessage(
          `❌ Error: ${error.message}`,
          event.threadID,
          event.messageID
        );
      }
    }
  }
};
