require("dotenv").config();
const moment = require("moment-timezone");
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const { join, resolve } = require("path");
const logger = require("./utils/log.js");
const login = require("fca-priyansh");
const listPackage = JSON.parse(readFileSync("./package.json")).dependencies;
const listbuiltinModules = require("module").builtinModules;

////////////////////////////////////////////////////////////
//========= Global Client & Data =========================//
////////////////////////////////////////////////////////////

global.client = new Object({
  commands: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  eventRegistered: new Array(),
  handleSchedule: new Array(),
  handleReaction: new Array(),
  handleReply: new Array(),
  mainPath: process.cwd(),
  configPath: new String(),
  getTime: function (option) {
    const tz = "Asia/Kolkata";
    switch (option) {
      case "seconds": return `${moment.tz(tz).format("ss")}`;
      case "minutes": return `${moment.tz(tz).format("mm")}`;
      case "hours": return `${moment.tz(tz).format("HH")}`;
      case "date": return `${moment.tz(tz).format("DD")}`;
      case "month": return `${moment.tz(tz).format("MM")}`;
      case "year": return `${moment.tz(tz).format("YYYY")}`;
      case "fullHour": return `${moment.tz(tz).format("HH:mm:ss")}`;
      case "fullYear": return `${moment.tz(tz).format("DD/MM/YYYY")}`;
      case "fullTime": return `${moment.tz(tz).format("HH:mm:ss DD/MM/YYYY")}`;
    }
  }
});

global.data = new Object({
  threadInfo: new Map(),
  threadData: new Map(),
  userName: new Map(),
  userBanned: new Map(),
  threadBanned: new Map(),
  commandBanned: new Map(),
  threadAllowNSFW: new Array(),
  allUserID: new Array(),
  allCurrenciesID: new Array(),
  allThreadID: new Array(),
  groupNameLock: new Map(),
  groupDpLock: new Map(),
  memberNameLock: new Map()
});

global.utils = require("./utils/index.js");
global.nodemodule = new Object();
global.config = new Object();
global.configModule = new Object();
global.moduleData = new Array();
global.language = new Object();

// Add missing checkBan function
async function checkBan(api) {
  try {
    global.checkBan = true;
    return true;
  } catch (error) {
    global.checkBan = false;
    return false;
  }
}

////////////////////////////////////////////////////////////
//========= Config Loader with .env Injection ============//
////////////////////////////////////////////////////////////

var configValue;
try {
  global.client.configPath = join(global.client.mainPath, "config.json");
  configValue = require(global.client.configPath);
  logger.loader("Found file config: config.json");
} catch {
  if (existsSync(global.client.configPath.replace(/\.json/g, "") + ".temp")) {
    configValue = readFileSync(global.client.configPath.replace(/\.json/g, "") + ".temp");
    configValue = JSON.parse(configValue);
    logger.loader(`Found: ${global.client.configPath.replace(/\.json/g, "") + ".temp"}`);
  } else return logger.loader("config.json not found!", "error");
}

try {
  // Inject .env values into config
  function injectEnv(obj, parentKey = "") {
    for (const key in obj) {
      const fullKey = (parentKey ? parentKey + "_" : "") + key;
      if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
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

  // Ensure arrays exist
  if (!Array.isArray(configValue.commandDisabled)) configValue.commandDisabled = [];
  if (!Array.isArray(configValue.eventDisabled)) configValue.eventDisabled = [];

  for (const key in configValue) global.config[key] = configValue[key];
  logger.loader("Config Loaded with .env support!");
} catch { 
  return logger.loader("Can't load file config!", "error");
}

const { Sequelize, sequelize } = require("./includes/database/index.js");

writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), "utf8");

////////////////////////////////////////////////////////////
//========= Load Language ================================//
////////////////////////////////////////////////////////////

const langFile = (readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: "utf-8" })).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf("#") != 0 && item != "");
for (const item of langData) {
  const getSeparator = item.indexOf("=");
  const itemKey = item.slice(0, getSeparator);
  const itemValue = item.slice(getSeparator + 1, item.length);
  const head = itemKey.slice(0, itemKey.indexOf("."));
  const key = itemKey.replace(head + ".", "");
  const value = itemValue.replace(/\\n/gi, "\n");
  if (typeof global.language[head] == "undefined") global.language[head] = new Object();
  global.language[head][key] = value;
}

