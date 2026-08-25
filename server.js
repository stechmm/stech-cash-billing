require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const { WebSocketServer } = require("ws");
let archiver;
try {
  archiver = require("archiver");
} catch {
  archiver = null;
}

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3030);
const APP_DIR = __dirname;
function resolveDbFile() {
  const homeMatch = APP_DIR.match(/^(\/home\/[^/]+)/);
  const defaultExtDir = homeMatch ? path.join(homeMatch[1], "stech_data") : path.join(APP_DIR, "data");
  const dataDir = path.resolve(process.env.DATA_DIR || defaultExtDir);
  const dataDb = path.join(dataDir, "app-db.json");
  const repoDataDb = path.join(APP_DIR, "data", "app-db.json");
  const rootDb = path.join(APP_DIR, "app-db.json");

  if (!fs.existsSync(dataDir)) {
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
  }

  // If external dataDb doesn't exist yet, automatically copy existing DB so data is preserved
  if (!fs.existsSync(dataDb)) {
    if (fs.existsSync(repoDataDb)) {
      try { fs.copyFileSync(repoDataDb, dataDb); } catch(e){}
    } else if (fs.existsSync(rootDb)) {
      try { fs.copyFileSync(rootDb, dataDb); } catch(e){}
    }
  }

  if (fs.existsSync(dataDb) || !fs.existsSync(repoDataDb)) {
    return { dataDir, dbFile: dataDb };
  }
  return { dataDir: APP_DIR, dbFile: rootDb };
}
const { dataDir: DATA_DIR, dbFile: DB_FILE } = resolveDbFile();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(APP_DIR, "uploads"));
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const SESSION_COOKIE = "stech_session";
const CUSTOMER_SESSION_COOKIE = "stech_customer_session";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const STORAGE_MODE = process.env.DB_CLIENT === "mysql" || process.env.DB_HOST ? "mysql" : "json";
const MYSQL_TABLE = process.env.DB_TABLE || "app_state";
const USER_TABS = ["dashboardPage", "cashPage", "billPage", "devicePage", "usagePage", "supportPage", "adminPage"];
const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".apk": "application/vnd.android.package-archive",
  ".exe": "application/vnd.microsoft.portable-executable",
  ".ico": "image/x-icon",
  ".png": "image/png"
};

function makeId() {
  return crypto.randomUUID();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  const strStored = String(stored || "").trim();
  if (!strStored.includes(":")) {
    return String(password) === strStored;
  }
  const [salt, expected] = strStored.split(":");
  if (!salt || !expected) return false;
  try {
    const actual = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
    const actualBuf = Buffer.from(actual);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, expectedBuf);
  } catch {
    return false;
  }
}

function currentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function ensureActiveMonth(db) {
  const monthKey = currentMonthKey();
  if (!db.months) db.months = {};
  if (!db.months[monthKey]) {
    db.months[monthKey] = { openingCash: 0, entries: [] };
  }
  db.activeMonth = monthKey;
  rollBillRecordsToMonth(db, monthKey);
  reconcileBillStatusFromLedger(db);
}

function defaultSnapshot() {
  const adminId = makeId();
  const monthKey = currentMonthKey();
  const adminUsername = process.env.ADMIN_USERNAME || "admin@localhost";
  const adminPassword = process.env.ADMIN_PASSWORD || "change-me-now";
  return {
    activeMonth: monthKey,
    activePage: "dashboardPage",
    nextDeviceNumber: 1,
    deviceRecords: [],
    billRecords: [],
    usageRecords: [],
    customerAccounts: [],
    announcements: [],
    supportMessages: [],
    appSettings: {
      appName: "SpaceLink",
      appKicker: "Satellite & Cash Operations",
      accentColor: "#38bdf8",
      themePreset: "obsidian",
      supportHotline: "+95 9 777 888 999",
      supportEmail: "support@spacelink.mm",
      currencySymbol: "MMK",
      heroGreeting: "Welcome back",
      heroSubtitle: "Satellite connectivity, usage tracking, and billing operations.",
      bannerEnabled: true,
      bannerText: "⚡ SpaceLink Priority & Roam services active and operational.",
      enabledModules: {
        usageChart: true,
        dailyHistory: true,
        announcements: true,
        supportChat: true,
        deviceSpecs: true
      }
    },
    systemSettings: {
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
      telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
      telegramBackupChatId: process.env.TELEGRAM_BACKUP_CHAT_ID || "",
      telegramAlertsEnabled: true,
      googleDriveBackupEnabled: false,
      googleDriveFolderId: "",
      autoBackupEnabled: true,
      autoBackupHour: 0,
      autoVouchersEnabled: true,
      companyName: "S-Tech Telecommunication Services",
      companyPhone: "+95 9 777 888 999",
      companyVoucherFooter: "Thank you for subscribing to S-Tech High-Speed Satellite Internet."
    },
    vouchers: [],
    months: {
      [monthKey]: {
        openingCash: 0,
        entries: []
      }
    },
    users: [
      {
        id: adminId,
        fullName: process.env.ADMIN_FULL_NAME || "Administrator",
        username: adminUsername,
        role: "admin",
        allowedTabs: ["dashboardPage", "cashPage", "billPage", "devicePage", "usagePage", "supportPage", "adminPage"],
        passwordHash: hashPassword(adminPassword)
      }
    ]
  };
}

function ensureUsageRecords(db) {
  if (!Array.isArray(db.usageRecords)) db.usageRecords = [];
  db.usageRecords = db.usageRecords.map((record) => {
    const dailyUsage = record.dailyUsage && typeof record.dailyUsage === "object" && !Array.isArray(record.dailyUsage)
      ? record.dailyUsage
      : {};
    const weeklyTotal = [1, 2, 3, 4, 5]
      .reduce((sum, week) => sum + Number(record[`week${week}Usage`] || 0), 0);
    return {
      ...record,
      dailyUsage,
      legacyUsageTB: Number(record.legacyUsageTB || weeklyTotal || 0)
    };
  });
}

function ensureCustomerFeatures(db) {
  if (!Array.isArray(db.customerAccounts)) db.customerAccounts = [];
  if (!Array.isArray(db.announcements)) db.announcements = [];
  if (!Array.isArray(db.supportMessages)) db.supportMessages = [];
}

function ensureAppSettings(db) {
  if (!db.appSettings || typeof db.appSettings !== "object") {
    db.appSettings = {
      appName: "SpaceLink",
      appKicker: "Satellite & Cash Operations",
      accentColor: "#38bdf8",
      themePreset: "obsidian",
      supportHotline: "+95 9 777 888 999",
      supportEmail: "support@spacelink.mm",
      currencySymbol: "MMK",
      heroGreeting: "Welcome back",
      heroSubtitle: "Satellite connectivity, usage tracking, and billing operations.",
      bannerEnabled: true,
      bannerText: "⚡ SpaceLink Priority & Roam services active and operational.",
      enabledModules: {
        usageChart: true,
        dailyHistory: true,
        announcements: true,
        supportChat: true,
        deviceSpecs: true
      },
      customerAppUpdate: {
        enabled: false,
        version: "",
        title: "New Update Available",
        description: "Please update your SpaceLink App to continue.",
        url: ""
      }
    };
  }
  if (!db.appSettings.customerAppUpdate) {
    db.appSettings.customerAppUpdate = {
      enabled: false,
      version: "",
      title: "New Update Available",
      description: "Please update your SpaceLink App to continue.",
      url: ""
    };
  }
}

function ensureSystemSettings(db) {
  if (!db.systemSettings || typeof db.systemSettings !== "object") {
    db.systemSettings = {};
  }
  const defaults = {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    telegramBackupChatId: process.env.TELEGRAM_BACKUP_CHAT_ID || "",
    telegramAlertsEnabled: true,
    googleDriveBackupEnabled: false,
    googleDriveFolderId: "",
    autoBackupEnabled: true,
    autoBackupHour: 0,
    autoVouchersEnabled: true,
    companyName: "S-Tech Telecommunication Services",
    companyPhone: "+95 9 777 888 999",
    companyVoucherFooter: "Thank you for subscribing to S-Tech High-Speed Satellite Internet."
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (db.systemSettings[k] === undefined) {
      db.systemSettings[k] = v;
    }
  }
  if (!Array.isArray(db.vouchers)) db.vouchers = [];
}

async function sendTelegramNotification(db, messageText, options = {}) {
  ensureSystemSettings(db);
  const token = db.systemSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId || db.systemSettings.telegramChatId || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || db.systemSettings.telegramAlertsEnabled === false) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    return Boolean(data && data.ok);
  } catch (err) {
    console.error("[Telegram Notification Error]:", err.message);
    return false;
  }
}

async function sendTelegramDocument(db, filePath, caption, targetChatId) {
  ensureSystemSettings(db);
  const token = db.systemSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = targetChatId || db.systemSettings.telegramBackupChatId || db.systemSettings.telegramChatId;
  if (!token || !chatId || !fs.existsSync(filePath)) return false;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer]);
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("caption", caption || "📦 Database Backup");
    formData.append("document", blob, fileName);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return Boolean(data && data.ok);
  } catch (err) {
    console.error("[Telegram Send Document Error]:", err.message);
    return false;
  }
}

