require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const { WebSocketServer } = require("ws");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3030);
const APP_DIR = __dirname;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(APP_DIR, "data"));
const DB_FILE = path.join(DATA_DIR, "app-db.json");
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(DATA_DIR, "uploads"));
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
  ".svg": "image/svg+xml"
};

function makeId() {
  return crypto.randomUUID();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
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
      bannerText: "⚡ Starlink Priority & Roam services active and operational.",
      enabledModules: {
        usageChart: true,
        dailyHistory: true,
        announcements: true,
        supportChat: true,
        deviceSpecs: true
      }
    },
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
      bannerText: "⚡ Starlink Priority & Roam services active and operational.",
      enabledModules: {
        usageChart: true,
        dailyHistory: true,
        announcements: true,
        supportChat: true,
        deviceSpecs: true
      }
    };
  }
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
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultSnapshot(), null, 2));
  }
  return {
    async read() {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    },
    async write(data) {
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

function safeCustomerAccount(customer) {
  return {
    id: customer.id,
    fullName: customer.fullName || "",
    username: customer.username || "",
    linkedDeviceId: customer.linkedDeviceId || "",
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
  const isSecureRequest = req.socket.encrypted || forwardedProto.includes("https");
  const parts = ["HttpOnly", "Path=/", "SameSite=Lax"];
  if (typeof maxAge === "number") parts.push(`Max-Age=${maxAge}`);
  if (IS_PRODUCTION && isSecureRequest) parts.push("Secure");
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
  const sid = cookies[SESSION_COOKIE];
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
  const sid = cookies[SESSION_COOKIE];
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
  const sid = cookies[CUSTOMER_SESSION_COOKIE];
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
  const linkedDeviceId = String(customer.linkedDeviceId || "").trim().toUpperCase();
  const device = db.deviceRecords.find((item) => String(item.deviceId || "").trim().toUpperCase() === linkedDeviceId) || null;
  const usage = db.usageRecords.find((item) => (
    String(item.monthKey || "") === db.activeMonth &&
    String(item.machine || "").trim().toUpperCase() === linkedDeviceId
  )) || null;
  const bill = db.billRecords.find((item) => String(item.machine || "").trim().toUpperCase() === linkedDeviceId) || null;
  const staffNames = new Map(db.users.map((item) => [item.id, item.fullName || item.username || "Support"]));
  const messages = db.supportMessages
    .filter((item) => item.customerId === customer.id)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
    .map((item) => ({
      ...item,
      senderName: item.senderType === "customer" ? customer.fullName : (staffNames.get(item.senderId) || "SpaceLink Support")
    }));
  return {
    customer: safeCustomerAccount(customer),
    activeMonth: db.activeMonth,
    device: device ? {
      name: device.name || "",
      email: device.email || "",
      deviceId: device.deviceId || "",
      serialNumber: device.serialNumber || "",
      kitNumber: device.kitNumber || "",
      serviceAddress: device.serviceAddress || "",
      region: device.region || "",
      planStatus: device.planStatus || "normal"
    } : null,
    usage,
    usageRecords: db.usageRecords.filter((item) => (
      String(item.machine || "").trim().toUpperCase() === linkedDeviceId
    )),
    bill: bill ? {
      machine: bill.machine || "",
      billDate: bill.billDate || "",
      cutOffDate: bill.cutOffDate || "",
      billType: bill.billType || "",
      status: bill.status || "",
      money: bill.money || ""
    } : null,
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
      app: "S-Tech Billing",
      environment: process.env.NODE_ENV || "development",
      storage
    });
  }

  if (pathname === "/api/session" && req.method === "GET") {
    const user = getCurrentUser(req, db);
    return json(res, 200, { user: user ? safeUser(user) : null });
  }

  if (pathname === "/api/login" && req.method === "POST") {
    const body = await readBody(req);
    const user = db.users.find((item) => item.username === String(body.username || "").trim());
    if (!user || !verifyPassword(String(body.password || ""), user.passwordHash)) {
      return json(res, 401, { error: "Invalid username or password" });
    }
    const sid = createSession(user.id, db);
    await writeDb(db);
    return json(
      res,
      200,
      { user: safeUser(user) },
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
    if (!customer || customer.active === false || !verifyPassword(String(body.password || ""), customer.passwordHash)) {
      return json(res, 401, { error: "Invalid username or password" });
    }
    const sid = createCustomerSession(customer.id, db);
    await writeDb(db);
    return json(res, 200, { customer: safeCustomerAccount(customer) }, {
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
    if (message.length > 2000) return json(res, 400, { error: "Message is too long" });
    db.supportMessages.push({
      id: makeId(), customerId: customer.id, senderType: "customer", senderId: customer.id,
      topic: "conversation", message, attachment, createdAt: new Date().toISOString(), readByCustomer: true, readByStaff: false
    });
    await writeDb(db);
    broadcastRealtime({ type: "support_message", customerId: customer.id }, (client) => client.kind === "staff" || client.customerId === customer.id);
    return json(res, 200, { ok: true });
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
    const linkedDeviceId = String(record.linkedDeviceId || "").trim();
    if (!username || !linkedDeviceId) return json(res, 400, { error: "Username and User ID are required" });
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
      linkedDeviceId,
      active: record.active !== false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      passwordHash: record.password ? hashPassword(String(record.password)) : existing.passwordHash
    };
    if (index >= 0) db.customerAccounts.splice(index, 1, payload);
    else db.customerAccounts.push(payload);
    db.customerAccounts.sort((a, b) => String(a.linkedDeviceId || "").localeCompare(String(b.linkedDeviceId || ""), undefined, { numeric: true }));
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
    db.supportMessages.push({
      id: makeId(), customerId, senderType: "staff", senderId: user.id,
      topic: "conversation", message, attachment, createdAt: new Date().toISOString(), readByCustomer: false, readByStaff: true
    });
    await writeDb(db);
    broadcastRealtime({ type: "support_message", customerId }, (client) => client.kind === "staff" || client.customerId === customerId);
    return json(res, 200, { ok: true });
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
    await writeDb(db);
    return json(res, 200, { ok: true });
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
      planStatus: record.planStatus || "normal"
    };
    if (index >= 0) db.deviceRecords.splice(index, 1, payload);
    else db.deviceRecords.push(payload);
    db.deviceRecords.sort((a, b) => Number(a.no) - Number(b.no));
    syncDeviceIntoBillRecords(db, payload, existingDevice);
    reconcileBillStatusFromLedger(db);
    db.billRecords.sort((a, b) => String(a.machine || "").localeCompare(String(b.machine || ""), undefined, { numeric: true }));
    await writeDb(db);
    return json(res, 200, { ok: true });
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
    await writeDb(db);
    const affectedCustomerIds = new Set(db.customerAccounts
      .filter((customer) => String(customer.linkedDeviceId || "").trim().toUpperCase() === machine.toUpperCase())
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

  if (pathname === "/api/users/record" && req.method === "POST") {
    if (!requireAdmin(user, res)) return;
    const body = await readBody(req);
    const record = body.record || {};
    const payload = {
      id: record.id || makeId(),
      fullName: record.fullName || "",
      username: record.username || "",
      role: record.role === "admin" ? "admin" : "user",
      allowedTabs: Array.isArray(record.allowedTabs)
        ? record.allowedTabs.filter((tab) => USER_TABS.includes(tab))
        : [],
      passwordHash: record.password ? hashPassword(record.password) : ""
    };
    const index = db.users.findIndex((item) => item.id === payload.id);
    if (db.users.some((item) => item.username === payload.username && item.id !== payload.id)) {
      return json(res, 400, { error: "Username already exists" });
    }
    if (index >= 0) {
      const current = db.users[index];
      db.users[index] = {
        ...current,
        fullName: payload.fullName,
        username: payload.username,
        role: payload.role,
        allowedTabs: payload.role === "admin" ? [...USER_TABS, "adminPage"] : payload.allowedTabs,
        passwordHash: payload.passwordHash || current.passwordHash
      };
    } else {
      db.users.push({
        ...payload,
        allowedTabs: payload.role === "admin" ? [...USER_TABS, "adminPage"] : payload.allowedTabs
      });
    }
    await writeDb(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/users/record" && req.method === "DELETE") {
    if (!requireAdmin(user, res)) return;
    const target = new URL(req.url, `http://${req.headers.host}`);
    const id = target.searchParams.get("id");
    const targetUser = db.users.find((item) => item.id === id);
    if (targetUser?.role === "admin" && db.users.filter((item) => item.role === "admin").length <= 1) {
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
    snapshot.users = db.users;
    snapshot.nextDeviceNumber = Number(snapshot.nextDeviceNumber || (snapshot.deviceRecords.length + 1));
    if (!Array.isArray(snapshot.usageRecords)) snapshot.usageRecords = [];
    if (!Array.isArray(snapshot.customerAccounts)) snapshot.customerAccounts = [];
    if (!Array.isArray(snapshot.announcements)) snapshot.announcements = [];
    if (!Array.isArray(snapshot.supportMessages)) snapshot.supportMessages = [];
    if (!snapshot.appSettings) ensureAppSettings(snapshot);
    await writeDb(snapshot);
    return json(res, 200, { ok: true });
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

server.listen(PORT, HOST, () => {
  console.log(`S-Tech app server running at http://${HOST}:${PORT}`);
});
