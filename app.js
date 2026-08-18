const TAB_LABELS = {
  dashboardPage: "Dashboard",
  cashPage: "Cash Ledger",
  billPage: "Bill Status",
  devicePage: "Device DB",
  usagePage: "Data Usage",
  supportPage: "Customer Support",
  adminPage: "Admin Panel"
};

const BILL_COLOR_STORAGE_KEY = "stech-bill-colors";
const DEFAULT_BILL_COLORS = {
  unpaid: "#00d83d",
  paid: "#4b86e8",
  warn: "#facc15",
  danger: "#fb7185",
  suspended: "#dc2626",
  inactive: "#6b7280"
};

function currentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const state = {
  user: null,
  activePage: "dashboardPage",
  activeMonth: currentMonthKey(),
  months: {},
  billRecords: [],
  deviceRecords: [],
  usageRecords: [],
  users: [],
  customerAccounts: [],
  announcements: [],
  supportMessages: [],
  selectedSupportCustomerId: "",
  billColors: { ...DEFAULT_BILL_COLORS }
};

let supportPendingAttachment = null;
let supportRecorder = null;
let supportRecordingStream = null;

const el = {
  loginScreen: document.querySelector("#loginScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  loginMessage: document.querySelector("#loginMessage"),
  menuItems: document.querySelectorAll(".menu-item"),
  pageViews: document.querySelectorAll(".page-view"),
  currentUserName: document.querySelector("#currentUserName"),
  currentUserRole: document.querySelector("#currentUserRole"),
  utilityMenu: document.querySelector(".utility-menu"),
  adminPanelBtn: document.querySelector("#adminPanelBtn"),
  printBtn: document.querySelector("#printBtn"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  importJsonInput: document.querySelector("#importJsonInput"),
  logoutBtn: document.querySelector("#logoutBtn"),

  summaryMonth: document.querySelector("#summaryMonth"),
  openingCashInput: document.querySelector("#openingCashInput"),
  totalIn: document.querySelector("#totalIn"),
  totalOut: document.querySelector("#totalOut"),
  closingCash: document.querySelector("#closingCash"),
  ledgerBody: document.querySelector("#ledgerBody"),
  rowTemplate: document.querySelector("#rowTemplate"),
  openEntryDialogBtn: document.querySelector("#openEntryDialogBtn"),
  entryDialog: document.querySelector("#entryDialog"),
  entryDialogTitle: document.querySelector("#entryDialogTitle"),
  closeEntryDialogBtn: document.querySelector("#closeEntryDialogBtn"),
  cancelEntryBtn: document.querySelector("#cancelEntryBtn"),
  entryForm: document.querySelector("#entryForm"),
  entryId: document.querySelector("#entryId"),
  dateInput: document.querySelector("#dateInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
  inInput: document.querySelector("#inInput"),
  outInput: document.querySelector("#outInput"),
  creditInput: document.querySelector("#creditInput"),
  manualAmountFields: document.querySelector("#manualAmountFields"),
  entryCalculatorPanel: document.querySelector("#entryCalculatorPanel"),
  openEntryCalculatorBtn: document.querySelector("#openEntryCalculatorBtn"),
  closeEntryCalculatorBtn: document.querySelector("#closeEntryCalculatorBtn"),
  entryRateInput: document.querySelector("#entryRateInput"),
  entryCostInput: document.querySelector("#entryCostInput"),
  entryPriceInput: document.querySelector("#entryPriceInput"),
  entryTotalOutput: document.querySelector("#entryTotalOutput"),
  entryProfitOutput: document.querySelector("#entryProfitOutput"),
  saveBtn: document.querySelector("#saveBtn"),
  resetBtn: document.querySelector("#resetBtn"),

  rateInput: document.querySelector("#rateInput"),
  costInput: document.querySelector("#costInput"),
  priceInput: document.querySelector("#priceInput"),
  calcTotal: document.querySelector("#calcTotal"),
  calcProfit: document.querySelector("#calcProfit"),

  billSentCount: document.querySelector("#billSentCount"),
  billPaidCount: document.querySelector("#billPaidCount"),
  billPendingCount: document.querySelector("#billPendingCount"),
  billInactiveCount: document.querySelector("#billInactiveCount"),
  billSuspendedCount: document.querySelector("#billSuspendedCount"),
  dashSentCount: document.querySelector("#dashSentCount"),
  dashPaidCount: document.querySelector("#dashPaidCount"),
  dashInactiveCount: document.querySelector("#dashInactiveCount"),
  alertSevenCount: document.querySelector("#alertSevenCount"),
  alertOneCount: document.querySelector("#alertOneCount"),
  alertSuspendedCount: document.querySelector("#alertSuspendedCount"),
  alertList: document.querySelector("#alertList"),
  billBody: document.querySelector("#billBody"),
  billRowTemplate: document.querySelector("#billRowTemplate"),
  openBillDialogBtn: document.querySelector("#openBillDialogBtn"),
  billDialog: document.querySelector("#billDialog"),
  billDialogTitle: document.querySelector("#billDialogTitle"),
  closeBillDialogBtn: document.querySelector("#closeBillDialogBtn"),
  cancelBillBtn: document.querySelector("#cancelBillBtn"),
  resetBillBtn: document.querySelector("#resetBillBtn"),
  billForm: document.querySelector("#billForm"),
  billId: document.querySelector("#billId"),
  machineInput: document.querySelector("#machineInput"),
  customerInput: document.querySelector("#customerInput"),
  submittedInput: document.querySelector("#submittedInput"),
  billDateInput: document.querySelector("#billDateInput"),
  cutOffInput: document.querySelector("#cutOffInput"),
  billTypeInput: document.querySelector("#billTypeInput"),
  billStatusInput: document.querySelector("#billStatusInput"),
  saveBillBtn: document.querySelector("#saveBillBtn"),

  deviceCount: document.querySelector("#deviceCount"),
  deviceNormalCount: document.querySelector("#deviceNormalCount"),
  deviceDiscountCount: document.querySelector("#deviceDiscountCount"),
  deviceRegionCount: document.querySelector("#deviceRegionCount"),
  exportDevicesBtn: document.querySelector("#exportDevicesBtn"),
  deviceBody: document.querySelector("#deviceBody"),
  deviceRowTemplate: document.querySelector("#deviceRowTemplate"),
  openDeviceDialogBtn: document.querySelector("#openDeviceDialogBtn"),
  deviceDialog: document.querySelector("#deviceDialog"),
  deviceDialogTitle: document.querySelector("#deviceDialogTitle"),
  closeDeviceDialogBtn: document.querySelector("#closeDeviceDialogBtn"),
  cancelDeviceBtn: document.querySelector("#cancelDeviceBtn"),
  resetDeviceBtn: document.querySelector("#resetDeviceBtn"),
  deviceForm: document.querySelector("#deviceForm"),
  deviceRecordId: document.querySelector("#deviceRecordId"),
  deviceNameInput: document.querySelector("#deviceNameInput"),
  deviceEmailInput: document.querySelector("#deviceEmailInput"),
  deviceIdInput: document.querySelector("#deviceIdInput"),
  serialNumberInput: document.querySelector("#serialNumberInput"),
  kitNumberInput: document.querySelector("#kitNumberInput"),
  serviceAddressInput: document.querySelector("#serviceAddressInput"),
  regionInput: document.querySelector("#regionInput"),
  planStatusInput: document.querySelector("#planStatusInput"),
  saveDeviceBtn: document.querySelector("#saveDeviceBtn"),

  usageNearCount: document.querySelector("#usageNearCount"),
  usageCriticalCount: document.querySelector("#usageCriticalCount"),
  usageAlertList: document.querySelector("#usageAlertList"),
  usageTrackedCount: document.querySelector("#usageTrackedCount"),
  usageSafeCount: document.querySelector("#usageSafeCount"),
  usageWarnCount: document.querySelector("#usageWarnCount"),
  usageExceededCount: document.querySelector("#usageExceededCount"),
  usageBody: document.querySelector("#usageBody"),
  usageRowTemplate: document.querySelector("#usageRowTemplate"),
  openUsageDialogBtn: document.querySelector("#openUsageDialogBtn"),
  usageDialog: document.querySelector("#usageDialog"),
  usageDialogTitle: document.querySelector("#usageDialogTitle"),
  closeUsageDialogBtn: document.querySelector("#closeUsageDialogBtn"),
  cancelUsageBtn: document.querySelector("#cancelUsageBtn"),
  resetUsageBtn: document.querySelector("#resetUsageBtn"),
  usageForm: document.querySelector("#usageForm"),
  usageId: document.querySelector("#usageId"),
  usageMachineInput: document.querySelector("#usageMachineInput"),
  usageCustomerInput: document.querySelector("#usageCustomerInput"),
  usageBillTypeInput: document.querySelector("#usageBillTypeInput"),
  usageLimitInput: document.querySelector("#usageLimitInput"),
  usageDateInput: document.querySelector("#usageDateInput"),
  usageDailyInput: document.querySelector("#usageDailyInput"),
  usageNotesInput: document.querySelector("#usageNotesInput"),
  usageDailyHistory: document.querySelector("#usageDailyHistory"),
  usageHistoryTotal: document.querySelector("#usageHistoryTotal"),
  saveUsageBtn: document.querySelector("#saveUsageBtn"),

  supportUnreadTotal: document.querySelector("#supportUnreadTotal"),
  supportConversationList: document.querySelector("#supportConversationList"),
  supportThreadUserId: document.querySelector("#supportThreadUserId"),
  supportThreadName: document.querySelector("#supportThreadName"),
  supportMessageList: document.querySelector("#supportMessageList"),
  supportMessageForm: document.querySelector("#supportMessageForm"),
  supportMessageInput: document.querySelector("#supportMessageInput"),
  supportReceiptInput: document.querySelector("#supportReceiptInput"),
  supportReceiptBtn: document.querySelector("#supportReceiptBtn"),
  supportVoiceBtn: document.querySelector("#supportVoiceBtn"),
  supportAttachmentPreview: document.querySelector("#supportAttachmentPreview"),
  openAnnouncementDialogBtn: document.querySelector("#openAnnouncementDialogBtn"),
  adminAnnouncementList: document.querySelector("#adminAnnouncementList"),
  announcementDialog: document.querySelector("#announcementDialog"),
  announcementDialogTitle: document.querySelector("#announcementDialogTitle"),
  closeAnnouncementDialogBtn: document.querySelector("#closeAnnouncementDialogBtn"),
  announcementForm: document.querySelector("#announcementForm"),
  announcementId: document.querySelector("#announcementId"),
  announcementTitle: document.querySelector("#announcementTitle"),
  announcementType: document.querySelector("#announcementType"),
  announcementMessage: document.querySelector("#announcementMessage"),
  announcementActive: document.querySelector("#announcementActive"),
  resetAnnouncementBtn: document.querySelector("#resetAnnouncementBtn"),
  cancelAnnouncementBtn: document.querySelector("#cancelAnnouncementBtn"),

  userCount: document.querySelector("#userCount"),
  adminCount: document.querySelector("#adminCount"),
  standardUserCount: document.querySelector("#standardUserCount"),
  userBody: document.querySelector("#userBody"),
  userRowTemplate: document.querySelector("#userRowTemplate"),
  openUserDialogBtn: document.querySelector("#openUserDialogBtn"),
  userDialog: document.querySelector("#userDialog"),
  userDialogTitle: document.querySelector("#userDialogTitle"),
  closeUserDialogBtn: document.querySelector("#closeUserDialogBtn"),
  cancelUserBtn: document.querySelector("#cancelUserBtn"),
  resetUserBtn: document.querySelector("#resetUserBtn"),
  userForm: document.querySelector("#userForm"),
  userRecordId: document.querySelector("#userRecordId"),
  userFullNameInput: document.querySelector("#userFullNameInput"),
  userUsernameInput: document.querySelector("#userUsernameInput"),
  userPasswordInput: document.querySelector("#userPasswordInput"),
  userRoleInput: document.querySelector("#userRoleInput"),
  saveUserBtn: document.querySelector("#saveUserBtn"),
  permissionChecks: document.querySelectorAll(".permission-grid input[type='checkbox']"),

  customerAccountBody: document.querySelector("#customerAccountBody"),
  customerAccountRowTemplate: document.querySelector("#customerAccountRowTemplate"),
  openCustomerAccountDialogBtn: document.querySelector("#openCustomerAccountDialogBtn"),
  customerAccountDialog: document.querySelector("#customerAccountDialog"),
  customerAccountDialogTitle: document.querySelector("#customerAccountDialogTitle"),
  closeCustomerAccountDialogBtn: document.querySelector("#closeCustomerAccountDialogBtn"),
  customerAccountForm: document.querySelector("#customerAccountForm"),
  customerAccountId: document.querySelector("#customerAccountId"),
  customerAccountName: document.querySelector("#customerAccountName"),
  customerAccountUsername: document.querySelector("#customerAccountUsername"),
  customerAccountDeviceId: document.querySelector("#customerAccountDeviceId"),
  customerAccountPassword: document.querySelector("#customerAccountPassword"),
  customerAccountStatus: document.querySelector("#customerAccountStatus"),
  resetCustomerAccountBtn: document.querySelector("#resetCustomerAccountBtn"),
  cancelCustomerAccountBtn: document.querySelector("#cancelCustomerAccountBtn"),

  openColorSettingsBtn: document.querySelector("#openColorSettingsBtn"),
  colorDialog: document.querySelector("#colorDialog"),
  closeColorDialogBtn: document.querySelector("#closeColorDialogBtn"),
  cancelColorBtn: document.querySelector("#cancelColorBtn"),
  resetColorBtn: document.querySelector("#resetColorBtn"),
  colorForm: document.querySelector("#colorForm"),
  colorUnpaidInput: document.querySelector("#colorUnpaidInput"),
  colorPaidInput: document.querySelector("#colorPaidInput"),
  colorWarnInput: document.querySelector("#colorWarnInput"),
  colorDangerInput: document.querySelector("#colorDangerInput"),
  colorSuspendedInput: document.querySelector("#colorSuspendedInput"),
  colorInactiveInput: document.querySelector("#colorInactiveInput")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === "object" && payload?.error ? payload.error : "Request failed";
    throw new Error(message);
  }
  return payload;
}

let appRealtimeSocket = null;
let appRealtimeReconnect = null;
let appRealtimeRefresh = null;

function connectAppRealtime() {
  if (!state.user || appRealtimeSocket?.readyState === WebSocket.OPEN || appRealtimeSocket?.readyState === WebSocket.CONNECTING) return;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  appRealtimeSocket = new WebSocket(`${protocol}//${location.host}/ws`);
  appRealtimeSocket.onmessage = (event) => {
    const message = JSON.parse(event.data || "{}");
    if (!["support_message", "announcement_updated", "usage_updated"].includes(message.type)) return;
    clearTimeout(appRealtimeRefresh);
    appRealtimeRefresh = setTimeout(() => refreshState().catch(() => {}), 80);
  };
  appRealtimeSocket.onclose = () => {
    appRealtimeSocket = null;
    clearTimeout(appRealtimeReconnect);
    if (state.user) appRealtimeReconnect = setTimeout(connectAppRealtime, 2500);
  };
  appRealtimeSocket.onerror = () => appRealtimeSocket?.close();
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function parseMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
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

function monthLabel(key) {
  const [year, month] = String(key || "").split("-").map(Number);
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${names[(month || 1) - 1]} ${year || ""}`.trim();
}

function canAccess(tab) {
  if (tab === "adminPage") return state.user?.role === "admin";
  return state.user?.role === "admin" || (state.user?.allowedTabs || []).includes(tab);
}

function loadBillColors() {
  try {
    const raw = localStorage.getItem(BILL_COLOR_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BILL_COLORS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BILL_COLORS, ...parsed };
  } catch {
    return { ...DEFAULT_BILL_COLORS };
  }
}

function applyBillColors(colors) {
  state.billColors = { ...DEFAULT_BILL_COLORS, ...(colors || {}) };
  const root = document.documentElement.style;
  root.setProperty("--status-unpaid", state.billColors.unpaid);
  root.setProperty("--status-paid", state.billColors.paid);
  root.setProperty("--status-warn", state.billColors.warn);
  root.setProperty("--status-danger", state.billColors.danger);
  root.setProperty("--status-suspended", state.billColors.suspended);
  root.setProperty("--status-inactive", state.billColors.inactive);
}

function syncColorInputs() {
  el.colorUnpaidInput.value = state.billColors.unpaid;
  el.colorPaidInput.value = state.billColors.paid;
  el.colorWarnInput.value = state.billColors.warn;
  el.colorDangerInput.value = state.billColors.danger;
  el.colorSuspendedInput.value = state.billColors.suspended;
  el.colorInactiveInput.value = state.billColors.inactive;
}

function readColorForm() {
  return {
    unpaid: el.colorUnpaidInput.value,
    paid: el.colorPaidInput.value,
    warn: el.colorWarnInput.value,
    danger: el.colorDangerInput.value,
    suspended: el.colorSuspendedInput.value,
    inactive: el.colorInactiveInput.value
  };
}

function usageTotal(record) {
  return dailyUsageEntries(record).reduce((sum, entry) => sum + entry.value, Number(record.legacyUsageTB || 0));
}

function dailyUsageEntries(record) {
  return Object.entries(record.dailyUsage || {})
    .map(([date, value]) => ({ date, value: Number(value || 0) }))
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && Number.isFinite(entry.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function usageDefaultDate() {
  const today = localDateKey();
  return today.startsWith(`${state.activeMonth}-`) ? today : `${state.activeMonth}-01`;
}

function usageMonthLastDate() {
  const [year, month] = state.activeMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${state.activeMonth}-${String(lastDay).padStart(2, "0")}`;
}

function formatUsageDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey || "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function usageAlertState(record) {
  const total = usageTotal(record);
  const limit = Number(record.usageLimitTB || 5);
  if (total >= limit) return "critical";
  if (total >= Math.max(limit - 0.5, 0)) return "warning";
  return "safe";
}

function usageAlertLabel(state) {
  return {
    safe: "safe",
    warning: "near 5 TB",
    critical: "5 TB reached"
  }[state] || state;
}

function currentMonthUsageRecords() {
  return state.usageRecords.filter((item) => String(item.monthKey || "") === state.activeMonth);
}

function updateState(snapshot) {
  state.user = snapshot.user;
  state.activePage = snapshot.activePage || "dashboardPage";
  state.activeMonth = snapshot.activeMonth || currentMonthKey();
  state.months = snapshot.months || {};
  state.billRecords = snapshot.billRecords || [];
  state.deviceRecords = snapshot.deviceRecords || [];
  state.usageRecords = snapshot.usageRecords || [];
  state.users = snapshot.users || [];
  state.customerAccounts = snapshot.customerAccounts || [];
  state.announcements = snapshot.announcements || [];
  state.supportMessages = snapshot.supportMessages || [];
  if (!state.selectedSupportCustomerId && state.customerAccounts.length) {
    state.selectedSupportCustomerId = state.customerAccounts[0].id;
  }
}

async function refreshState() {
  const currentPage = state.activePage;
  const snapshot = await api("/api/bootstrap");
  updateState(snapshot);
  if (currentPage && canAccess(currentPage)) {
    state.activePage = currentPage;
  }
  render();
  connectAppRealtime();
}

function showLogin(message = "") {
  el.loginScreen.classList.remove("hidden");
  el.appShell.classList.add("hidden");
  el.loginMessage.textContent = message;
}

function showApp() {
  el.loginScreen.classList.add("hidden");
  el.appShell.classList.remove("hidden");
}

function render() {
  if (!state.user) {
    showLogin();
    return;
  }

  showApp();
  renderHeader();
  renderPage();
  renderCashPage();
  renderBillPage();
  renderDevicePage();
  renderUsagePage();
  renderSupportPage();
  renderAdminPage();
  updateCalculator();
}

function renderHeader() {
  el.currentUserName.textContent = state.user.fullName || state.user.username;
  el.currentUserRole.textContent = state.user.role;
  el.menuItems.forEach((item) => {
    const allowed = canAccess(item.dataset.page);
    item.classList.toggle("hidden", !allowed);
    item.classList.toggle("active", item.dataset.page === state.activePage);
  });
  const adminOnly = state.user.role !== "admin";
  el.adminPanelBtn.classList.toggle("hidden", adminOnly);
  el.exportJsonBtn.classList.toggle("hidden", adminOnly);
  el.importJsonInput.closest(".file-item").classList.toggle("hidden", adminOnly);
  document.querySelectorAll(".admin-action-col").forEach((node) => node.classList.toggle("hidden", adminOnly));
}

function isAdmin() {
  return state.user?.role === "admin";
}

function renderPage() {
  const visibleTabs = Object.keys(TAB_LABELS).filter(canAccess);
  if (!canAccess(state.activePage)) {
    state.activePage = visibleTabs[0] || "dashboardPage";
  }
  el.pageViews.forEach((page) => {
    page.classList.toggle("active", page.id === state.activePage);
  });
}

function activeMonthData() {
  if (!state.months[state.activeMonth]) {
    state.months[state.activeMonth] = { openingCash: 0, entries: [] };
  }
  return state.months[state.activeMonth];
}

function cashTotals(month) {
  const totalIn = month.entries.reduce((sum, entry) => sum + Number(entry.inAmount || 0), 0);
  const totalOut = month.entries.reduce((sum, entry) => sum + Number(entry.outAmount || 0), 0);
  return { totalIn, totalOut, closingCash: Number(month.openingCash || 0) + totalIn - totalOut };
}

function renderCashPage() {
  const month = activeMonthData();
  const totals = cashTotals(month);
  el.summaryMonth.textContent = monthLabel(state.activeMonth);
  el.openingCashInput.value = month.openingCash || 0;
  el.totalIn.textContent = formatMoney(totals.totalIn);
  el.totalOut.textContent = formatMoney(totals.totalOut);
  el.closingCash.textContent = formatMoney(totals.closingCash);

  const balances = new Map();
  let running = Number(month.openingCash || 0);
  month.entries.forEach((entry) => {
    running += Number(entry.inAmount || 0) - Number(entry.outAmount || 0);
    balances.set(entry.id, running);
  });

  el.ledgerBody.innerHTML = "";
  month.entries.forEach((entry, index) => {
    const row = el.rowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = entry.id;
    row.querySelector(".row-number").textContent = index + 1;
    row.querySelector(".date-cell").textContent = entry.date || "";
    row.querySelector(".description-cell").textContent = entry.description || "";
    row.querySelector(".in-cell").textContent = entry.inAmount ? formatMoney(entry.inAmount) : "";
    row.querySelector(".out-cell").textContent = entry.outAmount ? formatMoney(entry.outAmount) : "";
    row.querySelector(".status-cell").textContent = formatMoney(balances.get(entry.id));
    const actions = row.querySelector(".row-actions");
    if (isAdmin()) {
      row.querySelector(".edit-row").onclick = () => editCashEntry(entry.id);
      row.querySelector(".delete-row").onclick = () => deleteCashEntry(entry.id);
    } else {
      actions.classList.add("hidden");
    }
    el.ledgerBody.append(row);
  });
}

function getBillAlertState(record) {
  if (!record.cutOffDate || record.status === "inactive" || record.status === "paid_done" || record.status === "paid_pending") return "none";
  const today = startOfDay(new Date());
  const cutOff = startOfDay(new Date(record.cutOffDate));
  if (Number.isNaN(cutOff.getTime())) return "none";
  const diffDays = Math.round((cutOff - today) / 86400000);
  if (diffDays <= 0) return "suspended";
  if (diffDays === 1) return "due_1_day";
  if (diffDays <= 7) return "due_7_days";
  return "none";
}

function billStatusLabel(status) {
  const labels = {
    sent_unpaid: "bill sent / unpaid",
    paid_done: "money received",
    paid_pending: "paid / bill pending",
    inactive: "inactive",
    suspended: "suspended"
  };
  return labels[status] || status;
}

function billAlertLabel(alertState) {
  return {
    none: "",
    due_7_days: "7 days left",
    due_1_day: "1 day left",
    suspended: "suspended"
  }[alertState] || "";
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function deriveBillDisplay(record) {
  if (record.status === "inactive") {
    return { status: "inactive", alertState: "none" };
  }
  if (record.status === "paid_done") {
    return { status: "paid_done", alertState: "none" };
  }
  if (record.status === "paid_pending") {
    return { status: "paid_pending", alertState: "none" };
  }
  const alertState = getBillAlertState(record);
  if (alertState === "suspended") {
    return { status: "suspended", alertState };
  }
  return { status: "sent_unpaid", alertState };
}

function renderBillPage() {
  const counts = { sent_unpaid: 0, paid_done: 0, paid_pending: 0, inactive: 0, suspended: 0 };
  const alerts = { due_7_days: 0, due_1_day: 0, suspended: 0 };
  const attention = [];

  el.billBody.innerHTML = "";
  state.billRecords.forEach((record) => {
    const display = deriveBillDisplay(record);
    counts[display.status] = (counts[display.status] || 0) + 1;
    const alertState = display.alertState;
    if (alerts[alertState] != null) alerts[alertState] += 1;
    if (alertState !== "none") attention.push({ record, alertState });

    const row = el.billRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = record.id;
    row.classList.add(`bill-row-${display.status}`);
    if (alertState !== "none") row.classList.add(`bill-alert-${alertState}`);
    row.querySelector(".machine-cell").textContent = record.machine || "";
    row.querySelector(".submitted-cell").textContent = record.submittedDate || "";
    row.querySelector(".bill-date-cell").textContent = record.billDate || "";
    row.querySelector(".cut-off-cell").textContent = record.cutOffDate || "";
    row.querySelector(".bill-type-cell").textContent = record.billType || "";
    row.querySelector(".bill-status-cell").textContent = billStatusLabel(display.status);
    row.querySelector(".bill-alert-cell").textContent = billAlertLabel(alertState);
    row.querySelector(".customer-cell").textContent = record.customer || "";
    const actions = row.querySelector(".row-actions");
    if (isAdmin()) {
      row.querySelector(".edit-bill").onclick = () => editBillRecord(record.id);
      row.querySelector(".delete-bill").onclick = () => deleteBillRecord(record.id);
    } else {
      actions.classList.add("hidden");
    }
    el.billBody.append(row);
  });

  el.billSentCount.textContent = counts.sent_unpaid;
  el.billPaidCount.textContent = counts.paid_done;
  el.billPendingCount.textContent = alerts.due_7_days;
  el.billInactiveCount.textContent = alerts.due_1_day;
  el.billSuspendedCount.textContent = alerts.suspended;
  el.dashSentCount.textContent = counts.sent_unpaid;
  el.dashPaidCount.textContent = counts.paid_done;
  el.dashInactiveCount.textContent = counts.inactive;
  el.alertSevenCount.textContent = alerts.due_7_days;
  el.alertOneCount.textContent = alerts.due_1_day;
  el.alertSuspendedCount.textContent = alerts.suspended;
  renderAlertList(attention);
}

function renderAlertList(items) {
  el.alertList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "alert-empty";
    empty.textContent = "No upcoming suspension alerts right now.";
    el.alertList.append(empty);
    return;
  }
  const priority = { suspended: 0, due_1_day: 1, due_7_days: 2 };
  items.sort((a, b) => priority[a.alertState] - priority[b.alertState]).forEach(({ record, alertState }) => {
    const item = document.createElement("div");
    item.className = `alert-item ${alertState}`;
    item.innerHTML = `
      <div>
        <strong>${record.machine || "-"}</strong>
        <span>${record.customer || "No customer"} | ${record.billType || "No bill type"}</span>
      </div>
      <div>
        <strong>${billAlertLabel(alertState)}</strong>
        <span>Cut off: ${record.cutOffDate || "-"}</span>
      </div>
    `;
    el.alertList.append(item);
  });
}

function renderDevicePage() {
  const regions = new Set();
  let normal = 0;
  let discount = 0;
  el.deviceBody.innerHTML = "";

  state.deviceRecords.forEach((record) => {
    if (record.region) regions.add(record.region.trim().toLowerCase());
    if (record.planStatus === "discount") discount += 1;
    else normal += 1;

    const row = el.deviceRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = record.id;
    row.querySelector(".device-no-cell").textContent = record.no || "";
    row.querySelector(".device-name-cell").textContent = record.name || "";
    row.querySelector(".device-email-cell").textContent = record.email || "";
    row.querySelector(".device-id-cell").textContent = record.deviceId || "";
    row.querySelector(".device-serial-cell").textContent = record.serialNumber || "";
    row.querySelector(".device-kit-cell").textContent = record.kitNumber || "";
    row.querySelector(".device-address-cell").textContent = record.serviceAddress || "";
    row.querySelector(".device-region-cell").textContent = record.region || "";
    row.querySelector(".device-plan-cell").textContent = record.planStatus || "";
    const actions = row.querySelector(".row-actions");
    if (isAdmin()) {
      row.querySelector(".edit-device").onclick = () => editDeviceRecord(record.id);
      row.querySelector(".delete-device").onclick = () => deleteDeviceRecord(record.id);
    } else {
      actions.classList.add("hidden");
    }
    el.deviceBody.append(row);
  });

  el.deviceCount.textContent = state.deviceRecords.length;
  el.deviceNormalCount.textContent = normal;
  el.deviceDiscountCount.textContent = discount;
  el.deviceRegionCount.textContent = regions.size;
}

function renderUsagePage() {
  const records = currentMonthUsageRecords();
  const counts = { safe: 0, warning: 0, critical: 0 };
  const flagged = [];
  el.usageBody.innerHTML = "";

  records.forEach((record) => {
    const entries = dailyUsageEntries(record);
    const latest = entries.at(-1);
    const todayUsage = Number(record.dailyUsage?.[localDateKey()] || 0);
    const total = usageTotal(record);
    const limit = Number(record.usageLimitTB || 5);
    const remaining = Math.max(limit - total, 0);
    const alertState = usageAlertState(record);
    counts[alertState] = (counts[alertState] || 0) + 1;
    if (alertState !== "safe") flagged.push({ ...record, total, limit, remaining, alertState });

    const row = el.usageRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = record.id;
    row.classList.add(`usage-row-${alertState}`);
    row.querySelector(".usage-machine-cell").textContent = record.machine || "";
    row.querySelector(".usage-customer-cell").textContent = record.customer || "";
    row.querySelector(".usage-billtype-cell").textContent = record.billType || "";
    row.querySelector(".usage-today-cell").textContent = `${todayUsage.toFixed(3)} TB`;
    row.querySelector(".usage-last-cell").textContent = latest ? `${formatUsageDate(latest.date)} | ${latest.value.toFixed(3)} TB` : "No entry";
    row.querySelector(".usage-total-cell").textContent = `${total.toFixed(2)} TB`;
    row.querySelector(".usage-remaining-cell").textContent = `${remaining.toFixed(2)} TB`;
    row.querySelector(".usage-alert-cell").textContent = usageAlertLabel(alertState);
    const actions = row.querySelector(".row-actions");
    if (isAdmin()) {
      row.querySelector(".edit-usage").onclick = () => editUsageRecord(record.id);
      row.querySelector(".delete-usage").onclick = () => deleteUsageRecord(record.id);
    } else {
      actions.classList.add("hidden");
    }
    el.usageBody.append(row);
  });

  el.usageTrackedCount.textContent = records.length;
  el.usageSafeCount.textContent = counts.safe;
  el.usageWarnCount.textContent = counts.warning;
  el.usageExceededCount.textContent = counts.critical;
  el.usageNearCount.textContent = counts.warning;
  el.usageCriticalCount.textContent = counts.critical;
  renderUsageAlerts(flagged);
}

function renderUsageAlerts(items) {
  el.usageAlertList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "alert-empty";
    empty.textContent = `No machines are close to 5 TB for ${monthLabel(state.activeMonth)}.`;
    el.usageAlertList.append(empty);
    return;
  }

  items
    .sort((a, b) => {
      const severity = { critical: 0, warning: 1, safe: 2 };
      const rank = severity[a.alertState] - severity[b.alertState];
      if (rank !== 0) return rank;
      return b.total - a.total;
    })
    .forEach((item) => {
      const node = document.createElement("div");
      node.className = `usage-alert-item ${item.alertState}`;
      node.innerHTML = `
        <div>
          <strong>${item.machine || "-"}</strong>
          <span>${item.customer || "No customer"} | ${item.billType || "No bill type"}</span>
        </div>
        <div>
          <strong>${item.total.toFixed(2)} / ${item.limit.toFixed(2)} TB</strong>
          <span>${usageAlertLabel(item.alertState)}</span>
        </div>
      `;
      el.usageAlertList.append(node);
    });
}

function formatMessageTime(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function messagesForCustomer(customerId) {
  return state.supportMessages
    .filter((item) => item.customerId === customerId)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
}

function renderSupportPage() {
  if (!el.supportConversationList) return;
  const accounts = [...state.customerAccounts].sort((a, b) => {
    const unreadA = messagesForCustomer(a.id).filter((item) => item.senderType === "customer" && !item.readByStaff).length;
    const unreadB = messagesForCustomer(b.id).filter((item) => item.senderType === "customer" && !item.readByStaff).length;
    if (unreadA !== unreadB) return unreadB - unreadA;
    const lastA = messagesForCustomer(a.id).at(-1)?.createdAt || "";
    const lastB = messagesForCustomer(b.id).at(-1)?.createdAt || "";
    return String(lastB).localeCompare(String(lastA));
  });
  const totalUnread = state.supportMessages.filter((item) => item.senderType === "customer" && !item.readByStaff).length;
  el.supportUnreadTotal.textContent = totalUnread;
  el.supportConversationList.innerHTML = "";

  if (!accounts.length) {
    const empty = document.createElement("div");
    empty.className = "alert-empty";
    empty.textContent = "Create a customer login account to start support chat.";
    el.supportConversationList.append(empty);
  }

  accounts.forEach((customer) => {
    const messages = messagesForCustomer(customer.id);
    const last = messages.at(-1);
    const unread = messages.filter((item) => item.senderType === "customer" && !item.readByStaff).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `support-conversation${state.selectedSupportCustomerId === customer.id ? " active" : ""}`;
    const identity = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = customer.fullName || customer.username;
    const device = document.createElement("span");
    device.textContent = `${customer.linkedDeviceId || "No User ID"} | ${customer.username}`;
    identity.append(name, device);
    const preview = document.createElement("small");
    preview.textContent = last?.message || (last?.attachment?.kind === "audio" ? "Voice message" : last?.attachment ? "Payment receipt" : "No messages yet");
    button.append(identity, preview);
    if (unread) {
      const badge = document.createElement("b");
      badge.textContent = unread;
      button.append(badge);
    }
    button.onclick = async () => {
      state.selectedSupportCustomerId = customer.id;
      renderSupportPage();
      if (unread) {
        await api("/api/support/read", { method: "POST", body: JSON.stringify({ customerId: customer.id }) });
        await refreshState();
      }
    };
    el.supportConversationList.append(button);
  });

  const selected = state.customerAccounts.find((item) => item.id === state.selectedSupportCustomerId);
  el.supportMessageList.innerHTML = "";
  el.supportMessageInput.disabled = !selected;
  el.supportReceiptBtn.disabled = !selected;
  el.supportVoiceBtn.disabled = !selected;
  if (!selected) {
    el.supportThreadUserId.textContent = "Select customer";
    el.supportThreadName.textContent = "Billing & Support";
    const empty = document.createElement("div");
    empty.className = "alert-empty";
    empty.textContent = "Select a customer conversation.";
    el.supportMessageList.append(empty);
  } else {
    el.supportThreadUserId.textContent = selected.linkedDeviceId || "Customer";
    el.supportThreadName.textContent = selected.fullName || selected.username;
    const thread = messagesForCustomer(selected.id);
    if (!thread.length) {
      const empty = document.createElement("div");
      empty.className = "alert-empty";
      empty.textContent = "No messages yet.";
      el.supportMessageList.append(empty);
    }
    thread.forEach((item) => {
      const bubble = document.createElement("article");
      bubble.className = `staff-message${item.senderType === "staff" ? " mine" : ""}`;
      const body = document.createElement("p");
      body.textContent = item.message || "";
      if (!item.message) body.classList.add("hidden");
      if (item.attachment) bubble.append(makeSupportAttachment(item.attachment));
      const meta = document.createElement("small");
      meta.textContent = `${item.senderType === "staff" ? "Staff" : selected.fullName || selected.username} | ${formatMessageTime(item.createdAt)}`;
      bubble.append(body, meta);
      el.supportMessageList.append(bubble);
    });
    el.supportMessageList.scrollTop = el.supportMessageList.scrollHeight;
  }
  renderAdminAnnouncements();
}

function makeSupportAttachment(attachment) {
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

function clearSupportAttachment() {
  supportPendingAttachment = null;
  el.supportReceiptInput.value = "";
  el.supportAttachmentPreview.innerHTML = "";
  el.supportAttachmentPreview.classList.add("hidden");
}

function setSupportAttachment(file, kind) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) return alert("Attachment must be 8 MB or smaller.");
  clearSupportAttachment();
  supportPendingAttachment = { file, kind };
  const name = document.createElement("span");
  name.textContent = kind === "audio" ? "Voice message ready" : file.name;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.onclick = clearSupportAttachment;
  el.supportAttachmentPreview.append(name, remove);
  el.supportAttachmentPreview.classList.remove("hidden");
}

async function toggleSupportRecording() {
  if (supportRecorder?.state === "recording") {
    supportRecorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return alert("Voice recording is not supported on this device.");
  try {
    supportRecordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    supportRecorder = new MediaRecorder(supportRecordingStream);
    supportRecorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    supportRecorder.onstop = () => {
      const mime = supportRecorder.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mime });
      setSupportAttachment(new File([blob], `voice-${Date.now()}.webm`, { type: mime }), "audio");
      supportRecordingStream?.getTracks().forEach((track) => track.stop());
      supportRecordingStream = null;
      el.supportVoiceBtn.textContent = "Voice";
      el.supportVoiceBtn.classList.remove("recording");
    };
    supportRecorder.start();
    el.supportVoiceBtn.textContent = "Stop";
    el.supportVoiceBtn.classList.add("recording");
  } catch {
    alert("Microphone permission is required to send a voice message.");
  }
}

