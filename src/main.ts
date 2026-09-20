import { state, loadState, saveState, getTodayHistory, TABLE_COUNT } from './state/store';
import { calcCost, formatDuration, formatMoney, formatDateTime, getEffectiveDuration, getCurrentShiftStart } from './lib/calculations';
import { loadSessionsFromSupabase, saveSessionToSupabase, deleteSessionFromSupabase } from './api/sessions';
import { openBarSettings } from './ui/renderBarSettings';
import { loadBarItems, saveBarOrders } from './api/bar';
import { renderGrid } from './ui/renderGrid';
import { setOpenCheckoutCallback } from './ui/tableActions';
import { renderStats } from './ui/renderHeader';
import { openDailyArchive, openMonthlyArchive } from './ui/renderReports';
import { checkAndArchiveShift, checkAndArchiveMonth } from './lib/archivation';
import type { Session } from './types';

const grid = document.getElementById('tablesGrid') as HTMLElement;
const dailyRevenueEl = document.getElementById('dailyRevenue') as HTMLElement;

const occupiedCountEl = document.getElementById('occupiedCount') as HTMLElement;
const rateInput = document.getElementById('hourlyRate') as HTMLInputElement;
const saveNote = document.getElementById('saveNote') as HTMLElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const modalOverlay = document.getElementById('modalOverlay') as HTMLElement;
const modalTableName = document.getElementById('modalTableName') as HTMLElement;
const modalCustomerRow = document.getElementById('modalCustomerRow') as HTMLElement;
const modalCustomerName = document.getElementById('modalCustomerName') as HTMLElement;
const modalDuration = document.getElementById('modalDuration') as HTMLElement;
const modalAmount = document.getElementById('modalAmount') as HTMLElement;
const cancelPaymentBtn = document.getElementById('cancelPaymentBtn') as HTMLButtonElement;

const barSettingsBtn = document.getElementById('barSettingsBtn') as HTMLButtonElement;
barSettingsBtn.addEventListener('click', openBarSettings);
const totalCountLabel = document.getElementById('totalCountLabel') as HTMLElement;
const historyWrap = document.getElementById('historyWrap') as HTMLElement;
const historyCountLabel = document.getElementById('historyCountLabel') as HTMLElement;



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
  if (todayHistory.length === 0) {
    historyWrap.innerHTML = `
      <div class="history-empty">
        <svg class="history-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <div class="history-empty-text">Bugun hali o'yinlar yo'q.</div>
      </div>
    `;
    return;
  }
  const sorted = [...todayHistory].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  const rowsHtml = sorted.map(h => {
    const pm = h.paymentMethod === 'card' ? '💳' : (h.paymentMethod === 'cash' ? '💵' : '');
    return `
    <tr>
      <td class="tname">${h.tableId}-stol</td>
      <td>${h.customerName ? escapeHtml(h.customerName) : '—'}</td>
      <td>${formatDateTime(new Date(h.endedAt).getTime())}</td>
      <td>${formatDuration(h.durationMs)}</td>
      <td class="num">${formatMoney(h.totalAmount)} ${pm}</td>
      <td style="text-align: right;">
        <button class="delete-history-btn" data-id="${h.id}" title="O'chirish" style="background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0.6;">🗑</button>
      </td>
    </tr>
  `}).join('');
  historyWrap.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Stol</th><th>Mijoz</th><th>Tugash vaqti</th><th>Davomiylik</th><th class="num">Summa</th><th></th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  historyWrap.querySelectorAll('.delete-history-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id;
      if (!id) return;
      if (!confirm('Rostdan ham ushbu yozuvni o\'chirmoqchimisiz?')) return;
      const success = await deleteSessionFromSupabase(id);
      if (success) {
        state.history = state.history.filter(s => s.id !== id);
        saveState();
        updateStats();
        renderHistory();
      }
    });
  });
}

function escapeHtml(str: string) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

