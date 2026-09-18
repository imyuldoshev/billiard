import { state, loadState, saveState, getDailyRevenuePeriodStart, getTodayHistory, getMonthHistory, computeMonthlyRevenue, TABLE_COUNT, getDateKey } from './state/store';
import { calcCost, formatDuration, formatMoney, formatDateTime } from './lib/calculations';
import { loadSessionsFromSupabase, saveSessionToSupabase } from './api/sessions';
import { authState, loadAuth, isLoggedIn, setLoggedIn, saveAuth, normalizeAuthValue } from './auth/auth';
import { renderGrid } from './ui/renderGrid';
import { setOpenCheckoutCallback } from './ui/renderCard';
import { renderStats } from './ui/renderHeader';
import type { Session } from './types';

const grid = document.getElementById('tablesGrid') as HTMLElement;
const dailyRevenueEl = document.getElementById('dailyRevenue') as HTMLElement;
const dailyRevenueRefreshBtn = document.getElementById('dailyRevenueRefreshBtn') as HTMLButtonElement;
const occupiedCountEl = document.getElementById('occupiedCount') as HTMLElement;
const rateInput = document.getElementById('hourlyRate') as HTMLInputElement;
const saveNote = document.getElementById('saveNote') as HTMLElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const monthlyReportBtn = document.getElementById('monthlyReportBtn') as HTMLButtonElement;
const monthlyReportOverlay = document.getElementById('monthlyReportOverlay') as HTMLElement;
const reportMonth = document.getElementById('reportMonth') as HTMLInputElement;
const monthlyGames = document.getElementById('monthlyGames') as HTMLElement;
const monthlyRevenue = document.getElementById('monthlyRevenue') as HTMLElement;
const exportMonthlyBtn = document.getElementById('exportMonthlyBtn') as HTMLButtonElement;
const closeMonthlyBtn = document.getElementById('closeMonthlyBtn') as HTMLButtonElement;
const modalOverlay = document.getElementById('modalOverlay') as HTMLElement;
const modalTableName = document.getElementById('modalTableName') as HTMLElement;
const modalCustomerRow = document.getElementById('modalCustomerRow') as HTMLElement;
const modalCustomerName = document.getElementById('modalCustomerName') as HTMLElement;
const modalDuration = document.getElementById('modalDuration') as HTMLElement;
const modalAmount = document.getElementById('modalAmount') as HTMLElement;
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn') as HTMLButtonElement;
const cancelPaymentBtn = document.getElementById('cancelPaymentBtn') as HTMLButtonElement;
const totalCountLabel = document.getElementById('totalCountLabel') as HTMLElement;
const historyWrap = document.getElementById('historyWrap') as HTMLElement;
const historyCountLabel = document.getElementById('historyCountLabel') as HTMLElement;

const loginOverlay = document.getElementById('loginOverlay') as HTMLElement;
const loginUsername = document.getElementById('loginUsername') as HTMLInputElement;
const loginPassword = document.getElementById('loginPassword') as HTMLInputElement;
const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
const loginError = document.getElementById('loginError') as HTMLElement;
const googleDivider = document.getElementById('googleDivider') as HTMLElement;
const googleSignInDiv = document.getElementById('googleSignInDiv') as HTMLElement;
const googleHint = document.getElementById('googleHint') as HTMLElement;

