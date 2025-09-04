const assets = require('@miraipr0ject/assets');
const crypto = require('crypto');
const os = require("os");
const axios = require("axios");
const { createWriteStream } = require('fs');

/**
 * YouTube utility functions for search and download
 * @param {string} query - Search query or video ID
 * @param {string} type - Type of operation (search, getLink)
 * @param {string} format - Format type (video, audio)
 */
module.exports.getYoutube = async function(query, type, format) {
    try {
        if (type === "search") {
            const ytSearch = require("youtube-search-api");
            if (!query) {
                console.log("Missing search query");
                return null;
            }
            const results = await ytSearch.GetListByKeyword(query, false, 6);
            return results.items;
        }
        
        if (type === "getLink") {
            const response = await axios.post("https://aiovideodl.ml/wp-json/aio-dl/video-data/", {
                url: `https://www.youtube.com/watch?v=${query}`
            });
            
            const data = response.data;
            
            if (format === "video") {
                return {
                    title: data.title,
                    duration: data.duration,
                    download: {
                        SD: data.medias[1]?.url,
                        HD: data.medias[2]?.url
                    }
                };
            }
            
            if (format === "audio") {
                return {
                    title: data.title,
                    duration: data.duration,
                    download: data.medias[3]?.url
                };
            }
        }
    } catch (error) {
        console.error("YouTube API Error:", error);
        return null;
    }
};

/**
 * Throw error message with proper prefix
 * @param {string} command - Command name
 * @param {string} threadID - Thread ID
 * @param {string} messageID - Message ID
 */
module.exports.throwError = function (command, threadID, messageID) {
    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    const prefix = threadSetting.hasOwnProperty("PREFIX") ? threadSetting.PREFIX : global.config.PREFIX;
    return global.client.api.sendMessage(
        global.getText("utils", "throwError", prefix, command), 
        threadID, 
        messageID
    );
};

/**
 * Clean HTML tags from Anilist descriptions
 * @param {string} text - HTML text to clean
 */
module.exports.cleanAnilistHTML = function (text) {
    if (!text) return "";
    
    return text
        .replace(/<br>/g, '\n')
        .replace(/<\/?(i|em)>/g, '*')
        .replace(/<\/?b>/g, '**')
        .replace(/~!|!~/g, '||')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
};

/**
 * Download file from URL
 * @param {string} url - File URL
 * @param {string} path - Local path to save
 */
module.exports.downloadFile = async function (url, path) {
    try {
        const response = await axios({
            method: 'GET',
            responseType: 'stream',
            url,
            timeout: 30000
        });

        const writer = createWriteStream(path);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
};

/**
 * Get content from URL
 * @param {string} url - URL to fetch
 */
module.exports.getContent = async function(url) {
    try {
        const response = await axios({
            method: 'GET',
            url,
            timeout: 10000
        });
        return response;
    } catch (error) {
        console.error("Get Content Error:", error.message);
        return null;
    }
};

/**
 * Generate random string
 * @param {number} length - Length of string
 */
module.exports.randomString = function (length = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
};

/**
 * Assets utility for fonts, images, and data
 */
module.exports.assets = {
    async font(name) {
        try {
            if (!assets.font.loaded) await assets.font.load();
            return assets.font.get(name);
        } catch (error) {
            console.error("Font loading error:", error);
            return null;
        }
    },
    
    async image(name) {
        try {
            if (!assets.image.loaded) await assets.image.load();
            return assets.image.get(name);
        } catch (error) {
            console.error("Image loading error:", error);
            return null;
        }
    },
    
    async data(name) {
        try {
            if (!assets.data.loaded) await assets.data.load();
            return assets.data.get(name);
        } catch (error) {
            console.error("Data loading error:", error);
            return null;
        }
    }
};

/**
 * AES encryption/decryption utilities
 */
module.exports.AES = {
    /**
     * Encrypt data using AES-256-CBC
     * @param {string} cryptKey - Encryption key
     * @param {string} cryptIv - Initialization vector
     * @param {string} plainData - Data to encrypt
     */
    encrypt(cryptKey, cryptIv, plainData) {
        try {
            const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(cryptKey), Buffer.from(cryptIv));
            let encrypted = cipher.update(plainData);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            return encrypted.toString('hex');
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    },
    
    /**
     * Decrypt data using AES-256-CBC
     * @param {string} cryptKey - Decryption key
     * @param {string} cryptIv - Initialization vector
     * @param {string} encrypted - Encrypted data
     */
    decrypt(cryptKey, cryptIv, encrypted) {
        try {
            const encryptedData = Buffer.from(encrypted, "hex");
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(cryptKey), Buffer.from(cryptIv, 'binary'));
            let decrypted = decipher.update(encryptedData);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString();
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    },
    
    /**
     * Generate random initialization vector
     */
    makeIv() {
        return Buffer.from(crypto.randomBytes(16)).toString('hex').slice(0, 16);
    }
};

/**
 * Get home directory path and system type
 */
module.exports.homeDir = function () {
    const home = process.env["HOME"];
    const user = process.env["LOGNAME"] || process.env["USER"] || process.env["LNAME"] || process.env["USERNAME"];
    
    let returnHome, typeSystem;

    switch (process.platform) {
        case "win32":
            returnHome = process.env.USERPROFILE || process.env.HOMEDRIVE + process.env.HOMEPATH || home || null;
            typeSystem = "win32";
            break;
            
        case "darwin":
            returnHome = home || (user ? '/Users/' + user : null);
            typeSystem = "darwin";
            break;
            
        case "linux":
            returnHome = home || (process.getuid() === 0 ? '/root' : (user ? '/home/' + user : null));
            typeSystem = "linux";
            break;
            
        default:
            returnHome = home || null;
            typeSystem = "unknown";
            break;
    }

    return [typeof os.homedir === 'function' ? os.homedir() : returnHome, typeSystem];
};

/**
 * Get system information
 */
module.exports.getSystemInfo = function() {
    return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpus: os.cpus().length,
        hostname: os.hostname(),
        type: os.type(),
        release: os.release()
    };
};
