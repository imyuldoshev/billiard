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
  loadSessionsByDate,
} from "./api/sessions";
import { loadBarItems } from "./api/bar";
import { loadDailyReports, loadMonthlyReports } from "./api/reports";
import { renderGrid } from "./ui/renderGrid";
import { setOpenCheckoutCallback } from "./ui/tableActions";
import { checkAndArchiveShift, checkAndArchiveMonth } from "./lib/archivation";
import { showDialog } from "./ui/dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });
import { checkPhoneExists, registerUser, verifyPin } from "./api/auth";

// Auth Initialization
const loginScreen = document.getElementById("loginScreen") as HTMLElement;
const appContainer = document.getElementById("app") as HTMLElement;
const loginStep1 = document.getElementById("loginStep1") as HTMLElement;
const loginStep2 = document.getElementById("loginStep2") as HTMLElement;
const loginPhone = document.getElementById("loginPhone") as HTMLInputElement;
const loginPin = document.getElementById("loginPin") as HTMLInputElement;
const loginNextBtn = document.getElementById("loginNextBtn") as HTMLButtonElement;
const loginSubmitBtn = document.getElementById("loginSubmitBtn") as HTMLButtonElement;
const loginBackBtn = document.getElementById("loginBackBtn") as HTMLButtonElement;
const loginPinText = document.getElementById("loginPinText") as HTMLElement;

let currentAuthPhone = "";
let isNewUser = false;

function checkAuth() {
  const loggedIn = localStorage.getItem("currentUser");
  if (loggedIn) {
    loginScreen.style.display = "none";
    appContainer.style.display = "block";
  } else {
    loginScreen.style.display = "flex";
    appContainer.style.display = "none";
  }
}

loginPhone?.addEventListener("input", () => {
  let val = loginPhone.value.replace(/[^\d]/g, ""); // Remove non-digits
  
  if (!val.startsWith("998")) {
    // If they delete 998, put it back
    if (val.length < 3) val = "998"; 
    else val = "998" + val;
  }
  
  if (val.length > 12) {
    val = val.substring(0, 12);
  }
  
  let formatted = "+998 ";
  if (val.length > 3) formatted += val.substring(3, 5);
  if (val.length > 5) formatted += " " + val.substring(5, 8);
  if (val.length > 8) formatted += " " + val.substring(8, 10);
  if (val.length > 10) formatted += " " + val.substring(10, 12);
  
  loginPhone.value = formatted;
});

loginPhone?.addEventListener("focus", () => {
  if (loginPhone.value.trim() === "" || loginPhone.value.trim() === "+") {
    loginPhone.value = "+998 ";
  }
});

loginNextBtn?.addEventListener("click", async () => {
  const phone = loginPhone.value.trim();
  if (phone.length !== 17) {
    showDialog({ type: "alert", message: "Telefon raqamni to'liq kiriting!" });
    return;
  }
  loginNextBtn.textContent = "Tekshirilmoqda...";
  loginNextBtn.disabled = true;
  
  const exists = await checkPhoneExists(phone);
  currentAuthPhone = phone;
  isNewUser = !exists;
  
  loginNextBtn.textContent = "Davom etish";
  loginNextBtn.disabled = false;
  
  loginStep1.style.display = "none";
  loginStep2.style.display = "block";
  loginPin.value = "";
  
  if (isNewUser) {
    loginPinText.textContent = "Siz yangi foydalanuvchisiz. O'zingiz uchun 4 xonali yangi PIN kod o'rnating:";
    loginSubmitBtn.textContent = "Ro'yxatdan o'tish";
  } else {
    loginPinText.textContent = "PIN kodni kiriting:";
    loginSubmitBtn.textContent = "Kirish";
  }
  setTimeout(() => loginPin.focus(), 100);
});

// Login — Enter bilan o'tish
loginPhone?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginNextBtn?.click();
});
loginPin?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginSubmitBtn?.click();
});

loginBackBtn?.addEventListener("click", () => {
  loginStep2.style.display = "none";
  loginStep1.style.display = "block";
});

