const schedule = require("node-schedule");
const moment = require("moment-timezone");
const chalk = require("chalk");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "time",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "Aman Khan",
    description: "auto send messages with images",
    commandCategory: "time reminder",
    usages: "[]",
    cooldowns: 3
};

// Greeting slots with separate text and image lists
const slots = {
    morning: {
        start: 5,
        end: 11,
        texts: [
            "🌞✨ ❖ GOOD MORNING ❖ ✨🌞\n🌸 Rise and shine! Have a beautiful day 💖",
            "🌄 A fresh start to a new day 🌸💫\nSmile and make it beautiful 💕",
            "🌺 Subah ka nasha hai, fresh hawa ke sath enjoy karo 💫"
        ],
        images: [
            "https://i.supaimg.com/1203ebd8-bd2a-4bb7-834f-37de54abeaa1.jpg",
            "https://i.supaimg.com/3299e971-c119-4da3-81c6-3b9104017439.jpg"
        ]
    },
    afternoon: {
        start: 12,
        end: 15,
        texts: [
            "☀️❖ GOOD AFTERNOON ❖☀️\n🌸 May your lunch be tasty and your mood happy 💖",
            "🍵 Relax and recharge 🌞\nGood Afternoon everyone 💫",
            "🌻 Din ke beech me ek chhoti si muskaan, bada sukoon deti hai 💕"
        ],
        images: [
            "https://i.supaimg.com/91385289-e617-483a-90d1-0cbda4ee52a0.jpg",
            "https://i.supaimg.com/8ad4f4e7-a0d1-4c0f-8058-9f4fdad6f415.jpg"
        ]
    },
    evening: {
        start: 16,
        end: 19,
        texts: [
            "🌆❖ GOOD EVENING ❖🌆\n🌸 Time to relax and smile 💕",
            "✨ Evening vibes are the best 🌙\nStay happy and calm 💖",
            "🌹 Shaam ke rang aur dosto ki baatein, dono sukoon dete hain 🌸"
        ],
        images: [
            "https://i.supaimg.com/8b8aa117-f247-4629-a06e-870f14510588.jpg",
            "https://i.supaimg.com/6af85730-035e-4757-9160-f28699d21945.jpg"
        ]
    },
    night: {
        start: 20,
        end: 23,
        texts: [
            "🌙❖ GOOD NIGHT ❖🌙\n💫 Sweet dreams, sleep tight 💖",
            "⭐ Raat ka sukoon sabse pyara hota hai 🌃\nShubh Ratri 🌸",
            "🌌 Chandni raat aur thodi si dua, aapki neend ko suhana banaye 💕"
        ],
        images: [
            "https://i.supaimg.com/64b9916d-c67f-4804-ad58-db93707f1666.jpg",
            "https://i.supaimg.com/5869abe4-c3f8-44cc-9584-38b13a047e5e.jpg"
        ]
    }
};

// Random pick function
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

module.exports.onLoad = ({ api }) => {
    console.log(chalk.bold.hex("#00c300")("============ TIME SCRIPT LOADED SUCCESSFULLY ============"));

    schedule.scheduleJob("*/1 * * * *", async () => { // every minute check
        const now = moment.tz("Asia/Kolkata");
        const hour = now.hour();

        let slot = null;
        for (const [key, value] of Object.entries(slots)) {
            if (hour >= value.start && hour <= value.end) {
                slot = key;
                break;
            }
        }
        if (!slot) return;

        // Random message + image
        const text = pickRandom(slots[slot].texts);
        const imgURL = pickRandom(slots[slot].images);

        const dateStr = now.format("DD/MM/YYYY");
        const timeStr = now.format("hh:mm A");

        const msg = `[
╔════════════════════════╗
${text}
╚════════════════════════╝

╔═════ 🌸 𝐓𝐈𝐌𝐄 & 𝐃𝐀𝐓𝐄 🌸 ═════╗
📅 Date : ${dateStr}
⏰ Time : ${timeStr}
╚════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━
I Love My India 🇮🇳
━━━━━━━━━━━━━━━━━━━━━

*★᭄𝐎𝐰𝐧𝐞𝐫 𝐀 𝐊 ⚔️⏤͟͟͞͞★*
]`;

        try {
            const imgPath = path.join(__dirname, "cache", `${Date.now()}.jpg`);
            const writer = fs.createWriteStream(imgPath);
            const response = await axios.get(imgURL, { responseType: "stream" });
            response.data.pipe(writer);

            writer.on("finish", () => {
                global.data.allThreadID.forEach(threadID => {
                    api.sendMessage(
                        {
                            body: msg,
                            attachment: fs.createReadStream(imgPath)
                        },
                        threadID,
                        (err) => {
                            if (err) console.error(`❌ Failed in ${threadID}`, err);
                            fs.unlinkSync(imgPath);
                        }
                    );
                });
            });
        } catch (err) {
            console.error("Image fetch error:", err);
        }
    });
};

module.exports.run = () => {};
