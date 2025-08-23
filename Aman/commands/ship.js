const axios = require("axios");

module.exports.config = {
  name: "dl",
  version: "1.0",
  hasPermission: 0,
  credits: "Aman + ChatGPT",
  description: "Download videos from any link (YouTube + Adult)",
  commandCategory: "Media",
  usages: "[url]",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const url = args[0];
  if (!url) return api.sendMessage("⚠️ Please provide a link.", event.threadID, event.messageID);

  const token = "apify_api_eCfbBMUeS3D0z9Xn4cJnnxPy3dMBsV3EUk1T"; // your Apify token
  const actorId = "apify/website-content-crawler"; // Apify actor for scraping (we can switch to video downloader actors)

  try {
    api.sendMessage("⏳ Processing your link, please wait...", event.threadID, event.messageID);

    // Start Apify actor
    const run = await axios.post(
      `https://api.apify.com/v2/actor-tasks/${actorId}/runs?token=${token}`,
      {
        "startUrls": [{ "url": url }]
      }
    );

    const runId = run.data.data.id;

    // Poll results
    let finished = false, resultUrl = "";
    while (!finished) {
      const res = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      const status = res.data.data.status;
      if (status === "SUCCEEDED") {
        finished = true;
        resultUrl = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}`;
      } else if (status === "FAILED") {
        return api.sendMessage("❌ Download failed. Unsupported link.", event.threadID, event.messageID);
      }
      await new Promise(r => setTimeout(r, 5000));
    }

    api.sendMessage(`✅ Here is your download result:\n${resultUrl}`, event.threadID, event.messageID);

  } catch (e) {
    api.sendMessage("❌ Error fetching video. Please check the link or try again.", event.threadID, event.messageID);
  }
};
