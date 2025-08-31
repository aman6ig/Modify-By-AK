module.exports.config = {
    name: "grouplock",
    version: "3.0.0",
    hasPermssion: 2, // Only Bot Admin
    credits: "Aman",
    description: "Complete group protection - lock name, member names & DP",
    commandCategory: "Admin",
    usages: "[name/members/dp/all] [value]",
    cooldowns: 5,
    dependencies: {}
};

// Global storage for all locks
global.groupLocks = global.groupLocks || {};

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
    
    // Check if user is bot admin
    const botAdmins = config.ADMINBOT || [];
    if (!botAdmins.includes(senderID)) {
        return api.sendMessage("❌ Sirf bot admin ye command use kar sakte hain!", threadID, messageID);
    }
    
    if (!args[0]) {
        return api.sendMessage(
            `🔒 **Group Protection System** 🔒\n\n` +
            `📋 **Usage:**\n` +
            `• /grouplock name [group name] - Lock group name\n` +
            `• /grouplock members - Lock all member names\n` +
            `• /grouplock dp - Lock group display picture\n` +
            `• /grouplock all [group name] - Lock everything\n` +
            `• /grouplock status - Check lock status\n` +
            `• /grouplock unlock [type/all] - Unlock specific or all\n\n` +
            `📝 **Examples:**\n` +
            `/grouplock name Aman ka Group\n` +
            `/grouplock members\n` +
            `/grouplock dp\n` +
            `/grouplock all My Protected Group`,
            threadID, messageID
        );
    }

    const command = args[0].toLowerCase();
    
    // Initialize group locks if not exists
    if (!global.groupLocks[threadID]) {
        global.groupLocks[threadID] = {
            name: null,
            members: null,
            dp: null,
            lockedBy: senderID,
            lockedAt: new Date().toISOString()
        };
    }

    switch (command) {
        case 'name':
            if (!args[1]) {
                return api.sendMessage("⚠️ Group name specify karo!\nExample: /grouplock name Aman ka Group", threadID, messageID);
            }
            
            const groupName = args.slice(1).join(" ");
            global.groupLocks[threadID].name = groupName;
            
            try {
                await api.setTitle(groupName, threadID);
                return api.sendMessage(
                    `🔒 **Group Name Locked!**\n\n` +
                    `📝 Locked Name: "${groupName}"\n` +
                    `👤 Locked by: You\n` +
                    `⚡ Ab koi bhi name change karega toh automatic revert ho jayega!`,
                    threadID, messageID
                );
            } catch (error) {
                return api.sendMessage("❌ Error: Bot ko admin banao pehle!", threadID, messageID);
            }

        case 'members':
            try {
                const threadInfo = await api.getThreadInfo(threadID);
                const memberNames = {};
                
                threadInfo.participantIDs.forEach(userID => {
                    const userInfo = threadInfo.userInfo.find(u => u.id === userID);
                    if (userInfo) {
                        memberNames[userID] = userInfo.name;
                    }
                });
                
                global.groupLocks[threadID].members = memberNames;
                
                return api.sendMessage(
                    `🔒 **Member Names Locked!**\n\n` +
                    `👥 Total Members: ${Object.keys(memberNames).length}\n` +
                    `⚡ Ab koi bhi member apna name change karega toh automatic revert ho jayega!\n` +
                    `📋 Note: Sirf current members ke names lock hue hain`,
                    threadID, messageID
                );
                
            } catch (error) {
                return api.sendMessage("❌ Error: Member names fetch nahi kar paya!", threadID, messageID);
            }

        case 'dp':
            try {
                const threadInfo = await api.getThreadInfo(threadID);
                const currentImage = threadInfo.imageSrc || threadInfo.image;
                
                if (!currentImage) {
                    return api.sendMessage("⚠️ Group me koi DP nahi hai! Pehle DP set karo phir lock karo.", threadID, messageID);
                }
                
                global.groupLocks[threadID].dp = currentImage;
                
                return api.sendMessage(
                    `🔒 **Group DP Locked!**\n\n` +
                    `🖼️ Current DP locked successfully\n` +
                    `⚡ Ab koi bhi DP change karega toh detection hoga aur notification milega!`,
                    threadID, messageID
                );
                
            } catch (error) {
                return api.sendMessage("❌ Error: DP lock nahi kar paya!", threadID, messageID);
            }

        case 'all':
            if (!args[1]) {
                return api.sendMessage("⚠️ Group name specify karo!\nExample: /grouplock all My Protected Group", threadID, messageID);
            }
            
            const allGroupName = args.slice(1).join(" ");
            
            try {
                // Lock name
                global.groupLocks[threadID].name = allGroupName;
                await api.setTitle(allGroupName, threadID);
                
                // Lock members
                const threadInfo = await api.getThreadInfo(threadID);
                const memberNames = {};
                
                threadInfo.participantIDs.forEach(userID => {
                    const userInfo = threadInfo.userInfo.find(u => u.id === userID);
                    if (userInfo) {
                        memberNames[userID] = userInfo.name;
                    }
                });
                global.groupLocks[threadID].members = memberNames;
                
                // Lock DP
                const currentImage = threadInfo.imageSrc || threadInfo.image;
                if (currentImage) {
                    global.groupLocks[threadID].dp = currentImage;
                }
                
                return api.sendMessage(
                    `🔒 **COMPLETE GROUP PROTECTION ACTIVATED!**\n\n` +
                    `📝 Group Name: "${allGroupName}" ✅\n` +
                    `👥 Member Names: ${Object.keys(memberNames).length} locked ✅\n` +
                    `🖼️ Group DP: ${currentImage ? 'Locked ✅' : 'No DP ❌'}\n\n` +
                    `⚡ Ab ye group completely protected hai!`,
                    threadID, messageID
                );
                
            } catch (error) {
                return api.sendMessage("❌ Error: Complete protection setup nahi kar paya!", threadID, messageID);
            }

        case 'status':
            const locks = global.groupLocks[threadID];
            if (!locks || (!locks.name && !locks.members && !locks.dp)) {
                return api.sendMessage("ℹ️ Is group me koi lock active nahi hai!", threadID, messageID);
            }
            
            let status = `🔒 **Group Lock Status**\n\n`;
            status += `📝 Name Lock: ${locks.name ? `✅ "${locks.name}"` : '❌ Not Active'}\n`;
            status += `👥 Members Lock: ${locks.members ? `✅ ${Object.keys(locks.members).length} members` : '❌ Not Active'}\n`;
            status += `🖼️ DP Lock: ${locks.dp ? '✅ Active' : '❌ Not Active'}\n\n`;
            status += `📅 Locked At: ${new Date(locks.lockedAt).toLocaleString('hi-IN')}`;
            
            return api.sendMessage(status, threadID, messageID);

        case 'unlock':
            if (!args[1]) {
                return api.sendMessage(
                    "⚠️ Kya unlock karna hai specify karo!\n\n" +
                    "• /grouplock unlock name\n" +
                    "• /grouplock unlock members\n" +
                    "• /grouplock unlock dp\n" +
                    "• /grouplock unlock all",
                    threadID, messageID
                );
            }
            
            const unlockType = args[1].toLowerCase();
            const currentLocks = global.groupLocks[threadID];
            
            if (!currentLocks) {
                return api.sendMessage("ℹ️ Koi lock active nahi hai!", threadID, messageID);
            }
            
            switch (unlockType) {
                case 'name':
                    global.groupLocks[threadID].name = null;
                    return api.sendMessage("🔓 Group name lock remove ho gaya!", threadID, messageID);
                
                case 'members':
                    global.groupLocks[threadID].members = null;
                    return api.sendMessage("🔓 Member names lock remove ho gaya!", threadID, messageID);
                
                case 'dp':
                    global.groupLocks[threadID].dp = null;
                    return api.sendMessage("🔓 Group DP lock remove ho gaya!", threadID, messageID);
                
                case 'all':
                    delete global.groupLocks[threadID];
                    return api.sendMessage("🔓 Saare locks remove ho gaye! Group ab unprotected hai.", threadID, messageID);
                
                default:
                    return api.sendMessage("❌ Invalid unlock type! Use: name/members/dp/all", threadID, messageID);
            }

        default:
            return api.sendMessage("❌ Invalid command! Use /grouplock without arguments to see usage.", threadID, messageID);
    }
};

