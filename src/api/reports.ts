import { supabase } from "../lib/supabase";
import type { DailyReport, MonthlyReport } from "../types";

export async function saveDailyReport(report: DailyReport) {
  const userId = localStorage.getItem("currentUser");
  if (!userId) return;
  
  if (
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_URL.startsWith("http")
  )
    return;
  const { error } = await supabase.from("daily_reports").upsert({
    id: report.id + "-" + userId, // make id unique per user
    report_date: report.reportDate,
    shift_start: new Date(report.shiftStart).toISOString(),
    shift_end: new Date(report.shiftEnd).toISOString(),
    total_sessions: report.totalSessions,
    game_revenue: report.gameRevenue,
    bar_revenue: report.barRevenue,
    total_revenue: report.totalRevenue,
    cash_amount: report.cashAmount,
    card_amount: report.cardAmount,
    user_id: userId,
  });
  if (error) console.error("Kunlik arxivni saqlashda xatolik:", error);
}

export async function loadDailyReports(
  limit: number = 30,
): Promise<DailyReport[]> {
  const userId = localStorage.getItem("currentUser");
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", userId)
    .order("report_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Kunlik arxivlarni yuklashda xatolik:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    reportDate: row.report_date,
    shiftStart: row.shift_start,
    shiftEnd: row.shift_end,
    totalSessions: row.total_sessions,
    gameRevenue: Number(row.game_revenue),
    barRevenue: Number(row.bar_revenue),
    totalRevenue: Number(row.total_revenue),
    cashAmount: Number(row.cash_amount),
    cardAmount: Number(row.card_amount),
  }));
}

export async function saveMonthlyReport(report: MonthlyReport) {
  const userId = localStorage.getItem("currentUser");
  if (!userId) return;

  if (
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_URL.startsWith("http")
  )
    return;
  const { error } = await supabase.from("monthly_reports").upsert({
    id: report.id + "-" + userId, // make id unique per user
    year: report.year,
    month: report.month,
    report_label: report.reportLabel,
    total_sessions: report.totalSessions,
    total_revenue: report.totalRevenue,
    working_days: report.workingDays,
    user_id: userId,
  });
  if (error) console.error("Oylik arxivni saqlashda xatolik:", error);
}

export async function loadMonthlyReports(
  limit: number = 12,
): Promise<MonthlyReport[]> {
  const userId = localStorage.getItem("currentUser");
  if (!userId) return [];

  const { data, error } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Oylik arxivlarni yuklashda xatolik:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    year: row.year,
    month: row.month,
    reportLabel: row.report_label,
    totalSessions: row.total_sessions,
    totalRevenue: Number(row.total_revenue),
    workingDays: row.working_days,
  }));
}