function generateAndSendVoucher(db, { customerId, customerName, machineId, amount, date, monthKey, notes, paymentMethod, staffUserId }) {
  ensureSystemSettings(db);
  if (db.systemSettings.autoVouchersEnabled === false) return null;

  let targetCustomer = null;
  if (customerId) {
    targetCustomer = db.customerAccounts.find((c) => c.id === customerId);
  }
  if (!targetCustomer && machineId) {
    targetCustomer = db.customerAccounts.find((c) => {
      const linked = Array.isArray(c.linkedDeviceIds) && c.linkedDeviceIds.length > 0 ? c.linkedDeviceIds : [c.linkedDeviceId];
      return linked.includes(machineId);
    });
  }
  if (!targetCustomer && customerName) {
    targetCustomer = db.customerAccounts.find((c) =>
      c.fullName?.trim().toLowerCase() === customerName.trim().toLowerCase() ||
      c.username?.toLowerCase() === customerName.trim().toLowerCase()
    );
  }
  if (!targetCustomer) return null;

  const cleanMonth = (monthKey || currentMonthKey()).replace("-", "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const voucherNumber = `VCH-${cleanMonth}-${randomSuffix}`;
  const numAmount = Number(amount) || 0;

  const voucher = {
    id: makeId(),
    voucherNumber,
    customerId: targetCustomer.id,
    customerName: targetCustomer.fullName || targetCustomer.username || "Customer",
    customerUsername: targetCustomer.username,
    machineId: machineId || (Array.isArray(targetCustomer.linkedDeviceIds) ? targetCustomer.linkedDeviceIds[0] : targetCustomer.linkedDeviceId) || "-",
    amount: numAmount,
    currency: "MMK",
    date: date || new Date().toISOString().slice(0, 10),
    monthKey: monthKey || currentMonthKey(),
    paymentMethod: paymentMethod || "Bank Transfer / Cash",
    status: "PAID",
    notes: notes || "SpaceLink Monthly Subscription",
    companyName: db.systemSettings.companyName || "S-Tech Telecommunication Services",
    companyPhone: db.systemSettings.companyPhone || "+95 9 777 888 999",
    createdAt: new Date().toISOString()
  };

  if (!Array.isArray(db.vouchers)) db.vouchers = [];
  db.vouchers.push(voucher);

  // Push official Voucher Chat Message
  const msgObj = {
    id: makeId(),
    customerId: targetCustomer.id,
    senderType: "staff",
    senderId: staffUserId || "system",
    topic: "voucher",
    message: `🧾 Official Payment Receipt / Voucher: ${voucher.voucherNumber}\nAmount: ${numAmount.toLocaleString()} MMK\nMachine: ${voucher.machineId}\nMonth: ${voucher.monthKey}\nStatus: PAID ✓`,
    voucher: voucher,
    createdAt: new Date().toISOString(),
    readByCustomer: false,
    readByStaff: true
  };
  db.supportMessages.push(msgObj);

  broadcastRealtime({ type: "support_message", customerId: targetCustomer.id, voucher }, (client) => client.kind === "staff" || client.customerId === targetCustomer.id);
  return voucher;
}

async function createBackupZip(db) {
  const backupDir = path.join(DATA_DIR, "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timeStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const zipName = `backup-${timeStr}.zip`;
  const zipPath = path.join(backupDir, zipName);

  if (!archiver) {
    throw new Error("Archiver module is not available on server");
  }

  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on("close", async () => {
      console.log(`[Backup] Created ${zipName} (${archive.pointer()} bytes)`);
      if (db.systemSettings?.telegramBotToken && (db.systemSettings?.telegramBackupChatId || db.systemSettings?.telegramChatId)) {
        await sendTelegramDocument(db, zipPath, `📦 S-Tech Billing Database Backup\nDate: ${new Date().toLocaleString()}\nFile: ${zipName}\nSize: ${(archive.pointer() / 1024).toFixed(1)} KB`);
      }
      resolve({ zipName, zipPath, size: archive.pointer() });
    });
    archive.on("error", (err) => reject(err));
    archive.pipe(output);

    if (fs.existsSync(DB_FILE)) archive.file(DB_FILE, { name: "app-db.json" });
    if (fs.existsSync(UPLOAD_DIR)) archive.directory(UPLOAD_DIR, "uploads");
    archive.finalize();
  });
}

function normalizeAllowedTabs(user) {
  if (user.role === "admin") return [...USER_TABS, "adminPage"];
  const source = Array.isArray(user.allowedTabs) ? user.allowedTabs : [];
  return source.filter((tab) => USER_TABS.includes(tab));
}

function ensureUserPermissions(db) {
  if (!Array.isArray(db.users)) db.users = [];
  db.users = db.users.map((user) => ({
    ...user,
    allowedTabs: normalizeAllowedTabs(user)
  }));
}

async function createJsonStorage() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultSnapshot(), null, 2));
  }
  return {
    async read() {
      if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultSnapshot(), null, 2));
      }
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    },
    async write(data) {
      const parentDir = path.dirname(DB_FILE);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    },
    describe() {
      return { mode: "json", location: DB_FILE };
    }
  };
}

async function createMysqlStorage() {
  const mysql = require("mysql2/promise");
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0
  });
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${MYSQL_TABLE}\` (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      state_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
  const [rows] = await pool.query(`SELECT state_json FROM \`${MYSQL_TABLE}\` WHERE id = 1 LIMIT 1`);
  if (!rows.length) {
    await pool.query(`INSERT INTO \`${MYSQL_TABLE}\` (id, state_json) VALUES (1, ?)`, [JSON.stringify(defaultSnapshot())]);
  }
  return {
    async read() {
      const [current] = await pool.query(`SELECT state_json FROM \`${MYSQL_TABLE}\` WHERE id = 1 LIMIT 1`);
      return JSON.parse(current[0].state_json);
    },
    async write(data) {
      await pool.query(`UPDATE \`${MYSQL_TABLE}\` SET state_json = ? WHERE id = 1`, [JSON.stringify(data)]);
    },
    describe() {
      return { mode: "mysql", database: process.env.DB_NAME, table: MYSQL_TABLE, host: process.env.DB_HOST };
    }
  };
}

const storagePromise = STORAGE_MODE === "mysql" ? createMysqlStorage() : createJsonStorage();

async function readDb() {
  const storage = await storagePromise;
  return storage.read();
}

async function writeDb(data) {
  const storage = await storagePromise;
  await storage.write(data);
}

async function storageInfo() {
  const storage = await storagePromise;
  return storage.describe();
}

function safeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    allowedTabs: normalizeAllowedTabs(user)
  };
}

function getCustomerLinkedDeviceIds(customer) {
  if (!customer) return [];
  if (Array.isArray(customer.linkedDeviceIds) && customer.linkedDeviceIds.length > 0) {
    return customer.linkedDeviceIds.map((id) => String(id || "").trim().toUpperCase()).filter(Boolean);
  }
  if (customer.linkedDeviceId) {
    return String(customer.linkedDeviceId).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  }
  return [];
}

function safeCustomerAccount(customer) {
  const linkedDeviceIds = getCustomerLinkedDeviceIds(customer);
  return {
    id: customer.id,
    fullName: customer.fullName || "",
    username: customer.username || "",
    linkedDeviceId: linkedDeviceIds[0] || "",
    linkedDeviceIds,
    active: customer.active !== false,
    createdAt: customer.createdAt || ""
  };
}

function parseCookies(req) {
  const source = req.headers.cookie || "";
  return source.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (key) acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60; // 30 days = 2,592,000 seconds

function cookieOptions(req, maxAge = THIRTY_DAYS_SEC) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  const isSecureRequest = req.socket.encrypted || forwardedProto.includes("https") || String(req.headers.host || "").includes("billing.stechmm.com");
  const parts = ["HttpOnly", "Path=/", "SameSite=Lax"];
  if (typeof maxAge === "number") {
    parts.push(`Max-Age=${maxAge}`);
    const expiresDate = new Date(Date.now() + maxAge * 1000).toUTCString();
    parts.push(`Expires=${expiresDate}`);
  }
  if (isSecureRequest) parts.push("Secure");
  return parts.join("; ");
}

function json(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function readBody(req, maxBytes = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const ATTACHMENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav"
};

function saveChatAttachment(payload) {
  if (!payload) return null;
  const kind = payload.kind === "receipt" ? "receipt" : payload.kind === "audio" ? "audio" : "";
  const match = String(payload.dataUrl || "").match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=]+)$/i);
  if (!kind || !match) throw new Error("Invalid attachment");
  const mime = match[1].toLowerCase();
  const extension = ATTACHMENT_TYPES[mime];
  if (!extension || (kind === "receipt" && !mime.startsWith("image/") && mime !== "application/pdf") || (kind === "audio" && !mime.startsWith("audio/"))) {
    throw new Error("Unsupported attachment type");
  }
  const data = Buffer.from(match[2], "base64");
  if (!data.length || data.length > MAX_ATTACHMENT_BYTES) throw new Error("Attachment must be 8 MB or smaller");
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const id = makeId();
  const storageName = `${id}.${extension}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, storageName), data);
  return {
    id,
    kind,
    mime,
    storageName,
    name: String(payload.name || (kind === "receipt" ? `receipt.${extension}` : `voice.${extension}`)).slice(0, 160),
    size: data.length
  };
}

function serveChatAttachment(req, res, pathname, db) {
  const id = decodeURIComponent(pathname.slice("/api/chat/attachment/".length));
  const message = db.supportMessages.find((item) => item.attachment?.id === id);
  if (!message) return notFound(res);
  const customer = getCurrentCustomer(req, db);
  const user = getCurrentUser(req, db);
  const allowed = customer?.id === message.customerId || (user && canAccess(user, "supportPage"));
  if (!allowed) return json(res, 401, { error: "Unauthorized" });
  const attachment = message.attachment;
  const filePath = path.join(UPLOAD_DIR, path.basename(attachment.storageName || ""));
  if (!attachment.storageName || !filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) return notFound(res);
  res.writeHead(200, {
    "Content-Type": attachment.mime || "application/octet-stream",
    "Content-Length": fs.statSync(filePath).size,
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff"
  });
  fs.createReadStream(filePath).pipe(res);
}

const sessions = new Map();
const customerSessions = new Map();
const realtimeClients = new Set();

function broadcastRealtime(event, predicate = () => true) {
  const payload = JSON.stringify(event);
  realtimeClients.forEach((client) => {
    if (client.socket.readyState === 1 && predicate(client)) client.socket.send(payload);
  });
}

function createSession(userId, db) {
  const sid = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + (THIRTY_DAYS_SEC * 1000);
  sessions.set(sid, { userId, createdAt: Date.now(), expiresAt });
  if (db) {
    if (!db.sessions) db.sessions = {};
    db.sessions[sid] = { userId, createdAt: Date.now(), expiresAt };
  }
  return sid;
}

function getCurrentUser(req, db) {
  const cookies = parseCookies(req);
  const authHeader = String(req.headers.authorization || "").trim();
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const sid = cookies[SESSION_COOKIE] || bearerToken;
  if (!sid) return null;
  let session = sessions.get(sid);
  if (!session && db?.sessions?.[sid]) {
    session = db.sessions[sid];
    sessions.set(sid, session);
  }
  if (!session) return null;
  if (session.expiresAt && session.expiresAt < Date.now()) {
    sessions.delete(sid);
    if (db?.sessions) delete db.sessions[sid];
    return null;
  }
  return db.users.find((user) => user.id === session.userId) || null;
}

function clearSession(req, res, db) {
  const cookies = parseCookies(req);
  const authHeader = String(req.headers.authorization || "").trim();
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const sid = cookies[SESSION_COOKIE] || bearerToken;
  if (sid) {
    sessions.delete(sid);
    if (db?.sessions) delete db.sessions[sid];
  }
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; ${cookieOptions(req, 0)}`);
}