// Enhanced event handler with better detection
module.exports.handleEvent = async function({ api, event }) {
    const { threadID, senderID, type, logMessageData } = event;
    
    if (!global.groupLocks || !global.groupLocks[threadID]) return;
    
    const locks = global.groupLocks[threadID];
    
    console.log(`[GroupLock] Event detected: ${type} in thread ${threadID}`);
    
    try {
        // Handle group name changes - ENHANCED
        const nameChangeEvents = [
            "log:thread-name",
            "change_thread_name", 
            "log:thread-name-change",
            "thread-name"
        ];
        
        if (nameChangeEvents.includes(type) && locks.name) {
            console.log("[GroupLock] Group name change detected!");
            
            let newName;
            
            // Multiple ways to get new name
            if (logMessageData) {
                newName = logMessageData.name || 
                         logMessageData.thread_name || 
                         logMessageData.threadName ||
                         logMessageData.title;
            } else if (event.threadName) {
                newName = event.threadName;
            } else if (event.name) {
                newName = event.name;
            }
            
            // Fallback: fetch current name
            if (!newName) {
                try {
                    const threadInfo = await api.getThreadInfo(threadID);
                    newName = threadInfo.threadName || threadInfo.name;
                } catch (err) {
                    console.log("[GroupLock] Error fetching thread info:", err);
                    return;
                }
            }
            
            console.log(`[GroupLock] New name: "${newName}", Locked name: "${locks.name}"`);
            
            if (newName && newName !== locks.name) {
                console.log("[GroupLock] Names don't match - reverting!");
                
                setTimeout(async () => {
                    try {
                        await api.setTitle(locks.name, threadID);
                        api.sendMessage(
                            `🔒 **Group Name Protected!**\n\n` +
                            `❌ Name change rejected\n` +
                            `📝 Locked Name: "${locks.name}"\n` +
                            `🔄 Attempted: "${newName}"\n` +
                            `👤 Changed by: User`,
                            threadID
                        );
                        console.log("[GroupLock] Name successfully reverted!");
                    } catch (error) {
                        console.log("[GroupLock] Name revert error:", error);
                        api.sendMessage(
                            `⚠️ Group name lock active but cannot revert!\n` +
                            `Bot ko admin permission do.`,
                            threadID
                        );
                    }
                }, 3000); // Increased delay for better reliability
            }
        }
        
        // Handle member name changes - ENHANCED
        const memberNameEvents = [
            "log:user-nickname",
            "change_user_nickname",
            "log:thread-name"
        ];
        
        if (memberNameEvents.includes(type) && locks.members) {
            console.log("[GroupLock] Member nickname change detected!");
            
            let changedUserID, newNickname;
            
            // Enhanced detection for member changes
            if (logMessageData) {
                changedUserID = logMessageData.participant_id || 
                               logMessageData.target_id ||
                               logMessageData.user_id ||
                               logMessageData.author_id ||
                               senderID; // Fallback to sender
                               
                newNickname = logMessageData.nickname || 
                             logMessageData.name ||
                             logMessageData.participant_name ||
                             logMessageData.thread_name;
            }
            
            // If still no user ID, check if sender changed their own name
            if (!changedUserID && locks.members[senderID]) {
                changedUserID = senderID;
            }
            
            console.log(`[GroupLock] Changed user: ${changedUserID}, New nickname: "${newNickname}"`);
            
            if (changedUserID && locks.members[changedUserID]) {
                const originalName = locks.members[changedUserID];
                
                // Get current name if not provided
                if (!newNickname) {
                    try {
                        const threadInfo = await api.getThreadInfo(threadID);
                        const userInfo = threadInfo.userInfo.find(u => u.id === changedUserID);
                        if (userInfo) {
                            newNickname = userInfo.name;
                        }
                    } catch (err) {
                        console.log("[GroupLock] Error getting user info:", err);
                        return;
                    }
                }
                
                console.log(`[GroupLock] Comparing: "${newNickname}" vs "${originalName}"`);
                
                if (newNickname && newNickname !== originalName) {
                    console.log("[GroupLock] Member name changed - reverting!");
                    
                    setTimeout(async () => {
                        try {
                            await api.changeNickname(originalName, threadID, changedUserID);
                            api.sendMessage(
                                `🔒 **Member Name Protected!**\n\n` +
                                `❌ Nickname change rejected\n` +
                                `👤 Original Name: "${originalName}"\n` +
                                `🔄 Attempted: "${newNickname}"\n` +
                                `🔒 Member names are locked in this group!`,
                                threadID
                            );
                            console.log("[GroupLock] Nickname successfully reverted!");
                        } catch (error) {
                            console.log("[GroupLock] Nickname revert error:", error);
                            api.sendMessage(
                                `⚠️ Member name lock active but cannot revert!\n` +
                                `Bot ko admin permission do ya member manually restore kare.`,
                                threadID
                            );
                        }
                    }, 3000); // Increased delay
                }
            }
        }
        
        // Handle DP changes - ENHANCED
        const dpChangeEvents = [
            "log:thread-image",
            "change_thread_image",
            "log:thread-icon",
            "log:thread-color"
        ];
        
        if (dpChangeEvents.includes(type) && locks.dp) {
            console.log("[GroupLock] Group DP change detected!");
            
            let newImageSrc;
            
            if (logMessageData) {
                newImageSrc = logMessageData.url || 
                             logMessageData.image || 
                             logMessageData.thread_image ||
                             logMessageData.image_src ||
                             logMessageData.attachment_url;
            }
            
            console.log(`[GroupLock] DP change detected: ${newImageSrc ? 'New image' : 'Image removed'}`);
            
            setTimeout(async () => {
                try {
                    api.sendMessage(
                        `🔒 **Group DP Protected!**\n\n` +
                        `❌ DP change detected!\n` +
                        `🖼️ Original DP was locked by admin\n` +
                        `⚠️ Please restore original DP manually\n` +
                        `📋 Bot cannot automatically revert DP changes\n` +
                        `🔄 Use /grouplock unlock dp to remove DP lock`,
                        threadID
                    );
                    console.log("[GroupLock] DP change notification sent!");
                } catch (error) {
                    console.log("[GroupLock] DP notification error:", error);
                }
            }, 2000);
        }
        
    } catch (error) {
        console.log("[GroupLock] Event handler error:", error);
    }
};

// Enhanced load function with better auto-protection
module.exports.onLoad = function() {
    console.log("[GroupLock] Complete Group Protection System v3.0 loaded!");
    
    // Enhanced auto-checker with better error handling
    if (!global.groupLockChecker) {
        global.groupLockChecker = setInterval(async () => {
            if (!global.groupLocks || !global.api) return;
            
            console.log(`[GroupLock] Auto-checker running... ${Object.keys(global.groupLocks).length} groups`);
            
            for (const [threadID, locks] of Object.entries(global.groupLocks)) {
                try {
                    const threadInfo = await global.api.getThreadInfo(threadID);
                    
                    // Check name lock with enhanced detection
                    if (locks.name) {
                        const currentName = threadInfo.threadName || threadInfo.name;
                        if (currentName && currentName !== locks.name) {
                            console.log(`[GroupLock] Auto-correcting group name in ${threadID}`);
                            
                            try {
                                await global.api.setTitle(locks.name, threadID);
                                global.api.sendMessage(
                                    `🔒 **Auto-Protected Group Name**\n` +
                                    `📝 Restored: "${locks.name}"\n` +
                                    `⚡ Automatic protection active!`,
                                    threadID
                                );
                            } catch (setError) {
                                console.log(`[Gro