setOpenCheckoutCallback((id: number) => {
  const table = state.tables.find(t => t.id === id);
  if (!table || !table.occupied || !table.startTime) return;
  
  // To'xtatganda, agar pauzada bo'lsa, uni to'xtatish (resume logic only internally for calculation)
  let extraPause = 0;
  if (table.isPaused && table.pauseStartTime) {
    extraPause = Date.now() - new Date(table.pauseStartTime).getTime();
  }
  const totalPauseDurationMs = table.totalPauseDurationMs + extraPause;

  const durationMs = getEffectiveDuration(table);
  const rate = table.customRate ?? state.hourlyRate;
  const gameAmount = calcCost(durationMs, rate);
  
  let barAmount = 0;
  if (table.barOrders && table.barOrders.length > 0) {
    barAmount = table.barOrders.reduce((sum, o) => sum + (o.price * o.qty), 0);
  }
  const totalAmount = gameAmount + barAmount;

  pendingCheckout = { 
    tableId: id, customerName: table.customerName, durationMs, 
    amount: gameAmount, barAmount, startedAt: table.startTime, 
    pauseDurationMs: totalPauseDurationMs 
  };

  modalTableName.textContent = `${id}-stol`;
  if (table.customerName) {
    modalCustomerRow.style.display = 'flex';
    modalCustomerName.textContent = table.customerName;
  } else {
    modalCustomerRow.style.display = 'none';
  }
  modalDuration.textContent = formatDuration(durationMs);
  
  const pauseRow = document.getElementById('modalPauseRow');
  const pauseDur = document.getElementById('modalPauseDuration');
  if (pauseRow && pauseDur) {
    if (totalPauseDurationMs > 0) {
      pauseRow.style.display = 'flex';
      pauseDur.textContent = formatDuration(totalPauseDurationMs);
    } else {
      pauseRow.style.display = 'none';
    }
  }

  const gameCostRow = document.getElementById('modalGameCostRow');
  const gameCostEl = document.getElementById('modalGameCost');
  const barCostRow = document.getElementById('modalBarCostRow');
  const barCostEl = document.getElementById('modalBarCost');
  
  if (gameCostRow && gameCostEl) {
    gameCostEl.textContent = formatMoney(gameAmount);
    gameCostRow.style.display = barAmount > 0 ? 'flex' : 'none'; // Only show breakdown if there's bar cost
  }
  if (barCostRow && barCostEl) {
    if (barAmount > 0) {
      barCostRow.style.display = 'flex';
      barCostEl.textContent = formatMoney(barAmount);
    } else {
      barCostRow.style.display = 'none';
    }
  }

  modalAmount.textContent = formatMoney(totalAmount);
  modalOverlay.classList.add('open');
});

function closeModal() {
  pendingCheckout = null;
  modalOverlay.classList.remove('open');
}

function confirmPayment(method: 'cash' | 'card') {
  if (!pendingCheckout) return;
  const { tableId, amount, customerName, durationMs, startedAt, pauseDurationMs, barAmount } = pendingCheckout;
  const table = state.tables.find(t => t.id === tableId);
  const endedAt = new Date().toISOString();
  let barOrdersToSave: any[] = [];
  if (table) {
    barOrdersToSave = [...table.barOrders];
    table.occupied = false;
    table.startTime = null;
    table.customerName = '';
    table.customRate = null;
    table.isPaused = false;
    table.pauseStartTime = null;
    table.totalPauseDurationMs = 0;
    table.barOrders = [];
  }
  const sessionId = `${tableId}-${new Date(endedAt).getTime()}`;
  const session: Session = { 
    id: sessionId, 
    tableId, 
    customerName, 
    durationMs, 
    amount, 
    startedAt: new Date(isNaN(Number(startedAt)) ? startedAt : Number(startedAt)).toISOString(), 
    endedAt,
    pauseDurationMs: pauseDurationMs || 0,
    barAmount: barAmount || 0,
    totalAmount: amount + (barAmount || 0),
    paymentMethod: method
  };
  state.history.push(session);
  pendingCheckout = null;
  modalOverlay.classList.remove('open');
  saveState();
  renderGrid(grid, updateStats);
  updateStats();
  renderHistory();
  saveSessionToSupabase(session);
  if (barOrdersToSave.length > 0) {
    saveBarOrders(sessionId, barOrdersToSave);
  }
}

