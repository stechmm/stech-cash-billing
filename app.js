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
let supportActiveReply = null;
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
  utilityMenu: document.querySelector("#utilityMenu") || document.querySelector(".utility-menu"),
  adminPanelBtn: document.querySelector("#adminPanelBtn"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  restoreBackupBtn: document.querySelector("#restoreBackupBtn"),
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
  deviceActiveInput: document.querySelector("#deviceActiveInput"),
  saveDeviceBtn: document.querySelector("#saveDeviceBtn"),
  deleteDeviceBtn: document.querySelector("#deleteDeviceBtn"),

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
  usageMachineDataList: document.querySelector("#usageMachineDataList"),
  usageMachineHint: document.querySelector("#usageMachineHint"),
  usageCustomerInput: document.querySelector("#usageCustomerInput"),
  usageBillTypeInput: document.querySelector("#usageBillTypeInput"),
  usageLimitInput: document.querySelector("#usageLimitInput"),
  usageDateInput: document.querySelector("#usageDateInput"),
  usageDailyInput: document.querySelector("#usageDailyInput"),
  usageUnitToggleGroup: document.querySelector("#usageUnitToggleGroup"),
  usageNotesInput: document.querySelector("#usageNotesInput"),
  usageDailyHistory: document.querySelector("#usageDailyHistory"),
  usageHistoryTotal: document.querySelector("#usageHistoryTotal"),
  saveUsageBtn: document.querySelector("#saveUsageBtn"),

  fleetUsageTotalValue: document.querySelector("#fleetUsageTotalValue"),
  usageActiveMachinesCount: document.querySelector("#usageActiveMachinesCount"),
  usageRecordedTodayCount: document.querySelector("#usageRecordedTodayCount"),
  usageRecordedTodaySub: document.querySelector("#usageRecordedTodaySub"),
  usagePendingTodayCount: document.querySelector("#usagePendingTodayCount"),
  usagePendingTodaySub: document.querySelector("#usagePendingTodaySub"),
  usageSearchInput: document.querySelector("#usageSearchInput"),

  machineChartModal: document.querySelector("#machineChartModal"),
  closeMachineChartModalBtn: document.querySelector("#closeMachineChartModalBtn"),
  machineChartMachineBadge: document.querySelector("#machineChartMachineBadge"),
  machineChartModalTitle: document.querySelector("#machineChartModalTitle"),
  machineChartSubtitle: document.querySelector("#machineChartSubtitle"),
  modalVizTotalValue: document.querySelector("#modalVizTotalValue"),
  modalVizPeriodBadge: document.querySelector("#modalVizPeriodBadge"),
  modalVizPeriodTabs: document.querySelector("#modalVizPeriodTabs"),
  modalVizCycleNav: document.querySelector("#modalVizCycleNav"),
  modalVizPlanLabel: document.querySelector("#modalVizPlanLabel"),
  modalVizSubTotal: document.querySelector("#modalVizSubTotal"),
  modalVizLimitLabel: document.querySelector("#modalVizLimitLabel"),
  modalStarlinkChartContainer: document.querySelector("#modalStarlinkChartContainer"),
  modalStarlinkChartSvg: document.querySelector("#modalStarlinkChartSvg"),
  modalStarlinkTooltip: document.querySelector("#modalStarlinkTooltip"),
  modalQuickRecordForm: document.querySelector("#modalQuickRecordForm"),
  modalQuickDate: document.querySelector("#modalQuickDate"),
  modalQuickAmount: document.querySelector("#modalQuickAmount"),
  modalQuickUnitToggle: document.querySelector("#modalQuickUnitToggle"),
  modalStatTotal: document.querySelector("#modalStatTotal"),
  modalStatLimit: document.querySelector("#modalStatLimit"),
  modalStatRemaining: document.querySelector("#modalStatRemaining"),
  modalStatStatus: document.querySelector("#modalStatStatus"),

  supportUnreadTotal: document.querySelector("#supportUnreadTotal"),
  supportConversationList: document.querySelector("#supportConversationList"),
  supportThreadUserId: document.querySelector("#supportThreadUserId"),
  supportThreadName: document.querySelector("#supportThreadName"),
  supportMessageList: document.querySelector("#supportMessageList"),
  supportMessageForm: document.querySelector("#supportMessageForm"),
  supportReplyPreview: document.querySelector("#supportReplyPreview"),
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
  customerDeviceChips: document.querySelector("#customerDeviceChips"),
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
    const err = new Error(message);
    err.status = response.status;
    throw err;
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
    if (!["support_message", "support_message_edit", "support_message_delete", "support_message_react", "announcement_updated", "usage_updated"].includes(message.type)) return;
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

try {
  localStorage.removeItem("spacelink_theme");
  document.documentElement.removeAttribute("data-theme");
  if (document.body) document.body.removeAttribute("data-theme");
} catch (e) {}

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
  return state.usageRecords.filter((item) => String(item.monthKey || "") === (vizState.activeMonth || state.activeMonth));
}

const vizState = {
  period: "daily",
  machine: "__ALL__",
  activeMonth: "",
  activeYear: new Date().getFullYear(),
  inputUnit: "GB"
};

