const customerState = {
  customer: null,
  devices: [],
  fleetSummary: null,
  selectedDeviceId: "ALL",
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

  deviceBar: document.querySelector("#customerDeviceBar"),
  deviceChipsContainer: document.querySelector("#customerDeviceChipsContainer"),
  fleetSection: document.querySelector("#customerFleetSection"),
  fleetCount: document.querySelector("#customerFleetCount"),
  fleetGrid: document.querySelector("#customerFleetGrid"),
  singleDeviceSection: document.querySelector("#customerSingleDeviceSection"),

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
  replyPreview: document.querySelector("#customerReplyPreview"),
  messageInput: document.querySelector("#customerMessageInput"),
  receiptInput: document.querySelector("#customerReceiptInput"),
  receiptButton: document.querySelector("#customerReceiptBtn"),
  voiceButton: document.querySelector("#customerVoiceBtn"),
  attachmentPreview: document.querySelector("#customerAttachmentPreview"),

  customerVizTotal: document.querySelector("#customerVizTotal"),
  customerVizBadge: document.querySelector("#customerVizBadge"),
  customerVizPeriodTabs: document.querySelector("#customerVizPeriodTabs"),
  customerCycleNav: document.querySelector("#customerCycleNav"),
  customerVizPlanLabel: document.querySelector("#customerVizPlanLabel"),
  customerVizSubTotal: document.querySelector("#customerVizSubTotal"),
  customerVizLimitLabel: document.querySelector("#customerVizLimitLabel"),
  customerChartSvg: document.querySelector("#customerChartSvg"),
  customerChartTooltip: document.querySelector("#customerChartTooltip"),

  updateModal: document.querySelector("#customerUpdateModal"),
  updateTitle: document.querySelector("#updateModalTitle"),
  updateDesc: document.querySelector("#updateModalDesc"),
  updateNowBtn: document.querySelector("#customerUpdateNowBtn"),
  dismissUpdateBtn: document.querySelector("#customerDismissUpdateBtn")
};

const customerVizState = {
  period: "daily",
  activeMonth: "",
  activeYear: new Date().getFullYear()
};

let customerPendingAttachment = null;
let customerActiveReply = null;
let customerRecorder = null;
let customerRecordingStream = null;

async function customerApi(path, options = {}) {
  const token = localStorage.getItem("stech_customer_session_token");
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = response.status;
    throw err;
  }
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
    if (!["support_message", "support_message_edit", "support_message_delete", "support_message_react", "announcement_updated", "usage_updated"].includes(message.type)) return;
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

// --- In-App Update Notification ---
const UPDATE_DISMISSED_KEY = "spacelink_update_dismissed_v";

function showCustomerUpdatePrompt({ version, title, description, url }) {
  const modal = customerEl.updateModal;
  if (!modal) return;
  const dismissedAt = localStorage.getItem(UPDATE_DISMISSED_KEY + version);
  if (dismissedAt) return; // already dismissed for this version

  if (customerEl.updateTitle) customerEl.updateTitle.textContent = title || "App Update Available";
  if (customerEl.updateDesc) customerEl.updateDesc.textContent = description || "A new version is ready. Update for the latest features.";

  modal.classList.remove("hidden");

  if (customerEl.updateNowBtn) {
    customerEl.updateNowBtn.onclick = () => {
      modal.classList.add("hidden");
      if (url) window.open(url, "_blank");
      else window.location.reload(true);
    };
  }
  if (customerEl.dismissUpdateBtn) {
    customerEl.dismissUpdateBtn.onclick = () => {
      modal.classList.add("hidden");
      localStorage.setItem(UPDATE_DISMISSED_KEY + version, Date.now());
    };
  }
}
window.showCustomerUpdatePrompt = showCustomerUpdatePrompt;