const adminBtn = document.getElementById('adminBtn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
const adminOverlay = document.getElementById('adminOverlay') as HTMLElement;
const adminUsernameInput = document.getElementById('adminUsernameInput') as HTMLInputElement;
const adminPasswordInput = document.getElementById('adminPasswordInput') as HTMLInputElement;
const googleClientIdInput = document.getElementById('googleClientIdInput') as HTMLInputElement;
const adminMsg = document.getElementById('adminMsg') as HTMLElement;
const saveAdminBtn = document.getElementById('saveAdminBtn') as HTMLButtonElement;
const closeAdminBtn = document.getElementById('closeAdminBtn') as HTMLButtonElement;

totalCountLabel.textContent = TABLE_COUNT + ' ta stol';

let pendingCheckout: any = null;
let saveNoteTimeout: any = null;
let lastKnownDateStr = new Date().toDateString();
let lastRevenuePeriodStart: number | null = null;

function updateStats() {
  renderStats(dailyRevenueEl, occupiedCountEl, exportBtn);
}

function renderHistory() {
  const todayHistory = getTodayHistory();
  historyCountLabel.textContent = `${todayHistory.length} ta o'yin`;
  if (!todayHistory.length) {
    historyWrap.innerHTML = `<div class="history-empty">Hozircha yakunlangan o'yinlar yo'q.</div>`;
    return;
  }
  const sorted = [...todayHistory].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  const rowsHtml = sorted.map(h => `
    <tr>
      <td class="tname">${h.tableId}-stol</td>
      <td>${h.customerName ? escapeHtml(h.customerName) : '—'}</td>
      <td>${formatDateTime(new Date(h.endedAt).getTime())}</td>
      <td>${formatDuration(h.durationMs)}</td>
      <td class="num">${formatMoney(h.amount)}</td>
    </tr>
  `).join('');
  historyWrap.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Stol</th><th>Mijoz</th><th>Tugash vaqti</th><th>Davomiylik</th><th class="num">Summa</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

function escapeHtml(str: string) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

setOpenCheckoutCallback((id: number) => {
  const table = state.tables.find(t => t.id === id);
  if (!table || !table.occupied || !table.startTime) return;
  const durationMs = Date.now() - parseInt(table.startTime, 10);
  const rate = table.customRate ?? state.hourlyRate;
  const amount = calcCost(durationMs, rate);
  pendingCheckout = { tableId: id, customerName: table.customerName, durationMs, amount, startedAt: table.startTime };

  modalTableName.textContent = `${id}-stol`;
  if (table.customerName) {
    modalCustomerRow.style.display = 'flex';
    modalCustomerName.textContent = table.customerName;
  } else {
    modalCustomerRow.style.display = 'none';
  }
  modalDuration.textContent = formatDuration(durationMs);
  modalAmount.textContent = formatMoney(amount);
  modalOverlay.classList.add('open');
});

function closeModal() {
  pendingCheckout = null;
  modalOverlay.classList.remove('open');
}

function confirmPayment() {
  if (!pendingCheckout) return;
  const { tableId, amount, customerName, durationMs, startedAt } = pendingCheckout;
  const table = state.tables.find(t => t.id === tableId);
  const endedAt = new Date().toISOString();
  if (table) {
    table.occupied = false;
    table.startTime = null;
    table.customerName = '';
    table.customRate = null;
  }
  const session: Session = { 
    id: `${tableId}-${new Date(endedAt).getTime()}`, 
    tableId, 
    customerName, 
    durationMs, 
    amount, 
    startedAt: new Date(Number(startedAt)).toISOString(), 
    endedAt,
    pauseDurationMs: 0,
    barAmount: 0,
    totalAmount: amount,
    paymentMethod: null
  };
  state.history.push(session);
  pendingCheckout = null;
  modalOverlay.classList.remove('open');
  saveState();
  renderGrid(grid, updateStats);
  updateStats();
  renderHistory();
  saveSessionToSupabase(session);
}

confirmPaymentBtn.addEventListener('click', confirmPayment);
cancelPaymentBtn.addEventListener('click', closeModal);

function exportHistoryToCSV() {
  const header = ['Stol', 'Mijoz', 'Boshlanish', 'Tugash', "Davomiyligi (soniya)", "Summa (so'm)"];
  const rows = getTodayHistory().map(h => [
    `${h.tableId}-stol`,
    h.customerName || '',
    new Date(h.startedAt).toLocaleString('uz-UZ'),
    new Date(h.endedAt).toLocaleString('uz-UZ'),
    Math.round(h.durationMs / 1000),
    Math.round(h.amount)
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bilyard-hisobot-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener('click', exportHistoryToCSV);

dailyRevenueRefreshBtn.addEventListener('click', () => {
  const resetAt = Date.now();
  state.dailyRevenueResetAtByDate[getDateKey(resetAt)] = resetAt;
  state.dailyRevenuePeriodStartedAt = resetAt;
  saveState();
  lastRevenuePeriodStart = resetAt;
  updateStats();
});

monthlyReportBtn.addEventListener('click', () => {
  reportMonth.value = new Date().toISOString().slice(0, 7);
  updateMonthlyReport();
  monthlyReportOverlay.classList.add('open');
});
reportMonth.addEventListener('input', updateMonthlyReport);

function updateMonthlyReport() {
  const rows = getMonthHistory(reportMonth.value);
  monthlyGames.textContent = rows.length.toString();
  monthlyRevenue.textContent = formatMoney(computeMonthlyRevenue(reportMonth.value));
  exportMonthlyBtn.disabled = rows.length === 0;
}

function exportMonthlyHistoryToCSV() {
  const monthValue = reportMonth.value;
  const rows = getMonthHistory(monthValue);
  const header = ['Stol', 'Mijoz', 'Boshlanish', 'Tugash', 'Davomiyligi (soniya)', "Summa (so'm)"];
  const csvRows = rows.map(h => [
    `${h.tableId}-stol`, h.customerName || '', new Date(h.startedAt).toLocaleString('uz-UZ'),
    new Date(h.endedAt).toLocaleString('uz-UZ'), Math.round(h.durationMs / 1000), Math.round(h.amount)
  ]);
  const csv = [header, ...csvRows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bilyard-hisobot-${monthValue}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

exportMonthlyBtn.addEventListener('click', exportMonthlyHistoryToCSV);
closeMonthlyBtn.addEventListener('click', () => monthlyReportOverlay.classList.remove('open'));

// Auth logic
function showLogin() {
  loginOverlay.classList.remove('hidden');
  loginUsername.value = '';
  loginPassword.value = '';
  loginError.textContent = '';
  loginUsername.focus();
  setupGoogleSignIn();
}

function hideLogin() {
  loginOverlay.classList.add('hidden');
}

function attemptLogin() {
  const u = normalizeAuthValue(loginUsername.value);
  const p = normalizeAuthValue(loginPassword.value);
  if (u === normalizeAuthValue(authState.username) && p === normalizeAuthValue(authState.password)) {
    setLoggedIn(true, true);
    hideLogin();
  } else {
    loginError.textContent = "Login yoki parol noto'g'ri";
  }
}

loginBtn.addEventListener('click', attemptLogin);
loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
loginUsername.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

logoutBtn.addEventListener('click', () => {
  setLoggedIn(false);
  showLogin();
});

function decodeGoogleCredential(jwt: string) {
  try {
    const payload = jwt.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
  } catch (e) {
    console.error("Google ma'lumotini o'qishda xatolik:", e);
    return null;
  }
}

function handleGoogleCredentialResponse(response: any) {
  const payload = decodeGoogleCredential(response.credential);
  if (payload && payload.email) {
    setLoggedIn(true, true);
    hideLogin();
  } else {
    loginError.textContent = "Google orqali kirishda xatolik yuz berdi";
  }
}

function setupGoogleSignIn() {
  if (!authState.googleClientId) {
    googleDivider.style.display = 'none';
    googleSignInDiv.style.display = 'none';
    googleHint.textContent = "Google orqali kirish yoqilmagan — Admin sozlamalaridan Client ID kiriting.";
    return;
  }
  if (typeof (window as any).google === 'undefined' || !(window as any).google.accounts || !(window as any).google.accounts.id) {
    googleDivider.style.display = 'none';
    googleSignInDiv.style.display = 'none';
    googleHint.textContent = "Google xizmati yuklanmadi (internet aloqasini tekshiring).";
    return;
  }
  googleDivider.style.display = 'flex';
  googleSignInDiv.style.display = 'flex';
  googleHint.textContent = '';
  try {
    (window as any).google.accounts.id.initialize({
      client_id: authState.googleClientId,
      callback: handleGoogleCredentialResponse
    });
    googleSignInDiv.innerHTML = '';
    (window as any).google.accounts.id.renderButton(googleSignInDiv, { theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'pill' });
  } catch (e) {
    console.error('Google Sign-In sozlashda xatolik:', e);
    googleHint.textContent = "Google orqali kirishni ishga tushirib bo'lmadi (Client ID to'g'riligini tekshiring).";
  }
}

function openAdminPanel() {
  adminUsernameInput.value = authState.username;
  adminPasswordInput.value = '';
  googleClientIdInput.value = authState.googleClientId;
  adminMsg.textContent = '';
  adminMsg.classList.remove('error');
  adminOverlay.classList.add('open');
}

function closeAdminPanel() {
  adminOverlay.classList.remove('open');
}

adminBtn.addEventListener('click', openAdminPanel);
closeAdminBtn.addEventListener('click', closeAdminPanel);

saveAdminBtn.addEventListener('click', () => {
  const newUsername = normalizeAuthValue(adminUsernameInput.value);
  if (!newUsername) {
    adminMsg.textContent = "Login bo'sh bo'lishi mumkin emas";
    adminMsg.classList.add('error');
    return;
  }
  authState.username = newUsername;
  if (adminPasswordInput.value.trim()) authState.password = normalizeAuthValue(adminPasswordInput.value);
  authState.googleClientId = googleClientIdInput.value.trim();
  saveAuth();
  adminMsg.classList.remove('error');
  adminMsg.textContent = 'Saqlandi ✓';
  setTimeout(() => { adminMsg.textContent = ''; }, 1500);
});

function initAuth() {
  loadAuth();
  if (isLoggedIn()) {
    hideLogin();
  } else {
    showLogin();
  }
}

rateInput.addEventListener('input', () => {
  const val = parseFloat(rateInput.value);
  if (!isNaN(val) && val >= 0) {
    state.hourlyRate = val;
    saveState();
    if (saveNoteTimeout) clearTimeout(saveNoteTimeout);
    saveNote.classList.add('show');
    saveNoteTimeout = setTimeout(() => saveNote.classList.remove('show'), 1200);
  }
});

function tick() {
  const nowDateStr = new Date().toDateString();
  const revenuePeriodStart = getDailyRevenuePeriodStart();
  if (nowDateStr !== lastKnownDateStr) {
    lastKnownDateStr = nowDateStr;
    updateStats();
    renderHistory();
  }
  if (revenuePeriodStart !== lastRevenuePeriodStart) {
    lastRevenuePeriodStart = revenuePeriodStart;
    updateStats();
  }
  state.tables.forEach(t => {
    if (t.occupied && t.startTime) {
      const el = grid.querySelector(`.table-card[data-id="${t.id}"]`);
      if (!el) return;
      const rate = t.customRate ?? state.hourlyRate;
      const durationMs = Date.now() - parseInt(t.startTime, 10);
      const timerEl = el.querySelector('[data-role="timer"]');
      const costEl = el.querySelector('[data-role="cost"]');
      if (timerEl) timerEl.textContent = formatDuration(durationMs);
      if (costEl) {
        costEl.innerHTML = `Joriy narx: <b>${formatMoney(calcCost(durationMs, rate))}</b>` + (t.customRate ? `<span class="custom-tag">(maxsus narx)</span>` : '');
      }
    }
  });
}

// Init
initAuth();
loadState();
rateInput.value = state.hourlyRate.toString();
renderGrid(grid, updateStats);
updateStats();
renderHistory();
tick();

loadSessionsFromSupabase(() => {
  updateStats();
  renderHistory();
});

setInterval(tick, 1000);
setInterval(() => {
  loadSessionsFromSupabase(() => {
    updateStats();
    renderHistory();
  });
}, 60000);