loginSubmitBtn?.addEventListener("click", async () => {
  const pin = loginPin.value.trim();
  if (pin.length !== 4) {
    showDialog({ type: "alert", message: "PIN kod 4 xonali bo'lishi kerak!" });
    return;
  }
  
  loginSubmitBtn.disabled = true;
  
  if (isNewUser) {
    loginSubmitBtn.textContent = "Yaratilmoqda...";
    const success = await registerUser(currentAuthPhone, pin);
    if (success) {
      localStorage.setItem("currentUser", currentAuthPhone);
      checkAuth();
    } else {
      showDialog({ type: "alert", message: "Xatolik yuz berdi. Qaytadan urinib ko'ring." });
    }
  } else {
    loginSubmitBtn.textContent = "Tekshirilmoqda...";
    const isValid = await verifyPin(currentAuthPhone, pin);
    if (isValid) {
      localStorage.setItem("currentUser", currentAuthPhone);
      checkAuth();
    } else {
      showDialog({ type: "alert", message: "PIN kod noto'g'ri!" });
    }
  }
  
  loginSubmitBtn.disabled = false;
  if (isNewUser) loginSubmitBtn.textContent = "Ro'yxatdan o'tish";
  else loginSubmitBtn.textContent = "Kirish";
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  showDialog({
    type: "confirm",
    message: "Haqiqatan ham tizimdan chiqmoqchimisiz?",
    onConfirm: () => {
      localStorage.removeItem("currentUser");
      window.location.reload();
    }
  });
});

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

// Daily Report DOM
const dailyReportDate = document.getElementById("dailyReportDate") as HTMLInputElement;
const dailyReportWrap = document.getElementById("dailyReportWrap") as HTMLElement;
const dailyReportCountLabel = document.getElementById("dailyReportCountLabel") as HTMLElement;
const dailyReportMonthLabel = document.getElementById("dailyReportMonthLabel") as HTMLElement;
const dailyReportMonthTotal = document.getElementById("dailyReportMonthTotal") as HTMLElement;

// Receipt Dialog DOM
const receiptDialogOverlay = document.getElementById("receiptDialogOverlay") as HTMLElement;
const receiptContent = document.getElementById("receiptContent") as HTMLElement;
const receiptTitle = document.getElementById("receiptTitle") as HTMLElement;
const receiptCloseBtn = document.getElementById("receiptCloseBtn") as HTMLButtonElement;
receiptCloseBtn?.addEventListener("click", () => {
  receiptDialogOverlay.classList.remove("show");
});

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