function createCustomerSession(customerId, db) {
  const sid = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + (THIRTY_DAYS_SEC * 1000);
  customerSessions.set(sid, { customerId, createdAt: Date.now(), expiresAt });
  if (db) {
    if (!db.customerSessions) db.customerSessions = {};
    db.customerSessions[sid] = { customerId, createdAt: Date.now(), expiresAt };
  }
  return sid;
}

function getCurrentCustomer(req, db) {
  const cookies = parseCookies(req);
  const authHeader = String(req.headers.authorization || "").trim();
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const sid = cookies[CUSTOMER_SESSION_COOKIE] || bearerToken;
  if (!sid) return null;
  let session = customerSessions.get(sid);
  if (!session && db?.customerSessions?.[sid]) {
    session = db.customerSessions[sid];
    customerSessions.set(sid, session);
  }
  if (!session) return null;
  if (session.expiresAt && session.expiresAt < Date.now()) {
    customerSessions.delete(sid);
    if (db?.customerSessions) delete db.customerSessions[sid];
    return null;
  }
  return db.customerAccounts.find((customer) => customer.id === session.customerId && customer.active !== false) || null;
}

function clearCustomerSession(req, res, db) {
  const cookies = parseCookies(req);
  const sid = cookies[CUSTOMER_SESSION_COOKIE];
  if (sid) {
    customerSessions.delete(sid);
    if (db?.customerSessions) delete db.customerSessions[sid];
  }
  res.setHeader("Set-Cookie", `${CUSTOMER_SESSION_COOKIE}=; ${cookieOptions(req, 0)}`);
}

function requireCustomer(req, res, db) {
  const customer = getCurrentCustomer(req, db);
  if (!customer) {
    json(res, 401, { error: "Customer login required" });
    return null;
  }
  return customer;
}

function requireUser(req, res, db) {
  const user = getCurrentUser(req, db);
  if (!user) {
    json(res, 401, { error: "Unauthorized" });
    return null;
  }
  return user;
}

function canAccess(user, tab) {
  if (tab === "adminPage") return user.role === "admin";
  return user.role === "admin" || (user.allowedTabs || []).includes(tab);
}

function requireTab(user, tab, res) {
  if (!canAccess(user, tab)) {
    json(res, 403, { error: "Forbidden" });
    return false;
  }
  return true;
}

function requireAdmin(user, res) {
  if (user.role !== "admin") {
    json(res, 403, { error: "Admin only" });
    return false;
  }
  return true;
}

function buildBootstrap(db, user) {
  ensureActiveMonth(db);
  ensureUsageRecords(db);
  ensureUserPermissions(db);
  ensureCustomerFeatures(db);
  ensureAppSettings(db);
  return {
    user: safeUser(user),
    activeMonth: db.activeMonth,
    activePage: db.activePage && canAccess(user, db.activePage) ? db.activePage : user.role === "admin" ? "dashboardPage" : (user.allowedTabs[0] || "dashboardPage"),
    months: canAccess(user, "cashPage") ? db.months : {},
    billRecords: canAccess(user, "billPage") || canAccess(user, "dashboardPage") ? db.billRecords : [],
    deviceRecords: canAccess(user, "devicePage") ? db.deviceRecords : [],
    usageRecords: canAccess(user, "usagePage") || canAccess(user, "dashboardPage") ? db.usageRecords : [],
    users: user.role === "admin" ? db.users.map(safeUser) : [],
    customerAccounts: canAccess(user, "supportPage") || user.role === "admin" ? db.customerAccounts.map(safeCustomerAccount) : [],
    announcements: canAccess(user, "supportPage") || user.role === "admin" ? db.announcements : [],
    supportMessages: canAccess(user, "supportPage") || user.role === "admin" ? db.supportMessages : [],
    appSettings: db.appSettings
  };
}

function buildCustomerBootstrap(db, customer) {
  ensureActiveMonth(db);
  ensureUsageRecords(db);
  ensureCustomerFeatures(db);
  ensureAppSettings(db);
  
  const linkedDeviceIds = getCustomerLinkedDeviceIds(customer);
  
  const matchedDevices = [];
  const seenIds = new Set();

  // 1. Check all explicitly linked device IDs
  linkedDeviceIds.forEach((id) => {
    const devId = String(id || "").trim().toUpperCase();
    if (!devId) return;
    const existing = db.deviceRecords.find((item) => String(item.deviceId || "").trim().toUpperCase() === devId);
    if (existing) {
      matchedDevices.push(existing);
      seenIds.add(devId);
    } else {
      matchedDevices.push({
        deviceId: id,
        name: customer.fullName || id,
        email: customer.username || "",
        serialNumber: "-",
        kitNumber: "-",
        serviceAddress: "-",
        region: "PH",
        planStatus: "normal",
        cycleResetDay: 28,
        active: true
      });
      seenIds.add(devId);
    }
  });

  // 2. Also match by customer username/email or fullName
  db.deviceRecords.forEach((item) => {
    const devId = String(item.deviceId || "").trim().toUpperCase();
    if (devId && !seenIds.has(devId)) {
      const matchEmail = customer.username && item.email && String(item.email).trim().toLowerCase() === String(customer.username).trim().toLowerCase();
      const matchName = customer.fullName && item.name && String(item.name).trim().toLowerCase() === String(customer.fullName).trim().toLowerCase();
      if (matchEmail || matchName) {
        matchedDevices.push(item);
        seenIds.add(devId);
      }
    }
  });

  // Build device list with their respective usage & bill
  const devicesList = matchedDevices.map((device) => {
    const devId = String(device.deviceId || "").trim().toUpperCase();
    const usage = db.usageRecords.find((item) => (
      String(item.monthKey || "") === db.activeMonth &&
      String(item.machine || "").trim().toUpperCase() === devId
    )) || null;
    const bill = db.billRecords.find((item) => String(item.machine || "").trim().toUpperCase() === devId) || null;
    return {
      deviceId: device.deviceId || "",
      name: device.name || "",
      email: device.email || "",
      serialNumber: device.serialNumber || "",
      kitNumber: device.kitNumber || "",
      serviceAddress: device.serviceAddress || "",
      region: device.region || "",
      planStatus: device.planStatus || "normal",
      cycleResetDay: device.cycleResetDay || 28,
      active: device.active !== false,
      usage,
      bill: bill ? {
        machine: bill.machine || "",
        billDate: bill.billDate || "",
        cutOffDate: bill.cutOffDate || "",
        billType: bill.billType || "",
        status: bill.status || "",
        money: bill.money || ""
      } : null
    };
  });

  // Calculate fleet combined usage & detect near-limit devices (>= 4.8 TB for 5TB plan, or >= 1.9 TB for 2TB plan)
  let totalUsageTB = 0;
  let unpaidCount = 0;
  let activeCount = 0;
  const nearLimitDevices = [];

  devicesList.forEach((d) => {
    const daily = d.usage?.dailyUsage || {};
    const sumDaily = Object.values(daily).reduce((a, b) => a + Number(b || 0), 0);
    const legacy = Number(d.usage?.legacyUsageTB || 0);
    const usedTB = sumDaily + legacy;
    totalUsageTB += usedTB;
    
    const limitTB = d.planStatus === "discount" ? 2.0 : 5.0;
    const thresholdTB = d.planStatus === "discount" ? 1.9 : 4.8;
    
    if (usedTB >= thresholdTB) {
      nearLimitDevices.push({
        deviceId: d.deviceId,
        usedTB: Number(usedTB.toFixed(2)),
        limitTB,
        percent: Math.min(100, Math.round((usedTB / limitTB) * 100))
      });
    }

    if (d.bill?.status === "unpaid") unpaidCount++;
    if (d.active !== false && d.bill?.status !== "inactive" && d.bill?.status !== "suspended") activeCount++;
  });

  const staffNames = new Map(db.users.map((item) => [item.id, item.fullName || item.username || "Support"]));
  const messages = db.supportMessages
    .filter((item) => item.customerId === customer.id)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map((item) => ({
      ...item,
      senderName: item.senderType === "customer" ? customer.fullName : (staffNames.get(item.senderId) || "SpaceLink Support")
    }));

  const primaryDevice = devicesList[0] || null;

  return {
    customer: safeCustomerAccount(customer),
    activeMonth: db.activeMonth,
    devices: devicesList,
    device: primaryDevice,
    usage: primaryDevice?.usage || null,
    bill: primaryDevice?.bill || null,
    fleetSummary: {
      totalDevices: devicesList.length,
      activeCount,
      unpaidCount,
      totalUsageTB: Number(totalUsageTB.toFixed(2)),
      nearLimitCount: nearLimitDevices.length,
      nearLimitDevices
    },
    usageRecords: db.usageRecords.filter((item) => {
      const m = String(item.machine || "").trim().toUpperCase();
      return linkedDeviceIds.includes(m) || devicesList.some((d) => d.deviceId.toUpperCase() === m);
    }),
    announcements: db.announcements
      .filter((item) => item.active !== false)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
    messages,
    appSettings: db.appSettings
  };
}