function renderAdminAnnouncements() {
  el.adminAnnouncementList.innerHTML = "";
  el.openAnnouncementDialogBtn.classList.toggle("hidden", !isAdmin());
  if (!state.announcements.length) {
    const empty = document.createElement("div");
    empty.className = "alert-empty";
    empty.textContent = "No announcements published yet.";
    el.adminAnnouncementList.append(empty);
    return;
  }
  [...state.announcements]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = "admin-announcement";
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.title || "Announcement";
      const message = document.createElement("p");
      message.textContent = item.message || "";
      const meta = document.createElement("small");
      meta.textContent = `${item.type || "general"} | ${item.active === false ? "Hidden" : "Visible"} | ${formatMessageTime(item.updatedAt || item.createdAt)}`;
      content.append(title, message, meta);
      card.append(content);
      if (isAdmin()) {
        const actions = document.createElement("div");
        actions.className = "row-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.onclick = () => editAnnouncement(item.id);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger";
        remove.textContent = "Delete";
        remove.onclick = () => deleteAnnouncement(item.id);
        actions.append(edit, remove);
        card.append(actions);
      }
      el.adminAnnouncementList.append(card);
    });
}

function renderAdminPage() {
  const admins = state.users.filter((user) => user.role === "admin").length;
  el.userCount.textContent = state.users.length;
  el.adminCount.textContent = admins;
  el.standardUserCount.textContent = Math.max(0, state.users.length - admins);
  el.userBody.innerHTML = "";

  state.users.forEach((user) => {
    const row = el.userRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = user.id;
    row.querySelector(".user-fullname-cell").textContent = user.fullName || "";
    row.querySelector(".user-username-cell").textContent = user.username || "";
    row.querySelector(".user-role-cell").textContent = user.role || "";
    row.querySelector(".user-tabs-cell").textContent = user.role === "admin"
      ? "All tabs"
      : (user.allowedTabs || []).map((tab) => TAB_LABELS[tab] || tab).join(", ");
    row.querySelector(".edit-user").onclick = () => editUserRecord(user.id);
    row.querySelector(".delete-user").onclick = () => deleteUserRecord(user.id);
    el.userBody.append(row);
  });

  el.customerAccountBody.innerHTML = "";
  state.customerAccounts.forEach((customer) => {
    const row = el.customerAccountRowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".customer-account-name").textContent = customer.fullName || "";
    row.querySelector(".customer-account-username").textContent = customer.username || "";
    row.querySelector(".customer-account-device").textContent = customer.linkedDeviceId || "";
    row.querySelector(".customer-account-status").textContent = customer.active === false ? "Inactive" : "Active";
    row.querySelector(".edit-customer-account").onclick = () => editCustomerAccount(customer.id);
    row.querySelector(".delete-customer-account").onclick = () => deleteCustomerAccount(customer.id);
    el.customerAccountBody.append(row);
  });
}