// Export PDF Logic
document.getElementById("exportBtn")?.addEventListener("click", () => {
  const todayHistory = getTodayHistory();
  
  if (todayHistory.length === 0) {
    showDialog({ type: "alert", message: "Eksport qilish uchun ma'lumot yo'q!" });
    return;
  }

  const doc = new jsPDF();
  
  const tableData = todayHistory.map(h => {
    const startStr = new Date(h.startedAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    const endStr = new Date(h.endedAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    return [
      `${h.tableId}-stol`,
      startStr,
      endStr,
      formatDuration(h.durationMs),
      h.amount.toLocaleString("ru-RU"),
      h.barAmount.toLocaleString("ru-RU"),
      h.totalAmount.toLocaleString("ru-RU"),
      h.paymentMethod === 'card' ? 'Karta' : 'Naqd',
      h.customerName || ""
    ];
  });

  autoTable(doc, {
    head: [['Stol', 'Boshlandi', 'Tugadi', 'Vaqt', 'O\'yin', 'Bar', 'Jami', 'To\'lov', 'Mijoz']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] }
  });

  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Billiard-Hisobot-${dateStr}.pdf`);
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
function updateOnlineStatus() {
  const dot = document.querySelector(".status-dot") as HTMLElement;
  if (!dot) return;
  if (navigator.onLine) {
    dot.style.backgroundColor = "";
    dot.style.boxShadow = "";
    dot.title = "Online";
  } else {
    dot.style.backgroundColor = "#f59e0b";
    dot.style.boxShadow = "0 0 8px #f59e0b";
    dot.title = "Oflayn rejim";
  }
}

window.addEventListener("online", () => {
  updateOnlineStatus();
  // Online bo'lganda Supabasega sync qilish
  loadSessionsFromSupabase(onRender);
});
window.addEventListener("offline", updateOnlineStatus);

async function initApp() {
  loadState();
  updateOnlineStatus();

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

  try {
    await Promise.all([
      loadSessionsFromSupabase(),
      loadBarItems(),
      checkAndArchiveShift(),
    ]);
  } catch (err) {
    console.error("Tarmoq xatosi yoki yuklashda xatolik:", err);
  }

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


let activeDailySessions: any[] = [];

function openReceipt(session: any) {
  const cardSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#60a5fa" stroke-width="2" style="vertical-align:-3px; margin-right:6px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>';
  const cashSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#34d399" stroke-width="2" style="vertical-align:-3px; margin-right:6px;"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>';
  
  receiptTitle.textContent = `${session.tableId}-stol cheki`;
  const pm = session.paymentMethod === "card" ? `${cardSvg} Karta` : `${cashSvg} Naqd`;
  
  const startStr = new Date(session.startedAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const endStr = new Date(session.endedAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

  receiptContent.innerHTML = `
    <div style="font-size: 15px; color: var(--text-dim); margin-bottom: 12px; text-align: center;">
      Sana: ${new Date(session.endedAt).toLocaleDateString("uz-UZ")}
    </div>
    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-soft); padding-bottom: 8px; margin-bottom: 8px;">
      <span>Boshlandi:</span> <b>${startStr}</b>
    </div>
    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-soft); padding-bottom: 8px; margin-bottom: 8px;">
      <span>Tugadi:</span> <b>${endStr}</b>
    </div>
    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-soft); padding-bottom: 8px; margin-bottom: 8px;">
      <span>O'ynalgan vaqt:</span> <b>${formatDuration(session.durationMs)}</b>
    </div>
    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-soft); padding-bottom: 8px; margin-bottom: 8px;">
      <span>O'yin summasi:</span> <b>${formatMoney(session.amount)}</b>
    </div>
    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-soft); padding-bottom: 8px; margin-bottom: 8px;">
      <span>Bar summasi:</span> <b>${formatMoney(session.barAmount)}</b>
    </div>
    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-soft); padding-bottom: 8px; margin-bottom: 16px;">
      <span>To'lov usuli:</span> <b>${pm}</b>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: var(--green-avail);">
      <span>Jami to'lov:</span> <span>${formatMoney(session.totalAmount)}</span>
    </div>
    ${session.customerName ? `<div style="margin-top: 16px; font-size: 14px; color: var(--text-dim); text-align: center;">Mijoz: ${escapeHtml(session.customerName)}</div>` : ''}
  `;
  receiptDialogOverlay.classList.add("show");
}

async function renderDailyHistory(dateStr: string) {
  dailyReportWrap.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);">Yuklanmoqda...</div>`;
  
  const [sessions, dailyReports] = await Promise.all([
    loadSessionsByDate(dateStr),
    loadDailyReports(31)
  ]);
  
  activeDailySessions = sessions;
  dailyReportCountLabel.textContent = `${sessions.length} ta o'yin`;
  
  const selectedDate = new Date(dateStr);
  const selYear = selectedDate.getFullYear();
  const selMonth = selectedDate.getMonth() + 1;
  const selDay = selectedDate.getDate();
  
  let monthTotal = 0;
  
  dailyReports.forEach(r => {
    const d = new Date(r.shiftStart);
    if (d.getFullYear() === selYear && d.getMonth() + 1 === selMonth && d.getDate() <= selDay) {
      monthTotal += r.totalRevenue;
    }
  });
  
  const todayDateStr = new Date().toISOString().split("T")[0];
  if (dateStr === todayDateStr) {
    const today = getTodayHistory();
    monthTotal += today.reduce((sum, h) => sum + h.totalAmount, 0);
  }
  
  dailyReportMonthLabel.textContent = `${selDay}-${String(selMonth).padStart(2, "0")}`;
  dailyReportMonthTotal.textContent = formatMoney(monthTotal);

  if (sessions.length === 0) {
    dailyReportWrap.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);">Ushbu sanada o'yinlar yo'q</div>`;
    return;
  }
  
  dailyReportWrap.innerHTML = sessions.map((h, i) => {
    const cardSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#60a5fa" stroke-width="2" style="vertical-align:-3px; margin-left:6px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>';
    const cashSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#34d399" stroke-width="2" style="vertical-align:-3px; margin-left:6px;"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>';
    const userSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    const pm = h.paymentMethod === "card" ? cardSvg : h.paymentMethod === "cash" ? cashSvg : "";
    const cust = h.customerName ? `<div class="hist-summary" style="margin-top:8px; color:var(--text-dim); font-size:13px; display:flex; align-items:center;">${userSvg}${escapeHtml(h.customerName)}</div>` : "";
    const timeStr = new Date(h.endedAt).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `
    <div class="history-item daily-hist-item" data-index="${i}" style="cursor: pointer;">
      <div class="hist-top">
        <div class="hist-title">${h.tableId}-stol &middot; ${timeStr}</div>
        <div class="hist-amount">${formatMoney(h.totalAmount)} ${pm}</div>
      </div>
      <div class="hist-bot" style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div style="margin-bottom:4px;">Davomiylik: ${formatDuration(h.durationMs)}</div>
          ${cust}
        </div>
      </div>
    </div>
  `;
  }).join("");

  dailyReportWrap.querySelectorAll(".daily-hist-item").forEach(item => {
    item.addEventListener("click", (e) => {
      const idx = parseInt((e.currentTarget as HTMLElement).dataset.index || "0", 10);
      const session = activeDailySessions[idx];
      if (session) {
        openReceipt(session);
      }
    });
  });
}