function serveStatic(req, res, pathname) {
  const relative = pathname === "/"
    ? "/index.html"
    : (pathname === "/customer" || pathname === "/customer/") ? "/customer.html" : pathname;
  const filePath = path.join(APP_DIR, relative);
  if (!filePath.startsWith(APP_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return notFound(res);
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": STATIC_TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, "\"\"")}"`).join(",")).join("\n");
}

function formatDateInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(dateText, days) {
  if (!dateText) return "";
  const base = new Date(dateText);
  if (Number.isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + days);
  return formatDateInput(base);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dateInMonth(dateText, monthKey) {
  if (!/^\d{4}-\d{2}$/.test(monthKey || "") || !/^\d{4}-\d{2}-\d{2}$/.test(dateText || "")) return dateText || "";
  const [year, month] = monthKey.split("-").map(Number);
  const originalDay = Number(dateText.slice(8, 10));
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthKey}-${String(Math.min(originalDay, lastDay)).padStart(2, "0")}`;
}

function shiftDateByMonths(dateText, monthCount) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || "") || !Number.isInteger(monthCount)) return dateText || "";
  const [year, month, day] = dateText.split("-").map(Number);
  const targetIndex = (year * 12) + (month - 1) + monthCount;
  const targetYear = Math.floor(targetIndex / 12);
  const targetMonth = targetIndex % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function monthDistance(fromMonth, toMonth) {
  if (!/^\d{4}-\d{2}$/.test(fromMonth || "") || !/^\d{4}-\d{2}$/.test(toMonth || "")) return 0;
  const [fromYear, fromValue] = fromMonth.split("-").map(Number);
  const [toYear, toValue] = toMonth.split("-").map(Number);
  return ((toYear - fromYear) * 12) + (toValue - fromValue);
}

function rollBillRecordsToMonth(db, monthKey) {
  if (!Array.isArray(db.billRecords) || !/^\d{4}-\d{2}$/.test(monthKey || "")) return;
  db.billRecords = db.billRecords.map((record) => {
    const inferredCycle = /^\d{4}-\d{2}$/.test(record.cycleMonth || "")
      ? record.cycleMonth
      : /^\d{4}-\d{2}/.test(record.billDate || "") ? record.billDate.slice(0, 7) : monthKey;
    if (record.status === "inactive" || inferredCycle >= monthKey) {
      return record.cycleMonth ? record : { ...record, cycleMonth: inferredCycle };
    }

    const cycleHistory = Array.isArray(record.cycleHistory) ? [...record.cycleHistory] : [];
    if (!cycleHistory.some((item) => item.monthKey === inferredCycle)) {
      cycleHistory.push({
        monthKey: inferredCycle,
        submittedDate: record.submittedDate || "",
        billDate: record.billDate || "",
        cutOffDate: record.cutOffDate || "",
        status: record.status || "sent_unpaid",
        money: record.money || "",
        autoPaid: Boolean(record.autoPaid)
      });
    }

    const billMonth = /^\d{4}-\d{2}/.test(record.billDate || "") ? record.billDate.slice(0, 7) : inferredCycle;
    const billDate = dateInMonth(record.billDate, monthKey);
    const monthShift = monthDistance(billMonth, monthKey);
    return {
      ...record,
      submittedDate: shiftDateByMonths(record.submittedDate, monthShift),
      billDate,
      cutOffDate: billDate ? shiftDate(billDate, -7) : "",
      status: "sent_unpaid",
      money: "",
      autoPaid: false,
      cycleMonth: monthKey,
      cycleHistory
    };
  });
}

function collectMatchedMachinesFromLedger(db) {
  if (!db?.months || !Array.isArray(db.billRecords) || !db.billRecords.length) {
    return new Set();
  }

  const machineList = db.billRecords
    .map((record) => String(record.machine || "").trim())
    .filter(Boolean);

  const matchedMachines = new Set();
  const month = db.months[db.activeMonth];
  const entries = Array.isArray(month?.entries) ? month.entries : [];
  entries.forEach((entry) => {
    const description = String(entry.description || "").trim().toUpperCase();
    if (!description) return;
    machineList.forEach((machine) => {
      const pattern = new RegExp(`(^|[^A-Z0-9])${escapeRegex(machine.toUpperCase())}([^A-Z0-9]|$)`);
      if (pattern.test(description)) matchedMachines.add(machine);
    });
  });

  return matchedMachines;
}

function reconcileBillStatusFromLedger(db) {
  if (!Array.isArray(db.billRecords) || !db.billRecords.length) return;

  const matchedMachines = collectMatchedMachinesFromLedger(db);
  db.billRecords = db.billRecords.map((record) => {
    const machine = String(record.machine || "").trim();
    if (!machine || record.status === "inactive") {
      return { ...record, autoPaid: false };
    }

    if (matchedMachines.has(machine)) {
      if (record.status === "sent_unpaid" || record.autoPaid) {
        return {
          ...record,
          status: "paid_done",
          money: record.money || "done",
          autoPaid: true
        };
      }
      return { ...record, autoPaid: false };
    }

    if (record.autoPaid) {
      return {
        ...record,
        status: "sent_unpaid",
        money: record.money === "done" ? "" : record.money,
        autoPaid: false
      };
    }

    return { ...record, autoPaid: false };
  });
}

function syncDeviceIntoBillRecords(db, deviceRecord, previousDeviceRecord = null) {
  if (!deviceRecord) return;

  const deviceId = String(deviceRecord.deviceId || "").trim();
  const previousDeviceId = String(previousDeviceRecord?.deviceId || "").trim();
  const linkedId = String(deviceRecord.id || "");

  let billIndex = db.billRecords.findIndex((item) => String(item.linkedDeviceRecordId || "") === linkedId);

  if (billIndex < 0 && deviceId) {
    billIndex = db.billRecords.findIndex((item) => String(item.machine || "").trim().toUpperCase() === deviceId.toUpperCase());
  }

  if (!deviceId) {
    if (billIndex >= 0 && db.billRecords[billIndex].autoCreatedFromDevice) {
      db.billRecords.splice(billIndex, 1);
    }
    return;
  }

  if (billIndex >= 0) {
    const current = db.billRecords[billIndex];
    db.billRecords[billIndex] = {
      ...current,
      machine: deviceId,
      customer: current.customer || deviceRecord.name || "",
      linkedDeviceRecordId: linkedId,
      autoCreatedFromDevice: current.autoCreatedFromDevice ?? true
    };
    return;
  }

  db.billRecords.push({
    id: makeId(),
    machine: deviceId,
    submittedDate: "",
    billDate: "",
    cutOffDate: "",
    billType: "",
    status: "sent_unpaid",
    money: "",
    customer: deviceRecord.name || "",
    autoPaid: false,
    cycleMonth: db.activeMonth,
    cycleHistory: [],
    linkedDeviceRecordId: linkedId,
    autoCreatedFromDevice: true
  });

  if (previousDeviceId && previousDeviceId.toUpperCase() !== deviceId.toUpperCase()) {
    db.billRecords = db.billRecords.filter((item) => {
      return !(
        item.autoCreatedFromDevice &&
        String(item.linkedDeviceRecordId || "") === linkedId &&
        String(item.machine || "").trim().toUpperCase() === previousDeviceId.toUpperCase()
      );
    });
  }
}

async function handleApi(req, res, pathname) {
  const db = await readDb();
  ensureUsageRecords(db);
  ensureUserPermissions(db);
  ensureCustomerFeatures(db);

  if (pathname === "/api/health" && req.method === "GET") {
    const storage = await storageInfo();
    return json(res, 200, {
      ok: true,
      app: "SpaceLink S-Tech Billing",
      version: "8.0.1-live",
      environment: process.env.NODE_ENV || "development",
      usersCount: (db.users || []).length,
      customersCount: (db.customerAccounts || []).length,
      storage
    });
  }

  if (pathname === "/api/session" && req.method === "GET") {
    const user = getCurrentUser(req, db);
    return json(res, 200, { user: user ? safeUser(user) : null });
  }

  if (pathname === "/api/login" && req.method === "POST") {
    const body = await readBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    const user = db.users.find((item) => String(item.username || "").trim().toLowerCase() === username);
    if (!user || !verifyPassword(String(body.password || ""), user.passwordHash || user.password)) {
      return json(res, 401, { error: "Invalid username or password" });
    }
    const sid = createSession(user.id, db);
    await writeDb(db);
    return json(
      res,
      200,
      { user: safeUser(user), sid, token: sid },
      { "Set-Cookie": `${SESSION_COOKIE}=${sid}; ${cookieOptions(req)}` }
    );
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    clearSession(req, res, db);
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/customer/session" && req.method === "GET") {
    const customer = getCurrentCustomer(req, db);
    return json(res, 200, { customer: customer ? safeCustomerAccount(customer) : null });
  }

  if (pathname === "/api/customer/login" && req.method === "POST") {
    const body = await readBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    const customer = db.customerAccounts.find((item) => String(item.username || "").trim().toLowerCase() === username);
    if (!customer || customer.active === false || !verifyPassword(String(body.password || ""), customer.passwordHash || customer.password)) {
      return json(res, 401, { error: "Invalid username or password" });
    }
    const sid = createCustomerSession(customer.id, db);
    await writeDb(db);
    return json(res, 200, { customer: safeCustomerAccount(customer), sid, token: sid }, {
      "Set-Cookie": `${CUSTOMER_SESSION_COOKIE}=${sid}; ${cookieOptions(req)}`
    });
  }

  if (pathname === "/api/customer/logout" && req.method === "POST") {
    clearCustomerSession(req, res, db);
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/customer/bootstrap" && req.method === "GET") {
    const customer = requireCustomer(req, res, db);
    if (!customer) return;
    ensureActiveMonth(db);
    await writeDb(db);
    return json(res, 200, buildCustomerBootstrap(db, customer));
  }

  if (pathname.startsWith("/api/chat/attachment/") && req.method === "GET") {
    return serveChatAttachment(req, res, pathname, db);
  }

  if (pathname === "/api/customer/messages" && req.method === "POST") {
    const customer = requireCustomer(req, res, db);
    if (!customer) return;
    const body = await readBody(req);
    const message = String(body.message || "").trim();
    let attachment = null;
    try {
      attachment = saveChatAttachment(body.attachment);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
    if (!message && !attachment) return json(res, 400, { error: "Message or attachment is required" });
    let replyTo = null;
    if (body.replyTo && body.replyTo.id) {
      replyTo = {
        id: String(body.replyTo.id),
        senderName: String(body.replyTo.senderName || "User"),
        text: String(body.replyTo.text || "").slice(0, 150)
      };
    }

    db.supportMessages.push({
      id: makeId(),
      customerId: customer.id,
      senderType: "customer",
      senderId: customer.id,
      topic: "conversation",
      message,
      attachment,
      replyTo,
      reactions: {},
      createdAt: new Date().toISOString(),
      readByCustomer: true,
      readByStaff: false
    });
    await writeDb(db);
    broadcastRealtime({ type: "support_message", customerId: customer.id }, (client) => client.kind === "staff" || client.customerId === customer.id);

    // Send Real-time Telegram Alert to Admin
    const devInfo = customer.linkedDeviceId || (Array.isArray(customer.linkedDeviceIds) && customer.linkedDeviceIds.length > 0 ? customer.linkedDeviceIds.join(", ") : "-");
    const hasImage = Boolean(attachment);
    const alertText = `💬 <b>New Support Message</b>\n👤 <b>Customer:</b> ${customer.fullName || customer.username}\n📟 <b>Device:</b> ${devInfo}\n📝 <b>Message:</b> ${message || (hasImage ? "📷 [Sent an Image / Payment Slip]" : "")}`;
    sendTelegramNotification(db, alertText);

    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/customer/messages/edit" && req.method === "POST") {
    const customer = requireCustomer(req, res, db);
    if (!customer) return;
    const body = await readBody(req);
    const messageId = String(body.messageId || "").trim();
    const newText = String(body.message || "").trim();
    if (!messageId || !newText) return json(res, 400, { error: "Message ID and text are required" });
    if (newText.length > 2000) return json(res, 400, { error: "Message is too long" });

    const msg = db.supportMessages.find((m) => m.id === messageId && m.customerId === customer.id);
    if (!msg) return json(res, 404, { error: "Message not found" });
    if (msg.senderType !== "customer") return json(res, 403, { error: "Permission denied" });
    if (msg.isDeleted) return json(res, 400, { error: "Cannot edit deleted message" });

    msg.message = newText;
    msg.editedAt = new Date().toISOString();
    await writeDb(db);
    broadcastRealtime({ type: "support_message_edit", customerId: customer.id, messageId, message: newText, editedAt: msg.editedAt }, (client) => client.kind === "staff" || client.customerId === customer.id);
    return json(res, 200, { ok: true, message: msg });
  }

  if (pathname === "/api/customer/messages/delete" && req.method === "POST") {
    const customer = requireCustomer(req, res, db);
    if (!customer) return;
    const body = await readBody(req);
    const messageId = String(body.messageId || "").trim();
    const msg = db.supportMessages.find((m) => m.id === messageId && m.customerId === customer.id);
    if (!msg) return json(res, 404, { error: "Message not found" });
    if (msg.senderType !== "customer") return json(res, 403, { error: "Permission denied" });

    msg.isDeleted = true;
    msg.message = "This message was deleted";
    msg.attachment = null;
    msg.deletedAt = new Date().toISOString();
    await writeDb(db);
    broadcastRealtime({ type: "support_message_delete", customerId: customer.id, messageId }, (client) => client.kind === "staff" || client.customerId === customer.id);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/customer/messages/react" && req.method === "POST") {
    const customer = requireCustomer(req, res, db);
    if (!customer) return;
    const body = await readBody(req);
    const messageId = String(body.messageId || "").trim();
    const emoji = String(body.emoji || "").trim();
    if (!messageId || !emoji) return json(res, 400, { error: "Message ID and emoji are required" });

    const msg = db.supportMessages.find((m) => m.id === messageId && m.customerId === customer.id);
    if (!msg) return json(res, 404, { error: "Message not found" });
    if (!msg.reactions || typeof msg.reactions !== "object") msg.reactions = {};

    const reactorId = `c_${customer.id}`;
    if (!Array.isArray(msg.reactions[emoji])) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(reactorId);
    if (idx >= 0) {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].push(reactorId);
    }

    await writeDb(db);
    broadcastRealtime({ type: "support_message_react", customerId: customer.id, messageId, reactions: msg.reactions }, (client) => client.kind === "staff" || client.customerId === customer.id);
    return json(res, 200, { ok: true, reactions: msg.reactions });
  }

  if (pathname === "/api/customer/messages/read" && req.method === "POST") {
    const customer = requireCustomer(req, res, db);
    if (!customer) return;
    db.supportMessages = db.supportMessages.map((item) => (
      item.customerId === customer.id && item.senderType === "staff" ? { ...item, readByCustomer: true } : item
    ));
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  const user = requireUser(req, res, db);
  if (!user) return;

  if (pathname === "/api/bootstrap" && req.method === "GET") {
    ensureActiveMonth(db);
    await writeDb(db);
    return json(res, 200, buildBootstrap(db, user));
  }

  if (pathname === "/api/customer-accounts/record" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    const record = body.record || {};
    const username = String(record.username || "").trim();
    
    let linkedDeviceIds = [];
    if (Array.isArray(record.linkedDeviceIds) && record.linkedDeviceIds.length > 0) {
      linkedDeviceIds = record.linkedDeviceIds.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
    } else if (record.linkedDeviceId) {
      linkedDeviceIds = String(record.linkedDeviceId).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    }
    
    if (!username || linkedDeviceIds.length === 0) {
      return json(res, 400, { error: "Username and at least one linked Machine/Device ID are required" });
    }
    const duplicate = db.customerAccounts.find((item) => (
      item.id !== record.id && String(item.username || "").trim().toLowerCase() === username.toLowerCase()
    ));
    if (duplicate) return json(res, 409, { error: "Customer username already exists" });
    const index = db.customerAccounts.findIndex((item) => item.id === record.id);
    const existing = index >= 0 ? db.customerAccounts[index] : null;
    if (!existing && !record.password) return json(res, 400, { error: "Password is required" });
    const payload = {
      id: existing?.id || makeId(),
      fullName: String(record.fullName || "").trim(),
      username,
      linkedDeviceId: linkedDeviceIds[0] || "",
      linkedDeviceIds,
      active: record.active !== false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      passwordHash: record.password ? hashPassword(String(record.password)) : existing.passwordHash
    };
    if (index >= 0) db.customerAccounts.splice(index, 1, payload);
    else db.customerAccounts.push(payload);
    db.customerAccounts.sort((a, b) => String(a.fullName || a.username || "").localeCompare(String(b.fullName || b.username || "")));
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/customer-accounts/record" && req.method === "DELETE") {
    if (!requireAdmin(user, res)) return;
    const target = new URL(req.url, `http://${req.headers.host}`);
    const id = target.searchParams.get("id");
    db.customerAccounts = db.customerAccounts.filter((item) => item.id !== id);
    db.supportMessages = db.supportMessages.filter((item) => item.customerId !== id);
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/announcements/record" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    const record = body.record || {};
    const title = String(record.title || "").trim();
    const message = String(record.message || "").trim();
    if (!title || !message) return json(res, 400, { error: "Title and announcement are required" });
    const index = db.announcements.findIndex((item) => item.id === record.id);
    const existing = index >= 0 ? db.announcements[index] : null;
    const payload = {
      id: existing?.id || makeId(), title, message,
      type: ["general", "billing", "maintenance"].includes(record.type) ? record.type : "general",
      active: record.active !== false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: user.id
    };
    if (index >= 0) db.announcements.splice(index, 1, payload);
    else db.announcements.push(payload);

    // Auto-broadcast announcement into all active customers' support chat
    if (payload.active) {
      const typeIcons = { general: "📢", billing: "💳", maintenance: "🔧" };
      const icon = typeIcons[payload.type] || "📢";
      const formattedAnnouncement = `${icon} <b>[ANNOUNCEMENT] ${title}</b>\n\n${message}`;
      const nowIso = new Date().toISOString();
      (db.customerAccounts || []).forEach((cust) => {
        if (cust.active === false) return;
        const hasExistingMsg = existing && db.supportMessages.some(m => m.announcementId === payload.id && m.customerId === cust.id);
        if (!hasExistingMsg) {
          db.supportMessages.push({
            id: makeId(),
            customerId: cust.id,
            senderType: "staff",
            senderId: user.id,
            topic: "announcement",
            announcementId: payload.id,
            message: formattedAnnouncement,
            attachment: null,
            reactions: {},
            createdAt: nowIso,
            readByCustomer: false,
            readByStaff: true
          });
        }
      });
      broadcastRealtime({ type: "support_message" });
    }

    await writeDb(db);
    broadcastRealtime({ type: "announcement_updated" });
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/announcements/record" && req.method === "DELETE") {
    if (!requireAdmin(user, res)) return;
    const target = new URL(req.url, `http://${req.headers.host}`);
    const id = target.searchParams.get("id");
    db.announcements = db.announcements.filter((item) => item.id !== id);
    await writeDb(db);
    broadcastRealtime({ type: "announcement_updated" });
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/support/broadcast" && req.method === "POST") {
    if (!requireTab(user, "supportPage", res)) return;
    const body = await readBody(req);
    const rawMessage = String(body.message || "").trim();
    const title = String(body.title || "").trim();
    const topic = String(body.topic || "announcement").trim();
    const alsoAnnouncement = body.alsoAnnouncement === true;
    
    if (!rawMessage) return json(res, 400, { error: "Message is required" });
    if (rawMessage.length > 3000) return json(res, 400, { error: "Message is too long" });

    let attachment = null;
    try {
      attachment = saveChatAttachment(body.attachment);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }

    const topicIcons = {
      announcement: "📢",
      maintenance: "🔧",
      billing: "💳",
      promotion: "🎁",
      urgent: "🚨",
      general: "💬"
    };
    const icon = topicIcons[topic] || "📢";
    const headerPrefix = title ? `${icon} <b>[${title.toUpperCase()}]</b>\n\n` : `${icon} `;
    const fullMessage = title ? `${headerPrefix}${rawMessage}` : `${icon} ${rawMessage}`;

    const activeCustomers = (db.customerAccounts || []).filter(c => c.active !== false);
    if (!activeCustomers.length) {
      return json(res, 400, { error: "No active customer accounts found to broadcast" });
    }

    const nowIso = new Date().toISOString();
    const broadcastId = makeId();

    activeCustomers.forEach((cust) => {
      db.supportMessages.push({
        id: makeId(),
        customerId: cust.id,
        senderType: "staff",
        senderId: user.id,
        topic,
        broadcastId,
        message: fullMessage,
        attachment: attachment ? { ...attachment } : null,
        reactions: {},
        createdAt: nowIso,
        readByCustomer: false,
        readByStaff: true
      });
    });

    if (alsoAnnouncement) {
      const annType = ["billing", "maintenance"].includes(topic) ? topic : "general";
      db.announcements.push({
        id: broadcastId,
        title: title || `${icon} General Notice`,
        message: rawMessage,
        type: annType,
        active: true,
        createdAt: nowIso,
        updatedAt: nowIso,
        authorId: user.id
      });
      broadcastRealtime({ type: "announcement_updated" });
    }

    await writeDb(db);
    broadcastRealtime({ type: "support_message" });
    return json(res, 200, { ok: true, count: activeCustomers.length });
  }

  if (pathname === "/api/support/message" && req.method === "POST") {
    if (!requireTab(user, "supportPage", res)) return;
    const body = await readBody(req);
    const customerId = String(body.customerId || "").trim();
    const message = String(body.message || "").trim();
    if (!db.customerAccounts.some((item) => item.id === customerId)) return json(res, 404, { error: "Customer not found" });
    let attachment = null;
    try {
      attachment = saveChatAttachment(body.attachment);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
    if (!message && !attachment) return json(res, 400, { error: "Message or attachment is required" });
    if (message.length > 2000) return json(res, 400, { error: "Message is too long" });

    let replyTo = null;
    if (body.replyTo && body.replyTo.id) {
      replyTo = {
        id: String(body.replyTo.id),
        senderName: String(body.replyTo.senderName || "Customer"),
        text: String(body.replyTo.text || "").slice(0, 150)
      };
    }

    db.supportMessages.push({
      id: makeId(),
      customerId,
      senderType: "staff",
      senderId: user.id,
      topic: "conversation",
      message,
      attachment,
      replyTo,
      reactions: {},
      createdAt: new Date().toISOString(),
      readByCustomer: false,
      readByStaff: true
    });
    await writeDb(db);
    broadcastRealtime({ type: "support_message", customerId }, (client) => client.kind === "staff" || client.customerId === customerId);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/support/messages/edit" && req.method === "POST") {
    if (!requireTab(user, "supportPage", res)) return;
    const body = await readBody(req);
    const messageId = String(body.messageId || "").trim();
    const newText = String(body.message || "").trim();
    if (!messageId || !newText) return json(res, 400, { error: "Message ID and text are required" });
    if (newText.length > 2000) return json(res, 400, { error: "Message is too long" });

    const msg = db.supportMessages.find((m) => m.id === messageId);
    if (!msg) return json(res, 404, { error: "Message not found" });
    if (msg.senderType !== "staff" && user.role !== "admin") return json(res, 403, { error: "Permission denied" });
    if (msg.isDeleted) return json(res, 400, { error: "Cannot edit deleted message" });

    msg.message = newText;
    msg.editedAt = new Date().toISOString();
    await writeDb(db);
    broadcastRealtime({ type: "support_message_edit", customerId: msg.customerId, messageId, message: newText, editedAt: msg.editedAt }, (client) => client.kind === "staff" || client.customerId === msg.customerId);
    return json(res, 200, { ok: true, message: msg });
  }

  if (pathname === "/api/support/messages/delete" && req.method === "POST") {
    if (!requireTab(user, "supportPage", res)) return;
    const body = await readBody(req);
    const messageId = String(body.messageId || "").trim();
    const msg = db.supportMessages.find((m) => m.id === messageId);
    if (!msg) return json(res, 404, { error: "Message not found" });
    if (msg.senderType !== "staff" && user.role !== "admin") return json(res, 403, { error: "Permission denied" });

    msg.isDeleted = true;
    msg.message = "This message was deleted";
    msg.attachment = null;
    msg.deletedAt = new Date().toISOString();
    await writeDb(db);
    broadcastRealtime({ type: "support_message_delete", customerId: msg.customerId, messageId }, (client) => client.kind === "staff" || client.customerId === msg.customerId);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/support/messages/react" && req.method === "POST") {
    if (!requireTab(user, "supportPage", res)) return;
    const body = await readBody(req);
    const messageId = String(body.messageId || "").trim();
    const emoji = String(body.emoji || "").trim();
    if (!messageId || !emoji) return json(res, 400, { error: "Message ID and emoji are required" });

    const msg = db.supportMessages.find((m) => m.id === messageId);
    if (!msg) return json(res, 404, { error: "Message not found" });
    if (!msg.reactions || typeof msg.reactions !== "object") msg.reactions = {};

    const reactorId = `s_${user.id}`;
    if (!Array.isArray(msg.reactions[emoji])) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(reactorId);
    if (idx >= 0) {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].push(reactorId);
    }

    await writeDb(db);
    broadcastRealtime({ type: "support_message_react", customerId: msg.customerId, messageId, reactions: msg.reactions }, (client) => client.kind === "staff" || client.customerId === msg.customerId);
    return json(res, 200, { ok: true, reactions: msg.reactions });
  }

  if (pathname === "/api/support/read" && req.method === "POST") {
    if (!requireTab(user, "supportPage", res)) return;
    const body = await readBody(req);
    const customerId = String(body.customerId || "").trim();
    db.supportMessages = db.supportMessages.map((item) => (
      item.customerId === customerId && item.senderType === "customer" ? { ...item, readByStaff: true } : item
    ));
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/cash/opening" && req.method === "POST") {
    if (!requireTab(user, "cashPage", res)) return;
    const body = await readBody(req);
    const monthKey = body.monthKey || db.activeMonth;
    if (!db.months[monthKey]) db.months[monthKey] = { openingCash: 0, entries: [] };
    db.months[monthKey].openingCash = Number(body.openingCash || 0);
    db.activeMonth = monthKey;
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/cash/entry" && req.method === "POST") {
    if (!requireTab(user, "cashPage", res)) return;
    const body = await readBody(req);
    const monthKey = body.monthKey || db.activeMonth;
    if (!db.months[monthKey]) db.months[monthKey] = { openingCash: 0, entries: [] };
    const entry = body.entry || {};
    const list = db.months[monthKey].entries;
    const existingEntry = entry.id ? list.find((item) => item.id === entry.id) : null;
    if (existingEntry && !requireAdmin(user, res)) return;
    const payload = {
      id: entry.id || makeId(),
      date: entry.date || "",
      description: entry.description || "",
      inAmount: Number(entry.inAmount || 0),
      outAmount: Number(entry.outAmount || 0),
      rate: Number(entry.rate || 0),
      cost: Number(entry.cost || 0),
      price: Number(entry.price || 0),
      totalCost: Number(entry.totalCost || 0),
      profitAmount: Number(entry.profitAmount || 0),
      useProfitCalculation: Boolean(entry.useProfitCalculation)
    };
    const index = list.findIndex((item) => item.id === payload.id);
    if (index >= 0) list.splice(index, 1, payload);
    else list.push(payload);
    list.sort((a, b) => String(a.date || "9999-99-99").localeCompare(String(b.date || "9999-99-99")));
    reconcileBillStatusFromLedger(db);
    db.billRecords.sort((a, b) => String(a.machine || "").localeCompare(String(b.machine || ""), undefined, { numeric: true }));
    db.activeMonth = monthKey;

    // Auto-generate voucher if In Amount is recorded
    let createdVoucher = null;
    if (payload.inAmount > 0 && body.sendVoucher !== false) {
      createdVoucher = generateAndSendVoucher(db, {
        customerId: body.customerId,
        customerName: body.customerName || payload.description,
        machineId: body.machineId || payload.description,
        amount: payload.inAmount,
        date: payload.date,
        monthKey,
        notes: payload.description,
        paymentMethod: body.paymentMethod || "Bank Transfer / Cash",
        staffUserId: user.id
      });
    }

    await writeDb(db);
    return json(res, 200, { ok: true, voucher: createdVoucher });
  }

  if (pathname === "/api/cash/entry" && req.method === "DELETE") {
    if (!requireTab(user, "cashPage", res)) return;
    if (!requireAdmin(user, res)) return;
    const target = new URL(req.url, `http://${req.headers.host}`);
    const id = target.searchParams.get("id");
    const monthKey = target.searchParams.get("monthKey") || db.activeMonth;
    if (db.months[monthKey]) {
      db.months[monthKey].entries = db.months[monthKey].entries.filter((item) => item.id !== id);
      reconcileBillStatusFromLedger(db);
      await writeDb(db);
    }
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/bills/record" && req.method === "POST") {
    if (!requireTab(user, "billPage", res)) return;
    const body = await readBody(req);
    const record = body.record || {};
    const existingRecord = record.id ? db.billRecords.find((item) => item.id === record.id) : null;
    if (existingRecord && !requireAdmin(user, res)) return;
    const billDate = record.billDate || "";
    const cutOffDate = shiftDate(billDate, -7);
    const normalizedStatus = record.status === "inactive" ? "inactive" : "sent_unpaid";
    const payload = {
      id: record.id || makeId(),
      machine: record.machine || "",
      submittedDate: record.submittedDate || "",
      billDate,
      cutOffDate,
      billType: record.billType || "",
      status: normalizedStatus,
      money: "",
      customer: record.customer || "",
      autoPaid: existingRecord?.autoPaid || false,
      cycleMonth: billDate?.slice(0, 7) || db.activeMonth,
      cycleHistory: Array.isArray(existingRecord?.cycleHistory) ? existingRecord.cycleHistory : []
    };
    const index = db.billRecords.findIndex((item) => item.id === payload.id);
    if (index >= 0) db.billRecords.splice(index, 1, payload);
    else db.billRecords.push(payload);
    reconcileBillStatusFromLedger(db);
    db.billRecords.sort((a, b) => String(a.machine || "").localeCompare(String(b.machine || ""), undefined, { numeric: true }));
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/bills/record" && req.method === "DELETE") {
    if (!requireTab(user, "billPage", res)) return;
    if (!requireAdmin(user, res)) return;
    const target = new URL(req.url, `http://${req.headers.host}`);
    const id = target.searchParams.get("id");
    db.billRecords = db.billRecords.filter((item) => item.id !== id);
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/devices/record" && req.method === "POST") {
    if (!requireTab(user, "devicePage", res)) return;
    const body = await readBody(req);
    const record = body.record || {};
    const index = db.deviceRecords.findIndex((item) => item.id === record.id);
    if (index >= 0 && !requireAdmin(user, res)) return;
    const existingDevice = index >= 0 ? db.deviceRecords[index] : null;
    const currentNo = index >= 0 ? db.deviceRecords[index].no : db.nextDeviceNumber++;
    const payload = {
      id: record.id || makeId(),
      no: currentNo,
      name: record.name || "",
      email: record.email || "",
      deviceId: record.deviceId || "",
      serialNumber: record.serialNumber || "",
      kitNumber: record.kitNumber || "",
      serviceAddress: record.serviceAddress || "",
      region: record.region || "",
      planStatus: record.planStatus || "normal",
      cycleResetDay: Number(record.cycleResetDay) > 0 && Number(record.cycleResetDay) <= 31 ? Number(record.cycleResetDay) : 28,
      active: record.active !== false
    };
    if (index >= 0) db.deviceRecords.splice(index, 1, payload);
    else db.deviceRecords.push(payload);
    db.deviceRecords.sort((a, b) => Number(a.no) - Number(b.no));
    syncDeviceIntoBillRecords(db, payload, existingDevice);
    reconcileBillStatusFromLedger(db);
    db.billRecords.sort((a, b) => String(a.machine || "").localeCompare(String(b.machine || ""), undefined, { numeric: true }));
    await writeDb(db);
    return json(res, 200, { ok: true, device: payload });
  }

  if (pathname === "/api/devices/record" && req.method === "DELETE") {
    if (!requireTab(user, "devicePage", res)) return;
    if (!requireAdmin(user, res)) return;
    const target = new URL(req.url, `http://${req.headers.host}`);
    const id = target.searchParams.get("id");
    db.deviceRecords = db.deviceRecords.filter((item) => item.id !== id);
    db.billRecords = db.billRecords.filter((item) => !(item.autoCreatedFromDevice && String(item.linkedDeviceRecordId || "") === String(id)));
    reconcileBillStatusFromLedger(db);
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/usage/record" && req.method === "POST") {
    if (!requireTab(user, "usagePage", res)) return;
    const body = await readBody(req);
    const record = body.record || body || {};
    const usageDate = String(record.usageDate || record.date || "").trim();
    const monthKey = record.monthKey || (usageDate.length >= 7 ? usageDate.slice(0, 7) : (db.activeMonth || currentMonthKey()));
    const machine = String(record.machine || "").trim();
    if (!machine) {
      return json(res, 400, { error: "Machine is required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(usageDate)) {
      return json(res, 400, { error: "Valid date YYYY-MM-DD is required" });
    }
    const existingIndex = db.usageRecords.findIndex((item) => {
      if (record.id && item.id === record.id) return true;
      return String(item.machine || "").trim().toUpperCase() === machine.toUpperCase() && String(item.monthKey || "") === monthKey;
    });
    const existing = existingIndex >= 0 ? db.usageRecords[existingIndex] : null;
    const dailyUsage = { ...(existing?.dailyUsage || {}) };
    const hasExistingDay = Object.prototype.hasOwnProperty.call(dailyUsage, usageDate);
    if (existing && user.role !== "admin" && (hasExistingDay || record.removeDate)) {
      return json(res, 403, { error: "Only an admin can change an existing daily record" });
    }
    if (record.removeDate) {
      delete dailyUsage[usageDate];
    } else {
      const dailyValue = Number(record.dailyUsageTB !== undefined ? record.dailyUsageTB : (record.usageAmountTB !== undefined ? record.usageAmountTB : 0));
      if (!Number.isFinite(dailyValue) || dailyValue < 0) {
        return json(res, 400, { error: "Daily usage must be zero or more" });
      }
      dailyUsage[usageDate] = dailyValue;
    }
    const linkedDevice = db.deviceRecords.find((item) => String(item.deviceId || "").trim().toUpperCase() === machine.toUpperCase());
    const linkedBill = db.billRecords.find((item) => String(item.machine || "").trim().toUpperCase() === machine.toUpperCase());
    const autoCustomer = linkedDevice?.name || linkedBill?.customer || "";
    const autoBillType = linkedDevice?.planStatus || linkedBill?.billType || "";
    const canEditDetails = !existing || user.role === "admin";
    const payload = {
      id: existing?.id || record.id || makeId(),
      monthKey,
      machine,
      customer: canEditDetails ? String(record.customer || existing?.customer || autoCustomer).trim() : (existing?.customer || autoCustomer),
      billType: canEditDetails ? String(record.billType || existing?.billType || autoBillType).trim() : (existing?.billType || autoBillType),
      usageLimitTB: canEditDetails ? Number(record.usageLimitTB || existing?.usageLimitTB || 5) : existing.usageLimitTB,
      dailyUsage,
      legacyUsageTB: Number(existing?.legacyUsageTB || 0),
      notes: canEditDetails ? String(record.notes || existing?.notes || "").trim() : existing.notes,
      updatedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) db.usageRecords.splice(existingIndex, 1, payload);
    else db.usageRecords.push(payload);
    db.usageRecords.sort((a, b) => {
      const monthSort = String(b.monthKey || "").localeCompare(String(a.monthKey || ""));
      if (monthSort !== 0) return monthSort;
      return String(a.machine || "").localeCompare(String(b.machine || ""), undefined, { numeric: true });
    });

    // Check for High Usage Alert (>= 4.8 TB on 5TB plan, or >= 1.9 TB on 2TB plan)
    const totalDailyTB = Object.values(dailyUsage).reduce((sum, v) => sum + Number(v || 0), 0);
    const totalUsageTB = totalDailyTB + Number(payload.legacyUsageTB || 0);
    const limitTB = Number(payload.usageLimitTB || (payload.billType === "discount" ? 2.0 : 5.0));
    const thresholdTB = payload.billType === "discount" ? 1.9 : 4.8;
    if (totalUsageTB >= thresholdTB) {
      const usageAlertText = `⚠️ <b>HIGH USAGE ALERT (≥ ${thresholdTB} TB)</b>\n📟 <b>Machine:</b> ${machine}\n👤 <b>Customer:</b> ${payload.customer || "-"}\n📊 <b>Total Used:</b> ${totalUsageTB.toFixed(2)} / ${limitTB.toFixed(1)} TB (${Math.round((totalUsageTB / limitTB) * 100)}%)\nTerminal is nearing its plan limit.`;
      sendTelegramNotification(db, usageAlertText);
    }

    await writeDb(db);
    const affectedCustomerIds = new Set(db.customerAccounts
      .filter((customer) => {
        const linked = Array.isArray(customer.linkedDeviceIds) && customer.linkedDeviceIds.length > 0 ? customer.linkedDeviceIds : [customer.linkedDeviceId];
        return linked.map((s) => String(s || "").trim().toUpperCase()).includes(machine.toUpperCase());
      })
      .map((customer) => customer.id));
    broadcastRealtime({ type: "usage_updated", machine }, (client) => client.kind === "staff" || affectedCustomerIds.has(client.customerId));
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/usage/record" && req.method === "DELETE") {
    if (!requireTab(user, "usagePage", res)) return;
    if (!requireAdmin(user, res)) return;
    const target = new URL(req.url, `http://${req.headers.host}`);
    const id = target.searchParams.get("id");
    db.usageRecords = db.usageRecords.filter((item) => item.id !== id);
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/usage/reset" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    db.usageRecords = [];
    await writeDb(db);
    broadcastRealtime({ type: "usage_updated" });
    return json(res, 200, { ok: true, message: "All data usage records reset successfully" });
  }

  if (pathname === "/api/users/record" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    const record = body.record || {};
    const username = String(record.username || "").trim();
    if (!username) {
      return json(res, 400, { error: "Username is required" });
    }
    const targetId = record.id || makeId();
    const duplicate = db.users.find((item) => item.id !== targetId && String(item.username || "").trim().toLowerCase() === username.toLowerCase());
    if (duplicate) {
      return json(res, 409, { error: "Username already exists" });
    }
    const index = db.users.findIndex((item) => item.id === targetId);
    const existing = index >= 0 ? db.users[index] : null;
    if (!existing && !record.password) {
      return json(res, 400, { error: "Password is required for new user" });
    }
    const payload = {
      id: targetId,
      fullName: String(record.fullName || "").trim(),
      username,
      role: record.role === "admin" ? "admin" : "user",
      allowedTabs: Array.isArray(record.allowedTabs)
        ? record.allowedTabs.filter((tab) => USER_TABS.includes(tab))
        : USER_TABS,
      passwordHash: record.password
        ? hashPassword(String(record.password))
        : (existing ? (existing.passwordHash || existing.password) : "")
    };
    if (index >= 0) db.users.splice(index, 1, payload);
    else db.users.push(payload);
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/users/record" && req.method === "DELETE") {
    if (!requireAdmin(user, res)) return;
    const target = new URL(req.url, `http://${req.headers.host}`);
    const id = target.searchParams.get("id");
    if (id === user.id) return json(res, 400, { error: "Cannot delete current user" });
    const admins = db.users.filter((item) => item.role === "admin" && item.id !== id);
    if (!admins.length) {
      return json(res, 400, { error: "At least one admin is required" });
    }
    db.users = db.users.filter((item) => item.id !== id);
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/export/devices.csv" && req.method === "GET") {
    if (!requireTab(user, "devicePage", res)) return;
    const rows = [["No", "Name", "Email", "Device ID", "Serial Number", "Kit Number", "Service Address", "Region", "Plan"]];
    db.deviceRecords.forEach((record) => {
      rows.push([record.no, record.name, record.email, record.deviceId, record.serialNumber, record.kitNumber, record.serviceAddress, record.region, record.planStatus]);
    });
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="device-db.csv"'
    });
    return res.end(toCsv(rows));
  }

  if (pathname === "/api/export/backup.json" && req.method === "GET") {
    if (!requireAdmin(user, res)) return;
    const backup = {
      ...db,
      users: db.users.map(safeUser),
      customerAccounts: db.customerAccounts.map(safeCustomerAccount)
    };
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cash-billing-backup.json"'
    });
    return res.end(JSON.stringify(backup, null, 2));
  }

  if (pathname === "/api/import/backup" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    const snapshot = body.snapshot || {};
    if (!snapshot.months || !Array.isArray(snapshot.billRecords) || !Array.isArray(snapshot.deviceRecords)) {
      return json(res, 400, { error: "Invalid backup payload" });
    }
    if (Array.isArray(snapshot.users) && snapshot.users.length > 0) {
      // keep imported users
    } else {
      snapshot.users = db.users;
    }
    snapshot.nextDeviceNumber = Number(snapshot.nextDeviceNumber || (snapshot.deviceRecords.length + 1));
    if (!Array.isArray(snapshot.usageRecords)) snapshot.usageRecords = [];
    if (!Array.isArray(snapshot.customerAccounts)) snapshot.customerAccounts = [];
    if (!Array.isArray(snapshot.announcements)) snapshot.announcements = [];
    if (!Array.isArray(snapshot.supportMessages)) snapshot.supportMessages = [];
    if (!snapshot.appSettings) ensureAppSettings(snapshot);
    if (!snapshot.systemSettings) ensureSystemSettings(snapshot);
    ensureActiveMonth(snapshot);
    ensureUsageRecords(snapshot);
    ensureCustomerFeatures(snapshot);
    ensureUserPermissions(snapshot);

    for (const key of Object.keys(db)) {
      delete db[key];
    }
    Object.assign(db, snapshot);

    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  // System & Telegram Settings APIs
  if (pathname === "/api/admin/settings" && req.method === "GET") {
    if (!requireAdmin(user, res)) return;
    ensureSystemSettings(db);
    return json(res, 200, {
      systemSettings: db.systemSettings,
      appSettings: db.appSettings
    });
  }

  if (pathname === "/api/admin/settings" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    ensureSystemSettings(db);
    db.systemSettings = {
      ...db.systemSettings,
      ...(body.systemSettings || {})
    };
    await writeDb(db);
    return json(res, 200, { ok: true, systemSettings: db.systemSettings });
  }

  if (pathname === "/api/admin/telegram/test" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    ensureSystemSettings(db);
    const testDb = {
      systemSettings: {
        ...db.systemSettings,
        ...(body.systemSettings || {})
      }
    };
    const testMsg = `🚀 <b>S-Tech Billing Bot Test</b>\n✅ Telegram integration is working perfectly!\n⏰ Time: ${new Date().toLocaleString()}\n👑 Admin: ${user.fullName || user.username}`;
    const ok = await sendTelegramNotification(testDb, testMsg);
    if (ok) {
      return json(res, 200, { ok: true, message: "Test notification sent successfully" });
    }
    return json(res, 400, { error: "Failed to send Telegram message. Please check Bot Token and Chat ID." });
  }

  // Automated & Manual Backup Download
  if (pathname === "/api/admin/backup/download" && req.method === "GET") {
    if (!requireAdmin(user, res)) return;
    try {
      const result = await createBackupZip(db);
      const fileStream = fs.createReadStream(result.zipPath);
      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.zipName}"`,
        "Content-Length": result.size
      });
      return fileStream.pipe(res);
    } catch (err) {
      return json(res, 500, { error: `Failed to create backup: ${err.message}` });
    }
  }

  if (pathname === "/api/admin/backup/trigger" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    try {
      const result = await createBackupZip(db);
      return json(res, 200, { ok: true, backup: result });
    } catch (err) {
      return json(res, 500, { error: `Failed to create backup: ${err.message}` });
    }
  }

  // Voucher Management APIs
  if (pathname === "/api/vouchers/list" && req.method === "GET") {
    if (!requireAdmin(user, res)) return;
    ensureSystemSettings(db);
    return json(res, 200, { vouchers: db.vouchers || [] });
  }

  if (pathname === "/api/vouchers/send" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    const voucher = generateAndSendVoucher(db, {
      customerId: body.customerId,
      customerName: body.customerName,
      machineId: body.machineId,
      amount: body.amount,
      date: body.date,
      monthKey: body.monthKey,
      notes: body.notes,
      paymentMethod: body.paymentMethod,
      staffUserId: user.id
    });
    if (!voucher) return json(res, 400, { error: "Could not find matching customer for voucher delivery" });
    await writeDb(db);
    return json(res, 200, { ok: true, voucher });
  }

  if (pathname === "/api/settings" && req.method === "GET") {
    ensureAppSettings(db);
    return json(res, 200, db.appSettings);
  }

  if (pathname === "/api/settings" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    ensureAppSettings(db);
    db.appSettings = {
      ...db.appSettings,
      ...(body.settings || body)
    };
    await writeDb(db);
    broadcastRealtime({ type: "settings_updated", settings: db.appSettings });
    return json(res, 200, { ok: true, settings: db.appSettings });
  }

  return notFound(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    if (requestUrl.pathname.startsWith("/api/")) {
      return await handleApi(req, res, requestUrl.pathname);
    }
    return serveStatic(req, res, requestUrl.pathname);
  } catch (error) {
    json(res, 500, { error: error.message || "Server error" });
  }
});