function updateCalculator() {
  const total = Number(el.rateInput.value || 0) * Number(el.costInput.value || 0);
  const profit = Number(el.priceInput.value || 0) - total;
  el.calcTotal.textContent = formatMoney(total);
  el.calcProfit.textContent = formatMoney(profit);
  el.calcProfit.classList.toggle("negative", profit < 0);
}

function entryCalculationValues() {
  const rate = Number(el.entryRateInput.value || 0);
  const cost = Number(el.entryCostInput.value || 0);
  const price = Number(el.entryPriceInput.value || 0);
  const totalCost = rate * cost;
  return { rate, cost, price, totalCost, profit: price - totalCost };
}

function updateEntryCalculation() {
  const enabled = el.creditInput.checked;
  el.entryCalculatorPanel.classList.toggle("hidden", !enabled);
  el.openEntryCalculatorBtn.textContent = enabled ? "Hide Calculator" : "Calculate Profit";
  [el.entryRateInput, el.entryCostInput, el.entryPriceInput].forEach((input) => {
    input.disabled = !enabled;
    input.required = enabled;
  });
  el.inInput.readOnly = enabled;
  el.outInput.readOnly = enabled;

  if (!enabled) {
    el.entryTotalOutput.textContent = "0";
    el.entryProfitOutput.textContent = "0";
    el.entryProfitOutput.classList.remove("negative");
    return;
  }

  const values = entryCalculationValues();
  el.entryTotalOutput.textContent = formatMoney(values.totalCost);
  el.entryProfitOutput.textContent = formatMoney(values.profit);
  el.entryProfitOutput.classList.toggle("negative", values.profit < 0);

  const ready = [el.entryRateInput, el.entryCostInput, el.entryPriceInput].every((input) => input.value !== "");
  if (!ready) {
    el.inInput.value = "";
    el.outInput.value = "";
  } else if (values.profit >= 0) {
    el.inInput.value = String(values.profit);
    el.outInput.value = "";
  } else {
    el.inInput.value = "";
    el.outInput.value = String(Math.abs(values.profit));
  }
}

