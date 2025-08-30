module.exports.config = {
    name: "groupnamelock",
    version: "1.0.0",
    hasPermssion: 2, // 0: Everyone, 1: Group Admin, 2: Bot Admin Only
    credits: "YourName",
    description: "Lock group name to prevent changes",
    commandCategory: "Admin",
    usages: "[group name to lock]",
    cooldowns: 5,
    dependencies: {}
};

// Global storage for locked group names
global.lockedGroupNames = global.lockedGroupNames || {};

module.exports.run = async function({ api, event, args, Threads }) {
    const { threadID, messageID, senderID } = event;
    
    // Load config for bot admin check
    const fs = require('fs');
    let config = {};
    try {
        config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (err) {
        console.log("Config load error:", err);
    }
    
    // Check if user is bot admin (from config.json)
    const botAdmins = config.ADMINBOT || [];
    const threadInfo = await api.getThreadInfo(threadID);
    const adminIDs = threadInfo.adminIDs.map(admin => admin.id);
    
    // Only bot admin can use this command
    if (!botAdmins.includes(senderID)) {
        return api.sendMessage("❌ Sirf bot admin ye command use kar sakte hain!", threadID, messageID);
    }
    
    if (!args[0]) {
        return api.sendMessage("⚠️ Usage: /groupnamelock [group name]\n\nExample: /groupnamelock Aman ka group", threadID, messageID);
    }
    
    const groupNameToLock = args.join(" ");
    
    // Store the locked name for this group
    global.lockedGroupNames[threadID] = {
        name: groupNameToLock,
        lockedBy: senderID,
        lockedAt: new Date().toISOString()
    };
    
    // Change group name to the locked name
    try {
        await api.setTitle(groupNameToLock, threadID);
        
        return api.sendMessage(
            `🔒 Group name lock ho gaya!\n\n` +
            `📝 Locked Name: "${groupNameToLock}"\n` +
            `👤 Locked by: You\n` +
            `⚡ Ab koi bhi group name change kare toh bot automatically "${groupNameToLock}" wapis rakh dega!`,
            threadID, messageID
        );
    } catch (error) {
        return api.sendMessage("❌ Error: Group name change nahi kar paya. Bot ko admin banao!", threadID, messageID);
    }
};

module.exports.handleEvent = async function({ api, event, Threads }) {
    // Multiple event types for group name changes
    if (event.type !== "log:thread-name" && event.type !== "change_thread_name") return;
    
    const { threadID } = event;
    let newName;
    
    // Get the new name from different event structures
    if (event.logMessageData && event.logMessageData.name) {
        newName = event.logMessageData.name;
    } else if (event.logMessageData && event.logMessageData.thread_name) {
        newName = event.logMessageData.thread_name;
    } else if (event.threadName) {
        newName = event.threadName;
    } else {
        // If we can't get the new name, fetch current thread info
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            newName = threadInfo.threadName || threadInfo.name;
        } catch (err) {
            console.log("Could not get thread name:", err);
            return;
        }
    }
    
    // Check if this group has name lock enabled
    if (!global.lockedGroupNames || !global.lockedGroupNames[threadID]) return;
    
    const lockedData = global.lockedGroupNames[threadID];
    
    // If someone changed the name to something different than locked name
    if (newName !== lockedData.name) {
        try {
            console.log(`Group name changed from "${lockedData.name}" to "${newName}", reverting...`);
            
            // Wait a bit then change back to locked name
            setTimeout(async () => {
                try {
                    await api.setTitle(lockedData.name, threadID);
                    
                    api.sendMessage(
                        `🔒 Group Name Lock Active!\n\n` +
                        `❌ Name change reject kar diya gaya\n` +
                        `📝 Original Name: "${lockedData.name}"\n` +
                        `⚠️ Sirf bot admin "/groupnameunlock" use karke unlock kar sakte hain!`,
                        threadID
                    );
                } catch (setError) {
                    console.log("Error setting title back:", setError);
                    api.sendMessage(
                        `❌ Group name lock active hai lekin bot ke pass admin permission nahi hai!\n` +
                        `Bot ko admin banao ya "/groupnameunlock" use karo.`,
                        threadID
                    );
                }
            }, 3000);
            
        } catch (error) {
            console.log("Group name lock error:", error);
        }
    }
};
