const axios = require('axios');

const API_BASE = 'https://yt-api-oq4d.onrender.com';

module.exports = {
    config: {
        name: "video",
        version: "1.0",
        author: "Aman",
        countDown: 15,
        role: 0,
        shortDescription: "YouTube video search",
        longDescription: "Search and download YouTube videos",
        category: "media",
        guide: "{pn} <search query>"
    },

    onStart: async function ({ api, event, args }) {
        try {
            if (!args[0]) {
                return api.sendMessage("❌ Please provide a search query!\nExample: /video song", event.threadID);
            }

            const query = args.join(" ");
            api.sendMessage(`🔍 Searching for "${query}"...`, event.threadID);

            // Search videos
            const searchUrl = `${API_BASE}/api/search?q=${encodeURIComponent(query)}`;
            const searchResponse = await axios.get(searchUrl);
            
            if (!searchResponse.data.success || !searchResponse.data.results.length) {
                return api.sendMessage("❌ No videos found!", event.threadID);
            }

            // First video
            const video = searchResponse.data.results[0];
            
            const message = `🎵 ${video.title}\n📺 Channel: ${video.channel}\n⏱ Duration: ${video.duration || 'N/A'}\n\nDownload link: https://www.youtube.com/watch?v=${video.id}`;

            api.sendMessage(message, event.threadID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage("❌ Error fetching video. Please try again later.", event.threadID);
        }
    }
};