function setEntryCalculatorOpen(open) {
  const wasCalculated = el.creditInput.checked;
  el.creditInput.checked = open;
  if (!open && wasCalculated) {
    el.entryRateInput.value = "";
    el.entryCostInput.value = "";
    el.entryPriceInput.value = "";
    el.inInput.value = "";
    el.outInput.value = "";
  }
  updateEntryCalculation();
  if (open) el.entryRateInput.focus();
}

function setDialogOpen(node, open) {
  if (!node) return;
  if (open) {
    node.classList.remove("hidden");
    requestAnimationFrame(() => node.classList.add("open"));
  } else {
    node.classList.remove("open");
    setTimeout(() => node.classList.add("hidden"), 160);
  }
}

function resetEntryForm() {
  el.entryForm.reset();
  el.entryId.value = "";
  el.dateInput.value = `${state.activeMonth}-01`;
  el.entryDialogTitle.textContent = "Add Record";
  el.saveBtn.textContent = "Add Record";
  updateEntryCalculation();
}

function resetBillForm() {
  el.billForm.reset();
  el.billId.value = "";
  el.cutOffInput.value = "";
  el.billDialogTitle.textContent = "Add Machine";
  el.saveBillBtn.textContent = "Save Machine";
}

function updateSuspendedPreview() {
  el.cutOffInput.value = shiftDate(el.billDateInput.value, -7);
}

