const customerState = {
  customer: null,
  device: null,
  usage: null,
  bill: null,
  announcements: [],
  messages: [],
  activeMonth: "",
  activePage: "customerHomePage"
};

const customerEl = {
  login: document.querySelector("#customerLogin"),
  loginForm: document.querySelector("#customerLoginForm"),
  username: document.querySelector("#customerUsername"),
  password: document.querySelector("#customerPassword"),
  loginError: document.querySelector("#customerLoginError"),
  app: document.querySelector("#customerApp"),
  headerName: document.querySelector("#customerHeaderName"),
  logout: document.querySelector("#customerLogoutBtn"),
  pages: document.querySelectorAll(".customer-page"),
  navButtons: document.querySelectorAll("[data-customer-page]"),
  monthLabel: document.querySelector("#customerMonthLabel"),
  welcomeName: document.querySelector("#customerWelcomeName"),
  deviceSummary: document.querySelector("#customerDeviceSummary"),
  usageTotal: document.querySelector("#customerUsageTotal"),
  usageLimit: document.querySelector("#customerUsageLimit"),
  usageRemaining: document.querySelector("#customerUsageRemaining"),
  usageState: document.querySelector("#customerUsageState"),
  deviceId: document.querySelector("#customerDeviceId"),
  deviceRegion: document.querySelector("#customerDeviceRegion"),
  deviceSerial: document.querySelector("#customerDeviceSerial"),
  deviceKit: document.querySelector("#customerDeviceKit"),
  devicePlan: document.querySelector("#customerDevicePlan"),
  deviceAddress: document.querySelector("#customerDeviceAddress"),
  navUnread: document.querySelector("#customerNavUnread"),
  latestAnnouncement: document.querySelector("#customerLatestAnnouncement"),
  usageMonth: document.querySelector("#customerUsageMonth"),
  usageProgress: document.querySelector("#customerUsageProgress"),
  usageProgressText: document.querySelector("#customerUsageProgressText"),
  lastSync: document.querySelector("#customerLastSync"),
  dailyUsageList: document.querySelector("#customerDailyUsageList"),
  announcementList: document.querySelector("#customerAnnouncementList"),
  messageList: document.querySelector("#customerMessageList"),
  messageForm: document.querySelector("#customerMessageForm"),
  messageInput: document.querySelector("#customerMessageInput"),
  receiptInput: document.querySelector("#customerReceiptInput"),
  receiptButton: document.querySelector("#customerReceiptBtn"),
  voiceButton: document.querySelector("#customerVoiceBtn"),
  attachmentPreview: document.querySelector("#customerAttachmentPreview")
};

let customerPendingAttachment = null;
let customerRecorder = null;
let customerRecordingStream = null;

