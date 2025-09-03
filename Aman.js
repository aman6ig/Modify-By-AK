require("dotenv").config(); // Load .env first
const moment = require("moment-timezone");
const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { join, resolve } = require("path");
const logger = require("./utils/log.js");
const login = require("fca-priyansh");
const listPackage = JSON.parse(readFileSync("./package.json")).dependencies;
const listbuiltinModules = require("module").builtinModules;

////////////////////////////////////////////////////////////
//========= Global Client & Data =========================//
////////////////////////////////////////////////////////////

global.client = {
  commands: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  eventRegistered: [],
  handleSchedule: [],
  handleReaction: [],
  handleReply: [],
  mainPath: process.cwd(),
  configPath: "",
  getTime: function (option) {
    const tz = "Asia/Kolkata";
    switch (option) {
      case "seconds": return moment.tz(tz).format("ss");
      case "minutes": return moment.tz(tz).format("mm");
      case "hours": return moment.tz(tz).format("HH");
      case "date": return moment.tz(tz).format("DD");
      case "month": return moment.tz(tz).format("MM");
      case "year": return moment.tz(tz).format("YYYY");
      case "fullHour": return moment.tz(tz).format("HH:mm:ss");
      case "fullYear": return moment.tz(tz).format("DD/MM/YYYY");
      case "fullTime": return moment.tz(tz).format("HH:mm:ss DD/MM/YYYY");
    }
  }
};

global.data = {
  threadInfo: new Map(),
  threadData: new Map(),
  userName: new Map(),
  userBanned: new Map(),
  threadBanned: new Map(),
  commandBanned: new Map(),
  threadAllowNSFW: [],
  allUserID: [],
  allCurrenciesID: [],
  allThreadID: [],
  groupNameLock: new Map(),
  groupDpLock: new Map(),
  memberNameLock: new Map()
};

global.utils = require("./utils/index.js");
global.nodemodule = {};
global.config = {};
global.configModule = {};
global.moduleData = [];
global.language = {};

////////////////////////////////////////////////////////////
//========= Config Loader with .env Injection ============//
////////////////////////////////////////////////////////////

try {
  global.client.configPath = join(global.client.mainPath, "config.json");
  let configValue = require(global.client.configPath);

  // Inject .env values
  function injectEnv(obj, parentKey = "") {
    for (const key in obj) {
      const fullKey = (parentKey ? parentKey + "_" : "") + key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        injectEnv(obj[key], fullKey);
      } else {
        const envKey = fullKey.toUpperCase();
        if (process.env[envKey]) {
          obj[key] = process.env[envKey];
        }
      }
    }
  }
  injectEnv(configValue);

  // ✅ Ensure arrays exist
  if (!Array.isArray(configValue.commandDisabled)) configValue.commandDisabled = [];
  if (!Array.isArray(configValue.eventDisabled)) configValue.eventDisabled = [];

  global.config = configValue;
  writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), "utf8");
  logger.loader("Config Loaded with .env support!");
} catch (err) {
  logger.loader("config.json not found!", "error");
  process.exit(1);
}

////////////////////////////////////////////////////////////
//========= Load Language ================================//
////////////////////////////////////////////////////////////

try {
  const langFile = readFileSync(
    `${__dirname}/languages/${global.config.language || "en"}.lang`,
    { encoding: "utf-8" }
  ).split(/\r?\n|\r/);

  const langData = langFile.filter(item => item.indexOf("#") != 0 && item != "");
  for (const item of langData) {
    const getSeparator = item.indexOf("=");
    const itemKey = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1);
    const head = itemKey.slice(0, itemKey.indexOf("."));
    const key = itemKey.replace(head + ".", "");
    const value = itemValue.replace(/\\n/gi, "\n");
    if (typeof global.language[head] == "undefined") global.language[head] = {};
    global.language[head][key] = value;
  }
} catch (err) {
  logger.loader("Language load failed, defaulting to en", "warn");
}

global.getText = function (...args) {
  const langText = global.language;
  if (!langText.hasOwnProperty(args[0])) {
    return `Missing language key: ${args[0]}.${args[1]}`;
  }
  var text = langText[args[0]][args[1]] || `Missing text: ${args[0]}.${args[1]}`;
  for (var i = args.length - 1; i > 0; i--) {
    const regEx = RegExp(`%${i}`, "g");
    text = text.replace(regEx, args[i + 1]);
  }
  return text;
};

////////////////////////////////////////////////////////////
//========= Appstate Load ================================//
////////////////////////////////////////////////////////////

let appState = [];
let appStateFile;
try {
  appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
  appState = require(appStateFile);
  logger.loader("Found appstate file");
} catch {
  logger.loader("AppState not found, continuing with empty state", "warn");
}