function resetDeviceForm() {
  el.deviceForm.reset();
  el.deviceRecordId.value = "";
  el.deviceDialogTitle.textContent = "Add Device";
  el.saveDeviceBtn.textContent = "Save Device";
  el.planStatusInput.value = "normal";
}

function resetUsageForm() {
  el.usageForm.reset();
  el.usageId.value = "";
  el.usageDialogTitle.textContent = "Add Daily Usage";
  el.saveUsageBtn.textContent = "Save Daily Usage";
  el.usageLimitInput.value = "5";
  el.usageDateInput.min = `${state.activeMonth}-01`;
  el.usageDateInput.max = usageMonthLastDate();
  el.usageDateInput.value = usageDefaultDate();
  el.usageDailyInput.value = "0";
  renderUsageHistory(null);
}

function resetUserForm() {
  el.userForm.reset();
  el.userRecordId.value = "";
  el.userDialogTitle.textContent = "Create User";
  el.saveUserBtn.textContent = "Save User";
  el.userRoleInput.value = "user";
  updatePermissionChecklist();
}

function resetCustomerAccountForm() {
  el.customerAccountForm.reset();
  el.customerAccountId.value = "";
  el.customerAccountStatus.value = "active";
  el.customerAccountDialogTitle.textContent = "Create Customer Account";
  el.customerAccountPassword.required = true;
}

