module.exports.config = {
	name: "video",
	version: "1.0.0",
	hasPermssion: 0,
	credits: "Aman Khan",
	description: "YouTube se video search karo aur download karo",
	commandCategory: "media",
	usages: "video [naam ya link]",
	cooldowns: 10,
	dependencies: {
		"ytdl-core": "",
		"simple-youtube-api": "",
		"fs-extra": "",
		"axios": ""
	}
};

// Packages ko script ke shuruwat mein hi require karo
const ytdl = global.nodemodule["ytdl-core"];
const fs = global.nodemodule["fs-extra"];
const path = global.nodemodule["path"];
const axios = global.nodemodule["axios"];

// YouTube API key (Yahan apni API key dalo)
const YOUTUBE_API_KEY = "AIzaSyDBOpnGGz225cPwHlJQs8OMRtxOjSUm73I";

module.exports.run = async function({ api, event, args }) {
	const keyword = args.join(" ");
	
	if (!keyword) {
		return api.sendMessage("❌ Koi keyword ya YouTube link dalo bhai...", event.threadID, event.messageID);
	}
	
	try {
		// Agar direct YouTube URL hai toh
		if (ytdl.validateURL(keyword)) {
			const videoInfo = await ytdl.getInfo(keyword);
			const videoTitle = videoInfo.videoDetails.title;
			
			api.sendMessage(`⬇️ Downloading: ${videoTitle}...`, event.threadID, (err, info) => {
				setTimeout(() => { api.unsendMessage(info.messageID) }, 10000);
			});
			
			await downloadAndSendVideo(api, event, keyword);
			return;
		}
		
		// Search karo videos using YouTube API directly
		api.sendMessage(`🔍 "${keyword}" search kar raha hoon...`, event.threadID, (err, info) => {
			setTimeout(() => { api.unsendMessage(info.messageID) }, 5000);
		});
		
		// YouTube API se search karte hain
		const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(keyword)}&key=${YOUTUBE_API_KEY}&type=video`;
		const searchResponse = await axios.get(searchUrl);
		
		if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
			return api.sendMessage("❌ Koi video nahi mila bhai...", event.threadID, event.messageID);
		}
		
		const videos = searchResponse.data.items;
		const links = videos.map(video => `https://www.youtube.com/watch?v=${video.id.videoId}`);
		const titles = videos.map((video, index) => `${index + 1}. ${video.snippet.title}`);
		
		api.sendMessage(`🎬 Konsa video chahiye? Number reply karo:\n\n${titles.join('\n')}\n\n❌ Cancel karne ke liye kuch bhi mat type karo`, event.threadID, (error, info) => {
			global.client.handleReply.push({
				name: this.config.name,
				messageID: info.messageID,
				author: event.senderID,
				link: links
			});
		});
	} catch (error) {
		console.error("Error in run function:", error);
		api.sendMessage("❌ Error aa gaya bhai, baad mein try karo.", event.threadID, event.messageID);
	}
};

module.exports.handleReply = async function({ api, event, handleReply }) {
	if (event.senderID != handleReply.author) return;
	
	const index = parseInt(event.body) - 1;
	if (isNaN(index) || index < 0 || index >= handleReply.link.length) {
		return api.sendMessage("❌ Sahi number dalo bhai (1-5)...", event.threadID, event.messageID);
	}
	
	try {
		const videoUrl = handleReply.link[index];
		const videoInfo = await ytdl.getInfo(videoUrl);
		const videoTitle = videoInfo.videoDetails.title;
		
		api.sendMessage(`⬇️ Downloading: ${videoTitle}...`, event.threadID, (err, info) => {
			setTimeout(() => { api.unsendMessage(info.messageID) }, 10000);
		});
		
		await downloadAndSendVideo(api, event, videoUrl);
	} catch (error) {
		console.error("Error in handleReply:", error);
		api.sendMessage("❌ Video download nahi ho paya.", event.threadID, event.messageID);
	}
};

async function downloadAndSendVideo(api, event, url) {
	try {
		const videoInfo = await ytdl.getInfo(url);
		const videoTitle = videoInfo.videoDetails.title;
		const videoDuration = parseInt(videoInfo.videoDetails.lengthSeconds);
		
		// 10 minutes se zyada lamba video nahi
		if (videoDuration > 600) {
			return api.sendMessage("❌ Video bahut lamba hai (max 10 minutes).", event.threadID, event.messageID);
		}
		
		const videoPath = path.join(__dirname, 'cache', `video_${Date.now()}.mp4`);
		
		// Cache folder banayein agar nahi hai toh
		if (!fs.existsSync(path.join(__dirname, 'cache'))) {
			fs.mkdirSync(path.join(__dirname, 'cache'));
		}
		
		const videoStream = ytdl(url, { 
			filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio,
			quality: 'lowest'
		});
		
		const writeStream = fs.createWriteStream(videoPath);
		
		videoStream.pipe(writeStream);
		
		writeStream.on('finish', async () => {
			try {
				const stats = fs.statSync(videoPath);
				const fileSize = stats.size;
				
				// 25MB se zyada bada file nahi
				if (fileSize > 25 * 1024 * 1024) {
					fs.unlinkSync(videoPath);
					return api.sendMessage("❌ Video file bahut bada hai (max 25MB).", event.threadID, event.messageID);
				}
				
				api.sendMessage({
					body: `🎬 ${videoTitle}\n\n✅ By Aman Khan`,
					attachment: fs.createReadStream(videoPath)
				}, event.threadID, () => {
					// Send hone ke baad file delete karo
					try {
						if (fs.existsSync(videoPath)) {
							fs.unlinkSync(videoPath);
						}
					} catch (e) {
						console.error("File delete error:", e);
					}
				}, event.messageID);
				
			} catch (error) {
				console.error("Error in file processing:", error);
				api.sendMessage("❌ Video send karne mein error aa gaya.", event.threadID, event.messageID);
			}
		});
		
		videoStream.on('error', (error) => {
			console.error("Download error:", error);
			api.sendMessage("❌ Video download nahi ho paya.", event.threadID, event.messageID);
		});
		
		writeStream.on('error', (error) => {
			console.error("Write error:", error);
			api.sendMessage("❌ File save nahi ho payi.", event.threadID, event.messageID);
		});
		
	} catch (error) {
		console.error("Error in downloadAndSendVideo:", error);
		api.sendMessage("❌ Video process nahi ho paya.", event.threadID, event.messageID);
	}
}
