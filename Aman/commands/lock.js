module.exports.config = {
    name: "groupnamelock",
    version: "1.0.0",
    hasPermssion: 1, // 0: Everyone, 1: Admin, 2: Bot Admin
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
    const { participantIDs } = await api.getThreadInfo(threadID);
    
    // Check if user is admin
    const threadInfo = await api.getThreadInfo(threadID);
    const adminIDs = threadInfo.adminIDs.map(admin => admin.id);
    
    if (!adminIDs.includes(senderID) && !global.config.ADMINBOT.includes(senderID)) {
        return api.sendMessage("❌ Sirf group admin ya bot admin ye command use kar sakte hain!", threadID, messageID);
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
    if (event.type !== "log:thread-name") return;
    
    const { threadID, logMessageData } = event;
    
    // Check if this group has name lock enabled
    if (!global.lockedGroupNames[threadID]) return;
    
    const lockedData = global.lockedGroupNames[threadID];
    const newName = logMessageData.name;
    
    // If someone changed the name to something different than locked name
    if (newName !== lockedData.name) {
        try {
            // Wait a bit then change back to locked name
            setTimeout(async () => {
                await api.setTitle(lockedData.name, threadID);
                
                api.sendMessage(
                    `🔒 Group Name Lock Active!\n\n` +
                    `❌ Name change reject kar diya gaya\n` +
                    `📝 Original Name: "${lockedData.name}"\n` +
                    `⚠️ Sirf admin "/groupnameunlock" use karke unlock kar sakte hain!`,
                    threadID
                );
            }, 2000);
            
        } catch (error) {
            console.log("Group name lock error:", error);
        }
    }
};