function resetAnnouncementForm() {
  el.announcementForm.reset();
  el.announcementId.value = "";
  el.announcementType.value = "general";
  el.announcementActive.checked = true;
  el.announcementDialogTitle.textContent = "New Announcement";
}

function resetColorForm() {
  applyBillColors(DEFAULT_BILL_COLORS);
  syncColorInputs();
}

function getSelectedTabs() {
  return [...el.permissionChecks].filter((item) => item.checked).map((item) => item.value);
}

function setSelectedTabs(tabs) {
  const picked = new Set(tabs || []);
  el.permissionChecks.forEach((item) => {
    item.checked = picked.has(item.value);
  });
}

function updatePermissionChecklist() {
  const isAdmin = el.userRoleInput.value === "admin";
  el.permissionChecks.forEach((item) => {
    item.disabled = isAdmin;
    if (isAdmin) item.checked = true;
  });
}

async function saveOpeningCash() {
  await api("/api/cash/opening", {
    method: "POST",
    body: JSON.stringify({ monthKey: state.activeMonth, openingCash: parseMoney(el.openingCashInput.value) })
  });
  await refreshState();
}

async function saveCashEntry(event) {
  event.preventDefault();
  const calculation = entryCalculationValues();
  const payload = {
    id: el.entryId.value || undefined,
    date: el.dateInput.value,
    description: el.descriptionInput.value.trim(),
    inAmount: parseMoney(el.inInput.value),
    outAmount: parseMoney(el.outInput.value),
    useProfitCalculation: el.creditInput.checked,
    rate: el.creditInput.checked ? calculation.rate : 0,
    cost: el.creditInput.checked ? calculation.cost : 0,
    price: el.creditInput.checked ? calculation.price : 0,
    totalCost: el.creditInput.checked ? calculation.totalCost : 0,
    profitAmount: el.creditInput.checked ? calculation.profit : 0
  };
  if (!payload.inAmount && !payload.outAmount) {
    alert("Please enter an In or Out amount.");
    return;
  }
  await api("/api/cash/entry", {
    method: "POST",
    body: JSON.stringify({ monthKey: state.activeMonth, entry: payload })
  });
  resetEntryForm();
  setDialogOpen(el.entryDialog, false);
  await refreshState();
}

function editCashEntry(id) {
  if (!isAdmin()) return;
  const entry = activeMonthData().entries.find((item) => item.id === id);
  if (!entry) return;
  el.entryId.value = entry.id;
  el.dateInput.value = entry.date || "";
  el.descriptionInput.value = entry.description || "";
  el.inInput.value = entry.inAmount || "";
  el.outInput.value = entry.outAmount || "";
  el.creditInput.checked = Boolean(entry.useProfitCalculation);
  el.entryRateInput.value = entry.rate || "";
  el.entryCostInput.value = entry.cost || "";
  el.entryPriceInput.value = entry.price || "";
  updateEntryCalculation();
  el.entryDialogTitle.textContent = "Update Record";
  el.saveBtn.textContent = "Update Record";
  setDialogOpen(el.entryDialog, true);
}

async function deleteCashEntry(id) {
  if (!isAdmin()) return;
  const ok = confirm("Delete this cash entry?");
  if (!ok) return;
  await api(`/api/cash/entry?id=${encodeURIComponent(id)}&monthKey=${encodeURIComponent(state.activeMonth)}`, { method: "DELETE" });
  await refreshState();
}

async function saveBillRecord(event) {
  event.preventDefault();
  updateSuspendedPreview();
  const payload = {
    id: el.billId.value || undefined,
    machine: el.machineInput.value.trim(),
    submittedDate: el.submittedInput.value,
    billDate: el.billDateInput.value,
    cutOffDate: el.cutOffInput.value,
    billType: el.billTypeInput.value.trim(),
    status: el.billStatusInput.value,
    customer: el.customerInput.value.trim()
  };
  await api("/api/bills/record", { method: "POST", body: JSON.stringify({ record: payload }) });
  resetBillForm();
  setDialogOpen(el.billDialog, false);
  await refreshState();
}

function editBillRecord(id) {
  if (!isAdmin()) return;
  closeActionMenus();
  const record = state.billRecords.find((item) => item.id === id);
  if (!record) return;
  el.billId.value = record.id;
  el.machineInput.value = record.machine || "";
  el.customerInput.value = record.customer || "";
  el.submittedInput.value = record.submittedDate || "";
  el.billDateInput.value = record.billDate || "";
  el.cutOffInput.value = record.cutOffDate || "";
  el.billTypeInput.value = record.billType || "";
  el.billStatusInput.value = record.status === "inactive" ? "inactive" : "sent_unpaid";
  el.billDialogTitle.textContent = "Update Machine";
  el.saveBillBtn.textContent = "Update Machine";
  setDialogOpen(el.billDialog, true);
}

async function deleteBillRecord(id) {
  if (!isAdmin()) return;
  closeActionMenus();
  const ok = confirm("Delete this machine bill record?");
  if (!ok) return;
  await api(`/api/bills/record?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  await refreshState();
}

async function saveDeviceRecord(event) {
  event.preventDefault();
  const payload = {
    id: el.deviceRecordId.value || undefined,
    name: el.deviceNameInput.value.trim(),
    email: el.deviceEmailInput.value.trim(),
    deviceId: el.deviceIdInput.value.trim(),
    serialNumber: el.serialNumberInput.value.trim(),
    kitNumber: el.kitNumberInput.value.trim(),
    serviceAddress: el.serviceAddressInput.value.trim(),
    region: el.regionInput.value.trim(),
    planStatus: el.planStatusInput.value
  };
  await api("/api/devices/record", { method: "POST", body: JSON.stringify({ record: payload }) });
  resetDeviceForm();
  setDialogOpen(el.deviceDialog, false);
  await refreshState();
}

function editDeviceRecord(id) {
  if (!isAdmin()) return;
  const record = state.deviceRecords.find((item) => item.id === id);
  if (!record) return;
  el.deviceRecordId.value = record.id;
  el.deviceNameInput.value = record.name || "";
  el.deviceEmailInput.value = record.email || "";
  el.deviceIdInput.value = record.deviceId || "";
  el.serialNumberInput.value = record.serialNumber || "";
  el.kitNumberInput.value = record.kitNumber || "";
  el.serviceAddressInput.value = record.serviceAddress || "";
  el.regionInput.value = record.region || "";
  el.planStatusInput.value = record.planStatus || "normal";
  el.deviceDialogTitle.textContent = "Update Device";
  el.saveDeviceBtn.textContent = "Update Device";
  setDialogOpen(el.deviceDialog, true);
}

async function deleteDeviceRecord(id) {
  if (!isAdmin()) return;
  const ok = confirm("Delete this device record?");
  if (!ok) return;
  await api(`/api/devices/record?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  await refreshState();
}

async function saveUsageRecord(event) {
  event.preventDefault();
  const payload = {
    id: el.usageId.value || undefined,
    monthKey: state.activeMonth,
    machine: el.usageMachineInput.value.trim(),
    customer: el.usageCustomerInput.value.trim(),
    billType: el.usageBillTypeInput.value.trim(),
    usageLimitTB: Number(el.usageLimitInput.value || 5),
    usageDate: el.usageDateInput.value,
    dailyUsageTB: Number(el.usageDailyInput.value || 0),
    notes: el.usageNotesInput.value.trim()
  };
  await api("/api/usage/record", { method: "POST", body: JSON.stringify({ record: payload }) });
  resetUsageForm();
  setDialogOpen(el.usageDialog, false);
  await refreshState();
}

function editUsageRecord(id) {
  if (!isAdmin()) return;
  const record = currentMonthUsageRecords().find((item) => item.id === id) || state.usageRecords.find((item) => item.id === id);
  if (!record) return;
  el.usageId.value = record.id;
  el.usageMachineInput.value = record.machine || "";
  el.usageCustomerInput.value = record.customer || "";
  el.usageBillTypeInput.value = record.billType || "";
  el.usageLimitInput.value = record.usageLimitTB || 5;
  const latest = dailyUsageEntries(record).at(-1);
  el.usageDateInput.min = `${record.monthKey}-01`;
  el.usageDateInput.max = usageMonthLastDate();
  el.usageDateInput.value = latest?.date || usageDefaultDate();
  el.usageDailyInput.value = latest?.value || 0;
  el.usageNotesInput.value = record.notes || "";
  el.usageDialogTitle.textContent = `Manage ${record.machine} Daily Usage`;
  el.saveUsageBtn.textContent = "Save Daily Usage";
  renderUsageHistory(record);
  setDialogOpen(el.usageDialog, true);
}

function renderUsageHistory(record) {
  el.usageDailyHistory.innerHTML = "";
  const entries = record ? dailyUsageEntries(record).reverse() : [];
  const legacyTotal = Number(record?.legacyUsageTB || 0);
  el.usageHistoryTotal.textContent = `${record ? usageTotal(record).toFixed(3) : "0.000"} TB this month`;

  if (legacyTotal > 0) {
    const imported = document.createElement("div");
    imported.className = "usage-history-item imported";
    imported.innerHTML = `<span>Imported previous usage</span><strong>${legacyTotal.toFixed(3)} TB</strong>`;
    el.usageDailyHistory.append(imported);
  }

  if (!entries.length && legacyTotal === 0) {
    const empty = document.createElement("div");
    empty.className = "usage-history-empty";
    empty.textContent = "No daily usage recorded for this machine yet.";
    el.usageDailyHistory.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "usage-history-item";
    const date = document.createElement("span");
    date.textContent = formatUsageDate(entry.date);
    const value = document.createElement("strong");
    value.textContent = `${entry.value.toFixed(3)} TB`;
    item.append(date, value);
    if (isAdmin()) {
      const actions = document.createElement("div");
      actions.className = "usage-history-actions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.onclick = () => {
        el.usageDateInput.value = entry.date;
        el.usageDailyInput.value = entry.value;
        el.usageDailyInput.focus();
      };
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "danger";
      deleteButton.textContent = "Delete";
      deleteButton.onclick = () => removeDailyUsage(record, entry.date);
      actions.append(editButton, deleteButton);
      item.append(actions);
    }
    el.usageDailyHistory.append(item);
  });
}