const payCashBtn = document.getElementById('payCashBtn') as HTMLButtonElement;
const payCardBtn = document.getElementById('payCardBtn') as HTMLButtonElement;
payCashBtn?.addEventListener('click', () => confirmPayment('cash'));
payCardBtn?.addEventListener('click', () => confirmPayment('card'));
cancelPaymentBtn.addEventListener('click', closeModal);

function exportHistoryToCSV() {
  const header = ['Stol', 'Mijoz', 'Boshlanish', 'Tugash', "Davomiyligi (soniya)", "O'yin summasi", "Bar summasi", "Jami summa", "To'lov usuli"];
  const rows = getTodayHistory().map(h => [
    `${h.tableId}-stol`,
    h.customerName || '',
    new Date(h.startedAt).toLocaleString('uz-UZ'),
    new Date(h.endedAt).toLocaleString('uz-UZ'),
    Math.round(h.durationMs / 1000),
    Math.round(h.amount),
    Math.round(h.barAmount || 0),
    Math.round(h.totalAmount),
    h.paymentMethod === 'card' ? 'Karta' : 'Naqt'
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

exportBtn?.addEventListener('click', exportHistoryToCSV);
const dailyArchiveBtn = document.getElementById('dailyArchiveBtn') as HTMLButtonElement;
const monthlyArchiveBtn = document.getElementById('monthlyArchiveBtn') as HTMLButtonElement;

dailyArchiveBtn?.addEventListener('click', openDailyArchive);
monthlyArchiveBtn?.addEventListener('click', openMonthlyArchive);



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
  const shiftStart = getCurrentShiftStart();
  if (nowDateStr !== lastKnownDateStr) {
    lastKnownDateStr = nowDateStr;
    updateStats();
    renderHistory();
  }
  if (shiftStart !== lastRevenuePeriodStart) {
    lastRevenuePeriodStart = shiftStart;
    updateStats();
    renderHistory();
  }
  state.tables.forEach(t => {
    if (t.occupied && t.startTime) {
      const el = grid.querySelector(`.table-card[data-id="${t.id}"]`);
      if (!el) return;
      const rate = t.customRate ?? state.hourlyRate;
      const durationMs = getEffectiveDuration(t);
      const timerEl = el.querySelector('[data-role="timer"]');
      const costEl = el.querySelector('[data-role="cost"]');
      if (timerEl) {
        if (t.isPaused) {
          timerEl.innerHTML = `<span style="color:var(--gold-soft);">${formatDuration(durationMs)}</span>`;
        } else {
          timerEl.textContent = formatDuration(durationMs);
        }
      }
      if (costEl) {
        costEl.innerHTML = `Joriy narx: <b>${formatMoney(calcCost(durationMs, rate))}</b>` + (t.customRate ? `<span class="custom-tag">(maxsus narx)</span>` : '');
      }
    }
  });
}

// Init
async function initApp() {
  loadState();
  await checkAndArchiveShift();
  await checkAndArchiveMonth();
  const bItems = await loadBarItems();
  if (bItems.length > 0) {
    state.barItems = bItems;
    saveState();
  }
  rateInput.value = state.hourlyRate.toString();
  renderGrid(grid, updateStats);
  updateStats();
  renderHistory();
  tick();

  loadSessionsFromSupabase(() => {
    updateStats();
    renderHistory();
  });
}

initApp();

setInterval(tick, 1000);
setInterval(() => {
  loadSessionsFromSupabase(() => {
    updateStats();
    renderHistory();
  });
}, 60000);