async function customerApi(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

let customerRealtimeSocket = null;
let customerRealtimeReconnect = null;
let customerRealtimeRefresh = null;

function connectCustomerRealtime() {
  if (!customerState.customer || customerRealtimeSocket?.readyState === WebSocket.OPEN || customerRealtimeSocket?.readyState === WebSocket.CONNECTING) return;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  customerRealtimeSocket = new WebSocket(`${protocol}//${location.host}/ws`);
  customerRealtimeSocket.onmessage = (event) => {
    const message = JSON.parse(event.data || "{}");
    if (!["support_message", "announcement_updated", "usage_updated"].includes(message.type)) return;
    if (message.customerId && message.customerId !== customerState.customer.id) return;
    clearTimeout(customerRealtimeRefresh);
    customerRealtimeRefresh = setTimeout(() => refreshCustomer(), 80);
  };
  customerRealtimeSocket.onclose = () => {
    customerRealtimeSocket = null;
    clearTimeout(customerRealtimeReconnect);
    if (customerState.customer) customerRealtimeReconnect = setTimeout(connectCustomerRealtime, 2500);
  };
  customerRealtimeSocket.onerror = () => customerRealtimeSocket?.close();
}

function customerMonthLabel(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(monthKey || "")) return "This month";
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function customerDate(value, withTime = false) {
  if (!value) return "-";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", withTime
    ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function customerUsageEntries() {
  return Object.entries(customerState.usage?.dailyUsage || {})
    .map(([date, value]) => ({ date, value: Number(value || 0) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function customerUsageTotal() {
  return customerUsageEntries().reduce((sum, item) => sum + item.value, Number(customerState.usage?.legacyUsageTB || 0));
}

function customerUsageLevel(total, limit) {
  if (total >= limit) return "critical";
  if (total >= Math.max(0, limit - 0.5)) return "warning";
  return "safe";
}

function makeCustomerEmpty(text) {
  const node = document.createElement("div");
  node.className = "customer-empty";
  node.textContent = text;
  return node;
}

function makeAnnouncementCard(item) {
  const card = document.createElement("article");
  card.className = "announcement-card";
  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = item.title || "Announcement";
  const type = document.createElement("span");
  type.className = `notice-type ${item.type || "general"}`;
  type.textContent = item.type || "general";
  header.append(title, type);
  const message = document.createElement("p");
  message.textContent = item.message || "";
  const time = document.createElement("time");
  time.textContent = customerDate(item.updatedAt || item.createdAt, true);
  card.append(header, message, time);
  return card;
}

function renderCustomerNavigation() {
  customerEl.pages.forEach((page) => page.classList.toggle("active", page.id === customerState.activePage));
  customerEl.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.customerPage === customerState.activePage));
}

function renderCustomerApp() {
  const customer = customerState.customer || {};
  const device = customerState.device;
  const total = customerUsageTotal();
  const limit = Number(customerState.usage?.usageLimitTB || 5);
  const remaining = Math.max(0, limit - total);
  const level = customerUsageLevel(total, limit);
  const entries = customerUsageEntries();
  const unread = customerState.messages.filter((item) => item.senderType === "staff" && !item.readByCustomer).length;

  customerEl.headerName.textContent = customer.fullName || customer.username || "Customer";
  customerEl.welcomeName.textContent = `Hello, ${customer.fullName || customer.username || "Customer"}`;
  customerEl.monthLabel.textContent = customerMonthLabel(customerState.activeMonth);
  customerEl.deviceSummary.textContent = device
    ? `${device.deviceId} | ${device.region || "Service active"}`
    : `${customer.linkedDeviceId || "User ID not linked"} | Device record pending`;
  customerEl.usageTotal.textContent = `${total.toFixed(3)} TB`;
  customerEl.usageLimit.textContent = `of ${limit.toFixed(1)} TB`;
  customerEl.usageRemaining.textContent = `${remaining.toFixed(3)} TB`;
  customerEl.usageState.textContent = level === "critical" ? "Limit reached" : level === "warning" ? "Near limit" : "Safe usage";
  customerEl.deviceId.textContent = device?.deviceId || customer.linkedDeviceId || "-";
  customerEl.deviceRegion.textContent = device?.region || "-";
  customerEl.deviceSerial.textContent = device?.serialNumber || "-";
  customerEl.deviceKit.textContent = device?.kitNumber || "-";
  customerEl.devicePlan.textContent = String(device?.planStatus || "-").replaceAll("_", " ");
  customerEl.deviceAddress.textContent = device?.serviceAddress || "-";
  customerEl.navUnread.textContent = unread;
  customerEl.navUnread.classList.toggle("hidden", unread === 0);

  customerEl.latestAnnouncement.innerHTML = "";
  customerEl.latestAnnouncement.className = customerState.announcements.length ? "" : "customer-empty";
  customerEl.latestAnnouncement.append(customerState.announcements.length
    ? makeAnnouncementCard(customerState.announcements[0])
    : document.createTextNode("No announcements yet."));

  customerEl.usageMonth.textContent = customerMonthLabel(customerState.activeMonth);
  const percent = limit > 0 ? Math.min(100, (total / limit) * 100) : 0;
  customerEl.usageProgress.style.width = `${percent}%`;
  customerEl.usageProgress.className = level === "safe" ? "" : level;
  customerEl.usageProgressText.textContent = `${total.toFixed(3)} / ${limit.toFixed(1)} TB`;
  customerEl.lastSync.textContent = entries.length ? `Latest ${customerDate(entries[0].date)}` : "No entries";
  customerEl.dailyUsageList.innerHTML = "";
  if (!entries.length) customerEl.dailyUsageList.append(makeCustomerEmpty("No daily usage has been recorded yet."));
  entries.forEach((item) => {
    const row = document.createElement("div");
    row.className = "daily-row";
    const date = document.createElement("span");
    date.textContent = customerDate(item.date);
    const value = document.createElement("strong");
    value.textContent = `${item.value.toFixed(3)} TB`;
    row.append(date, value);
    customerEl.dailyUsageList.append(row);
  });

  customerEl.announcementList.innerHTML = "";
  if (!customerState.announcements.length) customerEl.announcementList.append(makeCustomerEmpty("No announcements yet."));
  customerState.announcements.forEach((item) => customerEl.announcementList.append(makeAnnouncementCard(item)));
  renderCustomerMessages();
  renderCustomerNavigation();
}

function renderCustomerMessages() {
  const messages = customerState.messages;
  customerEl.messageList.innerHTML = "";
  if (!messages.length) customerEl.messageList.append(makeCustomerEmpty("Start a conversation with S-Tech."));
  messages.forEach((item) => {
    const bubble = document.createElement("article");
    bubble.className = `message-bubble${item.senderType === "customer" ? " mine" : ""}`;
    const body = document.createElement("p");
    body.textContent = item.message || "";
    if (!item.message) body.classList.add("hidden");
    if (item.attachment) bubble.append(makeChatAttachment(item.attachment));
    const meta = document.createElement("small");
    meta.textContent = `${item.senderName || (item.senderType === "customer" ? "You" : "S-Tech Support")} | ${customerDate(item.createdAt, true)}`;
    bubble.append(body, meta);
    customerEl.messageList.append(bubble);
  });
  customerEl.messageList.scrollTop = customerEl.messageList.scrollHeight;
}

function makeChatAttachment(attachment) {
  const url = `/api/chat/attachment/${encodeURIComponent(attachment.id)}`;
  if (attachment.kind === "audio") {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = url;
    return audio;
  }
  if (attachment.mime?.startsWith("image/")) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    const image = document.createElement("img");
    image.src = url;
    image.alt = "Payment receipt";
    link.append(image);
    return link;
  }
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "receipt-file-link";
  link.textContent = attachment.name || "Open receipt";
  return link;
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read attachment"));
    reader.readAsDataURL(file);
  });
}

function clearCustomerAttachment() {
  customerPendingAttachment = null;
  customerEl.receiptInput.value = "";
  customerEl.attachmentPreview.innerHTML = "";
  customerEl.attachmentPreview.classList.add("hidden");
}

function setCustomerAttachment(file, kind) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) return alert("Attachment must be 8 MB or smaller.");
  clearCustomerAttachment();
  customerPendingAttachment = { file, kind };
  const name = document.createElement("span");
  name.textContent = kind === "audio" ? "Voice message ready" : file.name;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.onclick = clearCustomerAttachment;
  customerEl.attachmentPreview.append(name, remove);
  customerEl.attachmentPreview.classList.remove("hidden");
}