function getAllMachineIds() {
  const ids = new Set();
  (state.deviceRecords || []).forEach((d) => { if (d.deviceId) ids.add(String(d.deviceId).trim().toUpperCase()); });
  (state.usageRecords || []).forEach((u) => { if (u.machine) ids.add(String(u.machine).trim().toUpperCase()); });
  (state.billRecords || []).forEach((b) => { if (b.machine) ids.add(String(b.machine).trim().toUpperCase()); });
  return Array.from(ids).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function formatGbOrTb(valueTB) {
  const gb = Number(valueTB || 0) * 1000;
  if (gb >= 1000) {
    return { number: valueTB.toFixed(2), unit: "TB", text: `${valueTB.toFixed(2)} TB`, gb };
  }
  return { number: gb >= 100 ? gb.toFixed(0) : gb.toFixed(1), unit: "GB", text: `${gb >= 100 ? gb.toFixed(0) : gb.toFixed(1)} GB`, gb };
}

function renderStarlinkChart(containerSvg, tooltipEl, dataPoints, options = {}) {
  if (!containerSvg) return;
  const width = 800;
  const height = 220;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxGB = Math.max(...dataPoints.map((d) => d.valueGB), 10);
  let yAxisMax = 50;
  if (maxGB > 50) yAxisMax = Math.ceil(maxGB / 50) * 50;
  else if (maxGB <= 10) yAxisMax = 10;
  else if (maxGB <= 25) yAxisMax = 25;

  const numPoints = Math.max(dataPoints.length, 1);
  const barWidth = Math.max(Math.min((chartW / numPoints) * 0.55, 24), 6);
  const step = chartW / numPoints;

  let svgHtml = `
    <defs>
      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#67e8f9" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
    </defs>
  `;

  const gridSteps = [yAxisMax, Math.round(yAxisMax / 2), 0];
  gridSteps.forEach((val) => {
    const y = padTop + chartH - (val / yAxisMax) * chartH;
    svgHtml += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="${val === 0 ? "0" : "3,3"}" />
      <text x="${padLeft - 10}" y="${y + 4}" fill="#64748b" font-size="11" font-weight="600" text-anchor="end">${val} GB</text>
    `;
  });

  dataPoints.forEach((d, idx) => {
    const x = padLeft + idx * step + (step - barWidth) / 2;
    const barH = Math.max((d.valueGB / yAxisMax) * chartH, d.valueGB > 0 ? 3 : 0);
    const y = padTop + chartH - barH;
    const isSpecial = d.isCurrent;

    svgHtml += `
      <rect class="chart-bar-track" data-idx="${idx}" x="${x - (step - barWidth) / 2}" y="${padTop}" width="${step}" height="${chartH}" fill="transparent" style="cursor: pointer;" />
      <rect class="chart-bar ${isSpecial ? "current" : ""}" data-idx="${idx}" x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="3" ry="3" fill="${isSpecial ? "url(#barGradActive)" : "url(#barGrad)"}" />
    `;
  });

  const labelInterval = options.format === "daily" ? Math.max(Math.ceil(numPoints / 6), 1) : 1;
  dataPoints.forEach((d, idx) => {
    if (idx === 0 || idx === numPoints - 1 || idx % labelInterval === 0) {
      const x = padLeft + idx * step + step / 2;
      svgHtml += `
        <text x="${x}" y="${height - 10}" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">${d.label}</text>
      `;
    }
  });

  containerSvg.innerHTML = svgHtml;

  const tracks = containerSvg.querySelectorAll(".chart-bar-track, .chart-bar");
  tracks.forEach((element) => {
    element.addEventListener("mouseenter", () => {
      const idx = parseInt(element.dataset.idx, 10);
      const point = dataPoints[idx];
      if (!point || !tooltipEl) return;
      tooltipEl.innerHTML = `
        <strong style="color:#ffffff; font-size:13px;">${point.fullLabel || point.label}</strong><br>
        <span style="color:#38bdf8; font-weight:700;">${point.valueGB.toFixed(2)} GB</span> 
        <span style="color:#94a3b8;">(${point.valueTB.toFixed(3)} TB)</span>
      `;
      tooltipEl.classList.remove("hidden");
      const rect = containerSvg.getBoundingClientRect();
      const ptX = ((padLeft + idx * step + step / 2) / width) * rect.width;
      const barH = Math.max((point.valueGB / yAxisMax) * chartH, 4);
      const ptY = ((padTop + chartH - barH) / height) * rect.height;
      tooltipEl.style.left = `${ptX}px`;
      tooltipEl.style.top = `${ptY}px`;
    });
    element.addEventListener("mouseleave", () => {
      if (tooltipEl) tooltipEl.classList.add("hidden");
    });
  });
}

const modalChartState = {
  machineId: "",
  period: "daily",
  activeMonth: "",
  activeYear: new Date().getFullYear(),
  unit: "GB"
};

function openMachineChartModal(machineId, monthKey = "") {
  if (!machineId) return;
  modalChartState.machineId = machineId;
  modalChartState.activeMonth = monthKey || state.activeMonth || currentMonthKey();
  modalChartState.period = "daily";
  modalChartState.unit = "GB";
  
  if (el.modalQuickDate) {
    el.modalQuickDate.value = localDateKey();
  }
  if (el.modalQuickAmount) {
    el.modalQuickAmount.value = "";
  }
  if (el.modalQuickUnitToggle) {
    el.modalQuickUnitToggle.querySelectorAll(".unit-pill").forEach((btn) => {
      const isGB = btn.dataset.unit === "GB";
      btn.classList.toggle("active", isGB);
      btn.style.background = isGB ? "#2563eb" : "transparent";
      btn.style.color = isGB ? "#ffffff" : "#64748b";
    });
  }
  
  renderModalMachineVisualizer();
  setDialogOpen(el.machineChartModal, true);
}

function closeMachineChartModal() {
  if (el.machineChartModal) {
    el.machineChartModal.classList.remove("open");
    el.machineChartModal.classList.add("hidden");
  }
}
window.closeMachineChartModal = closeMachineChartModal;

function renderModalMachineVisualizer() {
  if (!el.modalStarlinkChartSvg || !modalChartState.machineId) return;
  const currentMonth = modalChartState.activeMonth || state.activeMonth || currentMonthKey();
  modalChartState.activeMonth = currentMonth;
  const [yearStr, monthStr] = currentMonth.split("-");
  const yearNum = Number(yearStr) || new Date().getFullYear();
  const monthNum = Number(monthStr) || new Date().getMonth() + 1;

  const machineId = modalChartState.machineId;
  const linkedDevice = state.deviceRecords.find((d) => String(d.deviceId || "").toUpperCase() === machineId.toUpperCase());
  const linkedBill = state.billRecords.find((b) => String(b.machine || "").toUpperCase() === machineId.toUpperCase());
  const targetRecord = state.usageRecords.find((r) => String(r.machine || "").toUpperCase() === machineId.toUpperCase() && r.monthKey === currentMonth);
  const planName = linkedDevice?.planStatus || linkedBill?.billType || targetRecord?.billType || "Roam Data";
  const customerName = linkedDevice?.name || linkedBill?.customer || targetRecord?.customer || "Customer";
  const limitTB = Number(targetRecord?.usageLimitTB || 5);

  if (el.machineChartMachineBadge) el.machineChartMachineBadge.textContent = machineId;
  if (el.machineChartModalTitle) el.machineChartModalTitle.textContent = `${machineId} • ${customerName}`;
  if (el.machineChartSubtitle) el.machineChartSubtitle.textContent = `Plan: ${String(planName).toUpperCase()} | Limit: ${limitTB.toFixed(1)} TB | ${monthLabel(currentMonth)}`;
  if (el.modalVizPlanLabel) el.modalVizPlanLabel.textContent = String(planName).toUpperCase();
  if (el.modalVizLimitLabel) el.modalVizLimitLabel.textContent = `${limitTB.toFixed(1)} TB Limit`;
  if (el.modalVizPeriodBadge) el.modalVizPeriodBadge.textContent = monthLabel(currentMonth);

  // Render Cycle Nav in Modal
  if (el.modalVizCycleNav) {
    el.modalVizCycleNav.innerHTML = "";
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 1; m <= 12; m++) {
      const mKey = `${yearNum}-${String(m).padStart(2, "0")}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `cycle-nav-btn ${mKey === currentMonth ? "active" : ""}`;
      btn.textContent = monthNames[m - 1];
      btn.onclick = () => {
        modalChartState.activeMonth = mKey;
        renderModalMachineVisualizer();
      };
      el.modalVizCycleNav.append(btn);
    }
  }

  // Calculate Data Points
  let dataPoints = [];
  let totalPeriodTB = 0;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (modalChartState.period === "daily") {
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const todayStr = localDateKey();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayTB = Number(targetRecord?.dailyUsage?.[dateKey] || 0);
      totalPeriodTB += dayTB;
      const dateObj = new Date(`${dateKey}T00:00:00`);
      const dayShort = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(dateObj);
      dataPoints.push({
        label: `${day} ${monthNames[monthNum - 1]}`,
        fullLabel: `${dayShort} ${yearNum}`,
        valueTB: dayTB,
        valueGB: dayTB * 1000,
        isCurrent: dateKey === todayStr
      });
    }
  } else if (modalChartState.period === "monthly") {
    monthNames.forEach((name, mIdx) => {
      const mKey = `${yearNum}-${String(mIdx + 1).padStart(2, "0")}`;
      const rec = state.usageRecords.find((r) => String(r.machine || "").toUpperCase() === machineId.toUpperCase() && r.monthKey === mKey);
      let mTB = rec ? usageTotal(rec) : 0;
      totalPeriodTB += mTB;
      dataPoints.push({
        label: name,
        fullLabel: `${name} ${yearNum}`,
        valueTB: mTB,
        valueGB: mTB * 1000,
        isCurrent: mKey === currentMonth
      });
    });
  } else if (modalChartState.period === "yearly") {
    const years = new Set([yearNum - 1, yearNum, yearNum + 1]);
    state.usageRecords.filter((r) => String(r.machine || "").toUpperCase() === machineId.toUpperCase()).forEach((r) => {
      if (r.monthKey) {
        const y = Number(r.monthKey.split("-")[0]);
        if (y) years.add(y);
      }
    });
    const sortedYears = Array.from(years).sort();
    sortedYears.forEach((y) => {
      let yTB = 0;
      state.usageRecords
        .filter((r) => String(r.machine || "").toUpperCase() === machineId.toUpperCase() && String(r.monthKey || "").startsWith(`${y}-`))
        .forEach((r) => {
          yTB += usageTotal(r);
        });
      totalPeriodTB += yTB;
      dataPoints.push({
        label: String(y),
        fullLabel: `Year ${y}`,
        valueTB: yTB,
        valueGB: yTB * 1000,
        isCurrent: y === yearNum
      });
    });
  }

  const formattedTotal = formatGbOrTb(totalPeriodTB);
  if (el.modalVizTotalValue) el.modalVizTotalValue.textContent = formattedTotal.text;
  if (el.modalVizSubTotal) el.modalVizSubTotal.textContent = formattedTotal.text;

  // Month Stats Strip
  const monthTotalTB = targetRecord ? usageTotal(targetRecord) : 0;
  const remainingTB = Math.max(limitTB - monthTotalTB, 0);
  const isExceeded = monthTotalTB >= limitTB;
  const isNearLimit = monthTotalTB >= Math.max(limitTB - 0.5, 0);

  if (el.modalStatTotal) el.modalStatTotal.textContent = formatGbOrTb(monthTotalTB).text;
  if (el.modalStatLimit) el.modalStatLimit.textContent = `${limitTB.toFixed(1)} TB`;
  if (el.modalStatRemaining) {
    el.modalStatRemaining.textContent = `${remainingTB.toFixed(2)} TB`;
    el.modalStatRemaining.style.color = isExceeded ? "#ef4444" : "#38bdf8";
  }
  if (el.modalStatStatus) {
    el.modalStatStatus.textContent = isExceeded ? "Limit Reached" : (isNearLimit ? "Near 5 TB" : "Normal Safe");
    el.modalStatStatus.style.color = isExceeded ? "#ef4444" : (isNearLimit ? "#f59e0b" : "#34d399");
  }

  renderStarlinkChart(el.modalStarlinkChartSvg, el.modalStarlinkTooltip, dataPoints, {
    format: modalChartState.period,
    limitTB
  });
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
  try {
    const snapshot = await api("/api/bootstrap");
    updateState(snapshot);
    if (currentPage && canAccess(currentPage)) {
      state.activePage = currentPage;
    }
    render();
    connectAppRealtime();
  } catch (err) {
    // Only redirect to login on actual 401 Unauthorized (session expired or invalidated)
    if (err.status === 401 || err.message === "Unauthorized") {
      showLogin();
    }
    // Network errors or temporary hiccups will NOT log the user out
  }
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
  if (el.adminPanelBtn) el.adminPanelBtn.classList.toggle("hidden", adminOnly);
  if (el.exportJsonBtn) el.exportJsonBtn.classList.toggle("hidden", adminOnly);
  if (el.restoreBackupBtn) el.restoreBackupBtn.classList.toggle("hidden", adminOnly);
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

let billActiveFilter = "active";
let deviceActiveFilter = "active";
let usageActiveFilter = "active";

window.setBillActiveFilter = function(filter) {
  billActiveFilter = filter;
  document.querySelectorAll("#billFilterGroup .filter-chip").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderBillPage();
};

window.setDeviceActiveFilter = function(filter) {
  deviceActiveFilter = filter;
  document.querySelectorAll("#deviceFilterGroup .filter-chip").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderDevicePage();
};

window.setUsageActiveFilter = function(filter) {
  usageActiveFilter = filter;
  document.querySelectorAll("#usageFilterGroup .filter-chip").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderUsagePage();
};

function renderBillPage() {
  const counts = { sent_unpaid: 0, paid_done: 0, paid_pending: 0, inactive: 0, suspended: 0 };
  const alerts = { due_7_days: 0, due_1_day: 0, suspended: 0 };
  const attention = [];

  el.billBody.innerHTML = "";
  
  const filteredBills = state.billRecords.filter((record) => {
    const linkedDev = state.deviceRecords.find(d => String(d.deviceId || "").toUpperCase() === String(record.machine || "").toUpperCase());
    const isDevActive = linkedDev ? linkedDev.active !== false : true;
    if (billActiveFilter === "active") {
      if (!isDevActive) return false;
      if (record.status === "inactive") return false;
    }
    return true;
  });

  state.billRecords.forEach((record) => {
    const display = deriveBillDisplay(record);
    counts[display.status] = (counts[display.status] || 0) + 1;
    const alertState = display.alertState;
    if (alerts[alertState] != null) alerts[alertState] += 1;
    if (alertState !== "none") attention.push({ record, alertState });
  });

  filteredBills.forEach((record) => {
    const display = deriveBillDisplay(record);
    const alertState = display.alertState;

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
  });

  const filteredDevices = state.deviceRecords.filter((record) => {
    if (deviceActiveFilter === "active") return record.active !== false;
    return true;
  });

  filteredDevices.forEach((record) => {
    const active = record.active !== false;
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
    
    const statusCell = row.querySelector(".device-status-cell");
    if (statusCell) {
      statusCell.innerHTML = `<span class="device-status-badge ${active ? 'active' : 'inactive'}">${active ? 'Active' : 'Inactive'}</span>`;
    }

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

function formatUsageDateBadge(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const mName = monthNames[m] || parts[1];
  return `${mName} ${d}`;
}

function renderUsagePage() {
  const currentMonth = state.activeMonth || currentMonthKey();
  const allMachineIds = getAllMachineIds();
  const searchFilter = (el.usageSearchInput?.value || "").trim().toLowerCase();

  let fleetTotalTB = 0;
  let recordedTodayCount = 0;
  let pendingTodayCount = 0;
  const todayStr = localDateKey();

  if (el.usageBody) el.usageBody.innerHTML = "";

  const activeMachineIds = allMachineIds.filter((machineId) => {
    if (usageActiveFilter === "active") {
      const linkedDevice = state.deviceRecords.find((d) => String(d.deviceId || "").toUpperCase() === machineId.toUpperCase());
      if (linkedDevice && linkedDevice.active === false) return false;
    }
    return true;
  });

  activeMachineIds.forEach((machineId) => {
    const linkedDevice = state.deviceRecords.find((d) => String(d.deviceId || "").toUpperCase() === machineId.toUpperCase());
    const linkedBill = state.billRecords.find((b) => String(b.machine || "").toUpperCase() === machineId.toUpperCase());
    const usageRec = state.usageRecords.find((r) => String(r.machine || "").toUpperCase() === machineId.toUpperCase() && r.monthKey === currentMonth);
    
    const customer = linkedDevice?.name || linkedBill?.customer || usageRec?.customer || "Unlinked";
    const plan = linkedDevice?.planStatus || linkedBill?.billType || usageRec?.billType || "normal";
    const totalTB = usageRec ? usageTotal(usageRec) : 0;
    const limitTB = Number(usageRec?.usageLimitTB || 5);
    const remainingTB = Math.max(limitTB - totalTB, 0);

    // Find latest recorded entry for this machine in current month
    const recordedEntries = Object.entries(usageRec?.dailyUsage || {})
      .filter(([dateStr, val]) => Number(val) > 0)
      .sort(([a], [b]) => b.localeCompare(a));
    
    const hasRecorded = recordedEntries.length > 0;
    const latestEntry = hasRecorded ? recordedEntries[0] : null;

    fleetTotalTB += totalTB;
    if (hasRecorded) {
      recordedTodayCount++;
    } else {
      pendingTodayCount++;
    }

    if (searchFilter) {
      const match = machineId.toLowerCase().includes(searchFilter) ||
                    customer.toLowerCase().includes(searchFilter) ||
                    plan.toLowerCase().includes(searchFilter);
      if (!match) return;
    }

    const tr = document.createElement("tr");
    tr.dataset.id = usageRec?.id || "";
    tr.style.cursor = "pointer";

    // Machine Button
    const tdMachine = document.createElement("td");
    const machineBtn = document.createElement("button");
    machineBtn.type = "button";
    machineBtn.className = "machine-pill-btn";
    machineBtn.innerHTML = `<strong>${machineId}</strong>`;
    machineBtn.title = "Click to inspect full chart & daily history";
    machineBtn.onclick = (e) => {
      e.stopPropagation();
      openMachineChartModal(machineId, currentMonth);
    };
    tdMachine.append(machineBtn);

    // Customer
    const tdCustomer = document.createElement("td");
    tdCustomer.innerHTML = `<strong>${customer}</strong>`;
    if (linkedDevice?.region) {
      tdCustomer.innerHTML += ` <small style="color:#64748b;">(${linkedDevice.region})</small>`;
    }

    // Plan
    const tdPlan = document.createElement("td");
    tdPlan.innerHTML = `<span style="text-transform:uppercase; font-size:11px; font-weight:700; color:#0f766e;">${plan}</span>`;

    // Last Recorded Status Pill (Date + Usage)
    const tdToday = document.createElement("td");
    if (latestEntry) {
      const [latestDate, latestValTB] = latestEntry;
      const latestGB = (Number(latestValTB) * 1000).toFixed(1);
      const badgeDate = formatUsageDateBadge(latestDate);
      tdToday.innerHTML = `<span class="today-status-badge recorded" title="Last entry on ${latestDate} (${latestGB} GB)">📅 ${badgeDate} <small style="color:#a7f3d0; margin-left:3px; font-weight:600;">(${latestGB} GB)</small></span>`;
    } else {
      tdToday.innerHTML = `<span class="today-status-badge pending">⏳ No records</span>`;
    }

    // Month Total (Accumulated)
    const tdTotal = document.createElement("td");
    tdTotal.className = "money";
    const totalGB = totalTB * 1000;
    tdTotal.innerHTML = `<strong style="color:#0284c7;">${totalGB >= 1000 ? `${totalTB.toFixed(2)} TB` : `${totalGB.toFixed(1)} GB`}</strong> <span style="color:#94a3b8; font-size:10px;">(${totalTB.toFixed(3)} TB)</span>`;

    // Limit
    const tdLimit = document.createElement("td");
    tdLimit.textContent = `${limitTB.toFixed(1)} TB`;

    // Remaining
    const tdRemaining = document.createElement("td");
    tdRemaining.textContent = `${remainingTB.toFixed(2)} TB`;

    // Row Click opens modal chart
    tr.onclick = () => openMachineChartModal(machineId, currentMonth);

    tr.append(tdMachine, tdCustomer, tdPlan, tdToday, tdTotal, tdLimit, tdRemaining);
    if (el.usageBody) el.usageBody.append(tr);
  });

  // Update Top Fleet Summary Cards
  const formattedFleet = formatGbOrTb(fleetTotalTB);
  if (el.fleetUsageTotalValue) el.fleetUsageTotalValue.textContent = formattedFleet.text;
  if (el.usageActiveMachinesCount) el.usageActiveMachinesCount.textContent = allMachineIds.length;
  if (el.usageRecordedTodayCount) el.usageRecordedTodayCount.textContent = recordedTodayCount;
  if (el.usageRecordedTodaySub) el.usageRecordedTodaySub.textContent = `${recordedTodayCount} of ${allMachineIds.length} recorded`;
  if (el.usagePendingTodayCount) el.usagePendingTodayCount.textContent = pendingTodayCount;
  if (el.usagePendingTodaySub) el.usagePendingTodaySub.textContent = `${pendingTodayCount} machines without records`;
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

    const rawName = (customer.fullName || customer.username || "User").trim();
    const initials = rawName.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";

    const avatar = document.createElement("div");
    avatar.className = "conv-avatar";
    avatar.textContent = initials;

    const main = document.createElement("div");
    main.className = "conv-main";

    const topRow = document.createElement("div");
    topRow.className = "conv-top-row";

    const name = document.createElement("strong");
    name.className = "conv-name";
    name.textContent = customer.fullName || customer.username;

    const machineTag = document.createElement("span");
    machineTag.className = "conv-machine-badge";
    machineTag.textContent = customer.linkedDeviceId || "No ID";

    topRow.append(name, machineTag);

    const midRow = document.createElement("div");
    midRow.className = "conv-mid-row";

    const userTag = document.createElement("span");
    userTag.className = "conv-username";
    userTag.textContent = `@${customer.username}`;

    midRow.append(userTag);

    const previewRow = document.createElement("div");
    previewRow.className = "conv-preview-row";

    const preview = document.createElement("small");
    preview.className = "conv-preview";
    preview.textContent = last?.message || (last?.attachment?.kind === "audio" ? "Voice message" : last?.attachment ? "Payment receipt" : "No messages yet");

    previewRow.append(preview);

    main.append(topRow, midRow, previewRow);
    button.append(avatar, main);

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
      const msgRow = makeSupportMessageRow(item, selected);
      el.supportMessageList.append(msgRow);
    });
    el.supportMessageList.scrollTop = el.supportMessageList.scrollHeight;
  }
  renderAdminAnnouncements();
}

function makeSupportMessageRow(item, selected) {
  const row = document.createElement("div");
  row.className = `staff-message-row ${item.senderType === "staff" ? "mine" : "theirs"}`;
  row.dataset.msgId = item.id;

  const bubble = document.createElement("article");
  bubble.className = `staff-message ${item.senderType === "staff" ? "mine" : ""}${item.isDeleted ? " deleted" : ""}`;

  if (item.isDeleted) {
    const p = document.createElement("p");
    p.textContent = "🚫 This message was deleted";
    bubble.append(p);
    row.append(bubble);
    return row;
  }

  if (item.replyTo) {
    const quote = document.createElement("div");
    quote.className = "message-reply-quote";
    const qSender = document.createElement("strong");
    qSender.textContent = item.replyTo.senderName || "User";
    const qText = document.createElement("span");
    qText.textContent = item.replyTo.text || "";
    quote.append(qSender, qText);
    quote.onclick = () => {
      const target = el.supportMessageList.querySelector(`[data-msg-id="${item.replyTo.id}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    bubble.append(quote);
  }

  if (item.attachment) {
    bubble.append(makeSupportAttachment(item.attachment));
  }

  const body = document.createElement("p");
  if (item.topic === "announcement" || item.announcementId || item.broadcastId || (item.message && item.message.includes("<b>"))) {
    body.innerHTML = String(item.message || "").replace(/\n/g, "<br>");
    bubble.classList.add("broadcast-announcement-bubble");
  } else {
    body.textContent = item.message || "";
  }
  if (!item.message) body.classList.add("hidden");
  bubble.append(body);

  const meta = document.createElement("small");
  const senderLabel = item.senderType === "staff" ? "Staff" : (selected.fullName || selected.username);
  const metaText = document.createElement("span");
  metaText.textContent = `${senderLabel} | ${formatMessageTime(item.createdAt)}`;
  meta.append(metaText);

  if (item.editedAt) {
    const editedSpan = document.createElement("span");
    editedSpan.className = "edited-tag";
    editedSpan.textContent = "(edited)";
    meta.append(editedSpan);
  }
  bubble.append(meta);

  // Reactions
  const reactionsRow = document.createElement("div");
  reactionsRow.className = "message-reactions-row";
  const userReactorId = `s_${state.user?.id}`;
  if (item.reactions && typeof item.reactions === "object") {
    Object.entries(item.reactions).forEach(([emoji, reactors]) => {
      if (!Array.isArray(reactors) || reactors.length === 0) return;
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = `reaction-pill ${reactors.includes(userReactorId) ? "user-reacted" : ""}`;
      pill.innerHTML = `<span>${emoji}</span> <span>${reactors.length}</span>`;
      pill.onclick = (e) => {
        e.stopPropagation();
        toggleSupportReaction(item.id, emoji);
      };
      reactionsRow.append(pill);
    });
  }

  // Floating Action Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "message-action-toolbar";

  const reactBtn = document.createElement("button");
  reactBtn.type = "button";
  reactBtn.className = "action-tool-btn";
  reactBtn.innerHTML = "😀";
  reactBtn.title = "React with Emoji";
  reactBtn.onclick = (e) => {
    e.stopPropagation();
    showSupportEmojiPopup(item.id, toolbar);
  };
  toolbar.append(reactBtn);

  const replyBtn = document.createElement("button");
  replyBtn.type = "button";
  replyBtn.className = "action-tool-btn";
  replyBtn.innerHTML = "💬";
  replyBtn.title = "Reply";
  replyBtn.onclick = (e) => {
    e.stopPropagation();
    setSupportReply(item, senderLabel);
  };
  toolbar.append(replyBtn);

  if (item.senderType === "staff" || state.user?.role === "admin") {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "action-tool-btn";
    editBtn.innerHTML = "✏️";
    editBtn.title = "Edit Message";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      triggerSupportEdit(item.id, item.message);
    };
    toolbar.append(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "action-tool-btn danger";
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.title = "Delete Message";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      triggerSupportDelete(item.id);
    };
    toolbar.append(deleteBtn);
  }

  row.append(toolbar, bubble);
  if (reactionsRow.children.length > 0) {
    row.append(reactionsRow);
  }
  return row;
}

function setSupportReply(item, senderName) {
  supportActiveReply = {
    id: item.id,
    senderName,
    text: item.message || (item.attachment ? "Attachment" : "")
  };
  if (el.supportReplyPreview) {
    el.supportReplyPreview.innerHTML = `
      <div class="reply-context-info">
        <strong>Replying to ${senderName}</strong>
        <span>${supportActiveReply.text}</span>
      </div>
      <button type="button" class="reply-cancel-btn" onclick="clearSupportReply()" aria-label="Cancel Reply">✕</button>
    `;
    el.supportReplyPreview.classList.remove("hidden");
  }
  if (el.supportMessageInput) {
    el.supportMessageInput.focus();
  }
}

function clearSupportReply() {
  supportActiveReply = null;
  if (el.supportReplyPreview) {
    el.supportReplyPreview.innerHTML = "";
    el.supportReplyPreview.classList.add("hidden");
  }
}
window.clearSupportReply = clearSupportReply;

function showSupportEmojiPopup(msgId, targetToolbar) {
  const existing = document.querySelector(".quick-emoji-popup");
  if (existing) existing.remove();

  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];
  const popup = document.createElement("div");
  popup.className = "quick-emoji-popup";
  emojis.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-emoji-btn";
    btn.textContent = emoji;
    btn.onclick = async (e) => {
      e.stopPropagation();
      popup.remove();
      await toggleSupportReaction(msgId, emoji);
    };
    popup.append(btn);
  });
  targetToolbar.append(popup);
  setTimeout(() => {
    const closeListener = (evt) => {
      if (!popup.contains(evt.target)) {
        popup.remove();
        document.removeEventListener("click", closeListener);
      }
    };
    document.addEventListener("click", closeListener);
  }, 10);
}

async function toggleSupportReaction(messageId, emoji) {
  try {
    await api("/api/support/messages/react", {
      method: "POST",
      body: JSON.stringify({ messageId, emoji })
    });
    await refreshState();
  } catch (err) {
    console.error("Reaction failed:", err);
  }
}

async function triggerSupportEdit(messageId, currentText) {
  const newText = prompt("Edit your message:", currentText || "");
  if (newText === null) return;
  const trimmed = newText.trim();
  if (!trimmed) return alert("Message cannot be empty.");
  if (trimmed === currentText) return;

  try {
    await api("/api/support/messages/edit", {
      method: "POST",
      body: JSON.stringify({ messageId, message: trimmed })
    });
    await refreshState();
  } catch (err) {
    alert(err.message || "Failed to edit message");
  }
}

async function triggerSupportDelete(messageId) {
  const ok = confirm("Delete this message? It will be removed for everyone.");
  if (!ok) return;
  try {
    await api("/api/support/messages/delete", {
      method: "POST",
      body: JSON.stringify({ messageId })
    });
    await refreshState();
  } catch (err) {
    alert(err.message || "Failed to delete message");
  }
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

const MIC_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
const STOP_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';

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
      el.supportVoiceBtn.innerHTML = MIC_ICON_SVG;
      el.supportVoiceBtn.classList.remove("recording");
    };
    supportRecorder.start();
    el.supportVoiceBtn.innerHTML = STOP_ICON_SVG;
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
  if (el.userCount) el.userCount.textContent = state.users.length;
  if (el.adminCount) el.adminCount.textContent = admins;
  if (el.standardUserCount) el.standardUserCount.textContent = Math.max(0, state.users.length - admins);

  // Update Customer Portal Stats
  const elCustomerAccountCount = document.getElementById("customerAccountCount");
  const elCustomerActiveCount = document.getElementById("customerActiveCount");
  const elCustomerLinkedDeviceCount = document.getElementById("customerLinkedDeviceCount");
  if (elCustomerAccountCount) elCustomerAccountCount.textContent = state.customerAccounts.length;
  if (elCustomerActiveCount) elCustomerActiveCount.textContent = state.customerAccounts.filter(c => c.active !== false).length;
  if (elCustomerLinkedDeviceCount) {
    const devSet = new Set();
    state.customerAccounts.forEach(c => {
      const list = Array.isArray(c.linkedDeviceIds) && c.linkedDeviceIds.length > 0 ? c.linkedDeviceIds : (c.linkedDeviceId ? String(c.linkedDeviceId).split(",").map(s => s.trim().toUpperCase()).filter(Boolean) : []);
      list.forEach(d => devSet.add(d));
    });
    elCustomerLinkedDeviceCount.textContent = devSet.size;
  }

  if (el.userBody) el.userBody.innerHTML = "";

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
    if (el.userBody) el.userBody.append(row);
  });

  if (el.customerAccountBody) {
    el.customerAccountBody.innerHTML = "";
    state.customerAccounts.forEach((customer) => {
      const row = el.customerAccountRowTemplate.content.firstElementChild.cloneNode(true);
      row.querySelector(".customer-account-name").textContent = customer.fullName || "";
      row.querySelector(".customer-account-username").textContent = customer.username || "";
      
      const devices = Array.isArray(customer.linkedDeviceIds) && customer.linkedDeviceIds.length > 0
        ? customer.linkedDeviceIds
        : (customer.linkedDeviceId ? String(customer.linkedDeviceId).split(",").map(s => s.trim()).filter(Boolean) : []);
      
      const devCell = row.querySelector(".customer-account-device");
      devCell.innerHTML = "";
      if (devices.length === 0) {
        devCell.textContent = "-";
      } else {
        devices.forEach((d) => {
          const badge = document.createElement("span");
          badge.className = "device-chip-badge";
          badge.style.cssText = "display: inline-block; padding: 2px 7px; margin: 2px; font-size: 11px; font-weight: 700; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); border-radius: 6px;";
          badge.textContent = d;
          devCell.append(badge);
        });
      }

      row.querySelector(".customer-account-status").textContent = customer.active === false ? "Inactive" : "Active";
      row.querySelector(".edit-customer-account").onclick = () => editCustomerAccount(customer.id);
      row.querySelector(".delete-customer-account").onclick = () => deleteCustomerAccount(customer.id);
      el.customerAccountBody.append(row);
    });
  }
}

function renderCustomerDeviceChips(selectedIds = []) {
  // chips removed per user request for direct text input
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
    if (node._hideTimer) {
      clearTimeout(node._hideTimer);
      node._hideTimer = null;
    }
    node.classList.remove("hidden");
    void node.offsetWidth;
    node.classList.add("open");
  } else {
    node.classList.remove("open");
    if (node._hideTimer) clearTimeout(node._hideTimer);
    node._hideTimer = setTimeout(() => {
      if (!node.classList.contains("open")) {
        node.classList.add("hidden");
      }
      node._hideTimer = null;
    }, 180);
  }
}
window.setDialogOpen = setDialogOpen;

function closeEntryDialog() { setDialogOpen(el.entryDialog, false); }
function closeBillDialog() { setDialogOpen(el.billDialog, false); }
function closeDeviceDialog() { setDialogOpen(el.deviceDialog, false); }
function closeUserDialog() { setDialogOpen(el.userDialog, false); }
function closeCustomerAccountDialog() { setDialogOpen(el.customerAccountDialog, false); }
function closeAnnouncementDialog() { setDialogOpen(el.announcementDialog, false); }
function closeColorDialog() { setDialogOpen(el.colorDialog, false); }
function resetDefaultColors() {
  localStorage.removeItem(BILL_COLOR_STORAGE_KEY);
  resetColorForm();
  applyBillColors(DEFAULT_BILL_COLORS);
}

function openEntryDialog() {
  resetEntryForm();
  if (el.entryDialog) setDialogOpen(el.entryDialog, true);
}
function openBillDialog() {
  resetBillForm();
  if (el.billDialog) setDialogOpen(el.billDialog, true);
}
function openDeviceDialog() {
  resetDeviceForm();
  if (el.deviceDialog) setDialogOpen(el.deviceDialog, true);
}
function openUserDialog() {
  resetUserForm();
  if (el.userDialog) setDialogOpen(el.userDialog, true);
}
function openCustomerAccountDialog() {
  resetCustomerAccountForm();
  if (el.customerAccountDialog) setDialogOpen(el.customerAccountDialog, true);
}
function openAnnouncementDialog() {
  resetAnnouncementForm();
  if (el.announcementDialog) setDialogOpen(el.announcementDialog, true);
}

function openBroadcastDialog() {
  const form = document.getElementById("broadcastForm");
  if (form) form.reset();
  const countLabel = document.getElementById("broadcastCustomerCountLabel");
  const activeCount = (state.customerAccounts || []).filter(c => c.active !== false).length;
  if (countLabel) countLabel.textContent = `${activeCount} active customer accounts`;
  const dialog = document.getElementById("broadcastDialog");
  if (dialog) setDialogOpen(dialog, true);
}

function closeBroadcastDialog() {
  const dialog = document.getElementById("broadcastDialog");
  if (dialog) setDialogOpen(dialog, false);
}

async function sendBroadcastMessage(event) {
  if (event) event.preventDefault();
  const rawMessage = document.getElementById("broadcastMessage")?.value?.trim();
  const title = document.getElementById("broadcastTitle")?.value?.trim();
  const topic = document.getElementById("broadcastTopic")?.value || "announcement";
  const alsoAnnouncement = document.getElementById("broadcastAlsoAsAnnouncement")?.checked === true;

  if (!rawMessage) {
    alert("Please write a message to broadcast.");
    return;
  }

  const activeCount = (state.customerAccounts || []).filter(c => c.active !== false).length;
  if (!activeCount) {
    alert("No active customer accounts found to receive this broadcast.");
    return;
  }

  const confirmed = confirm(`📢 Broadcast Message to ${activeCount} Customers?\n\nThis message will be sent directly to all customer support chat threads.`);
  if (!confirmed) return;

  const btn = document.getElementById("sendBroadcastBtn");
  const origText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Sending to All...";
  }

  try {
    const res = await api("/api/support/broadcast", {
      method: "POST",
      body: JSON.stringify({
        message: rawMessage,
        title,
        topic,
        alsoAnnouncement
      })
    });
    alert(`✅ Broadcast message sent successfully to ${res.count || activeCount} customers!`);
    closeBroadcastDialog();
    await refreshState();
  } catch (err) {
    alert("❌ Failed to broadcast message: " + (err.message || "Unknown error"));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}

window.openEntryDialog = openEntryDialog;
window.openBillDialog = openBillDialog;
window.openDeviceDialog = openDeviceDialog;
window.openUserDialog = openUserDialog;
window.openCustomerAccountDialog = openCustomerAccountDialog;
window.openAnnouncementDialog = openAnnouncementDialog;
window.openBroadcastDialog = openBroadcastDialog;

window.closeEntryDialog = closeEntryDialog;
window.closeBillDialog = closeBillDialog;
window.closeDeviceDialog = closeDeviceDialog;
window.closeUserDialog = closeUserDialog;
window.closeCustomerAccountDialog = closeCustomerAccountDialog;
window.closeAnnouncementDialog = closeAnnouncementDialog;
window.closeBroadcastDialog = closeBroadcastDialog;
window.closeColorDialog = closeColorDialog;
window.resetDefaultColors = resetDefaultColors;
window.sendBroadcastMessage = sendBroadcastMessage;

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
  if (el.deleteDeviceBtn) el.deleteDeviceBtn.classList.add("hidden");
  el.planStatusInput.value = "normal";
  if (el.deviceActiveInput) el.deviceActiveInput.value = "true";
}

function openUsageDialog(recordId = null, machineId = "") {
  resetUsageForm();
  if (machineId && el.usageMachineInput) {
    el.usageMachineInput.value = machineId;
    syncUsageMachineContext();
  }
  if (el.usageDialog) {
    setDialogOpen(el.usageDialog, true);
  }
}
window.openUsageDialog = openUsageDialog;

function closeUsageDialog() {
  const dialog = el?.usageDialog || document.querySelector("#usageDialog");
  if (dialog) {
    dialog.classList.remove("open");
    dialog.classList.add("hidden");
  }
}
window.closeUsageDialog = closeUsageDialog;

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
  renderCustomerDeviceChips([]);
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
window.resetEntryForm = resetEntryForm;
window.resetBillForm = resetBillForm;
window.resetDeviceForm = resetDeviceForm;
window.resetUserForm = resetUserForm;
window.resetCustomerAccountForm = resetCustomerAccountForm;
window.resetAnnouncementForm = resetAnnouncementForm;
window.resetColorForm = resetColorForm;

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
  const sendVoucher = Boolean(document.getElementById("entrySendVoucher")?.checked);
  await api("/api/cash/entry", {
    method: "POST",
    body: JSON.stringify({ monthKey: state.activeMonth, entry: payload, sendVoucher })
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
    planStatus: el.planStatusInput.value,
    active: el.deviceActiveInput ? el.deviceActiveInput.value === "true" : true
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
  if (el.deviceActiveInput) {
    el.deviceActiveInput.value = record.active !== false ? "true" : "false";
  }
  el.deviceDialogTitle.textContent = "Update Device";
  el.saveDeviceBtn.textContent = "Update Device";
  if (el.deleteDeviceBtn) el.deleteDeviceBtn.classList.remove("hidden");
  setDialogOpen(el.deviceDialog, true);
}

async function deleteDeviceRecord(id) {
  if (!isAdmin()) return;
  const record = state.deviceRecords.find((item) => item.id === id);
  const name = record ? `${record.deviceId || ""} (${record.name || ""})` : "this device";
  const ok = confirm(`🗑️ Are you sure you want to delete ${name}?\n\nThis will remove the duplicate/obsolete device from the database.`);
  if (!ok) return;
  try {
    await api(`/api/devices/record?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await refreshState();
  } catch (err) {
    alert("Failed to delete device: " + (err.message || "Unknown error"));
  }
}

async function deleteDeviceRecordFromModal() {
  const id = el.deviceRecordId.value;
  if (!id) return;
  await deleteDeviceRecord(id);
  closeDeviceDialog();
}
window.deleteDeviceRecordFromModal = deleteDeviceRecordFromModal;

function resetUsageForm() {
  if (el.usageForm) el.usageForm.reset();
  if (el.usageId) el.usageId.value = "";
  if (el.usageDialogTitle) el.usageDialogTitle.textContent = "Add Daily Usage";
  if (el.saveUsageBtn) el.saveUsageBtn.textContent = "Save Daily Usage";
  if (el.usageLimitInput) el.usageLimitInput.value = "5";
  if (el.usageDateInput) el.usageDateInput.value = localDateKey();
  if (el.usageDailyInput) el.usageDailyInput.value = "";
  if (el.usageMachineInput) el.usageMachineInput.value = "";
  if (el.usageMachineHint) {
    el.usageMachineHint.textContent = "";
    el.usageMachineHint.classList.add("hidden");
  }
  setUsageModalUnit(vizState.inputUnit || "GB");
  renderUsageHistory(null);
}

function setUsageModalUnit(unit) {
  vizState.inputUnit = unit || "GB";
  if (!el.usageUnitToggleGroup) return;
  el.usageUnitToggleGroup.querySelectorAll(".unit-pill").forEach((btn) => {
    const isActive = btn.dataset.unit === vizState.inputUnit;
    btn.classList.toggle("active", isActive);
    btn.style.background = isActive ? "#2563eb" : "transparent";
    btn.style.color = isActive ? "#ffffff" : "#64748b";
  });
}

function selectUsageUnit(newUnit) {
  const oldUnit = vizState.inputUnit || "GB";
  if (newUnit !== oldUnit) {
    const val = parseFloat(el.usageDailyInput?.value);
    if (!isNaN(val) && val > 0 && el.usageDailyInput) {
      el.usageDailyInput.value = newUnit === "TB" ? parseFloat((val / 1000).toFixed(4)) : parseFloat((val * 1000).toFixed(2));
    }
  }
  setUsageModalUnit(newUnit);
}
window.selectUsageUnit = selectUsageUnit;

function applyUsagePreset(val) {
  const current = Number(el.usageDailyInput?.value || 0);
  const next = current > 0 ? (current + val) : val;
  if (el.usageDailyInput) {
    el.usageDailyInput.value = Number(next.toFixed(2));
    el.usageDailyInput.focus();
  }
}
window.applyUsagePreset = applyUsagePreset;

async function saveUsageRecord(event) {
  event.preventDefault();
  const machine = el.usageMachineInput.value.trim().toUpperCase();
  if (!machine) {
    alert("Please enter or select a Device ID");
    return;
  }
  const rawAmount = Number(el.usageDailyInput.value || 0);
  const dailyUsageTB = vizState.inputUnit === "GB" ? (rawAmount / 1000) : rawAmount;
  const usageDate = el.usageDateInput.value || localDateKey();
  const monthKey = usageDate.slice(0, 7);

  const payload = {
    id: el.usageId.value || undefined,
    monthKey,
    machine,
    customer: el.usageCustomerInput.value.trim(),
    billType: el.usageBillTypeInput.value.trim(),
    usageLimitTB: Number(el.usageLimitInput.value || 5),
    usageDate,
    dailyUsageTB,
    notes: el.usageNotesInput.value.trim()
  };
  await api("/api/usage/record", { method: "POST", body: JSON.stringify({ record: payload }) });
  resetUsageForm();
  setDialogOpen(el.usageDialog, false);
  await refreshState();
}

function editUsageRecord(id) {
  if (!isAdmin()) return;
  const record = state.usageRecords.find((item) => item.id === id);
  if (!record) return;
  el.usageId.value = record.id;
  el.usageMachineInput.value = record.machine || "";
  el.usageCustomerInput.value = record.customer || "";
  el.usageBillTypeInput.value = record.billType || "";
  el.usageLimitInput.value = record.usageLimitTB || 5;
  const latest = dailyUsageEntries(record).at(-1);
  el.usageDateInput.value = latest?.date || usageDefaultDate();
  
  const unit = vizState.inputUnit || "GB";
  setUsageModalUnit(unit);
  const valTB = latest?.value || 0;
  el.usageDailyInput.value = unit === "GB" ? Number((valTB * 1000).toFixed(3)) : valTB;
  
  el.usageNotesInput.value = record.notes || "";
  el.usageDialogTitle.textContent = `Manage ${record.machine} Daily Usage`;
  el.saveUsageBtn.textContent = "Save Daily Usage";
  syncUsageMachineContext();
  renderUsageHistory(record);
  setDialogOpen(el.usageDialog, true);
}

function renderUsageHistory(record) {
  if (!el.usageDailyHistory) return;
  el.usageDailyHistory.innerHTML = "";
  const entries = record ? dailyUsageEntries(record).reverse() : [];
  const legacyTotal = Number(record?.legacyUsageTB || 0);
  const total = record ? usageTotal(record) : 0;
  el.usageHistoryTotal.textContent = `${formatGbOrTb(total).text} this month`;

  if (legacyTotal > 0) {
    const imported = document.createElement("div");
    imported.className = "usage-history-item imported";
    imported.innerHTML = `<span>Imported previous usage</span><strong>${formatGbOrTb(legacyTotal).text}</strong>`;
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
    value.textContent = formatGbOrTb(entry.value).text;
    item.append(date, value);
    if (isAdmin()) {
      const actions = document.createElement("div");
      actions.className = "usage-history-actions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.onclick = () => {
        el.usageDateInput.value = entry.date;
        const u = vizState.inputUnit || "GB";
        el.usageDailyInput.value = u === "GB" ? Number((entry.value * 1000).toFixed(3)) : entry.value;
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
  if (!machine) {
    if (el.usageMachineHint) el.usageMachineHint.classList.add("hidden");
    renderUsageHistory(null);
    return;
  }
  const linkedDevice = state.deviceRecords.find((d) => String(d.deviceId || "").trim().toUpperCase() === machine);
  const linkedBill = state.billRecords.find((b) => String(b.machine || "").trim().toUpperCase() === machine);
  const record = currentMonthUsageRecords().find((item) => String(item.machine || "").trim().toUpperCase() === machine);

  if (record) {
    el.usageId.value = record.id;
    if (!el.usageCustomerInput.value) el.usageCustomerInput.value = record.customer || "";
    if (!el.usageBillTypeInput.value) el.usageBillTypeInput.value = record.billType || "";
    el.usageLimitInput.value = record.usageLimitTB || 5;
    if (record.notes) el.usageNotesInput.value = record.notes;
    renderUsageHistory(record);
  } else {
    el.usageId.value = "";
    if (linkedDevice && !el.usageCustomerInput.value) el.usageCustomerInput.value = linkedDevice.name || "";
    if (linkedDevice && !el.usageBillTypeInput.value) el.usageBillTypeInput.value = linkedDevice.planStatus || "";
    if (linkedBill && !el.usageCustomerInput.value) el.usageCustomerInput.value = linkedBill.customer || "";
    if (linkedBill && !el.usageBillTypeInput.value) el.usageBillTypeInput.value = linkedBill.billType || "";
    renderUsageHistory(null);
  }

  if (el.usageMachineHint) {
    const custName = el.usageCustomerInput.value || linkedDevice?.name || linkedBill?.customer || "";
    const plan = el.usageBillTypeInput.value || linkedDevice?.planStatus || "normal";
    const curTotal = record ? formatGbOrTb(usageTotal(record)).text : "0 GB";
    el.usageMachineHint.textContent = `Customer: ${custName || "-"} • Plan: ${plan.toUpperCase()} • This Month: ${curTotal}`;
    el.usageMachineHint.classList.remove("hidden");
  }
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
  if (event && event.preventDefault) event.preventDefault();
  const username = el.userUsernameInput.value.trim();
  const password = el.userPasswordInput.value;
  const isEditing = Boolean(el.userRecordId.value);

  if (!username) {
    alert("⚠️ Please enter a Username.");
    el.userUsernameInput.focus();
    return;
  }
  if (!isEditing && !password) {
    alert("⚠️ Please enter a Password for the new user.");
    el.userPasswordInput.focus();
    return;
  }

  const payload = {
    id: el.userRecordId.value || undefined,
    fullName: el.userFullNameInput.value.trim(),
    username,
    password: password || undefined,
    role: el.userRoleInput.value,
    allowedTabs: getSelectedTabs()
  };

  try {
    await api("/api/users/record", { method: "POST", body: JSON.stringify({ record: payload }) });
    resetUserForm();
    setDialogOpen(el.userDialog, false);
    await refreshState();
    alert("✅ User saved successfully!");
  } catch (err) {
    alert("❌ Failed to save user: " + (err.message || "Unknown error"));
  }
}
window.saveUserRecord = saveUserRecord;

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
window.editUserRecord = editUserRecord;

async function deleteUserRecord(id) {
  const ok = confirm("Delete this user?");
  if (!ok) return;
  try {
    await api(`/api/users/record?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await refreshState();
    alert("✅ User deleted successfully!");
  } catch (err) {
    alert("❌ Failed to delete user: " + (err.message || "Unknown error"));
  }
}
window.deleteUserRecord = deleteUserRecord;

async function saveCustomerAccount(event) {
  if (event && event.preventDefault) event.preventDefault();
  const username = el.customerAccountUsername.value.trim();
  const password = el.customerAccountPassword.value;
  const isEditing = Boolean(el.customerAccountId.value);
  const linkedDeviceIds = el.customerAccountDeviceId.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

  if (!username) {
    alert("⚠️ Please enter a Customer Username.");
    el.customerAccountUsername.focus();
    return;
  }
  if (linkedDeviceIds.length === 0) {
    alert("⚠️ Please enter at least one Linked Device ID (e.g. MM-ST-001).");
    el.customerAccountDeviceId.focus();
    return;
  }
  if (!isEditing && !password) {
    alert("⚠️ Please enter a Password for the new customer account.");
    el.customerAccountPassword.focus();
    return;
  }

  const payload = {
    id: el.customerAccountId.value || undefined,
    fullName: el.customerAccountName.value.trim(),
    username,
    linkedDeviceId: linkedDeviceIds[0] || "",
    linkedDeviceIds,
    password: password || undefined,
    active: el.customerAccountStatus.value === "active"
  };

  try {
    await api("/api/customer-accounts/record", { method: "POST", body: JSON.stringify({ record: payload }) });
    resetCustomerAccountForm();
    setDialogOpen(el.customerAccountDialog, false);
    await refreshState();
    alert("✅ Customer account saved successfully!");
  } catch (err) {
    alert("❌ Failed to save customer account: " + (err.message || "Unknown error"));
  }
}
window.saveCustomerAccount = saveCustomerAccount;

function editCustomerAccount(id) {
  const customer = state.customerAccounts.find((item) => item.id === id);
  if (!customer) return;
  el.customerAccountId.value = customer.id;
  el.customerAccountName.value = customer.fullName || "";
  el.customerAccountUsername.value = customer.username || "";
  
  const devices = Array.isArray(customer.linkedDeviceIds) && customer.linkedDeviceIds.length > 0
    ? customer.linkedDeviceIds
    : (customer.linkedDeviceId ? String(customer.linkedDeviceId).split(",").map(s => s.trim()).filter(Boolean) : []);
  
  el.customerAccountDeviceId.value = devices.join(", ");
  renderCustomerDeviceChips(devices);
  
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
  const replyContext = supportActiveReply;
  el.supportMessageInput.value = "";
  try {
    const attachment = pending ? {
      kind: pending.kind,
      name: pending.file.name,
      dataUrl: await fileAsDataUrl(pending.file)
    } : null;
    await api("/api/support/message", {
      method: "POST",
      body: JSON.stringify({ customerId, message, attachment, replyTo: replyContext })
    });
    clearSupportAttachment();
    clearSupportReply();
    await refreshState();
  } catch (error) {
    el.supportMessageInput.value = message;
    alert(error.message);
  }
}

function closeUtilityMenu() {
  if (el.utilityMenu) el.utilityMenu.removeAttribute("open");
  const um = document.querySelector("#utilityMenu") || document.querySelector(".utility-menu");
  if (um) um.removeAttribute("open");
}
window.closeUtilityMenu = closeUtilityMenu;

function openAdminPanel(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!canAccess("adminPage")) return;
  state.activePage = "adminPage";
  closeUtilityMenu();
  renderPage();
  renderHeader();
}
window.openAdminPanel = openAdminPanel;

function openColorSettings(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  closeUtilityMenu();
  syncColorInputs();
  setDialogOpen(el.colorDialog, true);
}
window.openColorSettings = openColorSettings;

function triggerRestoreBackup(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  closeUtilityMenu();
  if (el.importJsonInput) el.importJsonInput.click();
}
window.triggerRestoreBackup = triggerRestoreBackup;

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

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPwd = input.type === "password";
  input.type = isPwd ? "text" : "password";
  if (btn) {
    const openIcon = btn.querySelector(".eye-open");
    const closedIcon = btn.querySelector(".eye-closed");
    if (openIcon && closedIcon) {
      openIcon.classList.toggle("hidden", isPwd);
      closedIcon.classList.toggle("hidden", !isPwd);
    }
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

let currentLoginRole = "customer";

function setLoginRole(role) {
  currentLoginRole = role === "staff" ? "staff" : "customer";
  
  const kicker = document.getElementById("loginKicker");
  const title = document.getElementById("loginTitle");
  const subtext = document.getElementById("loginSubtext");
  const submitBtn = document.getElementById("loginSubmitBtn");
  const userPlaceholder = document.getElementById("loginUsername");
  const roleHintText = document.getElementById("loginRoleHintText");
  const roleBtnText = document.getElementById("loginRoleBtnText");
  if (el.loginMessage) el.loginMessage.textContent = "";

  if (currentLoginRole === "customer") {
    if (kicker) kicker.textContent = "SpaceLink Satellite Network";
    if (title) title.textContent = "Customer Sign In";
    if (subtext) subtext.textContent = "View live satellite usage, billing invoices, announcements & 24/7 technical support.";
    if (submitBtn) submitBtn.textContent = "Sign In to Customer Portal";
    if (userPlaceholder) userPlaceholder.placeholder = "Enter customer username";
    if (roleHintText) roleHintText.textContent = "Are you an Admin or Staff member?";
    if (roleBtnText) roleBtnText.textContent = "Sign in to Staff Console →";
  } else {
    if (kicker) kicker.textContent = "SpaceLink Operations Console";
    if (title) title.textContent = "Staff & Admin Sign In";
    if (subtext) subtext.textContent = "Satellite billing operations, cash ledger, usage monitoring, and system control.";
    if (submitBtn) submitBtn.textContent = "Sign In to Staff Dashboard";
    if (userPlaceholder) userPlaceholder.placeholder = "Enter staff / admin username";
    if (roleHintText) roleHintText.textContent = "Are you a customer?";
    if (roleBtnText) roleBtnText.textContent = "← Switch to Customer Portal";
  }
}
window.setLoginRole = setLoginRole;

function toggleLoginRole() {
  setLoginRole(currentLoginRole === "customer" ? "staff" : "customer");
}
window.toggleLoginRole = toggleLoginRole;

async function doLogin(event) {
  event.preventDefault();
  el.loginMessage.textContent = "";
  const username = el.loginUsername.value.trim();
  const password = el.loginPassword.value;
  if (!username || !password) {
    el.loginMessage.textContent = "Please enter both username and password.";
    return;
  }

  try {
    if (currentLoginRole === "customer") {
      await api("/api/customer/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      // Redirect to Customer Portal
      window.location.href = "/customer/";
    } else {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      el.loginForm.reset();
      await refreshState();
    }
  } catch (error) {
    el.loginMessage.textContent = error.message || "Invalid username or password";
  }
}

async function doLogout(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  closeUtilityMenu();
  await api("/api/logout", { method: "POST" });
  state.user = null;
  appRealtimeSocket?.close();
  appRealtimeSocket = null;
  showLogin();
}
window.doLogout = doLogout;

async function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const snapshot = JSON.parse(text);
    closeUtilityMenu();
    const res = await api("/api/import/backup", {
      method: "POST",
      body: JSON.stringify({ snapshot })
    });
    if (res && res.error) {
      alert("Restore Error: " + res.error);
      return;
    }
    event.target.value = "";
    alert("Data restored successfully!");
    window.location.reload();
  } catch (err) {
    alert("Restore failed: " + err.message);
  }
}

function exportBackup(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  closeUtilityMenu();
  window.location.href = "/api/export/backup.json";
}
window.exportBackup = exportBackup;

function exportDevices() {
  window.location.href = "/api/export/devices.csv";
}

async function boot() {
  try {
    applyBillColors(loadBillColors());
    syncColorInputs();
    const session = await api("/api/session");
    if (!session || !session.user) {
      showLogin();
      return;
    }
    state.user = session.user;
    await refreshState();
    showApp();
  } catch (err) {
    console.error("Boot session error:", err);
    showLogin();
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
el.usageMachineInput.addEventListener("input", syncUsageMachineContext);
el.usageMachineInput.addEventListener("change", syncUsageMachineContext);
el.usageDateInput.addEventListener("change", () => {
  const machine = el.usageMachineInput.value.trim().toUpperCase();
  const record = state.usageRecords.find((item) => String(item.machine || "").trim().toUpperCase() === machine);
  const valTB = record?.dailyUsage?.[el.usageDateInput.value];
  if (valTB !== undefined && valTB !== null) {
    const u = vizState.inputUnit || "GB";
    el.usageDailyInput.value = u === "GB" ? Number((valTB * 1000).toFixed(3)) : valTB;
  }
});

if (el.usageUnitToggleGroup) {
  el.usageUnitToggleGroup.querySelectorAll(".unit-pill").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectUsageUnit(btn.dataset.unit);
    });
  });
}

if (el.usageSearchInput) {
  el.usageSearchInput.addEventListener("input", renderUsagePage);
}

if (el.closeMachineChartModalBtn) {
  el.closeMachineChartModalBtn.addEventListener("click", closeMachineChartModal);
}
if (el.machineChartModal) {
  el.machineChartModal.addEventListener("click", (event) => {
    if (event.target === el.machineChartModal) closeMachineChartModal();
  });
}

if (el.modalVizPeriodTabs) {
  el.modalVizPeriodTabs.querySelectorAll(".starlink-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      modalChartState.period = tab.dataset.period;
      el.modalVizPeriodTabs.querySelectorAll(".starlink-tab").forEach((t) => t.classList.toggle("active", t === tab));
      renderModalMachineVisualizer();
    });
  });
}

if (el.modalQuickUnitToggle) {
  el.modalQuickUnitToggle.querySelectorAll(".unit-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      modalChartState.unit = btn.dataset.unit;
      el.modalQuickUnitToggle.querySelectorAll(".unit-pill").forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.style.background = isActive ? "#2563eb" : "transparent";
        b.style.color = isActive ? "#ffffff" : "#64748b";
      });
    });
  });
}

if (el.modalQuickRecordForm) {
  el.modalQuickRecordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const date = el.modalQuickDate.value;
    const rawVal = Number(el.modalQuickAmount.value || 0);
    const unit = modalChartState.unit || "GB";
    const valTB = unit === "TB" ? rawVal : rawVal / 1000;
    const machine = modalChartState.machineId;
    if (!machine || !date || valTB < 0) return;

    try {
      await api("/api/usage/record", {
        method: "POST",
        body: JSON.stringify({
          machine,
          date,
          usageAmountTB: valTB
        })
      });
      el.modalQuickAmount.value = "";
      await refreshState();
      renderModalMachineVisualizer();
      renderUsagePage();
    } catch (err) {
      alert(err.message);
    }
  });
}

el.openUsageDialogBtn.addEventListener("click", () => {
  resetUsageForm();
  setDialogOpen(el.usageDialog, true);
});
if (el.closeUsageDialogBtn) {
  el.closeUsageDialogBtn.addEventListener("click", closeUsageDialog);
}
if (el.cancelUsageBtn) {
  el.cancelUsageBtn.addEventListener("click", closeUsageDialog);
}
if (el.usageDialog) {
  el.usageDialog.addEventListener("click", (event) => {
    if (event.target === el.usageDialog) closeUsageDialog();
  });
}

if (el.userForm) el.userForm.addEventListener("submit", saveUserRecord);
if (el.resetUserBtn) el.resetUserBtn.addEventListener("click", resetUserForm);
if (el.userRoleInput) el.userRoleInput.addEventListener("change", updatePermissionChecklist);
if (el.openUserDialogBtn) {
  el.openUserDialogBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetUserForm();
    setDialogOpen(el.userDialog, true);
  });
}
if (el.closeUserDialogBtn) {
  el.closeUserDialogBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(el.userDialog, false);
  });
}
if (el.cancelUserBtn) {
  el.cancelUserBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(el.userDialog, false);
  });
}
if (el.userDialog) {
  el.userDialog.addEventListener("click", (event) => {
    if (event.target === el.userDialog) setDialogOpen(el.userDialog, false);
  });
}

if (el.customerAccountForm) el.customerAccountForm.addEventListener("submit", saveCustomerAccount);
if (el.resetCustomerAccountBtn) el.resetCustomerAccountBtn.addEventListener("click", resetCustomerAccountForm);
if (el.openCustomerAccountDialogBtn) {
  el.openCustomerAccountDialogBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetCustomerAccountForm();
    setDialogOpen(el.customerAccountDialog, true);
  });
}
if (el.closeCustomerAccountDialogBtn) {
  el.closeCustomerAccountDialogBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(el.customerAccountDialog, false);
  });
}
if (el.cancelCustomerAccountBtn) {
  el.cancelCustomerAccountBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(el.customerAccountDialog, false);
  });
}
if (el.customerAccountDialog) {
  el.customerAccountDialog.addEventListener("click", (event) => {
    if (event.target === el.customerAccountDialog) setDialogOpen(el.customerAccountDialog, false);
  });
}

if (el.announcementForm) el.announcementForm.addEventListener("submit", saveAnnouncement);
if (el.resetAnnouncementBtn) el.resetAnnouncementBtn.addEventListener("click", resetAnnouncementForm);
if (el.openAnnouncementDialogBtn) {
  el.openAnnouncementDialogBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetAnnouncementForm();
    setDialogOpen(el.announcementDialog, true);
  });
}
if (el.closeAnnouncementDialogBtn) {
  el.closeAnnouncementDialogBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(el.announcementDialog, false);
  });
}
if (el.cancelAnnouncementBtn) {
  el.cancelAnnouncementBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(el.announcementDialog, false);
  });
}
if (el.announcementDialog) {
  el.announcementDialog.addEventListener("click", (event) => {
    if (event.target === el.announcementDialog) setDialogOpen(el.announcementDialog, false);
  });
}

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
    closeMachineChartModal();
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

if (el.exportJsonBtn) {
  el.exportJsonBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    exportBackup();
  });
}
if (el.restoreBackupBtn) {
  el.restoreBackupBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeUtilityMenu();
    el.importJsonInput.click();
  });
}
if (el.importJsonInput) {
  el.importJsonInput.addEventListener("change", importBackup);
}
if (el.logoutBtn) {
  el.logoutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    doLogout();
  });
}

document.addEventListener("click", (event) => {
  if (el.utilityMenu && el.utilityMenu.hasAttribute("open")) {
    if (!el.utilityMenu.contains(event.target)) {
      closeUtilityMenu();
    }
  }
});

function switchSettingsTab(tabId) {
  const tabs = document.querySelectorAll(".settings-nav-tab");
  const panes = document.querySelectorAll(".settings-tab-pane");
  tabs.forEach(t => {
    const isAct = t.dataset.tab === tabId;
    t.classList.toggle("active", isAct);
    t.setAttribute("aria-selected", isAct ? "true" : "false");
  });
  panes.forEach(p => {
    const isAct = p.id === tabId;
    p.classList.toggle("active", isAct);
    p.classList.toggle("hidden", !isAct);
  });
}
window.switchSettingsTab = switchSettingsTab;

async function openSystemSettingsModal(event) {
  if (event) event.preventDefault();
  closeUtilityMenu();
  switchSettingsTab("tabTelegram");
  try {
    const data = await api("/api/admin/settings");
    if (!data) return;
    const sys = data.systemSettings || {};
    
    document.getElementById("settingsTelegramAlerts").checked = sys.telegramAlertsEnabled !== false;
    document.getElementById("settingsTelegramToken").value = sys.telegramBotToken || "";
    document.getElementById("settingsTelegramChatId").value = sys.telegramChatId || "";
    document.getElementById("settingsTelegramBackupChatId").value = sys.telegramBackupChatId || "";
    
    document.getElementById("settingsAutoBackup").checked = sys.autoBackupEnabled !== false;
    document.getElementById("settingsAutoBackupHour").value = String(sys.autoBackupHour ?? 0);
    document.getElementById("settingsAutoVouchers").value = String(sys.autoVouchersEnabled !== false);
    
    document.getElementById("settingsCompanyName").value = sys.companyName || "S-Tech Telecommunication Services";
    document.getElementById("settingsCompanyPhone").value = sys.companyPhone || "+95 9 777 888 999";

    // Customer App Update fields (stored in appSettings)
    const appData = await api("/api/settings").catch(() => ({}));
    const upd = appData?.customerAppUpdate || {};
    document.getElementById("settingsCustomerUpdateEnabled").checked = !!upd.enabled;
    document.getElementById("settingsCustomerUpdateVersion").value = upd.version || "";
    document.getElementById("settingsCustomerUpdateTitle").value = upd.title || "";
    document.getElementById("settingsCustomerUpdateDesc").value = upd.description || "";
    document.getElementById("settingsCustomerUpdateUrl").value = upd.url || "";
    
    setDialogOpen(document.getElementById("systemSettingsDialog"), true);
  } catch (err) {
    alert("Failed to load system settings: " + err.message);
  }
}

function closeSystemSettingsDialog() {
  setDialogOpen(document.getElementById("systemSettingsDialog"), false);
}

async function saveSystemSettings(event) {
  if (event) event.preventDefault();
  const sysPayload = {
    telegramAlertsEnabled: document.getElementById("settingsTelegramAlerts").checked,
    telegramBotToken: document.getElementById("settingsTelegramToken").value.trim(),
    telegramChatId: document.getElementById("settingsTelegramChatId").value.trim(),
    telegramBackupChatId: document.getElementById("settingsTelegramBackupChatId").value.trim(),
    autoBackupEnabled: document.getElementById("settingsAutoBackup").checked,
    autoBackupHour: Number(document.getElementById("settingsAutoBackupHour").value || 0),
    autoVouchersEnabled: document.getElementById("settingsAutoVouchers").value === "true",
    companyName: document.getElementById("settingsCompanyName").value.trim(),
    companyPhone: document.getElementById("settingsCompanyPhone").value.trim()
  };

  const updPayload = {
    enabled: document.getElementById("settingsCustomerUpdateEnabled").checked,
    version: document.getElementById("settingsCustomerUpdateVersion").value.trim(),
    title: document.getElementById("settingsCustomerUpdateTitle").value.trim(),
    description: document.getElementById("settingsCustomerUpdateDesc").value.trim(),
    url: document.getElementById("settingsCustomerUpdateUrl").value.trim()
  };

  try {
    await api("/api/admin/settings", {
      method: "POST",
      body: JSON.stringify({ systemSettings: sysPayload })
    });
    await api("/api/settings", {
      method: "POST",
      body: JSON.stringify({ customerAppUpdate: updPayload })
    });
    alert("System & Integration Settings saved successfully!");
    closeSystemSettingsDialog();
  } catch (err) {
    alert("Failed to save settings: " + err.message);
  }
}

async function testTelegramAlert() {
  const token = document.getElementById("settingsTelegramToken").value.trim();
  const chatId = document.getElementById("settingsTelegramChatId").value.trim();
  if (!token || !chatId) {
    alert("Please enter Bot Token and Chat ID first.");
    return;
  }
  const btn = document.getElementById("testTelegramBtn");
  const origText = btn.textContent;
  btn.textContent = "⏳ Sending Test...";
  btn.disabled = true;
  try {
    const res = await api("/api/admin/telegram/test", {
      method: "POST",
      body: JSON.stringify({
        systemSettings: {
          telegramBotToken: token,
          telegramChatId: chatId,
          telegramAlertsEnabled: true
        }
      })
    });
    alert("✅ Telegram Test Alert Sent Successfully! Check your Telegram app.");
  } catch (err) {
    alert("❌ Telegram Test Failed: " + (err.message || "Invalid Token or Chat ID"));
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
  }
}

async function triggerImmediateBackup() {
  const btn = document.getElementById("triggerBackupNowBtn");
  const orig = btn.textContent;
  btn.textContent = "⏳ Archiving & Sending...";
  btn.disabled = true;
  try {
    const res = await api("/api/admin/backup/trigger", { method: "POST" });
    alert("✅ Backup created successfully! File: " + res.backup.zipName + " (" + (res.backup.size / 1024).toFixed(1) + " KB)");
  } catch (err) {
    alert("❌ Backup failed: " + err.message);
  } finally {
    btn.textContent = orig;
    btn.disabled = false;
  }
}

function downloadZipBackup(event) {
  if (event) event.preventDefault();
  closeUtilityMenu();
  window.open("/api/admin/backup/download", "_blank");
}

async function resetAllDataUsageRecords() {
  const confirmed = confirm("⚠️ ARE YOU SURE YOU WANT TO RESET ALL DATA USAGE RECORDS?\n\nThis will clear all daily data usage logs and limits across all devices so you can re-enter from scratch.\n\n(Device list, customers, and billing ledger will NOT be deleted).");
  if (!confirmed) return;

  const doubleConfirm = prompt("Type 'RESET' to confirm deleting all data usage records:");
  if (!doubleConfirm || (doubleConfirm.trim().toUpperCase() !== "RESET")) {
    alert("Reset cancelled. (Confirmation text did not match)");
    return;
  }

  const btn = document.getElementById("resetAllUsageBtn");
  const statusEl = document.getElementById("resetUsageStatus");
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.textContent = "⏳ Resetting data usage records...";

  try {
    await api("/api/usage/reset", { method: "POST" });
    await refreshState();
    if (statusEl) statusEl.textContent = "✅ Reset complete!";
    alert("✅ All Data Usage records have been cleared. You can now start entering fresh usage data from scratch.");
    closeSystemSettingsDialog();
  } catch (err) {
    if (statusEl) statusEl.textContent = "";
    alert("❌ Failed to reset usage records: " + (err.message || "Unknown error"));
  } finally {
    if (btn) btn.disabled = false;
  }
}
window.resetAllDataUsageRecords = resetAllDataUsageRecords;

document.getElementById("systemSettingsForm")?.addEventListener("submit", saveSystemSettings);

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
