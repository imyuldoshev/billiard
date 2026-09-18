import { TABLE_COUNT, state, computeDailyRevenue, getTodayHistory } from '../state/store';
import { formatMoney } from '../lib/calculations';

export function renderStats(dailyRevenueEl: HTMLElement, occupiedCountEl: HTMLElement, exportBtn: HTMLButtonElement) {
  dailyRevenueEl.textContent = formatMoney(computeDailyRevenue());
  const occ = state.tables.filter(t => t.occupied).length;
  occupiedCountEl.textContent = `${occ} / ${TABLE_COUNT}`;
  exportBtn.disabled = getTodayHistory().length === 0;
}