async function toggleCustomerRecording() {
  if (customerRecorder?.state === "recording") {
    customerRecorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return alert("Voice recording is not supported on this device.");
  try {
    customerRecordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    customerRecorder = new MediaRecorder(customerRecordingStream);
    customerRecorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    customerRecorder.onstop = () => {
      const mime = customerRecorder.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mime });
      setCustomerAttachment(new File([blob], `voice-${Date.now()}.webm`, { type: mime }), "audio");
      customerRecordingStream?.getTracks().forEach((track) => track.stop());
      customerRecordingStream = null;
      customerEl.voiceButton.textContent = "Voice";
      customerEl.voiceButton.classList.remove("recording");
    };
    customerRecorder.start();
    customerEl.voiceButton.textContent = "Stop";
    customerEl.voiceButton.classList.add("recording");
  } catch {
    alert("Microphone permission is required to send a voice message.");
  }
}

async function refreshCustomer() {
  try {
    const snapshot = await customerApi("/api/customer/bootstrap");
    Object.assign(customerState, snapshot);
    renderCustomerApp();
    connectCustomerRealtime();
    if (customerState.activePage === "customerSupportPage" && customerState.messages.some((item) => item.senderType === "staff" && !item.readByCustomer)) {
      await customerApi("/api/customer/messages/read", { method: "POST", body: "{}" });
      customerState.messages = customerState.messages.map((item) => item.senderType === "staff" ? { ...item, readByCustomer: true } : item);
      renderCustomerApp();
    }
  } catch (error) {
    if (/login|required|unauthorized/i.test(error.message)) showCustomerLogin();
  }
}

