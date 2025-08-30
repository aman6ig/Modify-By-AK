module.exports.config = {
    name: "groupnamelock",
    version: "1.0.0",
    hasPermssion: 2, // Only Bot Admin
    credits: "Aman",
    description: "Lock group name to prevent changes",
    commandCategory: "Admin",
    usages: "[group name to lock]",
    cooldowns: 5,
    dependencies: {}
};

// Global storage for locked group names
global.lockedGroupNames = global.lockedGroupNames || {};

module.exports.run = async function({ api, event, args }) {
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

// Handle events for name change detection
module.exports.handleEvent = async function({ api, event }) {
    const { threadID } = event;
    
    // Debug log for all events in locked groups
    if (threadID && global.lockedGroupNames && global.lockedGroupNames[threadID]) {
        console.log(`[GroupNameLock] Event in locked group ${threadID}:`, event.type);
    }
    
    // Check multiple event types that indicate group name change
    const validEventTypes = [
        "log:thread-name",
        "change_thread_name", 
        "log:thread-name-change",
        "thread-name",
        "log:subscribe"
    ];
    
    if (!validEventTypes.includes(event.type)) return;
    
    // Check if this group has name lock enabled
    if (!global.lockedGroupNames || !global.lockedGroupNames[threadID]) return;
    
    const lockedData = global.lockedGroupNames[threadID];
    let newName;
    
    // Try to get new name from various event structures
    if (event.logMessageData) {
        newName = event.logMessageData.name || 
                 event.logMessageData.thread_name || 
                 event.logMessageData.threadName;
    } else if (event.threadName) {
        newName = event.threadName;
    } else if (event.name) {
        newName = event.name;
    }
    
    // If we still don't have the name, fetch current thread info
    if (!newName) {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            newName = threadInfo.threadName || threadInfo.name;
        } catch (err) {
            console.log("Could not get thread name:", err);
            return;
        }
    }
    
    console.log(`[GroupNameLock] Detected: "${newName}", Locked: "${lockedData.name}"`);
    
    // If someone changed the name to something different than locked name
    if (newName && newName !== lockedData.name) {
        console.log(`[GroupNameLock] Reverting name change in ${threadID}`);
        
        try {
            // Wait a bit then change back to locked name
            setTimeout(async () => {
                try {
                    await api.setTitle(lockedData.name, threadID);
                    console.log("[GroupNameLock] Successfully reverted group name");
                    
                    api.sendMessage(
                        `🔒 Group Name Lock Active!\n\n` +
                        `❌ Name change reject kar diya gaya\n` +
                        `📝 Locked Name: "${lockedData.name}"\n` +
                        `🔄 Changed From: "${newName}"\n` +
                        `⚠️ Sirf bot admin "/groupnameunlock" use karke unlock kar sakte hain!`,
                        threadID
                    );
                } catch (setError) {
                    console.log("[GroupNameLock] Error setting title back:", setError);
                    api.sendMessage(
                        `❌ Group name lock active hai lekin bot admin nahi hai!\n` +
                        `Bot ko group admin banao ya "/groupnameunlock" use karo.`,
                        threadID
                    );
                }
            }, 2000);
            
        } catch (error) {
            console.log("[GroupNameLock] Error:", error);
        }
    }
};

// Load function with backup checker
module.exports.onLoad = function() {
    console.log("[GroupNameLock] Command loaded successfully!");
    
    // Set up interval to check group names every 15 seconds (backup method)
    if (!global.groupNameChecker) {
        global.groupNameChecker = setInterval(async () => {
            if (!global.lockedGroupNames || !global.api) return;
            
            for (const [threadID, lockedData] of Object.entries(global.lockedGroupNames)) {
                try {
                    // Get current thread info
                    const threadInfo = await global.api.getThreadInfo(threadID);
                    const currentName = threadInfo.threadName || threadInfo.name;
                    
                    if (currentName && currentName !== lockedData.name) {
                        console.log(`[GroupNameLock] Auto-checker detected mismatch in ${threadID}`);
                        
                        // Revert name
                        await global.api.setTitle(lockedData.name, threadID);
                        
                        global.api.sendMessage(
                            `🔒 Group Name Auto-Protected!\n\n` +
                            `📝 Locked Name: "${lockedData.name}"\n` +
                            `⚠️ Automatic protection active!`,
                            threadID
                        );
                    }
                } catch (error) {
                    // Silent error - group might be deleted or bot removed
                    if (error.error === 2 || error.errorCode === 2) {
                        // Group doesn't exist anymore, remove from locked list
                        delete global.lockedGroupNames[threadID];
                        console.log(`[GroupNameLock] Removed deleted group ${threadID} from lock list`);
                    }
                }
            }
        }, 15000); // Check every 15 seconds
        
        console.log("[GroupNameLock] Auto-checker started (15s intervals)");
    }
};
