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
  customerChartTooltip: document.querySelector("#customerChartTooltip")
};

const customerVizState = {
  period: "daily",
  activeMonth: "",
  activeYear: new Date().getFullYear()
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
    customerEl.deviceSummary.textContent = `Fleet of ${devices.length} Starlink Machines | Individual 5.0 TB Limits`;
    
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