const realtimeServer = new WebSocketServer({ noServer: true });

server.on("upgrade", async (req, socket, head) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    if (requestUrl.pathname !== "/ws") return socket.destroy();
    const db = await readDb();
    ensureCustomerFeatures(db);
    const staff = getCurrentUser(req, db);
    const customer = getCurrentCustomer(req, db);
    if (!staff && !customer) return socket.destroy();
    realtimeServer.handleUpgrade(req, socket, head, (webSocket) => {
      const client = {
        socket: webSocket,
        kind: customer ? "customer" : "staff",
        customerId: customer?.id || "",
        userId: staff?.id || "",
        isAlive: true
      };
      realtimeClients.add(client);
      webSocket.on("pong", () => { client.isAlive = true; });
      webSocket.on("close", () => realtimeClients.delete(client));
      webSocket.on("error", () => realtimeClients.delete(client));
      webSocket.send(JSON.stringify({ type: "connected" }));
    });
  } catch {
    socket.destroy();
  }
});

const realtimeHeartbeat = setInterval(() => {
  realtimeClients.forEach((client) => {
    if (!client.isAlive) {
      client.socket.terminate();
      realtimeClients.delete(client);
      return;
    }
    client.isAlive = false;
    client.socket.ping();
  });
}, 30000);
realtimeHeartbeat.unref();

// Daily Automated Backup Interval (Every 10 min check)
let lastBackupDateStr = "";
setInterval(async () => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const db = await readDb();
    ensureSystemSettings(db);
    if (db.systemSettings.autoBackupEnabled !== false) {
      const targetHour = Number(db.systemSettings.autoBackupHour || 0);
      if (now.getHours() === targetHour && lastBackupDateStr !== todayStr) {
        lastBackupDateStr = todayStr;
        console.log("[Auto-Backup] Running scheduled daily backup for", todayStr);
        await createBackupZip(db);
      }
    }
  } catch (err) {
    console.error("[Auto-Backup Error]:", err.message);
  }
}, 10 * 60 * 1000).unref();

server.listen(PORT, HOST, () => {
  console.log(`S-Tech app server running at http://${HOST}:${PORT}`);
});
