import {
  state,
  loadState,
  saveState,
  getTodayHistory,
  TABLE_COUNT,
} from "./state/store";
import {
  calcCost,
  formatDuration,
  formatMoney,
  getEffectiveDuration,
} from "./lib/calculations";
import {
  loadSessionsFromSupabase,
  saveSessionToSupabase,
  deleteSessionFromSupabase,
} from "./api/sessions";
import { loadBarItems } from "./api/bar";
import { loadDailyReports, loadMonthlyReports } from "./api/reports";
import { renderGrid } from "./ui/renderGrid";
import { setOpenCheckoutCallback } from "./ui/tableActions";
import { checkAndArchiveShift, checkAndArchiveMonth } from "./lib/archivation";
import { showDialog } from "./ui/dialog";

// Initialization
const tablesGrid = document.getElementById("tablesGrid") as HTMLElement;
const dailyRevenueEl = document.getElementById("dailyRevenue") as HTMLElement;
const occupiedCountEl = document.getElementById("occupiedCount") as HTMLElement;
const historyWrap = document.getElementById("historyWrap") as HTMLElement;
const historyCountLabel = document.getElementById(
  "historyCountLabel",
) as HTMLElement;
const monthlyArchiveList = document.getElementById(
  "monthlyArchiveList",
) as HTMLElement;
const hourlyRateInput = document.getElementById(
  "hourlyRate",
) as HTMLInputElement;

// Navigation
const navItems = document.querySelectorAll(".nav-item");
const tabPanes = document.querySelectorAll(".tab-pane");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const targetId = (item as HTMLElement).dataset.target;
    if (!targetId) return;

    navItems.forEach((n) => n.classList.remove("active"));
    item.classList.add("active");

    tabPanes.forEach((p) => p.classList.remove("active"));
    document.getElementById(targetId)?.classList.add("active");

    localStorage.setItem("activeTab", targetId);

    if (targetId === "tab-bar") updateBarSellView();
    if (targetId === "tab-history") renderHistory();
  });
});

// Segment controls
document.querySelectorAll(".tab-segment").forEach((seg) => {
  const buttons = seg.querySelectorAll(".seg-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetView = (btn as HTMLElement).dataset.view;
      if (!targetView) return;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const parentPane = btn.closest(".tab-pane");
      if (parentPane) {
        parentPane
          .querySelectorAll(".view-pane")
          .forEach((v) => v.classList.remove("active", "fade-in"));
        const v = document.getElementById(targetView);
        if (v) v.classList.add("active");
        localStorage.setItem("activeSegment_" + parentPane.id, targetView);
      }
    });
  });
});

// App State Updates
function updateStats() {
  const todayHistory = getTodayHistory();
  const totalRev = todayHistory.reduce((sum, h) => sum + h.totalAmount, 0);
  dailyRevenueEl.textContent = formatMoney(totalRev);

  const occupied = state.tables.filter((t) => t.occupied).length;
  occupiedCountEl.textContent = `Band: ${occupied}/${state.tables.length}`;
}

let lastKnownDateStr = new Date().toDateString();
function onRender() {
  const currentStr = new Date().toDateString();
  if (currentStr !== lastKnownDateStr) {
    checkAndArchiveShift();
    checkAndArchiveMonth();
    lastKnownDateStr = currentStr;
  }

  updateStats();
  renderGrid(tablesGrid, updateStats);
}

// Start
async function initApp() {
  loadState();

  if (state.tables.length === 0) {
    state.tables = Array.from({ length: TABLE_COUNT }, (_, i) => ({
      id: i + 1,
      occupied: false,
      startTime: null,
      customerName: null,
      customRate: null,
      isPaused: false,
      pauseStartTime: null,
      totalPauseDurationMs: 0,
      barOrders: [],
    }));
    saveState();
  }

  hourlyRateInput.value = state.hourlyRate.toString();

  await Promise.all([
    loadSessionsFromSupabase(),
    loadBarItems(),
    checkAndArchiveShift(),
  ]);

  onRender();
  renderBarMenu();
  renderHistory();

  // Restore tab and segment state
  const activeTab = localStorage.getItem("activeTab");
  if (activeTab) {
    const tabBtn = document.querySelector(`[data-target="${activeTab}"]`) as HTMLElement;
    if (tabBtn) tabBtn.click();
  }
  const barSegment = localStorage.getItem("activeSegment_tab-bar");
  if (barSegment) {
    const btn = document.querySelector(`[data-view="${barSegment}"]`) as HTMLElement;
    if (btn) btn.click();
  }
  const historySegment = localStorage.getItem("activeSegment_tab-history");
  if (historySegment) {
    const btn = document.querySelector(`[data-view="${historySegment}"]`) as HTMLElement;
    if (btn) btn.click();
  }
}