function showCustomerLogin() {
  customerState.customer = null;
  customerRealtimeSocket?.close();
  customerRealtimeSocket = null;
  customerEl.app.classList.add("hidden");
  customerEl.login.classList.remove("hidden");
}

async function submitCustomerLogin(event) {
  event.preventDefault();
  customerEl.loginError.textContent = "";
  try {
    await customerApi("/api/customer/login", {
      method: "POST",
      body: JSON.stringify({ username: customerEl.username.value.trim(), password: customerEl.password.value })
    });
    customerEl.loginForm.reset();
    customerEl.login.classList.add("hidden");
    customerEl.app.classList.remove("hidden");
    await refreshCustomer();
  } catch (error) {
    customerEl.loginError.textContent = error.message;
  }
}

async function submitCustomerMessage(event) {
  event.preventDefault();
  const message = customerEl.messageInput.value.trim();
  if (!message && !customerPendingAttachment) return;
  const pending = customerPendingAttachment;
  customerEl.messageInput.value = "";
  try {
    const attachment = pending ? {
      kind: pending.kind,
      name: pending.file.name,
      dataUrl: await fileAsDataUrl(pending.file)
    } : null;
    await customerApi("/api/customer/messages", {
      method: "POST",
      body: JSON.stringify({ message, attachment })
    });
    clearCustomerAttachment();
    await refreshCustomer();
  } catch (error) {
    customerEl.messageInput.value = message;
    alert(error.message);
  }
}

customerEl.loginForm.addEventListener("submit", submitCustomerLogin);
customerEl.messageForm.addEventListener("submit", submitCustomerMessage);
customerEl.logout.addEventListener("click", async () => {
  await customerApi("/api/customer/logout", { method: "POST", body: "{}" }).catch(() => {});
  showCustomerLogin();
});
customerEl.navButtons.forEach((button) => button.addEventListener("click", async () => {
  customerState.activePage = button.dataset.customerPage;
  renderCustomerNavigation();
  if (customerState.activePage === "customerSupportPage") await refreshCustomer();
}));
customerEl.receiptButton.addEventListener("click", () => customerEl.receiptInput.click());
customerEl.receiptInput.addEventListener("change", () => setCustomerAttachment(customerEl.receiptInput.files[0], "receipt"));
customerEl.voiceButton.addEventListener("click", toggleCustomerRecording);

async function initCustomerApp() {
  const session = await customerApi("/api/customer/session").catch(() => ({ customer: null }));
  if (!session.customer) return showCustomerLogin();
  customerEl.login.classList.add("hidden");
  customerEl.app.classList.remove("hidden");
  await refreshCustomer();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/customer-sw.js", { scope: "/customer/" }).catch(() => {}));
}

setInterval(() => {
  if (customerState.customer && !document.hidden) refreshCustomer();
}, 60000);

initCustomerApp();