////////////////////////////////////////////////////////////
//========= Bot Startup =================================//
////////////////////////////////////////////////////////////

function onBot({ models: botModel }) {
  login({ appState }, async (loginError, loginApiData) => {
    if (loginError) return logger(JSON.stringify(loginError), "ERROR");

    if (global.config.FCAOption) loginApiData.setOptions(global.config.FCAOption);
    if (appStateFile) writeFileSync(appStateFile, JSON.stringify(loginApiData.getAppState(), null, "\t"));

    global.client.api = loginApiData;
    global.api = loginApiData;
    logger.loader("✅ Global API access enabled");

    global.config.version = "1.2.14";
    global.client.timeStart = Date.now();

    ////////////////////////////////////////////////////////////
    //========= Load Commands ================================//
    ////////////////////////////////////////////////////////////

    try {
      const commandsPath = join(global.client.mainPath, "Aman", "commands");
      if (existsSync(commandsPath)) {
        const listCommand = readdirSync(commandsPath).filter(cmd =>
          cmd.endsWith(".js") && !cmd.includes("example") && !global.config.commandDisabled.includes(cmd)
        );

        for (const cmd of listCommand) {
          try {
            const module = require(join(commandsPath, cmd));
            if (!module.config || !module.run) continue;
            if (global.client.commands.has(module.config.name)) continue;

            if (module.config.dependencies) {
              for (const dep in module.config.dependencies) {
                if (!global.nodemodule[dep]) {
                  if (listPackage.hasOwnProperty(dep) || listbuiltinModules.includes(dep)) {
                    global.nodemodule[dep] = require(dep);
                  }
                }
              }
            }

            global.client.commands.set(module.config.name, module);
            logger.loader(`✅ Loaded command: ${module.config.name}`);
          } catch (err) {
            logger.loader(`❌ Command load failed (${cmd}): ${err}`, "error");
          }
        }
      }
    } catch (err) {
      logger.loader(`❌ Commands folder error: ${err}`, "error");
    }

    ////////////////////////////////////////////////////////////
    //========= Load Events ==================================//
    ////////////////////////////////////////////////////////////

    try {
      const eventsPath = join(global.client.mainPath, "Aman", "events");
      if (existsSync(eventsPath)) {
        const events = readdirSync(eventsPath).filter(ev =>
          ev.endsWith(".js") && !global.config.eventDisabled.includes(ev)
        );

        for (const ev of events) {
          try {
            const event = require(join(eventsPath, ev));
            if (!event.config || !event.run) continue;
            if (global.client.events.has(event.config.name)) continue;

            global.client.events.set(event.config.name, event);
            logger.loader(`✅ Loaded event: ${event.config.name}`);
          } catch (err) {
            logger.loader(`❌ Event load failed (${ev}): ${err}`, "error");
          }
        }
      }
    } catch (err) {
      logger.loader(`❌ Events folder error: ${err}`, "error");
    }

    logger.loader(`🎉 Loaded ${global.client.commands.size} commands and ${global.client.events.size} events`);
    logger.loader(`⚡ Startup Time: ${((Date.now() - global.client.timeStart) / 1000).toFixed()}s`);
    logger.loader("===== [ AMAN BOT STARTED ] =====");

    // Listener
    try {
      const listenerData = { api: loginApiData, models: botModel };
      const listener = require("./includes/listen.js")(listenerData);

      global.handleListen = loginApiData.listenMqtt((error, message) => {
        if (error) return logger(`Listen error: ${JSON.stringify(error)}`, "error");
        if (["presence", "typ", "read_receipt"].includes(message.type)) return;
        if (global.config.DeveloperMode) console.log(message);
        return listener(message);
      });
    } catch (err) {
      logger.loader(`❌ Listener setup error: ${err}`, "error");
    }

    console.log("🚀 AMAN BOT IS NOW ONLINE AND READY! 🚀");
  });
}

////////////////////////////////////////////////////////////
//========= Database Connection ==========================//
////////////////////////////////////////////////////////////

(async () => {
  try {
    const { Sequelize, sequelize } = require("./includes/database/index.js");
    await sequelize.authenticate();
    const models = require("./includes/database/model.js")({ Sequelize, sequelize });
    logger("✅ Database connected successfully", "[ DATABASE ]");
    onBot({ models });
  } catch (err) {
    logger(`❌ Database connection failed: ${err}`, "[ DATABASE ]");
    onBot({ models: null });
  }
})();

process.on("unhandledRejection", (err) => console.log("🚫 Unhandled Rejection:", err));
process.on("uncaughtException", (err) => console.log("🚫 Uncaught Exception:", err));