// History
function renderHistory() {
  const todayHistory = getTodayHistory();
  historyCountLabel.textContent = `${todayHistory.length} ta o'yin`;

  if (todayHistory.length === 0) {
    historyWrap.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);">Hozircha o'yinlar yo'q</div>`;
  } else {
    const sorted = [...todayHistory].sort(
      (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
    );
    historyWrap.innerHTML = sorted
      .map((h) => {
        const pm =
          h.paymentMethod === "card"
            ? "💳"
            : h.paymentMethod === "cash"
              ? "💵"
              : "";
        const cust = h.customerName
          ? ` &middot; ${escapeHtml(h.customerName)}`
          : "";
        const timeStr = new Date(h.endedAt).toLocaleTimeString("uz-UZ", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `
        <div class="history-item">
          <div class="hist-top">
            <div class="hist-title">${h.tableId}-stol &middot; ${timeStr}</div>
            <div class="hist-amount">${formatMoney(h.totalAmount)} ${pm}</div>
          </div>
          <div class="hist-bot">
            <span>Davomiylik: ${formatDuration(h.durationMs)}</span>
            <button class="delete-history-btn" data-id="${h.id}" style="background:none;border:none;color:var(--text-dim);font-size:16px;">🗑</button>
          </div>
          ${cust ? `<div class="hist-summary">${cust}</div>` : ""}
        </div>
      `;
      })
      .join("");

    historyWrap.querySelectorAll(".delete-history-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (!id) return;
        showDialog({
          type: "confirm",
          message: "Ushbu yozuvni o'chirasizmi?",
          onConfirm: async () => {
            const success = await deleteSessionFromSupabase(id);
            if (success) {
              state.history = state.history.filter((s) => s.id !== id);
              saveState();
              onRender();
              renderHistory();
            }
          },
        });
      });
    });
  }

  // Render Month
  loadMonthlyReports().then((reports) => {
    if (reports.length === 0) {
      monthlyArchiveList.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);">Arxivlar topilmadi.</div>`;
    } else {
      monthlyArchiveList.innerHTML = reports
        .map(
          (r) => `
        <div class="history-item">
          <div class="hist-top">
            <div class="hist-title" style="color:var(--gold-soft);">${r.reportLabel} (${r.year}-${String(r.month).padStart(2, "0")})</div>
            <div class="hist-amount" style="color:var(--green-avail);">${formatMoney(r.totalRevenue)}</div>
          </div>
          <div class="hist-bot">
            <span>O'yinlar: ${r.totalSessions} ta</span>
            <span>${r.workingDays} ish kuni</span>
          </div>
        </div>
      `,
        )
        .join("");
    }
  });
}

function escapeHtml(str: string) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Checkout Sheet
const checkoutSheetOverlay = document.getElementById(
  "checkoutSheetOverlay",
) as HTMLElement;
let pendingCheckoutTableId: number | null = null;
let pendingPaymentMethod: "cash" | "card" = "cash";

setOpenCheckoutCallback((id: number) => {
  const table = state.tables.find((t) => t.id === id);
  if (!table || !table.occupied || !table.startTime) return;

  pendingCheckoutTableId = id;
  const durationMs = getEffectiveDuration(table);
  const rate = table.customRate ?? state.hourlyRate;
  const gameAmount = calcCost(durationMs, rate);

  let barAmount = 0;
  if (table.barOrders && table.barOrders.length > 0) {
    barAmount = table.barOrders.reduce((sum, o) => sum + o.price * o.qty, 0);
  }
  const totalAmount = gameAmount + barAmount;

  (document.getElementById("sheetTitle") as HTMLElement).textContent =
    `${id}-stol`;
  (document.getElementById("sheetDuration") as HTMLElement).textContent =
    formatDuration(durationMs);
  (document.getElementById("sheetGameAmount") as HTMLElement).textContent =
    formatMoney(gameAmount);

  const barRow = document.getElementById("sheetBarRow") as HTMLElement;
  if (barAmount > 0) {
    barRow.style.display = "flex";
    (document.getElementById("sheetBarAmount") as HTMLElement).textContent =
      formatMoney(barAmount);
  } else {
    barRow.style.display = "none";
  }

  (document.getElementById("sheetTotalAmount") as HTMLElement).textContent =
    formatMoney(totalAmount);
  (document.getElementById("sheetCustomerName") as HTMLInputElement).value =
    table.customerName || "";

  pendingPaymentMethod = "cash";
  document.querySelectorAll("#paymentMethodSeg .seg-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      (btn as HTMLElement).dataset.type === "cash",
    );
  });

  checkoutSheetOverlay.classList.add("open");
});

