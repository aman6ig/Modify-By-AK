const { spawn } = require("child_process");
const axios = require("axios");
const logger = require("./utils/log");
const express = require("express");
const path = require("path");

///////////////////////////////////////////////////////////
//========= Create website for dashboard/uptime =========//
///////////////////////////////////////////////////////////

const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/index.html"));
});

app.listen(port, () => {
  logger(`[${new Date().toLocaleString()}] Server is running on port ${port}...`, "[ Starting ]");
}).on("error", (err) => {
  if (err.code === "EACCES") {
    logger(`Permission denied. Cannot bind to port ${port}.`, "[ Error ]");
  } else {
    logger(`Server error: ${err.message}`, "[ Error ]");
  }
});

/////////////////////////////////////////////////////////
//========= Create start bot and make it loop =========//
/////////////////////////////////////////////////////////

global.countRestart = global.countRestart || 0;
const MAX_RESTARTS = process.env.MAX_RESTARTS || 5; // Configurable max restarts
const RESTART_DELAY = 5000; // 5 seconds delay before restart

function startBot(message) {
  if (message) logger(`[${new Date().toLocaleString()}] ${message}`, "[ Starting ]");

  const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "Aman.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true
  });

  child.on("close", (codeExit) => {
    if (codeExit !== 0 && global.countRestart < MAX_RESTARTS) {
      global.countRestart++;
      logger(
        `[${new Date().toLocaleString()}] Bot exited with code ${codeExit}. Restarting in ${RESTART_DELAY / 1000}s... (${global.countRestart}/${MAX_RESTARTS})`,
        "[ Restarting ]"
      );
      setTimeout(() => startBot(), RESTART_DELAY);
    } else if (global.countRestart >= MAX_RESTARTS) {
      logger(`[${new Date().toLocaleString()}] Bot stopped after ${global.countRestart} restarts.`, "[ Stopped ]");
    } else {
      logger(`[${new Date().toLocaleString()}] Bot exited normally.`, "[ Info ]");
    }
  });

  child.on("error", (error) => {
    logger(`[${new Date().toLocaleString()}] An error occurred: ${JSON.stringify(error)}`, "[ Error ]");
  });
}

////////////////////////////////////////////////
//========= Signal Handling (Graceful) =========//
////////////////////////////////////////////////

process.on("SIGINT", () => {
  logger(`[${new Date().toLocaleString()}] Received SIGINT. Shutting down gracefully...`, "[ Shutdown ]");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger(`[${new Date().toLocaleString()}] Received SIGTERM. Shutting down gracefully...`, "[ Shutdown ]");
  process.exit(0);
});

////////////////////////////////////////////////
//========= Start Bot ========================//
////////////////////////////////////////////////

startBot();