// Check for in-app update from server settings
async function checkCustomerUpdate() {
  try {
    const data = await customerApi("/api/customer/bootstrap").catch(() => null);
    if (!data) return;
    const updateInfo = data.appSettings?.customerAppUpdate;
    if (updateInfo && updateInfo.enabled && updateInfo.version) {
      showCustomerUpdatePrompt({
        version: updateInfo.version,
        title: updateInfo.title || "New App Update Available",
        description: updateInfo.description || "Please update your SpaceLink App to enjoy the latest features and improvements.",
        url: updateInfo.url || null
      });
    }
  } catch (_) {}
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

function formatGbOrTbCustomer(valueTB) {
  const gb = Number(valueTB || 0) * 1000;
  if (gb >= 1000) {
    return { number: valueTB.toFixed(2), unit: "TB", text: `${valueTB.toFixed(2)} TB`, gb };
  }
  return { number: gb >= 100 ? gb.toFixed(0) : gb.toFixed(1), unit: "GB", text: `${gb >= 100 ? gb.toFixed(0) : gb.toFixed(1)} GB`, gb };
}

function renderStarlinkCustomerChart(containerSvg, tooltipEl, dataPoints, options = {}) {
  if (!containerSvg) return;
  const width = 800;
  const height = 200;
  const padLeft = 55;
  const padRight = 15;
  const padTop = 25;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxGB = Math.max(...dataPoints.map((d) => d.valueGB), 10);
  let yAxisMax = 50;
  if (maxGB > 50) yAxisMax = Math.ceil(maxGB / 50) * 50;
  else if (maxGB <= 10) yAxisMax = 10;
  else if (maxGB <= 25) yAxisMax = 25;

  const numPoints = Math.max(dataPoints.length, 1);
  const barWidth = Math.max(Math.min((chartW / numPoints) * 0.55, 22), 6);
  const step = chartW / numPoints;

  let svgHtml = `
    <defs>
      <linearGradient id="custBarGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <linearGradient id="custBarGradActive" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#67e8f9" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
    </defs>
  `;

  const gridSteps = [yAxisMax, Math.round(yAxisMax / 2), 0];
  gridSteps.forEach((val) => {
    const y = padTop + chartH - (val / yAxisMax * chartH);
    svgHtml += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="${val === 0 ? "0" : "3,3"}" />
      <text x="${padLeft - 8}" y="${y + 4}" fill="#64748b" font-size="10" font-weight="600" text-anchor="end">${val} GB</text>
    `;
  });

  dataPoints.forEach((d, idx) => {
    const x = padLeft + idx * step + (step - barWidth) / 2;
    const barH = Math.max((d.valueGB / yAxisMax) * chartH, d.valueGB > 0 ? 3 : 0);
    const y = padTop + chartH - barH;
    const isSpecial = d.isCurrent;

    svgHtml += `
      <rect class="chart-bar-track" data-idx="${idx}" x="${x - (step - barWidth) / 2}" y="${padTop}" width="${step}" height="${chartH}" fill="transparent" style="cursor: pointer;" />
      <rect class="chart-bar ${isSpecial ? "current" : ""}" data-idx="${idx}" x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="3" ry="3" fill="${isSpecial ? "url(#custBarGradActive)" : "url(#custBarGrad)"}" />
    `;
  });

  const labelInterval = options.format === "daily" ? Math.max(Math.ceil(numPoints / 6), 1) : 1;
  dataPoints.forEach((d, idx) => {
    if (idx === 0 || idx === numPoints - 1 || idx % labelInterval === 0) {
      const x = padLeft + idx * step + step / 2;
      svgHtml += `
        <text x="${x}" y="${height - 8}" fill="#94a3b8" font-size="10" font-weight="600" text-anchor="middle">${d.label}</text>
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
        <strong style="color:#ffffff; font-size:12px;">${point.fullLabel || point.label}</strong><br>
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

function renderCustomerVisualizer() {
  if (!customerEl.customerChartSvg) return;
  const currentMonth = customerVizState.activeMonth || customerState.activeMonth || new Date().toISOString().slice(0, 7);
  customerVizState.activeMonth = currentMonth;
  const [yearStr, monthStr] = currentMonth.split("-");
  const yearNum = Number(yearStr) || new Date().getFullYear();
  const monthNum = Number(monthStr) || new Date().getMonth() + 1;

  const allRecords = customerState.usageRecords || (customerState.usage ? [customerState.usage] : []);
  const activeRecord = allRecords.find((r) => r.monthKey === currentMonth) || customerState.usage || null;
  const limitTB = Number(activeRecord?.usageLimitTB || 5);
  const planName = String(customerState.device?.planStatus || activeRecord?.billType || "Roam Data").replaceAll("_", " ");

  if (customerEl.customerVizPlanLabel) customerEl.customerVizPlanLabel.textContent = planName.toUpperCase();
  if (customerEl.customerVizBadge) customerEl.customerVizBadge.textContent = customerState.device?.deviceId || customerState.customer?.linkedDeviceId || "Device";

  if (customerEl.customerCycleNav) {
    customerEl.customerCycleNav.innerHTML = "";
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 1; m <= 12; m++) {
      const mKey = `${yearNum}-${String(m).padStart(2, "0")}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `cycle-nav-btn ${mKey === currentMonth ? "active" : ""}`;
      btn.textContent = monthNames[m - 1];
      btn.onclick = () => {
        customerVizState.activeMonth = mKey;
        renderCustomerVisualizer();
      };
      customerEl.customerCycleNav.append(btn);
    }
  }

  let dataPoints = [];
  let totalPeriodTB = 0;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (customerVizState.period === "daily") {
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayTB = Number(activeRecord?.dailyUsage?.[dateKey] || 0);
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
  } else if (customerVizState.period === "monthly") {
    monthNames.forEach((name, mIdx) => {
      const mKey = `${yearNum}-${String(mIdx + 1).padStart(2, "0")}`;
      const rec = allRecords.find((r) => r.monthKey === mKey);
      let mTB = 0;
      if (rec) {
        mTB = Object.values(rec.dailyUsage || {}).reduce((s, v) => s + Number(v || 0), Number(rec.legacyUsageTB || 0));
      }
      totalPeriodTB += mTB;
      dataPoints.push({
        label: name,
        fullLabel: `${name} ${yearNum}`,
        valueTB: mTB,
        valueGB: mTB * 1000,
        isCurrent: mKey === currentMonth
      });
    });
  } else if (customerVizState.period === "yearly") {
    const years = new Set([yearNum - 1, yearNum, yearNum + 1]);
    allRecords.forEach((r) => {
      if (r.monthKey) {
        const y = Number(r.monthKey.split("-")[0]);
        if (y) years.add(y);
      }
    });
    const sortedYears = Array.from(years).sort();
    sortedYears.forEach((y) => {
      let yTB = 0;
      allRecords.filter((r) => String(r.monthKey || "").startsWith(`${y}-`)).forEach((r) => {
        yTB += Object.values(r.dailyUsage || {}).reduce((s, v) => s + Number(v || 0), Number(r.legacyUsageTB || 0));
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

  const formattedTotal = formatGbOrTbCustomer(totalPeriodTB);
  if (customerEl.customerVizTotal) customerEl.customerVizTotal.textContent = formattedTotal.text;
  if (customerEl.customerVizSubTotal) customerEl.customerVizSubTotal.textContent = formattedTotal.text;
  if (customerEl.customerVizLimitLabel) customerEl.customerVizLimitLabel.textContent = `${limitTB.toFixed(1)} TB Limit`;

  renderStarlinkCustomerChart(customerEl.customerChartSvg, customerEl.customerChartTooltip, dataPoints, {
    format: customerVizState.period,
    limitTB
  });
}

function syncActiveDeviceSelection() {
  if (!customerState.devices || customerState.devices.length === 0) {
    customerState.device = null;
    customerState.usage = null;
    customerState.bill = null;
    return;
  }
  if (customerState.devices.length === 1) {
    customerState.selectedDeviceId = customerState.devices[0].deviceId;
  }
  if (customerState.selectedDeviceId === "ALL" && customerState.devices.length > 1) {
    customerState.device = null;
    customerState.usage = null;
    customerState.bill = null;
  } else {
    const d = customerState.devices.find((item) => item.deviceId === customerState.selectedDeviceId) || customerState.devices[0];
    customerState.device = d || null;
    customerState.usage = d?.usage || null;
    customerState.bill = d?.bill || null;
  }
}

function renderCustomerDeviceBar() {
  if (!customerEl.deviceBar || !customerEl.deviceChipsContainer) return;
  const devices = customerState.devices || [];
  if (devices.length <= 1) {
    customerEl.deviceBar.classList.add("hidden");
    return;
  }
  customerEl.deviceBar.classList.remove("hidden");
  customerEl.deviceChipsContainer.innerHTML = "";

  // "All Devices" Chip
  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = `customer-device-chip ${customerState.selectedDeviceId === "ALL" ? "active" : ""}`;
  allChip.innerHTML = `🌐 All Devices (${devices.length})`;
  allChip.onclick = () => {
    customerState.selectedDeviceId = "ALL";
    syncActiveDeviceSelection();
    renderCustomerApp();
  };
  customerEl.deviceChipsContainer.append(allChip);

  // Individual Device Chips
  devices.forEach((d) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `customer-device-chip ${customerState.selectedDeviceId === d.deviceId ? "active" : ""}`;
    chip.innerHTML = `📟 ${d.deviceId}`;
    chip.onclick = () => {
      customerState.selectedDeviceId = d.deviceId;
      syncActiveDeviceSelection();
      renderCustomerApp();
    };
    customerEl.deviceChipsContainer.append(chip);
  });
}

function renderCustomerFleetOverview() {
  const devices = customerState.devices || [];
  if (!customerEl.fleetSection || !customerEl.fleetGrid) return;
  if (customerState.selectedDeviceId !== "ALL" || devices.length <= 1) {
    customerEl.fleetSection.classList.add("hidden");
    customerEl.singleDeviceSection?.classList.remove("hidden");
    return;
  }
  customerEl.fleetSection.classList.remove("hidden");
  customerEl.singleDeviceSection?.classList.add("hidden");
  customerEl.fleetCount.textContent = `${devices.length} Machines`;
  customerEl.fleetGrid.innerHTML = "";

  devices.forEach((d) => {
    const daily = d.usage?.dailyUsage || {};
    const sumDaily = Object.values(daily).reduce((a, b) => a + Number(b || 0), 0);
    const legacy = Number(d.usage?.legacyUsageTB || 0);
    const usedTB = sumDaily + legacy;
    const limitTB = d.planStatus === "discount" ? 2.0 : 5.0;
    const thresholdTB = d.planStatus === "discount" ? 1.9 : 4.8;
    const isNearLimit = usedTB >= thresholdTB;
    const percent = Math.min(100, Math.round((usedTB / limitTB) * 100));

    const card = document.createElement("div");
    card.className = `fleet-machine-card ${isNearLimit ? "near-limit-card" : ""}`;
    card.innerHTML = `
      <div class="fleet-card-top">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="fleet-card-id">📟 ${d.deviceId}</span>
          ${isNearLimit ? '<span class="fleet-near-badge">⚠️ ≥ 4.8 TB</span>' : ''}
        </div>
        <span class="fleet-card-badge ${d.planStatus === "discount" ? "discount" : "normal"}">${d.planStatus || "Normal"}</span>
      </div>
      <div class="fleet-card-usage">
        <span>Data Used (Limit: ${limitTB.toFixed(1)} TB)</span>
        <strong style="color: ${isNearLimit ? "#f43f5e" : "#38bdf8"};">${usedTB.toFixed(2)} / ${limitTB.toFixed(1)} TB</strong>
      </div>
      <div class="fleet-progress-bar">
        <div class="fleet-progress-fill ${isNearLimit ? "critical" : percent > 75 ? "warning" : ""}" style="width: ${percent}%;"></div>
      </div>
      <div class="fleet-card-meta">
        <span>${d.region || "Myanmar"} ${d.active === false ? '<b style="color:#ef4444;">(Inactive)</b>' : ''}</span>
        <span style="color: #38bdf8; font-weight: 700;">Inspect Machine →</span>
      </div>
    `;
    card.onclick = () => {
      customerState.selectedDeviceId = d.deviceId;
      syncActiveDeviceSelection();
      renderCustomerApp();
    };
    customerEl.fleetGrid.append(card);
  });
}

function renderCustomerApp() {
  const customer = customerState.customer || {};
  const devices = customerState.devices || [];
  const isFleetAll = customerState.selectedDeviceId === "ALL" && devices.length > 1;

  let total = 0;
  let limit = 5;
  let remaining = 5;

  if (isFleetAll) {
    total = customerState.fleetSummary?.totalUsageTB || 0;
    limit = 5.0;
    remaining = 5.0;
  } else {
    total = customerUsageTotal();
    limit = Number(customerState.usage?.usageLimitTB || (customerState.device?.planStatus === "discount" ? 2 : 5));
    remaining = Math.max(0, limit - total);
  }

  const level = customerUsageLevel(total, limit);
  const entries = customerUsageEntries();
  const unread = customerState.messages.filter((item) => item.senderType === "staff" && !item.readByCustomer).length;

  customerEl.headerName.textContent = customer.fullName || customer.username || "Customer";
  customerEl.welcomeName.textContent = `Hello, ${customer.fullName || customer.username || "Customer"}`;
  customerEl.monthLabel.textContent = customerMonthLabel(customerState.activeMonth);

  if (isFleetAll) {
    const nearLimitList = customerState.fleetSummary?.nearLimitDevices || [];
    customerEl.deviceSummary.textContent = `Fleet of ${devices.length} Satellite Machines | Individual 5.0 TB Limits`;
    
    // Left Card: Total Fleet Machines
    if (customerEl.usageTotal.previousElementSibling) {
      customerEl.usageTotal.previousElementSibling.textContent = "Fleet Machines";
    }
    customerEl.usageTotal.textContent = `${devices.length} Units`;
    customerEl.usageLimit.textContent = `${customerState.fleetSummary?.activeCount || devices.length} Active in Service`;
    
    // Right Card: 4.8 TB Near-Limit Alert / Fleet Status
    if (customerEl.usageRemaining.previousElementSibling) {
      customerEl.usageRemaining.previousElementSibling.textContent = "High Usage Alert";
    }
    if (nearLimitList.length > 0) {
      customerEl.usageRemaining.textContent = `⚠️ ${nearLimitList.length} Machine(s)`;
      customerEl.usageRemaining.style.color = "#f43f5e";
      customerEl.usageState.textContent = nearLimitList.map(d => `${d.deviceId}: ${d.usedTB} TB`).join(", ");
    } else {
      customerEl.usageRemaining.textContent = "✓ All Safe";
      customerEl.usageRemaining.style.color = "#10b981";
      customerEl.usageState.textContent = "All machines < 4.8 TB limit";
    }
  } else {
    if (customerEl.usageTotal.previousElementSibling) {
      customerEl.usageTotal.previousElementSibling.textContent = "Data Used";
    }
    customerEl.usageTotal.textContent = `${total.toFixed(3)} TB`;
    customerEl.usageLimit.textContent = `of ${limit.toFixed(1)} TB`;
    if (customerEl.usageRemaining.previousElementSibling) {
      customerEl.usageRemaining.previousElementSibling.textContent = "Remaining";
    }
    customerEl.usageRemaining.textContent = `${remaining.toFixed(3)} TB`;
    customerEl.usageRemaining.style.color = "";
    customerEl.usageState.textContent = level === "critical" ? "Limit reached" : level === "warning" ? "Near limit" : "Safe usage";
    customerEl.deviceSummary.textContent = customerState.device
      ? `${customerState.device.deviceId} | ${customerState.device.region || "Service active"}`
      : `${customer.linkedDeviceId || "Device not linked"}`;
  }

  if (customerState.device) {
    customerEl.deviceId.textContent = customerState.device.deviceId || "-";
    customerEl.deviceRegion.textContent = customerState.device.region || "-";
    customerEl.deviceSerial.textContent = customerState.device.serialNumber || "-";
    customerEl.deviceKit.textContent = customerState.device.kitNumber || "-";
    customerEl.devicePlan.textContent = String(customerState.device.planStatus || "-").replaceAll("_", " ");
    customerEl.deviceAddress.textContent = customerState.device.serviceAddress || "-";
  }

  customerEl.navUnread.textContent = unread;
  customerEl.navUnread.classList.toggle("hidden", unread === 0);

  customerEl.latestAnnouncement.innerHTML = "";
  customerEl.latestAnnouncement.className = customerState.announcements.length ? "" : "customer-empty";
  customerEl.latestAnnouncement.append(customerState.announcements.length
    ? makeAnnouncementCard(customerState.announcements[0])
    : document.createTextNode("No announcements yet."));

  renderCustomerDeviceBar();
  renderCustomerFleetOverview();
  renderCustomerVisualizer();

  customerEl.dailyUsageList.innerHTML = "";
  if (!entries.length) customerEl.dailyUsageList.append(makeCustomerEmpty(isFleetAll ? "Select an individual machine above to view its daily breakdown." : "No daily usage has been recorded yet."));
  entries.forEach((item) => {
    const row = document.createElement("div");
    row.className = "daily-row";
    const date = document.createElement("span");
    date.textContent = customerDate(item.date);
    const value = document.createElement("strong");
    value.textContent = formatGbOrTbCustomer(item.value).text;
    row.append(date, value);
    customerEl.dailyUsageList.append(row);
  });

  customerEl.announcementList.innerHTML = "";
  if (!customerState.announcements.length) customerEl.announcementList.append(makeCustomerEmpty("No announcements yet."));
  customerState.announcements.forEach((item) => customerEl.announcementList.append(makeAnnouncementCard(item)));
  renderCustomerMessages();
  renderCustomerNavigation();
}

function renderCustomerNavigation() {
  customerEl.pages.forEach((page) => {
    page.classList.toggle("active", page.id === customerState.activePage);
  });
  customerEl.navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.customerPage === customerState.activePage);
  });
  if (customerState.activePage === "customerUsagePage") {
    renderCustomerVisualizer();
  }
}

function renderCustomerMessages() {
  const messages = customerState.messages;
  customerEl.messageList.innerHTML = "";
  if (!messages.length) customerEl.messageList.append(makeCustomerEmpty("Start a conversation with SpaceLink."));
  messages.forEach((item) => {
    if (item.voucher || item.topic === "voucher") {
      const v = item.voucher || {};
      const voucherEl = makeVoucherElement(v);
      customerEl.messageList.append(voucherEl);
      return;
    }
    const msgRow = makeCustomerMessageRow(item);
    customerEl.messageList.append(msgRow);
  });
  customerEl.messageList.scrollTop = customerEl.messageList.scrollHeight;
}

function makeCustomerMessageRow(item) {
  const isMine = item.senderType === "customer";
  const row = document.createElement("div");
  row.className = `message-bubble-row ${isMine ? "mine" : "theirs"}`;
  row.dataset.msgId = item.id;

  const bubble = document.createElement("article");
  bubble.className = `message-bubble ${isMine ? "mine" : ""}${item.isDeleted ? " deleted" : ""}`;

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
      const target = customerEl.messageList.querySelector(`[data-msg-id="${item.replyTo.id}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    bubble.append(quote);
  }

  if (item.attachment) {
    bubble.append(makeChatAttachment(item.attachment));
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
  const senderLabel = isMine ? "You" : (item.senderName || "SpaceLink Support");
  const metaText = document.createElement("span");
  metaText.textContent = `${senderLabel} | ${customerDate(item.createdAt, true)}`;
  meta.append(metaText);

  if (item.editedAt) {
    const editedSpan = document.createElement("span");
    editedSpan.className = "edited-tag";
    editedSpan.textContent = "(edited)";
    meta.append(editedSpan);
  }
  bubble.append(meta);

  // Reactions Row
  const reactionsRow = document.createElement("div");
  reactionsRow.className = "message-reactions-row";
  const userReactorId = `c_${customerState.customer?.id}`;
  if (item.reactions && typeof item.reactions === "object") {
    Object.entries(item.reactions).forEach(([emoji, reactors]) => {
      if (!Array.isArray(reactors) || reactors.length === 0) return;
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = `reaction-pill ${reactors.includes(userReactorId) ? "user-reacted" : ""}`;
      pill.innerHTML = `<span>${emoji}</span> <span>${reactors.length}</span>`;
      pill.onclick = (e) => {
        e.stopPropagation();
        toggleCustomerReaction(item.id, emoji);
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
    showCustomerEmojiPopup(item.id, toolbar);
  };
  toolbar.append(reactBtn);

  const replyBtn = document.createElement("button");
  replyBtn.type = "button";
  replyBtn.className = "action-tool-btn";
  replyBtn.innerHTML = "💬";
  replyBtn.title = "Reply";
  replyBtn.onclick = (e) => {
    e.stopPropagation();
    setCustomerReply(item, senderLabel);
  };
  toolbar.append(replyBtn);

  if (isMine) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "action-tool-btn";
    editBtn.innerHTML = "✏️";
    editBtn.title = "Edit Message";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      triggerCustomerEdit(item.id, item.message);
    };
    toolbar.append(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "action-tool-btn danger";
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.title = "Delete Message";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      triggerCustomerDelete(item.id);
    };
    toolbar.append(deleteBtn);
  }

  row.append(toolbar, bubble);
  if (reactionsRow.children.length > 0) {
    row.append(reactionsRow);
  }
  return row;
}

function setCustomerReply(item, senderName) {
  customerActiveReply = {
    id: item.id,
    senderName,
    text: item.message || (item.attachment ? "Attachment" : "")
  };
  if (customerEl.replyPreview) {
    customerEl.replyPreview.innerHTML = `
      <div class="reply-context-info">
        <strong>Replying to ${senderName}</strong>
        <span>${customerActiveReply.text}</span>
      </div>
      <button type="button" class="reply-cancel-btn" onclick="clearCustomerReply()" aria-label="Cancel Reply">✕</button>
    `;
    customerEl.replyPreview.classList.remove("hidden");
  }
  if (customerEl.messageInput) {
    customerEl.messageInput.focus();
  }
}

function clearCustomerReply() {
  customerActiveReply = null;
  if (customerEl.replyPreview) {
    customerEl.replyPreview.innerHTML = "";
    customerEl.replyPreview.classList.add("hidden");
  }
}
window.clearCustomerReply = clearCustomerReply;

function showCustomerEmojiPopup(msgId, targetToolbar) {
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
      await toggleCustomerReaction(msgId, emoji);
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

async function toggleCustomerReaction(messageId, emoji) {
  try {
    await customerApi("/api/customer/messages/react", {
      method: "POST",
      body: JSON.stringify({ messageId, emoji })
    });
    await refreshCustomer();
  } catch (err) {
    console.error("Reaction failed:", err);
  }
}

async function triggerCustomerEdit(messageId, currentText) {
  const newText = prompt("Edit your message:", currentText || "");
  if (newText === null) return;
  const trimmed = newText.trim();
  if (!trimmed) return alert("Message cannot be empty.");
  if (trimmed === currentText) return;

  try {
    await customerApi("/api/customer/messages/edit", {
      method: "POST",
      body: JSON.stringify({ messageId, message: trimmed })
    });
    await refreshCustomer();
  } catch (err) {
    alert(err.message || "Failed to edit message");
  }
}

async function triggerCustomerDelete(messageId) {
  const ok = confirm("Delete this message? It will be removed for everyone.");
  if (!ok) return;
  try {
    await customerApi("/api/customer/messages/delete", {
      method: "POST",
      body: JSON.stringify({ messageId })
    });
    await refreshCustomer();
  } catch (err) {
    alert(err.message || "Failed to delete message");
  }
}

function makeVoucherElement(v) {
  const card = document.createElement("div");
  card.className = "customer-voucher-card";
  const numAmount = Number(v.amount || 0);
  card.innerHTML = `
    <div class="voucher-top-brand">
      <div class="voucher-brand-title">
        <strong>${v.companyName || "SpaceLink"}</strong>
        <small>Payment Receipt</small>
      </div>
      <span class="voucher-stamp-paid">PAID</span>
    </div>
    <div class="voucher-amount-box">
      <span>Amount Paid</span>
      <strong>${numAmount.toLocaleString()} MMK</strong>
    </div>
    <div class="voucher-details-list">
      <div class="voucher-detail-row">
        <span>Voucher No</span>
        <strong>${v.voucherNumber || "-"}</strong>
      </div>
      <div class="voucher-detail-row">
        <span>Customer</span>
        <strong>${v.customerName || "-"}</strong>
      </div>
      <div class="voucher-detail-row">
        <span>Terminal ID</span>
        <strong>${v.machineId || "-"}</strong>
      </div>
      <div class="voucher-detail-row">
        <span>Billing Month</span>
        <strong>${v.monthKey || "-"}</strong>
      </div>
      <div class="voucher-detail-row">
        <span>Date</span>
        <strong>${v.date || "-"}</strong>
      </div>
      <div class="voucher-detail-row">
        <span>Method</span>
        <strong>${v.paymentMethod || "Bank Transfer"}</strong>
      </div>
    </div>
    <button type="button" class="voucher-action-btn">
      📄 View & Print Invoice
    </button>
  `;
  const printBtn = card.querySelector(".voucher-action-btn");
  if (printBtn) {
    printBtn.onclick = () => printOrSaveVoucher(v.voucherNumber, v.customerName, v.machineId, v.amount, v.date, v.monthKey);
  }
  return card;
}

function printOrSaveVoucher(no, name, machine, amount, date, month) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to view and print invoice");
    return;
  }
  const formattedAmount = Number(amount || 470000).toLocaleString();
  const invoiceNo = no || "INV-DF-PHL-2829003-54680-6";
  const customerName = name || "CHO (THING KONG)";
  const issueDate = date || "April 18, 2026";
  const periodStr = month ? `Billing Month: ${month}` : "April 26, 2026 – May 26, 2026";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>SpaceLink Invoice - ${invoiceNo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          background: #f1f5f9;
          color: #0f172a;
          padding: 30px 15px;
          display: flex;
          justify-content: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .invoice-sheet {
          width: 100%;
          max-width: 820px;
          background: #ffffff;
          border-radius: 20px;
          padding: 44px 48px;
          box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08);
          border: 1px solid #e2e8f0;
          position: relative;
        }

        /* Top Header */
        .invoice-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 24px;
          margin-bottom: 28px;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .brand-logo-svg {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #0284c7, #0369a1);
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: #fff;
          font-size: 24px;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
        }

        .brand-text h1 {
          font-size: 22px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .brand-text span {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .invoice-title-box {
          text-align: right;
        }

        .invoice-title-box h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 32px;
          font-weight: 700;
          color: #0369a1;
          letter-spacing: 0.04em;
          line-height: 1;
          margin-bottom: 8px;
        }

        .meta-badge {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 8px 14px;
          text-align: right;
          display: inline-block;
        }

        .meta-badge .inv-no {
          font-size: 11.5px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.03em;
        }

        .meta-badge .acc-no {
          font-size: 10.5px;
          font-weight: 600;
          color: #64748b;
          margin-top: 2px;
        }

        /* 3-Column Info Bar */
        .info-grid {
          display: grid;
          grid-template-columns: 1.4fr 1.2fr 1fr;
          gap: 20px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px 22px;
          margin-bottom: 28px;
        }

        .info-col span {
          display: block;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }

        .info-col strong {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }

        .info-col p {
          font-size: 12px;
          color: #475569;
          font-weight: 500;
          margin-top: 2px;
        }

        /* Table */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }

        .items-table th {
          background: #0369a1;
          color: #ffffff;
          text-align: left;
          padding: 12px 16px;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .items-table th:first-child { border-radius: 8px 0 0 8px; width: 50px; text-align: center; }
        .items-table th:last-child { border-radius: 0 8px 8px 0; text-align: right; }
        .items-table th.center { text-align: center; }
        .items-table th.right { text-align: right; }

        .items-table td {
          padding: 16px 16px;
          font-size: 13px;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
        }

        .items-table td.center { text-align: center; }
        .items-table td.right { text-align: right; }

        .item-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 13.5px;
        }

        .item-sub {
          font-size: 11.5px;
          color: #64748b;
          margin-top: 3px;
        }

        /* Summary Total Bar */
        .total-wrapper {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }

        .total-box {
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border: 1.5px solid #38bdf8;
          border-radius: 12px;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .total-box .label-group span {
          display: block;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #0369a1;
          letter-spacing: 0.05em;
        }

        .total-box .paid-badge {
          display: inline-block;
          background: #10b981;
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          margin-top: 2px;
        }

        .total-box .amount {
          font-size: 24px;
          font-weight: 800;
          color: #0c4a6e;
          font-family: 'Space Grotesk', sans-serif;
        }

        /* Footer */
        .invoice-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px dashed #cbd5e1;
          padding-top: 20px;
        }

        .contact-links {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .contact-links a, .contact-links span {
          font-size: 11.5px;
          color: #0284c7;
          text-decoration: none;
          font-weight: 600;
        }

        .thank-you {
          text-align: right;
        }

        .thank-you strong {
          display: block;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.05em;
        }

        .thank-you span {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }

        @media print {
          body { padding: 0; background: #fff; }
          .invoice-sheet { box-shadow: none; border: none; padding: 20px 24px; width: 100%; max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-sheet">
        <!-- Top Header -->
        <div class="invoice-top">
          <div class="brand-section">
            <div class="brand-logo-svg">🛰️</div>
            <div class="brand-text">
              <h1>SpaceLink</h1>
              <span>Billing Service</span>
            </div>
          </div>
          <div class="invoice-title-box">
            <h2>INVOICE</h2>
            <div class="meta-badge">
              <div class="inv-no">${invoiceNo}</div>
              <div class="acc-no">CUSTOMER ACCOUNT: ACC-8741499-22873-29</div>
            </div>
          </div>
        </div>

        <!-- 3-Column Info Bar -->
        <div class="info-grid">
          <div class="info-col">
            <span>INVOICE TO :</span>
            <strong>${customerName}</strong>
            <p>${machine ? `Terminal: ${machine}` : 'Thing Kong'}</p>
          </div>
          <div class="info-col">
            <span>SEND PAYMENT TO :</span>
            <strong>SPACELINK MYANMAR</strong>
            <p>KBZPay / Mobile Banking</p>
          </div>
          <div class="info-col">
            <span>DATE :</span>
            <strong>${issueDate}</strong>
            <p>${periodStr}</p>
          </div>
        </div>

        <!-- Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Description</th>
              <th class="center">Qty</th>
              <th class="right">Price</th>
              <th class="right">Total (MMK)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="center"><strong>1</strong></td>
              <td>
                <div class="item-name">SpaceLink Internet Bill</div>
                <div class="item-sub">(${periodStr})</div>
              </td>
              <td class="center">1</td>
              <td class="right">${formattedAmount}</td>
              <td class="right"><strong>${formattedAmount}</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- Total Box -->
        <div class="total-wrapper">
          <div class="total-box">
            <div class="label-group">
              <span>Total Received</span>
              <div class="paid-badge">PAID ✓</div>
            </div>
            <div class="amount">${formattedAmount} MMK</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="invoice-footer">
          <div class="contact-links">
            <span>www.spacelinkmm.com</span>
            <span>info@spacelinkmm.com</span>
            <span>billing@spacelinkmm.com</span>
          </div>
          <div class="thank-you">
            <strong>THANK YOU</strong>
            <span>SPACELINK MM</span>
          </div>
        </div>
      </div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `);
  printWindow.document.close();
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

const CUSTOMER_MIC_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
const CUSTOMER_STOP_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';

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
      customerEl.voiceButton.innerHTML = CUSTOMER_MIC_ICON_SVG;
      customerEl.voiceButton.classList.remove("recording");
    };
    customerRecorder.start();
    customerEl.voiceButton.innerHTML = CUSTOMER_STOP_ICON_SVG;
    customerEl.voiceButton.classList.add("recording");
  } catch {
    alert("Microphone permission is required to send a voice message.");
  }
}

async function refreshCustomer() {
  try {
    const snapshot = await customerApi("/api/customer/bootstrap");
    Object.assign(customerState, snapshot);
    customerState.devices = snapshot.devices || (snapshot.device ? [snapshot.device] : []);
    customerState.fleetSummary = snapshot.fleetSummary || null;
    
    if (customerState.devices.length <= 1 && customerState.devices.length > 0) {
      customerState.selectedDeviceId = customerState.devices[0].deviceId;
    } else if (!customerState.selectedDeviceId) {
      customerState.selectedDeviceId = "ALL";
    }
    syncActiveDeviceSelection();
    
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
  localStorage.removeItem("stech_customer_session_token");
  customerEl.app.classList.add("hidden");
  customerEl.login.classList.remove("hidden");
}

async function submitCustomerLogin(event) {
  event.preventDefault();
  customerEl.loginError.textContent = "";
  try {
    const res = await customerApi("/api/customer/login", {
      method: "POST",
      body: JSON.stringify({ username: customerEl.username.value.trim(), password: customerEl.password.value })
    });
    if (res && (res.token || res.sid)) {
      localStorage.setItem("stech_customer_session_token", res.token || res.sid);
    }
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
  const replyContext = customerActiveReply;
  customerEl.messageInput.value = "";
  try {
    const attachment = pending ? {
      kind: pending.kind,
      name: pending.file.name,
      dataUrl: await fileAsDataUrl(pending.file)
    } : null;
    await customerApi("/api/customer/messages", {
      method: "POST",
      body: JSON.stringify({ message, attachment, replyTo: replyContext })
    });
    clearCustomerAttachment();
    clearCustomerReply();
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

if (customerEl.customerVizPeriodTabs) {
  customerEl.customerVizPeriodTabs.querySelectorAll(".customer-viz-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      customerVizState.period = tab.dataset.period;
      customerEl.customerVizPeriodTabs.querySelectorAll(".customer-viz-tab").forEach((t) => t.classList.toggle("active", t === tab));
      renderCustomerVisualizer();
    });
  });
}

async function initCustomerApp() {
  const session = await customerApi("/api/customer/session").catch(() => ({ customer: null }));
  if (!session.customer) return showCustomerLogin();
  customerEl.login.classList.add("hidden");
  customerEl.app.classList.remove("hidden");
  await refreshCustomer();
  // Check for in-app update notification after login
  checkCustomerUpdate();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/customer-sw.js", { scope: "/customer/" }).catch(() => {}));
}

setInterval(() => {
  if (customerState.customer && !document.hidden) refreshCustomer();
}, 60000);

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

initCustomerApp();