function syncUsageMachineContext() {
  const machine = el.usageMachineInput.value.trim().toUpperCase();
  const record = currentMonthUsageRecords().find((item) => String(item.machine || "").trim().toUpperCase() === machine);
  if (!record) {
    el.usageId.value = "";
    renderUsageHistory(null);
    return;
  }
  el.usageId.value = record.id;
  if (!el.usageCustomerInput.value) el.usageCustomerInput.value = record.customer || "";
  if (!el.usageBillTypeInput.value) el.usageBillTypeInput.value = record.billType || "";
  el.usageLimitInput.value = record.usageLimitTB || 5;
  el.usageNotesInput.value = record.notes || "";
  renderUsageHistory(record);
}

async function removeDailyUsage(record, usageDate) {
  if (!isAdmin()) return;
  const ok = confirm(`Delete usage for ${formatUsageDate(usageDate)}?`);
  if (!ok) return;
  await api("/api/usage/record", {
    method: "POST",
    body: JSON.stringify({ record: { id: record.id, monthKey: record.monthKey, machine: record.machine, usageDate, removeDate: true } })
  });
  await refreshState();
  const updated = state.usageRecords.find((item) => item.id === record.id);
  if (updated) editUsageRecord(updated.id);
}

async function deleteUsageRecord(id) {
  if (!isAdmin()) return;
  const ok = confirm("Delete this usage record?");
  if (!ok) return;
  await api(`/api/usage/record?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  await refreshState();
}

async function saveUserRecord(event) {
  event.preventDefault();
  const payload = {
    id: el.userRecordId.value || undefined,
    fullName: el.userFullNameInput.value.trim(),
    username: el.userUsernameInput.value.trim(),
    password: el.userPasswordInput.value,
    role: el.userRoleInput.value,
    allowedTabs: getSelectedTabs()
  };
  await api("/api/users/record", { method: "POST", body: JSON.stringify({ record: payload }) });
  resetUserForm();
  setDialogOpen(el.userDialog, false);
  await refreshState();
}

function editUserRecord(id) {
  const user = state.users.find((item) => item.id === id);
  if (!user) return;
  el.userRecordId.value = user.id;
  el.userFullNameInput.value = user.fullName || "";
  el.userUsernameInput.value = user.username || "";
  el.userPasswordInput.value = "";
  el.userRoleInput.value = user.role || "user";
  setSelectedTabs(user.allowedTabs || []);
  updatePermissionChecklist();
  el.userDialogTitle.textContent = "Update User";
  el.saveUserBtn.textContent = "Update User";
  setDialogOpen(el.userDialog, true);
}

async function deleteUserRecord(id) {
  const ok = confirm("Delete this user?");
  if (!ok) return;
  await api(`/api/users/record?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  await refreshState();
}

async function saveCustomerAccount(event) {
  event.preventDefault();
  const payload = {
    id: el.customerAccountId.value || undefined,
    fullName: el.customerAccountName.value.trim(),
    username: el.customerAccountUsername.value.trim(),
    linkedDeviceId: el.customerAccountDeviceId.value.trim(),
    password: el.customerAccountPassword.value,
    active: el.customerAccountStatus.value === "active"
  };
  await api("/api/customer-accounts/record", { method: "POST", body: JSON.stringify({ record: payload }) });
  resetCustomerAccountForm();
  setDialogOpen(el.customerAccountDialog, false);
  await refreshState();
}

function editCustomerAccount(id) {
  const customer = state.customerAccounts.find((item) => item.id === id);
  if (!customer) return;
  el.customerAccountId.value = customer.id;
  el.customerAccountName.value = customer.fullName || "";
  el.customerAccountUsername.value = customer.username || "";
  el.customerAccountDeviceId.value = customer.linkedDeviceId || "";
  el.customerAccountPassword.value = "";
  el.customerAccountPassword.required = false;
  el.customerAccountStatus.value = customer.active === false ? "inactive" : "active";
  el.customerAccountDialogTitle.textContent = "Update Customer Account";
  setDialogOpen(el.customerAccountDialog, true);
}

async function deleteCustomerAccount(id) {
  const customer = state.customerAccounts.find((item) => item.id === id);
  const ok = confirm(`Delete customer account ${customer?.username || ""} and its chat history?`);
  if (!ok) return;
  await api(`/api/customer-accounts/record?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (state.selectedSupportCustomerId === id) state.selectedSupportCustomerId = "";
  await refreshState();
}

async function saveAnnouncement(event) {
  event.preventDefault();
  const payload = {
    id: el.announcementId.value || undefined,
    title: el.announcementTitle.value.trim(),
    message: el.announcementMessage.value.trim(),
    type: el.announcementType.value,
    active: el.announcementActive.checked
  };
  await api("/api/announcements/record", { method: "POST", body: JSON.stringify({ record: payload }) });
  resetAnnouncementForm();
  setDialogOpen(el.announcementDialog, false);
  await refreshState();
}

function editAnnouncement(id) {
  const item = state.announcements.find((announcement) => announcement.id === id);
  if (!item) return;
  el.announcementId.value = item.id;
  el.announcementTitle.value = item.title || "";
  el.announcementMessage.value = item.message || "";
  el.announcementType.value = item.type || "general";
  el.announcementActive.checked = item.active !== false;
  el.announcementDialogTitle.textContent = "Update Announcement";
  setDialogOpen(el.announcementDialog, true);
}

async function deleteAnnouncement(id) {
  const ok = confirm("Delete this announcement?");
  if (!ok) return;
  await api(`/api/announcements/record?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  await refreshState();
}

async function sendSupportMessage(event) {
  event.preventDefault();
  const customerId = state.selectedSupportCustomerId;
  const message = el.supportMessageInput.value.trim();
  if (!customerId || (!message && !supportPendingAttachment)) return;
  const pending = supportPendingAttachment;
  el.supportMessageInput.value = "";
  try {
    const attachment = pending ? {
      kind: pending.kind,
      name: pending.file.name,
      dataUrl: await fileAsDataUrl(pending.file)
    } : null;
    await api("/api/support/message", {
      method: "POST",
      body: JSON.stringify({ customerId, message, attachment })
    });
    clearSupportAttachment();
    await refreshState();
  } catch (error) {
    el.supportMessageInput.value = message;
    alert(error.message);
  }
}

function closeUtilityMenu() {
  if (el.utilityMenu) el.utilityMenu.removeAttribute("open");
}

function closeActionMenus() {
  document.querySelectorAll(".action-menu[open]").forEach((menu) => menu.removeAttribute("open"));
}

function saveColorSettings(event) {
  event.preventDefault();
  const colors = readColorForm();
  applyBillColors(colors);
  localStorage.setItem(BILL_COLOR_STORAGE_KEY, JSON.stringify(colors));
  setDialogOpen(el.colorDialog, false);
}

async function doLogin(event) {
  event.preventDefault();
  el.loginMessage.textContent = "";
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: el.loginUsername.value.trim(),
        password: el.loginPassword.value
      })
    });
    el.loginForm.reset();
    await refreshState();
  } catch (error) {
    el.loginMessage.textContent = error.message;
  }
}