document.querySelectorAll("#paymentMethodSeg .seg-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document
      .querySelectorAll("#paymentMethodSeg .seg-btn")
      .forEach((b) => b.classList.remove("active"));
    const t = e.currentTarget as HTMLElement;
    t.classList.add("active");
    pendingPaymentMethod = t.dataset.type as "cash" | "card";
  });
});

document
  .getElementById("sheetCancelBtn")
  ?.addEventListener("click", () =>
    checkoutSheetOverlay.classList.remove("open"),
  );
document
  .getElementById("sheetCloseBtn")
  ?.addEventListener("click", () =>
    checkoutSheetOverlay.classList.remove("open"),
  );

document
  .getElementById("sheetConfirmBtn")
  ?.addEventListener("click", async () => {
    if (pendingCheckoutTableId === null) return;
    const table = state.tables.find((t) => t.id === pendingCheckoutTableId);
    if (!table || !table.occupied || !table.startTime) return;

    const durationMs = getEffectiveDuration(table);
    const rate = table.customRate ?? state.hourlyRate;
    const gameAmount = calcCost(durationMs, rate);

    let barAmount = 0;
    if (table.barOrders && table.barOrders.length > 0) {
      barAmount = table.barOrders.reduce((sum, o) => sum + o.price * o.qty, 0);
    }

    const custName = (
      document.getElementById("sheetCustomerName") as HTMLInputElement
    ).value.trim();

    const session = {
      id: Date.now().toString() + Math.floor(Math.random() * 1000),
      tableId: table.id,
      customerName: custName,
      startedAt: new Date(isNaN(Number(table.startTime)) ? table.startTime : Number(table.startTime)).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs,
      pauseDurationMs: table.totalPauseDurationMs,
      amount: gameAmount,
      barAmount,
      totalAmount: gameAmount + barAmount,
      paymentMethod: pendingPaymentMethod,
      barOrders: JSON.parse(JSON.stringify(table.barOrders)),
    };

    await saveSessionToSupabase(session);
    state.history.push(session);

    table.occupied = false;
    table.startTime = null;
    table.customerName = null;
    table.customRate = null;
    table.isPaused = false;
    table.pauseStartTime = null;
    table.totalPauseDurationMs = 0;
    table.barOrders = [];

    saveState();
    onRender();

    checkoutSheetOverlay.classList.remove("open");
    showDialog({ type: "alert", message: "Hisob yopildi va tarixga yozildi!" });
  });

// Bar Logic
let currentBarDraft: Record<string, number> = {};

function updateBarSellView() {
  const select = document.getElementById(
    "barOrderTableSelect",
  ) as HTMLSelectElement;
  select.innerHTML = "";
  const occupiedTables = state.tables.filter((t) => t.occupied);
  if (occupiedTables.length === 0) {
    select.innerHTML = `<option disabled selected>Band stollar yo'q</option>`;
  } else {
    occupiedTables.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id.toString();
      opt.textContent = `${t.id}-stol`;
      select.appendChild(opt);
    });
  }

  currentBarDraft = {};
  renderBarSellList();
}

function renderBarSellList() {
  const list = document.getElementById("barOrderItems") as HTMLElement;
  const activeItems = state.barItems.filter((i) => i.isActive);

  if (activeItems.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding: 20px; color:var(--text-dim);">Mahsulotlar yo'q</div>`;
    (
      document.getElementById("barOrderTotalAmount") as HTMLElement
    ).textContent = "0 so'm";
    return;
  }

  list.innerHTML = activeItems
    .map((item) => {
      const qty = currentBarDraft[item.id] || 0;
      return `
      <div class="bar-item-row">
        <div class="bar-item-info">
          <div class="bar-item-name">${escapeHtml(item.name)}</div>
          <div class="bar-item-price">${formatMoney(item.price)}</div>
        </div>
        <div class="bar-qty-controls">
          <button class="bar-qty-btn" data-id="${item.id}" data-action="minus">-</button>
          <div class="bar-qty-val">${qty}</div>
          <button class="bar-qty-btn" data-id="${item.id}" data-action="plus">+</button>
        </div>
      </div>
    `;
    })
    .join("");

  list.querySelectorAll(".bar-qty-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const b = e.currentTarget as HTMLElement;
      const id = b.dataset.id!;
      if (!currentBarDraft[id]) currentBarDraft[id] = 0;
      if (b.dataset.action === "plus") currentBarDraft[id]++;
      else if (currentBarDraft[id] > 0) currentBarDraft[id]--;
      renderBarSellList();
    });
  });

  let sum = 0;
  activeItems.forEach((i) => (sum += (currentBarDraft[i.id] || 0) * i.price));
  (document.getElementById("barOrderTotalAmount") as HTMLElement).textContent =
    formatMoney(sum);
}

