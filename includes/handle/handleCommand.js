// modules/cmds/handleCommand.js
module.exports = function ({ api, models, Users, Threads, Currencies }) {
  const stringSimilarity = require("string-similarity");
  const logger = require("../../utils/log.js");
  const moment = require("moment-timezone");
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

  // ===== helpers =====
  const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return async function ({ event }) {
    const dateNow = Date.now();
    const time = moment.tz("Asia/Kolkata").format("HH:mm:ss DD/MM/YYYY");

    const {
      allowInbox,
      PREFIX,
      ADMINBOT = [],
      NDH = [],
      DeveloperMode,
    } = global.config;

    const { userBanned, threadBanned, threadInfo, threadData, commandBanned } =
      global.data;

    const { commands, cooldowns } = global.client;

    let { body = "", senderID, threadID, messageID } = event;
    senderID = String(senderID);
    threadID = String(threadID);

    // ---- prefix detection (fast-exit if not a command) ----
    const threadSetting = threadData.get(threadID) || {};
    const usedPrefix = threadSetting.hasOwnProperty("PREFIX")
      ? threadSetting.PREFIX
      : PREFIX;
    const prefixRegex = new RegExp(
      `^(<@!?${escapeRegex(senderID)}>\\s*|${escapeRegex(usedPrefix)})\\s*`,
      "i"
    );
    if (!body || !prefixRegex.test(body)) return; // only process real commands

    // ---- approval gate (only on commands) ----
    const approvalData = loadApproval();
    if (
      !approvalData.approved.includes(threadID) &&
      !ADMINBOT.includes(senderID)
    ) {
      return api.sendMessage(
        "⚠️ Ye group abhi approved nahi hai.\n📌 Command: /approval request\nOwner se contact karein.",
        threadID,
        messageID
      );
    }
    if (approvalData.banned.includes(threadID)) {
      return api.sendMessage("⛔ Ye group banned hai. Contact owner.", threadID, messageID);
    }

    // ---- global ban / inbox policy checks ----
    if (userBanned.has(senderID) || threadBanned.has(threadID) || (allowInbox === false && senderID === threadID)) {
      if (!ADMINBOT.includes(senderID)) {
        if (userBanned.has(senderID)) {
          const { reason, dateAdded } = userBanned.get(senderID) || {};
          return api.sendMessage(
            global.getText("handleCommand", "userBanned", reason, dateAdded),
            threadID,
            async (err, info) => {
              await new Promise((r) => setTimeout(r, 5_000));
              api.unsendMessage(info.messageID);
            },
            messageID
          );
        }
        if (threadBanned.has(threadID)) {
          const { reason, dateAdded } = threadBanned.get(threadID) || {};
          return api.sendMessage(
            global.getText("handleCommand", "threadBanned", reason, dateAdded),
            threadID,
            async (err, info) => {
              await new Promise((r) => setTimeout(r, 5_000));
              api.unsendMessage(info.messageID);
            },
            messageID
          );
        }
      }
    }

    // ---- adminOnly / ndhOnly / adminPaOnly gates ----
    const adminbotCfg = require("./../../config.json");
    if (
      !global.data.allThreadID.includes(threadID) &&
      !ADMINBOT.includes(senderID) &&
      adminbotCfg.adminPaOnly === true
    ) {
      return api.sendMessage(
        "MODE » Sirf admins apne inbox me bot use kar sakte hain.",
        threadID,
        messageID
      );
    }
    if (!ADMINBOT.includes(senderID) && adminbotCfg.adminOnly === true) {
      return api.sendMessage("MODE » Sirf admins bot use kar sakte hain.", threadID, messageID);
    }
    if (!NDH.includes(senderID) && !ADMINBOT.includes(senderID) && adminbotCfg.ndhOnly === true) {
      return api.sendMessage("MODE » Sirf bot support (NDH) use kar sakta hai.", threadID, messageID);
    }

    // ---- adminbox gate (per-thread) ----
    try {
      const dataAdbox = require("../../Aman/commands/cache/data.json");
      const tInfo = threadInfo.get(threadID) || (await Threads.getInfo(threadID));
      const isThreadAdmin = !!tInfo.adminIDs?.find((el) => el.id == senderID);
      if (
        dataAdbox?.adminbox?.[threadID] === true &&
        !ADMINBOT.includes(senderID) &&
        !isThreadAdmin &&
        event.isGroup === true
      ) {
        return api.sendMessage("MODE » Sirf group admins bot use kar sakte hain.", threadID, messageID);
      }
    } catch {
      // ignore missing adminbox file
    }

    // ---- parse command + args ----
    const [matchedPrefix] = body.match(prefixRegex);
    const args = body.slice(matchedPrefix.length).trim().split(/ +/);
    const commandName = (args.shift() || "").toLowerCase();

    // ---- resolve command (with fuzzy fallback) ----
    let command = commands.get(commandName);
    if (!command) {
      const allNames = Array.from(commands.keys());
      const checker = stringSimilarity.findBestMatch(commandName, allNames);
      if (checker.bestMatch.rating >= 0.5) {
        command = commands.get(checker.bestMatch.target);
      } else {
        return api.sendMessage(
          global.getText("handleCommand", "commandNotExist", checker.bestMatch.target),
          threadID,
          messageID
        );
      }
    }

    // ---- per-command ban gates ----
    if (commandBanned.get(threadID) || commandBanned.get(senderID)) {
      if (!ADMINBOT.includes(senderID)) {
        const banThreads = commandBanned.get(threadID) || [];
        const banUsers = commandBanned.get(senderID) || [];
        if (banThreads.includes(command.config.name)) {
          return api.sendMessage(
            global.getText("handleCommand", "commandThreadBanned", command.config.name),
            threadID,
            async (err, info) => {
              await new Promise((r) => setTimeout(r, 5_000));
              api.unsendMessage(info.messageID);
            },
            messageID
          );
        }
        if (banUsers.includes(command.config.name)) {
          return api.sendMessage(
            global.getText("handleCommand", "commandUserBanned", command.config.name),
            threadID,
            async (err, info) => {
              await new Promise((r) => setTimeout(r, 5_000));
              api.unsendMessage(info.messageID);
            },
            messageID
          );
        }
      }
    }

    // ---- NSFW allowlist ----
    if (
      (command.config.commandCategory || "").toLowerCase() === "nsfw" &&
      !global.data.threadAllowNSFW.includes(threadID) &&
      !ADMINBOT.includes(senderID)
    ) {
      return api.sendMessage(
        global.getText("handleCommand", "threadNotAllowNSFW"),
        threadID,
        async (err, info) => {
          await new Promise((r) => setTimeout(r, 5_000));
          api.unsendMessage(info.messageID);
        },
        messageID
      );
    }

    // ---- permission calc (0: user, 1: thread admin, 2: NDH, 3: bot admin) ----
    let permssion = 0;
    try {
      const tInfo2 = threadInfo.get(threadID) || (await Threads.getInfo(threadID));
      const isAdmin = !!tInfo2.adminIDs?.find((el) => el.id == senderID);
      if (ADMINBOT.includes(senderID)) permssion = 3;
      else if (NDH.includes(senderID)) permssion = 2;
      else if (isAdmin) permssion = 1;
    } catch {
      // ignore
    }
    if ((command.config.hasPermssion || 0) > permssion) {
      return api.sendMessage(
        global.getText("handleCommand", "permssionNotEnough", command.config.name),
        threadID,
        messageID
      );
    }

    // ---- cooldowns ----
    if (!cooldowns.has(command.config.name)) cooldowns.set(command.config.name, new Map());
    const timestamps = cooldowns.get(command.config.name);
    const expirationTime = (command.config.cooldowns || 1) * 1000;
    if (timestamps.has(senderID) && dateNow < timestamps.get(senderID) + expirationTime) {
      const wait = ((timestamps.get(senderID) + expirationTime - dateNow) / 1000).toFixed(1);
      return api.sendMessage(
        `⏳ Cooldown: ${wait}s baad dubara try karein.`,
        threadID,
        messageID
      );
    }

    // ---- i18n helper for command modules ----
    let getText2 = () => {};
    if (command.languages && typeof command.languages === "object" && command.languages.hasOwnProperty(global.config.language)) {
      getText2 = (...values) => {
        let lang = command.languages[global.config.language][values[0]] || "";
        for (let i = values.length; i > 0; i--) {
          const expReg = new RegExp("%" + i, "g");
          lang = lang.replace(expReg, values[i]);
        }
        return lang;
      };
    }

    // ---- execute ----
    try {
      const Obj = {
        api,
        event,
        args,
        models,
        Users,
        Threads,
        Currencies,
        permssion,
        getText: getText2,
      };
      await command.run(Obj);
      timestamps.set(senderID, dateNow);

      if (DeveloperMode === true) {
        logger(
          global.getText(
            "handleCommand",
            "executeCommand",
            time,
            command.config?.name || commandName,
            senderID,
            threadID,
            args.join(" "),
            Date.now() - dateNow
          ),
          "[ DEV MODE ]"
        );
      }
    } catch (e) {
      return api.sendMessage(
        global.getText("handleCommand", "commandError", command.config?.name || commandName, e.message || e),
        threadID
      );
    }
  };
};