async function doLogout() {
  await api("/api/logout", { method: "POST" });
  state.user = null;
  appRealtimeSocket?.close();
  appRealtimeSocket = null;
  showLogin();
}

async function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const snapshot = JSON.parse(text);
  closeUtilityMenu();
  await api("/api/import/backup", {
    method: "POST",
    body: JSON.stringify({ snapshot })
  });
  event.target.value = "";
  await refreshState();
}

function exportBackup() {
  closeUtilityMenu();
  window.location.href = "/api/export/backup.json";
}

function exportDevices() {
  window.location.href = "/api/export/devices.csv";
}

async function boot() {
  try {
    applyBillColors(loadBillColors());
    syncColorInputs();
    const session = await api("/api/session");
    if (!session.user) {
      showLogin();
      return;
    }
    await refreshState();
  } catch {
    showLogin("Server connection failed.");
  }
}

el.loginForm.addEventListener("submit", doLogin);
el.menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    if (!canAccess(item.dataset.page)) return;
    state.activePage = item.dataset.page;
    renderPage();
    renderHeader();
  });
});

el.adminPanelBtn.addEventListener("click", () => {
  if (!canAccess("adminPage")) return;
  state.activePage = "adminPage";
  closeUtilityMenu();
  renderPage();
  renderHeader();
});

el.openingCashInput.addEventListener("change", saveOpeningCash);
el.entryForm.addEventListener("submit", saveCashEntry);
el.resetBtn.addEventListener("click", resetEntryForm);
el.openEntryCalculatorBtn.addEventListener("click", () => setEntryCalculatorOpen(!el.creditInput.checked));
el.closeEntryCalculatorBtn.addEventListener("click", () => setEntryCalculatorOpen(false));
[el.entryRateInput, el.entryCostInput, el.entryPriceInput].forEach((input) => {
  input.addEventListener("input", updateEntryCalculation);
});
el.openEntryDialogBtn.addEventListener("click", () => {
  resetEntryForm();
  setDialogOpen(el.entryDialog, true);
});
el.closeEntryDialogBtn.addEventListener("click", () => setDialogOpen(el.entryDialog, false));
el.cancelEntryBtn.addEventListener("click", () => setDialogOpen(el.entryDialog, false));
el.entryDialog.addEventListener("click", (event) => {
  if (event.target === el.entryDialog) setDialogOpen(el.entryDialog, false);
});

el.billForm.addEventListener("submit", saveBillRecord);
el.billDateInput.addEventListener("input", updateSuspendedPreview);
el.resetBillBtn.addEventListener("click", resetBillForm);
el.openBillDialogBtn.addEventListener("click", () => {
  resetBillForm();
  setDialogOpen(el.billDialog, true);
});
el.closeBillDialogBtn.addEventListener("click", () => setDialogOpen(el.billDialog, false));
el.cancelBillBtn.addEventListener("click", () => setDialogOpen(el.billDialog, false));
el.billDialog.addEventListener("click", (event) => {
  if (event.target === el.billDialog) setDialogOpen(el.billDialog, false);
});

el.deviceForm.addEventListener("submit", saveDeviceRecord);
el.resetDeviceBtn.addEventListener("click", resetDeviceForm);
el.openDeviceDialogBtn.addEventListener("click", () => {
  resetDeviceForm();
  setDialogOpen(el.deviceDialog, true);
});
el.closeDeviceDialogBtn.addEventListener("click", () => setDialogOpen(el.deviceDialog, false));
el.cancelDeviceBtn.addEventListener("click", () => setDialogOpen(el.deviceDialog, false));
el.deviceDialog.addEventListener("click", (event) => {
  if (event.target === el.deviceDialog) setDialogOpen(el.deviceDialog, false);
});
el.exportDevicesBtn.addEventListener("click", exportDevices);

el.usageForm.addEventListener("submit", saveUsageRecord);
el.resetUsageBtn.addEventListener("click", resetUsageForm);
el.usageMachineInput.addEventListener("change", syncUsageMachineContext);
el.usageDateInput.addEventListener("change", () => {
  const record = state.usageRecords.find((item) => item.id === el.usageId.value);
  el.usageDailyInput.value = record?.dailyUsage?.[el.usageDateInput.value] ?? 0;
});
el.openUsageDialogBtn.addEventListener("click", () => {
  resetUsageForm();
  setDialogOpen(el.usageDialog, true);
});
el.closeUsageDialogBtn.addEventListener("click", () => setDialogOpen(el.usageDialog, false));
el.cancelUsageBtn.addEventListener("click", () => setDialogOpen(el.usageDialog, false));
el.usageDialog.addEventListener("click", (event) => {
  if (event.target === el.usageDialog) setDialogOpen(el.usageDialog, false);
});

el.userForm.addEventListener("submit", saveUserRecord);
el.resetUserBtn.addEventListener("click", resetUserForm);
el.userRoleInput.addEventListener("change", updatePermissionChecklist);
el.openUserDialogBtn.addEventListener("click", () => {
  resetUserForm();
  setDialogOpen(el.userDialog, true);
});
el.closeUserDialogBtn.addEventListener("click", () => setDialogOpen(el.userDialog, false));
el.cancelUserBtn.addEventListener("click", () => setDialogOpen(el.userDialog, false));
el.userDialog.addEventListener("click", (event) => {
  if (event.target === el.userDialog) setDialogOpen(el.userDialog, false);
});

el.customerAccountForm.addEventListener("submit", saveCustomerAccount);
el.resetCustomerAccountBtn.addEventListener("click", resetCustomerAccountForm);
el.openCustomerAccountDialogBtn.addEventListener("click", () => {
  resetCustomerAccountForm();
  setDialogOpen(el.customerAccountDialog, true);
});
el.closeCustomerAccountDialogBtn.addEventListener("click", () => setDialogOpen(el.customerAccountDialog, false));
el.cancelCustomerAccountBtn.addEventListener("click", () => setDialogOpen(el.customerAccountDialog, false));
el.customerAccountDialog.addEventListener("click", (event) => {
  if (event.target === el.customerAccountDialog) setDialogOpen(el.customerAccountDialog, false);
});

el.announcementForm.addEventListener("submit", saveAnnouncement);
el.resetAnnouncementBtn.addEventListener("click", resetAnnouncementForm);
el.openAnnouncementDialogBtn.addEventListener("click", () => {
  resetAnnouncementForm();
  setDialogOpen(el.announcementDialog, true);
});
el.closeAnnouncementDialogBtn.addEventListener("click", () => setDialogOpen(el.announcementDialog, false));
el.cancelAnnouncementBtn.addEventListener("click", () => setDialogOpen(el.announcementDialog, false));
el.announcementDialog.addEventListener("click", (event) => {
  if (event.target === el.announcementDialog) setDialogOpen(el.announcementDialog, false);
});

el.supportMessageForm.addEventListener("submit", sendSupportMessage);
el.supportReceiptBtn.addEventListener("click", () => el.supportReceiptInput.click());
el.supportReceiptInput.addEventListener("change", () => setSupportAttachment(el.supportReceiptInput.files[0], "receipt"));
el.supportVoiceBtn.addEventListener("click", toggleSupportRecording);

el.colorForm.addEventListener("submit", saveColorSettings);
el.openColorSettingsBtn.addEventListener("click", () => {
  closeUtilityMenu();
  syncColorInputs();
  setDialogOpen(el.colorDialog, true);
});
el.closeColorDialogBtn.addEventListener("click", () => setDialogOpen(el.colorDialog, false));
el.cancelColorBtn.addEventListener("click", () => setDialogOpen(el.colorDialog, false));
el.resetColorBtn.addEventListener("click", () => {
  localStorage.removeItem(BILL_COLOR_STORAGE_KEY);
  resetColorForm();
});
el.colorDialog.addEventListener("click", (event) => {
  if (event.target === el.colorDialog) setDialogOpen(el.colorDialog, false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setDialogOpen(el.entryDialog, false);
    setDialogOpen(el.billDialog, false);
    setDialogOpen(el.deviceDialog, false);
    setDialogOpen(el.usageDialog, false);
    setDialogOpen(el.userDialog, false);
    setDialogOpen(el.customerAccountDialog, false);
    setDialogOpen(el.announcementDialog, false);
    setDialogOpen(el.colorDialog, false);
  }
});

el.rateInput.addEventListener("input", updateCalculator);
el.costInput.addEventListener("input", updateCalculator);
el.priceInput.addEventListener("input", updateCalculator);
el.printBtn.addEventListener("click", () => {
  closeUtilityMenu();
  window.print();
});
el.exportJsonBtn.addEventListener("click", exportBackup);
el.importJsonInput.addEventListener("change", importBackup);
el.logoutBtn.addEventListener("click", doLogout);

resetEntryForm();
resetBillForm();
resetDeviceForm();
resetUsageForm();
resetUserForm();
resetCustomerAccountForm();
resetAnnouncementForm();
applyBillColors(loadBillColors());
syncColorInputs();
updateCalculator();
boot();

setInterval(() => {
  if (state.user && state.activePage === "supportPage" && !document.hidden) refreshState().catch(() => {});
}, 60000);