document.getElementById("confirmBarOrderBtn")?.addEventListener("click", () => {
  const select = document.getElementById(
    "barOrderTableSelect",
  ) as HTMLSelectElement;
  if (!select || !select.value) return;
  const tid = parseInt(select.value);
  const table = state.tables.find((t) => t.id === tid);
  if (!table) return;

  const activeItems = state.barItems.filter((i) => i.isActive);
  let added = false;
  for (const itemId in currentBarDraft) {
    const qty = currentBarDraft[itemId];
    if (qty > 0) {
      const item = activeItems.find((i) => i.id === itemId);
      if (item) {
        const existing = table.barOrders.find((o) => o.itemId === itemId);
        if (existing) existing.qty += qty;
        else
          table.barOrders.push({
            itemId,
            name: item.name,
            price: item.price,
            qty,
          });
        added = true;
      }
    }
  }

  if (added) {
    saveState();
    onRender();
    showDialog({ type: "alert", message: "Sotildi!" });
    updateBarSellView();
  }
});

// Bar Menu Logic
function renderBarMenu() {
  const list = document.getElementById("barItemsList") as HTMLElement;
  const activeItems = state.barItems.filter((i) => i.isActive);
  list.innerHTML = activeItems
    .map(
      (item) => `
    <div class="bar-item-row" style="padding: 10px 16px;">
      <div class="bar-item-info">
        <div class="bar-item-name">${escapeHtml(item.name)}</div>
        <div class="bar-item-price">${formatMoney(item.price)}</div>
      </div>
      <button class="btn btn-outline btn-sm delete-menu-btn" data-id="${item.id}" style="color:var(--red-occ-soft); border-color:var(--red-occ-soft);">O'chirish</button>
    </div>
  `,
    )
    .join("");

  list.querySelectorAll(".delete-menu-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      showDialog({
        type: "confirm",
        message: "Mahsulotni o'chirasizmi?",
        onConfirm: () => {
          const item = state.barItems.find((i) => i.id === id);
          if (item) item.isActive = false;
          saveState();
          renderBarMenu();
        },
      });
    });
  });
}

document.getElementById("addBarItemBtn")?.addEventListener("click", () => {
  const name = (
    document.getElementById("barItemName") as HTMLInputElement
  ).value.trim();
  const price = parseInt(
    (document.getElementById("barItemPrice") as HTMLInputElement).value,
  );
  const cat = (document.getElementById("barItemCategory") as HTMLSelectElement)
    .value;

  if (name && !isNaN(price) && price >= 0) {
    state.barItems.push({
      id: Date.now().toString(),
      name,
      price,
      category: cat,
      isActive: true,
    });
    saveState();
    (document.getElementById("barItemName") as HTMLInputElement).value = "";
    (document.getElementById("barItemPrice") as HTMLInputElement).value = "";
    renderBarMenu();
  }
});

// Settings
document.getElementById("saveRateBtn")?.addEventListener("click", () => {
  const val = parseInt(hourlyRateInput.value);
  if (!isNaN(val) && val >= 0) {
    showDialog({
      type: "confirm",
      message: "Soatbay narxni saqlaysizmi?",
      onConfirm: () => {
        state.hourlyRate = val;
        saveState();
        const note = document.getElementById("saveNote");
        note?.classList.add("show");
        setTimeout(() => note?.classList.remove("show"), 2000);
      },
    });
  }
});

const dailyArchiveOverlay = document.getElementById(
  "dailyArchiveOverlay",
) as HTMLElement;
document
  .getElementById("dailyArchiveBtn")
  ?.addEventListener("click", async () => {
    dailyArchiveOverlay.classList.add("open");
    const list = document.getElementById("dailyArchiveList") as HTMLElement;
    list.innerHTML = `<div style="padding: 20px;">Yuklanmoqda...</div>`;
    const reports = await loadDailyReports();
    if (reports.length === 0) {
      list.innerHTML = `<div style="padding: 20px; color: var(--text-dim);">Arxivlar topilmadi.</div>`;
      return;
    }
    list.innerHTML = reports
      .map(
        (r) => `
    <div class="history-item">
      <div class="hist-top">
        <div class="hist-title" style="color:var(--gold-soft);">${r.reportDate}</div>
        <div class="hist-amount">${formatMoney(r.totalRevenue)}</div>
      </div>
      <div class="hist-bot">
        <span>O'yinlar: ${r.totalSessions} ta</span>
      </div>
      <div class="hist-summary" style="display:flex; justify-content:space-between;">
        <span>O'yin: ${formatMoney(r.gameRevenue)}</span>
        <span>Bar: ${formatMoney(r.barRevenue)}</span>
      </div>
    </div>
  `,
      )
      .join("");
  });
document
  .getElementById("closeDailyArchiveBtn")
  ?.addEventListener("click", () =>
    dailyArchiveOverlay.classList.remove("open"),
  );

initApp();
