const fs = require("fs");
const path = require("path");

// ====== CONFIG LOADER (admin IDs from config.json) ======
function loadAdmins() {
  try {
    // Try project root config.json
    const rootCfg = path.resolve(process.cwd(), "config.json");
    if (fs.existsSync(rootCfg)) {
      const cfg = JSON.parse(fs.readFileSync(rootCfg, "utf8"));
      if (Array.isArray(cfg.ADMINBOT) && cfg.ADMINBOT.length) return cfg.ADMINBOT.map(String);
      if (Array.isArray(cfg.admin) && cfg.admin.length) return cfg.admin.map(String);
    }
  } catch {}
  try {
    // Try relative two-levels up (common bot structures)
    const alt = path.resolve(__dirname, "..", "..", "config.json");
    if (fs.existsSync(alt)) {
      const cfg = JSON.parse(fs.readFileSync(alt, "utf8"));
      if (Array.isArray(cfg.ADMINBOT) && cfg.ADMINBOT.length) return cfg.ADMINBOT.map(String);
      if (Array.isArray(cfg.admin) && cfg.admin.length) return cfg.admin.map(String);
    }
  } catch {}
  return []; // fallback
}

const OWNER_IDS = loadAdmins(); // array of strings
const OWNER_LINK = "www.facebook.com/Ak47xK"; // <- tumhara link

// ====== STORAGE SETUP ======
const CACHE_DIR = path.join(__dirname, "cache");
const THREAD_FILE = path.join(CACHE_DIR, "Thread.json");

function ensureStorage() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(THREAD_FILE)) fs.writeFileSync(THREAD_FILE, JSON.stringify({}), "utf8");
}
function readThreads() {
  ensureStorage();
  try {
    return JSON.parse(fs.readFileSync(THREAD_FILE, "utf8")) || {};
  } catch {
    return {};
  }
}
function writeThreads(data) {
  ensureStorage();
  fs.writeFileSync(THREAD_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ====== HELPER ======
function isOwner(senderID) {
  return OWNER_IDS.includes(String(senderID));
}

module.exports.config = {
  name: "permission",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Aman Khan",
  description: "Group approval & permission manager",
  commandCategory: "system",
  usages: "/approval | /permission allow <threadID> | /permission ban <threadID> | /permissionlist",
  cooldowns: 2
};

// ====== CORE GUARD (auto message if not approved) ======
async function guardAndMaybeNotify({ api, event }) {
  const { threadID, senderID, body } = event;
  const threads = readThreads();
  const t = threads[threadID] || {};

  // Owner bypass
  if (isOwner(senderID)) return true;

  // Approved?
  if (t.allowed === true) return true;

  // Not approved → send polite notice (rate limited per 30 min)
  const now = Date.now();
  const THIRTY_MIN = 30 * 60 * 1000;

  if (!t.lastNotice || now - t.lastNotice > THIRTY_MIN) {
    t.lastNotice = now;
    threads[threadID] = t;
    writeThreads(threads);

    const msg =
      "⛔ Bot is not allowed to chat in this group.\n" +
      "Please contact owner for approval.\n\n" +
      `Owner: ${OWNER_LINK}\n\n` +
      "Type: /approval to request access.";
    try { await api.sendMessage(msg, threadID); } catch {}
  }

  // If the message itself is "/approval", we still let command handler run (handled below)
  if (body && String(body).trim().toLowerCase().startsWith("/approval")) {
    return true; // allow to proceed so request can be sent
  }

  // Block other actions
  return false;
}

// ====== MAIN HANDLER ======
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body, senderID } = event;
  if (!body) return;

  // Guard: stop bot in unapproved groups (except /approval)
  const ok = await guardAndMaybeNotify({ api, event });
  if (!ok) return;

  const text = String(body).trim();
  const lower = text.toLowerCase();

  // -------- USER: /approval --------
  if (lower.startsWith("/approval")) {
    try {
      // Gather thread info
      let tinfo = {};
      try { tinfo = await api.getThreadInfo(threadID); } catch {}
      const threadName = tinfo.threadName || "Unknown Group";
      const members = tinfo.participantIDs ? tinfo.participantIDs.length : "N/A";

      const notice =
        "📩 New approval request received\n\n" +
        `• Thread Name: ${threadName}\n` +
        `• Thread ID: ${threadID}\n` +
        `• Members: ${members}\n` +
        `• Requested by: ${senderID}\n\n` +
        `Allow: /permission allow ${threadID}\n` +
        `Ban: /permission ban ${threadID}`;

      // Send to all owners
      if (OWNER_IDS.length === 0) {
        await api.sendMessage("❗Owner not configured. Please set admin IDs in config.json", threadID, messageID);
      } else {
        for (const oid of OWNER_IDS) {
          try { await api.sendMessage(notice, oid); } catch {}
        }
        await api.sendMessage("✅ Request sent to owner. Please wait for approval.", threadID, messageID);
      }
    } catch (e) {
      await api.sendMessage("⚠️ Could not send approval request. Try again later.", threadID, messageID);
    }
    return;
  }

  // -------- OWNER: /permission allow|ban <threadID> --------
  if (lower.startsWith("/permission ")) {
    if (!isOwner(senderID)) {
      return api.sendMessage("❌ Only owner can use this command.", threadID, messageID);
    }

    const parts = text.split(/\s+/);
    // Expected: /permission allow <id>  OR  /permission ban <id>
    const action = (parts[1] || "").toLowerCase();
    const targetID = parts[2];

    if (!["allow", "ban"].includes(action) || !targetID) {
      return api.sendMessage(
        "Usage:\n/permission allow <threadID>\n/permission ban <threadID>\n/permissionlist",
        threadID,
        messageID
      );
    }

    const threads = readThreads();
    threads[targetID] = threads[targetID] || {};
    if (action === "allow") {
      threads[targetID].allowed = true;
      threads[targetID].by = String(senderID);
      threads[targetID].time = Date.now();
      writeThreads(threads);
      try { await api.sendMessage("✅ Chat allowed in this group.", targetID); } catch {}
      return api.sendMessage(`✅ Allowed: ${targetID}`, threadID, messageID);
    } else {
      threads[targetID].allowed = false;
      threads[targetID].by = String(senderID);
      threads[targetID].time = Date.now();
      writeThreads(threads);
      try { await api.sendMessage("⛔ Chat disabled by owner.", targetID); } catch {}
      return api.sendMessage(`⛔ Banned: ${targetID}`, threadID, messageID);
    }
  }

  // -------- OWNER: /permissionlist --------
  if (lower === "/permissionlist") {
    if (!isOwner(senderID)) {
      return api.sendMessage("❌ Only owner can use this command.", threadID, messageID);
    }
    const threads = readThreads();
    const allowed = Object.entries(threads)
      .filter(([, v]) => v && v.allowed === true)
      .map(([k, v]) => `• ${k} (by: ${v.by || "unknown"})`);
    const banned = Object.entries(threads)
      .filter(([, v]) => v && v.allowed === false)
      .map(([k, v]) => `• ${k} (by: ${v.by || "unknown"})`);

    const msg =
      "📜 Permission List\n\n" +
      "✅ Allowed:\n" + (allowed.length ? allowed.join("\n") : "— none —") + "\n\n" +
      "⛔ Banned:\n" + (banned.length ? banned.join("\n") : "— none —");

    return api.sendMessage(msg, threadID, messageID);
  }

  // If some other message and thread not approved earlier, guard already handled notice
  return;
};

module.exports.run = async function () {
  return;
};
