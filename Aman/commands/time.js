const schedule = require("node-schedule");
const moment = require("moment-timezone");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "time",
    version: "4.0.0",
    hasPermssion: 0,
    credits: "Aman Khan",
    description: "Auto greeting messages with images (Morning, Afternoon, Evening, Night) + manual test",
    commandCategory: "auto",
    usages: "/time [morning|afternoon|evening|night]",
    cooldowns: 3
};

// Yaha apne messages aur image links add karo
const slots = {
    morning: {
        start: 5, end: 11,
        messages: [
            "🌞 Good Morning dosto 🌸\nMuskurate raho aur din shubh ho 💖",
            "🌄 Utho aur chamko ✨\nAaj ka din aapke liye khushiyo bhara ho 💕",
            "🌸 Subah ki fresh hawa ke sath\nEk naye din ka swagat karo 🌞"
        ],
        images: [
            "https://i.supaimg.com/1203ebd8-bd2a-4bb7-834f-37de54abeaa1.jpg",
            "https://i.supaimg.com/3299e971-c119-4da3-81c6-3b9104017439.jpg"
        ]
    },
    afternoon: {
        start: 12, end: 15,
        messages: [
            "☀️ Good Afternoon 💫\nApka din suhana ho 💖",
            "🍵 Lunch time hai 🌸\nThoda relax karo aur enjoy karo 🌞"
        ],
        images: [
            "https://i.supaimg.com/91385289-e617-483a-90d1-0cbda4ee52a0.jpg",
            "https://i.supaimg.com/8ad4f4e7-a0d1-4c0f-8058-9f4fdad6f415.jpg"
        ]
    },
    evening: {
        start: 16, end: 19,
        messages: [
            "🌆 Good Evening ✨\nThakawat bhool jao aur relax karo 💕",
            "🌙 Shaam ke rang bohot pyare hote hain 💫\nAapka mood bhi awesome ho 💖"
        ],
        images: [
            "https://i.supaimg.com/6af85730-035e-4757-9160-f28699d21945.jpg",
            "https://i.supaimg.com/8b8aa117-f247-4629-a06e-870f14510588.jpg"
        ]
    },
    night: {
        start: 20, end: 23,
        messages: [
            "🌙 Good Night 💫\nMeethi neend aaye aur khubsurat sapne 🌸",
            "⭐ Raat ka asmaan bohot sukoon deta hai 🌃\nShubh Ratri 💖"
        ],
        images: [
            "https://i.supaimg.com/64b9916d-c67f-4804-ad58-db93707f1666.jpg",
            "https://i.supaimg.com/5869abe4-c3f8-44cc-9584-38b13a047e5e.jpg"
        ]
    }
};

// Helper function to random pick
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Yeh function message + image bhejta hai
async function sendSlotMessage(api, slot, threadIDs) {
    const now = moment.tz("Asia/Kolkata");
    const text = pickRandom(slots[slot].messages);
    const imgURL = pickRandom(slots[slot].images);

    const msg = `❖ ${text} ❖

📅 Date: ${now.format("DD/MM/YYYY")}
⏰ Time: ${now.format("hh:mm A")}

━━━━━━━━━━━━━━━
𝐁𝐨𝐭 𝐎𝐰𝐧𝐞𝐫 ➜ ❖ 𝐀𝐌𝐀𝐍 ❖`;

    try {
        const imgPath = path.join(__dirname, "cache", `${Date.now()}.jpg`);
        const response = await axios.get(imgURL, { responseType: "stream" });
        const writer = fs.createWriteStream(imgPath);
        response.data.pipe(writer);

        writer.on("finish", () => {
            threadIDs.forEach(threadID => {
                api.sendMessage(
                    { body: msg, attachment: fs.createReadStream(imgPath) },
                    threadID,
                    () => fs.unlinkSync(imgPath) // delete after sending
                );
            });
        });
    } catch (err) {
        console.error("❌ Error sending message:", err);
    }
}

module.exports.onLoad = ({ api }) => {
    console.log("✅ Time auto-message script loaded");

    // Check every 1 minute
    schedule.scheduleJob("*/1 * * * *", async () => {
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

        await sendSlotMessage(api, slot, global.data.allThreadID);
    });
};

// Manual run: /time morning
module.exports.run = async ({ api, event, args }) => {
    const slot = args[0]?.toLowerCase();
    if (!slot || !slots[slot]) {
        return api.sendMessage("❌ Usage: /time [morning|afternoon|evening|night]", event.threadID);
    }

    await sendSlotMessage(api, slot, [event.threadID]);
};
