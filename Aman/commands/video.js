module.exports.config = {
	name: "video",
	version: "1.0.0",
	hasPermssion: 0,
	credits: "Aman Khan",
	description: "YouTube se video search karo aur download karo",
	commandCategory: "media",
	usages: "video [song name]",
	cooldowns: 10,
	dependencies: {
		"ytdl-core": "",
		"fs-extra": "",
		"axios": "",
		"yt-search": ""
	}
};

const ytdl = global.nodemodule["ytdl-core"];
const fs = global.nodemodule["fs-extra"];
const path = global.nodemodule["path"];
const yts = global.nodemodule["yt-search"];

module.exports.run = async function({ api, event, args }) {
	const keyword = args.join(" ");
	
	if (!keyword) {
		return api.sendMessage("❌ Koi song name dalo bhai...\nExample: .video Saiyara Song", event.threadID, event.messageID);
	}
	
	try {
		api.sendMessage(`🔍 Searching "${keyword}" on YouTube...`, event.threadID, (err, info) => {
			setTimeout(() => { api.unsendMessage(info.messageID) }, 5000);
		});

		// yt-search package use karte hain
		const searchResults = await yts(keyword);
		
		if (!searchResults.videos || searchResults.videos.length === 0) {
			return api.sendMessage("❌ Koi video nahi mila bhai...", event.threadID, event.messageID);
		}
		
		const videos = searchResults.videos.slice(0, 5);
		const links = videos.map(video => video.url);
		const titles = videos.map((video, index) => `${index + 1}. ${video.title} (${video.timestamp})`);
		
		api.sendMessage(`🎬 Results for "${keyword}":\n\n${titles.join('\n')}\n\nReply with number (1-5) to download`, event.threadID, (error, info) => {
			global.client.handleReply.push({
				name: this.config.name,
				messageID: info.messageID,
				author: event.senderID,
				link: links
			});
		});
		
	} catch (error) {
		console.error("Error:", error);
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
			setTimeout(() => { api.unsendMessage(info.messageID) }, 15000);
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
		
		// 15 minutes tak ka video allow karte hain
		if (videoDuration > 900) {
			return api.sendMessage("❌ Video bahut lamba hai (max 15 minutes).", event.threadID, event.messageID);
		}
		
		const videoPath = path.join(__dirname, 'cache', `video_${Date.now()}.mp4`);
		
		// Cache folder banayein agar nahi hai toh
		if (!fs.existsSync(path.join(__dirname, 'cache'))) {
			fs.mkdirSync(path.join(__dirname, 'cache'));
		}
		
		// Better quality settings - 720p tak
		const videoStream = ytdl(url, {
			quality: 'highest',
			filter: format => {
				return format.container === 'mp4' && 
					   format.hasVideo && 
					   format.hasAudio && 
					   parseInt(format.qualityLabel) <= 720;
			}
		});
		
		const writeStream = fs.createWriteStream(videoPath);
		
		videoStream.pipe(writeStream);
		
		writeStream.on('finish', async () => {
			try {
				const stats = fs.statSync(videoPath);
				const fileSize = stats.size;
				
				// 50MB tak allow karte hain
				if (fileSize > 50 * 1024 * 1024) {
					fs.unlinkSync(videoPath);
					return api.sendMessage("❌ Video file bahut bada hai (max 50MB).", event.threadID, event.messageID);
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
