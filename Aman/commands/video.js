module.exports.config = {
	name: "video",
	version: "1.0.0",
	hasPermssion: 0,
	credits: "Aman Khan",
	description: "Download YouTube videos from search",
	commandCategory: "media",
	usages: "[video name]",
	cooldowns: 5,
	dependencies: {
		"axios": "",
		"yt-search": ""
	}
};

const axios = global.nodemodule["axios"];
const ytSearch = global.nodemodule["yt-search"];
const fs = global.nodemodule["fs-extra"];
const path = global.nodemodule["path"];

module.exports.run = async function({ api, event, args }) {
	const videoName = args.join(" ");
	
	if (!videoName) {
		return api.sendMessage("❌ Koi video ka naam dalo bhai...\nExample: .video Saiyara Song", event.threadID, event.messageID);
	}

	try {
		// Processing message
		const processingMessage = await api.sendMessage("✅ Video search kar raha hoon...", event.threadID, event.messageID);

		// Search for the video on YouTube
		const searchResults = await ytSearch(videoName);
		
		if (!searchResults.videos || searchResults.videos.length === 0) {
			api.unsendMessage(processingMessage.messageID);
			return api.sendMessage("❌ Koi video nahi mila bhai...", event.threadID, event.messageID);
		}

		// Get top 5 results
		const videos = searchResults.videos.slice(0, 5);
		const links = videos.map(video => video.url);
		const titles = videos.map((video, index) => `${index + 1}. ${video.title} (${video.timestamp})`);
		
		api.unsendMessage(processingMessage.messageID);
		
		api.sendMessage(`🎬 Results for "${videoName}":\n\n${titles.join('\n')}\n\nReply with number (1-5) to download`, event.threadID, (error, info) => {
			global.client.handleReply.push({
				name: this.config.name,
				messageID: info.messageID,
				author: event.senderID,
				link: links
			});
		});
		
	} catch (error) {
		console.error("Search Error:", error);
		api.sendMessage("❌ Search mein error aa gaya bhai.", event.threadID, event.messageID);
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
		
		api.sendMessage(`⬇️ Downloading video...`, event.threadID, (err, info) => {
			setTimeout(() => { api.unsendMessage(info.messageID) }, 15000);
		});
		
		await downloadAndSendVideo(api, event, videoUrl);
	} catch (error) {
		console.error("Download Error:", error);
		api.sendMessage("❌ Video download nahi ho paya.", event.threadID, event.messageID);
	}
};

async function downloadAndSendVideo(api, event, url) {
	try {
		const apiKey = "priyansh-here";
		const apiUrl = `https://priyanshu-ai.onrender.com/youtube?id=${getVideoId(url)}&type=video&apikey=${apiKey}`;

		// Get download URL from API
		const downloadResponse = await axios.get(apiUrl);
		const downloadUrl = downloadResponse.data.downloadUrl;

		// Set request headers
		const headers = {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
			'Accept': '*/*',
			'Accept-Encoding': 'gzip, deflate, br',
			'Referer': 'https://cnvmp3.com/',
		};

		const response = await axios({
			method: 'GET',
			url: downloadUrl,
			headers: headers,
			responseType: 'stream'
		});

		const videoPath = path.join(__dirname, 'cache', `video_${Date.now()}.mp4`);
		
		// Cache folder banayein
		if (!fs.existsSync(path.join(__dirname, 'cache'))) {
			fs.mkdirSync(path.join(__dirname, 'cache'));
		}

		const writer = fs.createWriteStream(videoPath);
		response.data.pipe(writer);

		writer.on('finish', async () => {
			try {
				const stats = fs.statSync(videoPath);
				const fileSize = stats.size;
				
				// 25MB limit
				if (fileSize > 25 * 1024 * 1024) {
					fs.unlinkSync(videoPath);
					return api.sendMessage("❌ Video file bahut bada hai (max 25MB).", event.threadID, event.messageID);
				}

				api.sendMessage({
					body: `🎬 Video Downloaded Successfully!\n\n✅ By Aman Khan`,
					attachment: fs.createReadStream(videoPath)
				}, event.threadID, () => {
					// Clean up
					try {
						if (fs.existsSync(videoPath)) {
							fs.unlinkSync(videoPath);
						}
					} catch (e) {
						console.error("File delete error:", e);
					}
				}, event.messageID);
				
			} catch (error) {
				console.error("File Processing Error:", error);
				api.sendMessage("❌ Video send karne mein error aa gaya.", event.threadID, event.messageID);
			}
		});

		writer.on('error', (error) => {
			console.error("Write Error:", error);
			api.sendMessage("❌ File save nahi ho payi.", event.threadID, event.messageID);
		});
		
	} catch (error) {
		console.error("Download Function Error:", error);
		api.sendMessage("❌ Video download process mein error aa gaya.", event.threadID, event.messageID);
	}
}

// YouTube URL se video ID nikalne ke liye
function getVideoId(url) {
	const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
	return match ? match[1] : null;
}