dailyReportDate.addEventListener("change", (e) => {
  renderDailyHistory((e.target as HTMLInputElement).value);
});

// History

function renderHistory() {
  if (!dailyReportDate.value) {
    const today = new Date().toISOString().split("T")[0];
    dailyReportDate.value = today;
    renderDailyHistory(today);
  } else {
    renderDailyHistory(dailyReportDate.value);
  }

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
        const cardSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#60a5fa" stroke-width="2" style="vertical-align:-3px; margin-left:6px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;
        const cashSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#34d399" stroke-width="2" style="vertical-align:-3px; margin-left:6px;"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`;
        const userSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        const trashSvg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

        const pm = h.paymentMethod === "card" ? cardSvg : h.paymentMethod === "cash" ? cashSvg : "";
        const cust = h.customerName ? `<div class="hist-summary" style="margin-top:8px; color:var(--text-dim); font-size:13px; display:flex; align-items:center;">${userSvg}${escapeHtml(h.customerName)}</div>` : "";
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
          <div class="hist-bot" style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
              <div style="margin-bottom:4px;">Davomiylik: ${formatDuration(h.durationMs)}</div>
              ${cust}
            </div>
            <button class="delete-history-btn" data-id="${h.id}" style="background:rgba(239, 68, 68, 0.1);border:none;color:var(--red-occ-soft);padding:8px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;">${trashSvg}</button>
          </div>
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
  Promise.all([loadMonthlyReports(), loadDailyReports(31)]).then(([reports, dailyReports]) => {
    let html = "";
    
    // Calculate current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    let currentMonthSessions = 0;
    let currentMonthRevenue = 0;
    let workingDays = 0;
    
    const currentMonthDaily = dailyReports.filter(r => {
      const d = new Date(r.shiftStart);
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
    });
    
    currentMonthDaily.forEach(r => {
      currentMonthSessions += r.totalSessions;
      currentMonthRevenue += r.totalRevenue;
      workingDays++;
    });
    
    const today = getTodayHistory();
    if (today.length > 0) {
      workingDays++;
      currentMonthSessions += today.length;
      today.forEach(s => {
        currentMonthRevenue += s.totalAmount;
      });
    }

    if (currentMonthSessions > 0) {
       html += `
        <div class="history-item" style="border-color: var(--accent); box-shadow: 0 0 10px rgba(59, 130, 246, 0.1);">
          <div class="hist-top">
            <div class="hist-title" style="color:var(--accent);">Joriy oy (${currentYear}-${String(currentMonth).padStart(2, "0")})</div>
            <div class="hist-amount" style="color:var(--green-avail);">${formatMoney(currentMonthRevenue)}</div>
          </div>
          <div class="hist-bot">
            <span>O'yinlar: ${currentMonthSessions} ta</span>
            <span>${workingDays} ish kuni</span>
          </div>
        </div>
      `;
    }

    if (reports.length > 0) {
      html += reports.map(r => `
        <div class="history-item">
          <div class="hist-top">
            <div class="hist-title" style="color:var(--gold-soft);">${r.reportLabel}</div>
            <div class="hist-amount" style="color:var(--green-avail);">${formatMoney(r.totalRevenue)}</div>
          </div>
          <div class="hist-bot">
            <span>O'yinlar: ${r.totalSessions} ta</span>
            <span>${r.workingDays} ish kuni</span>
          </div>
        </div>
      `).join("");
    }

    if (!html) {
      monthlyArchiveList.innerHTML = `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <div>Arxivlar topilmadi.</div>
      </div>`;
    } else {
      monthlyArchiveList.innerHTML = html;
    }
  }).catch((err) => {
    console.error("Arxivlarni yuklashda xatolik (Oflayn bo'lishingiz mumkin):", err);
    monthlyArchiveList.innerHTML = `<div class="empty-state">
      <div>Oflayn rejim. Ma'lumotlarni yuklab bo'lmadi.</div>
    </div>`;
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
  (document.getElementById("sheetCustomTotalAmount") as HTMLInputElement).value = "";

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

const customTotalInput = document.getElementById("sheetCustomTotalAmount") as HTMLInputElement;
if (customTotalInput) {
  customTotalInput.addEventListener("input", (e) => {
    let val = (e.target as HTMLInputElement).value.replace(/\D/g, "");
    if (val) {
      (e.target as HTMLInputElement).value = parseInt(val, 10).toLocaleString("ru-RU").replace(/\s/g, " ");
    } else {
      (e.target as HTMLInputElement).value = "";
    }
  });
  // Enter — To'lovni tasdiqlash
  customTotalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter")
      (document.getElementById("sheetConfirmBtn") as HTMLButtonElement)?.click();
  });
}

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

    const customAmountStr = (
      document.getElementById("sheetCustomTotalAmount") as HTMLInputElement
    ).value.replace(/\s/g, "");
    const customAmountVal = customAmountStr ? parseInt(customAmountStr, 10) : NaN;
    const finalTotalAmount = !isNaN(customAmountVal) ? customAmountVal : (gameAmount + barAmount);

    const custName = table.customerName || "";

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
      totalAmount: finalTotalAmount,
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

let selectedTableForBar: number | null = null;

function updateBarSellView() {
  const container = document.getElementById("barOrderTableSelect") as HTMLElement;
  container.innerHTML = "";
  const occupiedTables = state.tables.filter((t) => t.occupied);
  
  if (occupiedTables.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 10px;">Barcha stollar bo'sh</div>`;
    selectedTableForBar = null;
  } else {
    if (!selectedTableForBar || !occupiedTables.find(t => t.id === selectedTableForBar)) {
      selectedTableForBar = occupiedTables[0].id;
    }
    occupiedTables.forEach((t) => {
      const chip = document.createElement("div");
      chip.className = "table-chip";
      if (t.id === selectedTableForBar) chip.classList.add("active");
      chip.textContent = `${t.id}-stol`;
      chip.addEventListener("click", () => {
        selectedTableForBar = t.id;
        updateBarSellView();
      });
      container.appendChild(chip);
    });
  }

  currentBarDraft = {};
  renderBarSellList();
}

function renderBarSellList() {
  const list = document.getElementById("barOrderItems") as HTMLElement;
  const stickyPanel = document.getElementById("barStickyPanel") as HTMLElement;
  const activeItems = state.barItems.filter((i) => i.isActive);

  if (activeItems.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
          <line x1="6" y1="1" x2="6" y2="4"/>
          <line x1="10" y1="1" x2="10" y2="4"/>
          <line x1="14" y1="1" x2="14" y2="4"/>
        </svg>
        <div>Mahsulotlar yo'q. "Menyu" bo'limida qo'shing.</div>
      </div>`;
    (document.getElementById("barOrderTotalAmount") as HTMLElement).textContent = "0 so'm";
    if (stickyPanel) stickyPanel.style.display = 'none';
    return;
  }
  
  if (stickyPanel) stickyPanel.style.display = 'block';

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
  if (selectedTableForBar === null) return;
  const tid = selectedTableForBar;
  const table = state.tables.find((t) => t.id === tid);
  if (!table) return;

  const activeItems = state.barItems.filter((i) => i.isActive);
  let hasOrder = false;
  for (const itemId in currentBarDraft) {
    const qty = currentBarDraft[itemId];
    if (qty > 0) {
      hasOrder = true;
      const item = activeItems.find((i) => i.id === itemId);
      if (item) {
        const existing = table.barOrders.find((o) => o.itemId === itemId);
        if (existing) {
          existing.qty += qty;
        } else {
          table.barOrders.push({
            itemId,
            name: item.name,
            price: item.price,
            qty,
          });
        }
      }
    }
  }

  if (hasOrder) {
    saveState();
    showDialog({ type: "alert", message: "Sotildi!" });
    updateBarSellView();
    onRender();
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

// Bar menyu — Enter bilan qo'shish
["barItemName", "barItemPrice"].forEach((id) => {
  document.getElementById(id)?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter")
      (document.getElementById("addBarItemBtn") as HTMLButtonElement)?.click();
  });
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

// Sozlamalar — Enter bilan saqlash
hourlyRateInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") (document.getElementById("saveRateBtn") as HTMLButtonElement)?.click();
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
checkAuth();
