const axios = require("axios");
const fs = require("fs");
const ytdl = require("ytdl-core"); // YouTube ke liye

module.exports.config = {
  name: "load",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Download video from any link",
  commandCategory: "tools",
  usages: "download [url]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const url = args[0];
  if (!url) return api.sendMessage("❌ Link do jiska video download karna hai!", event.threadID, event.messageID);

  try {
    if (ytdl.validateURL(url)) {
      // YouTube video download
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;
      const file = __dirname + "/cache/video.mp4";

      ytdl(url, { quality: "lowest" })
        .pipe(fs.createWriteStream(file))
        .on("finish", () => {
          api.sendMessage(
            {
              body: `✅ Video download complete!\n\n🎬 Title: ${title}`,
              attachment: fs.createReadStream(file)
            },
            event.threadID,
            () => fs.unlinkSync(file),
            event.messageID
          );
        });
    } else {
      // Non-YouTube ke liye 3rd party API
      const res = await axios.get(`https://api.vreden.my.id/api/download/mediafire?url=${encodeURIComponent(url)}`);
      if (!res.data || !res.data.result) return api.sendMessage("❌ Ye link support nahi hota!", event.threadID, event.messageID);

      api.sendMessage(`✅ Link fetched!\n\n🔗 ${res.data.result.link}`, event.threadID, event.messageID);
    }
  } catch (e) {
    console.error(e);
    api.sendMessage("❌ Download error!", event.threadID, event.messageID);
  }
};
