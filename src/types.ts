export type UserRole = 'admin' | 'worker';

export interface BarOrder {
  itemId: string;
  name: string;
  price: number;
  qty: number;
}

export interface BarItem {
  id: string;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
}

export interface Table {
  id: number;
  occupied: boolean;
  startTime: string | null; // ISO string
  customerName: string | null;
  customRate: number | null;
  isPaused: boolean;
  pauseStartTime: string | null; // ISO string
  totalPauseDurationMs: number;
  barOrders: BarOrder[];
}

export interface Session {
  id: string;
  tableId: number;
  customerName: string | null;
  durationMs: number;
  pauseDurationMs: number;
  amount: number;
  barAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | null;
  startedAt: string; // ISO string
  endedAt: string; // ISO string
}

export interface DailyReport {
  id: string;
  reportDate: string; // YYYY-MM-DD
  shiftStart: string; // ISO string
  shiftEnd: string; // ISO string
  totalSessions: number;
  gameRevenue: number;
  barRevenue: number;
  totalRevenue: number;
  cashAmount: number;
  cardAmount: number;
}

export interface MonthlyReport {
  id: string;
  year: number;
  month: number;
  reportLabel: string; // e.g. "Sentabr 2026"
  totalSessions: number;
  totalRevenue: number;
  workingDays: number;
}

export interface AppState {
  hourlyRate: number;
  tables: Table[];
  history: Session[];
  barItems: BarItem[];
  dailyReports: DailyReport[];
  monthlyReports: MonthlyReport[];
}