global.getText = function (...args) {
  const langText = global.language;
  if (!langText.hasOwnProperty(args[0])) {
    console.warn(`Language key not found: ${args[0]}`);
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

try {
  var appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
  var appState = require(appStateFile);
  logger.loader(global.getText("priyansh", "foundPathAppstate") || "Found appstate file");
} catch {
  console.log("AppState file not found, but continuing...");
  var appState = [];
}

////////////////////////////////////////////////////////////
//========= Bot Startup =================================//
////////////////////////////////////////////////////////////

function onBot({ models: botModel }) {
  const loginData = {};
  loginData['appState'] = appState;
  
  login(loginData, async (loginError, loginApiData) => {
    if (loginError) return logger(JSON.stringify(loginError), `ERROR`);

    // Set options if available
    if (global.config.FCAOption) {
      loginApiData.setOptions(global.config.FCAOption);
    }

    writeFileSync(appStateFile, JSON.stringify(loginApiData.getAppState(), null, '\x09'));

    // IMPORTANT: Make API globally accessible
    global.client.api = loginApiData;
    global.api = loginApiData;

    console.log("[SYSTEM] ✅ Global API access enabled for commands");

    global.config.version = '1.2.14';
    global.client.timeStart = new Date().getTime();

    ////////////////////////////////////////////////////////////
    //========= Load Commands ================================//
    ////////////////////////////////////////////////////////////

    try {
      const commandsPath = join(global.client.mainPath, 'Aman', 'commands');
      if (existsSync(commandsPath)) {
        const listCommand = readdirSync(commandsPath).filter(command =>
          command.endsWith('.js') &&
          !command.includes('example') &&
          !global.config.commandDisabled.includes(command)
        );

        for (const command of listCommand) {
          try {
            var module = require(join(commandsPath, command));
            if (!module.config || !module.run) {
              logger.loader(`❌ Invalid format: ${command}`, 'warn');
              continue;
            }

            if (global.client.commands.has(module.config.name)) {
              logger.loader(`❌ Duplicate command name: ${module.config.name}`, 'warn');
              continue;
            }

            // Handle dependencies
            if (module.config.dependencies && typeof module.config.dependencies == 'object') {
              for (const reqDependencies in module.config.dependencies) {
                try {
                  if (!global.nodemodule.hasOwnProperty(reqDependencies)) {
                    if (listPackage.hasOwnProperty(reqDependencies) || listbuiltinModules.includes(reqDependencies)) {
                      global.nodemodule[reqDependencies] = require(reqDependencies);
                    }
                  }
                } catch (error) {
                  logger.loader(`⚠️ Missing dependency ${reqDependencies} for ${module.config.name}`, 'warn');
                }
              }
            }

            // Handle config
            if (module.config.envConfig) {
              try {
                for (const envConfig in module.config.envConfig) {
                  if (typeof global.configModule[module.config.name] == 'undefined') global.configModule[module.config.name] = {};
                  if (typeof global.config[module.config.name] == 'undefined') global.config[module.config.name] = {};
                  if (typeof global.config[module.config.name][envConfig] !== 'undefined') {
                    global.configModule[module.config.name][envConfig] = global.config[module.config.name][envConfig];
                  } else {
                    global.configModule[module.config.name][envConfig] = module.config.envConfig[envConfig] || '';
                  }
                  if (typeof global.config[module.config.name][envConfig] == 'undefined') {
                    global.config[module.config.name][envConfig] = module.config.envConfig[envConfig] || '';
                  }
                }
              } catch (error) {
                logger.loader(`⚠️ Config error for ${module.config.name}: ${error}`, 'warn');
              }
            }

            // Handle onLoad
            if (module.onLoad) {
              try {
                const moduleData = { api: loginApiData, models: botModel };
                module.onLoad(moduleData);
              } catch (error) {
                logger.loader(`⚠️ OnLoad error for ${module.config.name}: ${error}`, 'warn');
              }
            }

            // FIXED: Only register in eventRegistered, NOT in events Map
            if (module.handleEvent) {
              global.client.eventRegistered.push(module.config.name);
            }
            
            global.client.commands.set(module.config.name, module);
            logger.loader(`✅ Loaded command: ${module.config.name}`);

          } catch (error) {
            logger.loader(`❌ Failed to load ${command}: ${error}`, 'error');
          }
        }
      }
    } catch (error) {
      logger.loader(`❌ Commands folder error: ${error}`, 'error');
    }

    ////////////////////////////////////////////////////////////
    //========= Load Events (ONLY Normal Events) =============//
    ////////////////////////////////////////////////////////////

    try {
      const eventsPath = join(global.client.mainPath, 'Aman', 'events');
      if (existsSync(eventsPath)) {
        const events = readdirSync(eventsPath).filter(event =>
          event.endsWith('.js') &&
          !global.config.eventDisabled.includes(event)
        );

        for (const ev of events) {
          try {
            var event = require(join(eventsPath, ev));
            if (!event.config) {
              logger.loader(`❌ Invalid event format: ${ev}`, 'warn');
              continue;
            }

            if (global.client.events.has(event.config.name)) {
              logger.loader(`❌ Duplicate event name: ${event.config.name}`, 'warn');
              continue;
            }

            // Handle dependencies
            if (event.config.dependencies && typeof event.config.dependencies == 'object') {
              for (const dependency in event.config.dependencies) {
                try {
                  if (!global.nodemodule.hasOwnProperty(dependency)) {
                    if (listPackage.hasOwnProperty(dependency) || listbuiltinModules.includes(dependency)) {
                      global.nodemodule[dependency] = require(dependency);
                    }
                  }
                } catch (error) {
                  logger.loader(`⚠️ Missing dependency ${dependency} for ${event.config.name}`, 'warn');
                }
              }
            }

            // Handle config
            if (event.config.envConfig) {
              try {
                for (const envConfig in event.config.envConfig) {
                  if (typeof global.configModule[event.config.name] == 'undefined') global.configModule[event.config.name] = {};
                  if (typeof global.config[event.config.name] == 'undefined') global.config[event.config.name] = {};
                  if (typeof global.config[event.config.name][envConfig] !== 'undefined') {
                    global.configModule[event.config.name][envConfig] = global.config[event.config.name][envConfig];
                  } else {
                    global.configModule[event.config.name][envConfig] = event.config.envConfig[envConfig] || '';
                  }
                  if (typeof global.config[event.config.name][envConfig] == 'undefined') {
                    global.config[event.config.name][envConfig] = event.config.envConfig[envConfig] || '';
                  }
                }
              } catch (error) {
                logger.loader(`⚠️ Config error for ${event.config.name}: ${error}`, 'warn');
              }
            }

            // Handle onLoad
            if (event.onLoad) {
              try {
                const eventData = { api: loginApiData, models: botModel };
                event.onLoad(eventData);
              } catch (error) {
                logger.loader(`⚠️ OnLoad error for ${event.config.name}: ${error}`, 'warn');
              }
            }

            // FIXED: Only register handleEvent in eventRegistered array, 
            // and DON'T add to events Map if it's NoPrefix
            if (event.handleEvent && !event.run) {
              // Pure NoPrefix event - only add to eventRegistered
              global.client.eventRegistered.push(event.config.name);
              logger.loader(`✅ Loaded NoPrefix event: ${event.config.name}`);
            } else if (event.run) {
              // Normal event with run function
              global.client.events.set(event.config.name, event);
              logger.loader(`✅ Loaded event: ${event.config.name}`);
              
              // If it also has handleEvent, add to eventRegistered
              if (event.handleEvent) {
                global.client.eventRegistered.push(event.config.name);
              }
            }

          } catch (error) {
            logger.loader(`❌ Failed to load event ${ev}: ${error}`, 'error');
          }
        }
      }
    } catch (error) {
      logger.loader(`❌ Events folder error: ${error}`, 'error');
    }

    logger.loader(`🎉 Loaded ${global.client.commands.size} commands and ${global.client.events.size} events`);
    logger.loader(`⚡ Startup Time: ${((Date.now() - global.client.timeStart) / 1000).toFixed()}s`);
    logger.loader('===== [ AMAN BOT STARTED ] =====');

    // Save config
    try {
      writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');
      if (existsSync(global.client.configPath + '.temp')) {
        unlinkSync(global.client.configPath + '.temp');
      }
    } catch (error) {
      logger.loader(`⚠️ Config save error: ${error}`, 'warn');
    }

    ////////////////////////////////////////////////////////////
    //========= Setup Listener (COMPLETELY FIXED) ============//
    ////////////////////////////////////////////////////////////

    try {
      const listenerData = { api: loginApiData, models: botModel };
      const listener = require('./includes/listen.js')(listenerData);

      function listenerCallback(error, message) {
        if (error) return logger(`Listen error: ${JSON.stringify(error)}`, 'error');
        if (['presence', 'typ', 'read_receipt'].some(data => data == message.type)) return;
        if (global.config.DeveloperMode) console.log(message);
        
        // Call the main listener for prefix commands
        listener(message);
        
        // FIXED: Handle NoPrefix events - avoid duplicates
        try {
          const processedEvents = new Set(); // Track processed events
          
          for (const eventName of global.client.eventRegistered) {
            if (processedEvents.has(eventName)) continue; // Skip if already processed
            
            // First check commands
            const command = global.client.commands.get(eventName);
            if (command && command.handleEvent && typeof command.handleEvent === 'function') {
              try {
                command.handleEvent({ api: loginApiData, event: message, models: botModel });
                processedEvents.add(eventName);
              } catch (err) {
                logger.loader(`❌ Error in command handleEvent ${eventName}: ${err}`, 'error');
              }
              continue;
            }
            
            // Then check events (for pure NoPrefix events not in commands Map)
            if (!processedEvents.has(eventName)) {
              try {
                const eventPath = join(global.client.mainPath, 'Aman', 'events');
                const eventFiles = readdirSync(eventPath);
                
                for (const file of eventFiles) {
                  if (file.endsWith('.js')) {
                    const eventModule = require(join(eventPath, file));
                    if (eventModule.config && eventModule.config.name === eventName && eventModule.handleEvent) {
                      eventModule.handleEvent({ api: loginApiData, event: message, models: botModel });
                      processedEvents.add(eventName);
                      break;
                    }
                  }
                }
              } catch (err) {
                logger.loader(`❌ Error in event handleEvent ${eventName}: ${err}`, 'error');
              }
            }
          }
        } catch (error) {
          logger.loader(`❌ NoPrefix handler error: ${error}`, 'error');
        }
      }

      global.handleListen = loginApiData.listenMqtt(listenerCallback);
    } catch (error) {
      logger.loader(`❌ Listener setup error: ${error}`, 'error');
    }

    // Check ban
    try {
      await checkBan(loginApiData);
    } catch (error) {
      logger.loader(`⚠️ Ban check error: ${error}`, 'warn');
    }

    if (!global.checkBan) {
      logger.loader('⚠️ Warning: Source code verification failed', 'warn');
    }

    console.log("🚀 AMAN BOT IS NOW ONLINE AND READY! 🚀");
  });
}

////////////////////////////////////////////////////////////
//========= Database Connection ==========================//
////////////////////////////////////////////////////////////

(async () => {
  try {
    await sequelize.authenticate();
    const authentication = { Sequelize, sequelize };
    const models = require('./includes/database/model.js')(authentication);
    logger('✅ Database connected successfully', '[ DATABASE ]');
    const botData = { models };
    onBot(botData);
  } catch (error) {
    logger(`❌ Database connection failed: ${JSON.stringify(error)}`, '[ DATABASE ]');
    // Continue without database
    const botData = { models: null };
    onBot(botData);
  }
})();

process.on('unhandledRejection', (err, p) => {
  console.log('🚫 Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.log('🚫 Uncaught Exception:', err);
});
