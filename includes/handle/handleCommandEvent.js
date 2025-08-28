// modules/cmds/handleEvent.js
module.exports = function ({ api, models, Users, Threads, Currencies }) {
  const logger = require("../../utils/log.js");
  const fs = require("fs");
  const path = require("path");

  // ===== Approval store (permission.js should write here) =====
  const approvalPath = path.join(__dirname, "/../../commands/cache/thread.json");
  function loadApproval() {
    try {
      if (!fs.existsSync(approvalPath)) return { approved: [], banned: [] };
      const data = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
      if (!data || typeof data !== "object") return { approved: [], banned: [] };
      data.approved ||= [];
      data.banned ||= [];
      return data;
    } catch {
      return { approved: [], banned: [] };
    }
  }

  return function ({ event }) {
    const { allowInbox, ADMINBOT = [] } = global.config;
    const { userBanned, threadBanned } = global.data;
    const { commands, eventRegistered } = global.client;

    let { senderID, threadID, body = "" } = event;
    senderID = String(senderID);
    threadID = String(threadID);

    // ---- hard bans always enforced ----
    if (userBanned.has(senderID) || threadBanned.has(threadID) || (allowInbox === false && senderID === threadID)) {
      if (!ADMINBOT.includes(senderID)) return;
    }

    // ---- approval gate for events: silent skip (NO spam messages) ----
    // Only block events if not approved; don't send any text on normal msgs.
    const approvalData = loadApproval();
    if (
      !approvalData.approved.includes(threadID) &&
      !approvalData.banned.includes(threadID) &&
      !ADMINBOT.includes(senderID)
    ) {
      // Not approved yet -> ignore events quietly
      return;
    }
    if (approvalData.banned.includes(threadID) && !ADMINBOT.includes(senderID)) {
      // Banned -> also ignore quietly
      return;
    }

    // ---- dispatch events to modules that registered handleEvent ----
    for (const eventReg of eventRegistered) {
      const cmd = commands.get(eventReg);
      if (!cmd || typeof cmd.handleEvent !== "function") continue;

      // i18n helper
      let getText2 = () => {};
      if (cmd.languages && typeof cmd.languages === "object") {
        getText2 = (...values) => {
          const commandModule = cmd.languages || {};
          if (!commandModule.hasOwnProperty(global.config.language)) return "";
          let lang = cmd.languages[global.config.language][values[0]] || "";
          for (let i = values.length - 1; i >= 0; i--) {
            const expReg = new RegExp("%" + (i + 1), "g");
            lang = lang.replace(expReg, values[i]);
          }
          return lang;
        };
      }

      try {
        const Obj = {
          event,
          api,
          models,
          Users,
          Threads,
          Currencies,
          getText: getText2,
        };
        cmd.handleEvent(Obj);
      } catch (error) {
        logger(
          global.getText("handleCommandEvent", "moduleError", cmd.config?.name || "unknown"),
          "error"
        );
      }
    }
  };
};
