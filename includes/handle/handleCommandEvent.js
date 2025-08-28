module.exports = function ({ api, models, Users, Threads, Currencies }) {
    const logger = require("../../utils/log.js");
    const fs = require("fs");
    const approvalPath = __dirname + "/../../commands/cache/thread.json";

    function loadApproval() {
        if (!fs.existsSync(approvalPath)) return { approved: [], banned: [] };
        return JSON.parse(fs.readFileSync(approvalPath, "utf8"));
    }

    return function ({ event }) {
        const { allowInbox } = global.config;
        const { userBanned, threadBanned } = global.data;
        const { commands, eventRegistered } = global.client;
        var { senderID, threadID } = event;
        senderID = String(senderID);
        threadID = String(threadID);

        // 🔹 Approval check
        const approvalData = loadApproval();
        if (!approvalData.approved.includes(threadID) && !global.config.ADMINBOT.includes(senderID)) {
            return api.sendMessage(
                "⚠️ Ye group abhi approved nahi hai.\n📌 Use command: /approval request\nContact owner for approval.",
                threadID
            );
        }
        if (approvalData.banned.includes(threadID)) {
            return api.sendMessage("⛔ Ye group banned hai. Contact owner.", threadID);
        }

        if (userBanned.has(senderID) || threadBanned.has(threadID) || (allowInbox == false && senderID == threadID)) return;
        for (const eventReg of eventRegistered) {
            const cmd = commands.get(eventReg);
            var getText2;

            if (cmd.languages && typeof cmd.languages == 'object') {
                getText2 = (...values) => {
                    const commandModule = cmd.languages || {};
                    if (!commandModule.hasOwnProperty(global.config.language)) 
                        return api.sendMessage(global.getText('handleCommand','notFoundLanguage', cmd.config.name), threadID, messengeID); 
                    var lang = cmd.languages[global.config.language][values[0]] || '';
                    for (var i = values.length - 1; i >= 0; i--) {
                        const expReg = RegExp('%' + (i + 1), 'g');
                        lang = lang.replace(expReg, values[i]);
                    }
                    return lang;
                };
            } else {
                getText2 = () => {};
            }

            try {
                const Obj = {};
                Obj.event = event;
                Obj.api = api;
                Obj.models = models;
                Obj.Users = Users;
                Obj.Threads = Threads;
                Obj.Currencies = Currencies;
                Obj.getText = getText2;
                if (cmd) cmd.handleEvent(Obj);
            } catch (error) {
                logger(global.getText('handleCommandEvent', 'moduleError', cmd.config.name), 'error');
            }
        }
    };
};
