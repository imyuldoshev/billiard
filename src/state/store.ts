import type { AppState, Session } from '../types';

export const TABLE_COUNT = 4;
export const DAILY_REVENUE_PERIOD_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'bilyard-klub-state-v3';

export const state: AppState & {
  dailyRevenueResetAtByDate: Record<string, number>;
  dailyRevenuePeriodStartedAt: number | null;
} = {
  hourlyRate: 30000,
  tables: Array.from({ length: TABLE_COUNT }, (_, i) => ({
    id: i + 1,
    occupied: false,
    startTime: null,
    customerName: null,
    customRate: null,
    isPaused: false,
    pauseStartTime: null,
    totalPauseDurationMs: 0,
    barOrders: []
  })),
  history: [],
  barItems: [],
  dailyReports: [],
  monthlyReports: [],
  dailyRevenueResetAtByDate: {},
  dailyRevenuePeriodStartedAt: null
};

export function loadState(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.hourlyRate === 'number') state.hourlyRate = parsed.hourlyRate;
        if (Array.isArray(parsed.tables) && parsed.tables.length === TABLE_COUNT) {
          state.tables = parsed.tables;
        }
        if (Array.isArray(parsed.history)) state.history = parsed.history;
        if (Array.isArray(parsed.barItems)) state.barItems = parsed.barItems;
        if (parsed.dailyRevenueResetAtByDate && typeof parsed.dailyRevenueResetAtByDate === 'object') {
          state.dailyRevenueResetAtByDate = parsed.dailyRevenueResetAtByDate;
        }
        if (typeof parsed.dailyRevenuePeriodStartedAt === 'number') {
          state.dailyRevenuePeriodStartedAt = parsed.dailyRevenuePeriodStartedAt;
        }
      }
    }
  } catch (e) {
    console.error('Holatni yuklashda xatolik:', e);
  }
}

export function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Holatni saqlashda xatolik:', e);
  }
}

function isSameDay(msA: number | string, msB: number | string) {
  const a = new Date(msA), b = new Date(msB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getDateKey(ms: number) {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

import { getCurrentShiftStart, getCurrentShiftEnd } from '../lib/calculations';

export function getTodayHistory(): Session[] {
  const shiftStart = getCurrentShiftStart();
  const shiftEnd = getCurrentShiftEnd(shiftStart);
  return state.history.filter(h => {
    const endMs = new Date(h.endedAt).getTime();
    return endMs >= shiftStart && endMs < shiftEnd;
  });
}

export function computeDailyRevenue() {
  return getTodayHistory().reduce((sum, h) => sum + h.totalAmount, 0);
}

export function getMonthHistory(monthValue: string): Session[] {
  const [year, month] = monthValue.split('-').map(Number);
  return state.history.filter(h => {
    const date = new Date(h.endedAt);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });
}

export function computeMonthlyRevenue(monthValue: string) {
  return getMonthHistory(monthValue).reduce((sum, h) => sum + h.amount, 0);
}
