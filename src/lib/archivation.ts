import { state, saveState } from '../state/store';
import { saveDailyReport } from '../api/reports';
import { getCurrentShiftStart, getCurrentShiftEnd } from './calculations';
import type { DailyReport, Session } from '../types';

export async function checkAndArchiveShift() {
  const currentShiftStart = getCurrentShiftStart();
  
  // O'tgan smenalar (hozirgi smenadan oldingi barcha tugagan seanslar)
  const pastSessions = state.history.filter(h => new Date(h.endedAt).getTime() < currentShiftStart);
  if (pastSessions.length === 0) return;

  // Guruhlash: Har bir smena (kun) uchun alohida arxiv
  const byShift: Record<string, Session[]> = {};
  pastSessions.forEach(s => {
    // Seans qaysi smenaga tegishli ekanligini topamiz
    const sTime = new Date(s.endedAt).getTime();
    const shiftStart = getCurrentShiftStart(sTime);
    const dateKey = new Date(shiftStart).toISOString().slice(0, 10);
    if (!byShift[dateKey]) byShift[dateKey] = [];
    byShift[dateKey].push(s);
  });

  for (const dateKey in byShift) {
    const shiftSessions = byShift[dateKey];
    const shiftStartMs = getCurrentShiftStart(new Date(shiftSessions[0].endedAt).getTime());
    const shiftEndMs = getCurrentShiftEnd(shiftStartMs);

    let gameRevenue = 0;
    let barRevenue = 0;
    let cashAmount = 0;
    let cardAmount = 0;

    shiftSessions.forEach(s => {
      gameRevenue += s.amount;
      barRevenue += s.barAmount;
      if (s.paymentMethod === 'card') cardAmount += s.totalAmount;
      else cashAmount += s.totalAmount;
    });

    const report: DailyReport = {
      id: `report-${dateKey}`,
      reportDate: dateKey,
      shiftStart: new Date(shiftStartMs).toISOString(),
      shiftEnd: new Date(shiftEndMs).toISOString(),
      totalSessions: shiftSessions.length,
      gameRevenue,
      barRevenue,
      totalRevenue: gameRevenue + barRevenue,
      cashAmount,
      cardAmount
    };

    // Saqlash (agar bazada bo'lsa xato berishi mumkin, e'tibor bermaymiz)
    await saveDailyReport(report);
  }

  // Local state dan o'tgan smenalarni o'chiramiz va faqat joriy smenani qoldiramiz
  state.history = state.history.filter(h => new Date(h.endedAt).getTime() >= currentShiftStart);
  saveState();
}

import { loadDailyReports, saveMonthlyReport } from '../api/reports';
import type { MonthlyReport } from '../types';

export async function checkAndArchiveMonth() {
  const now = new Date();
  if (now.getDate() === 1) {
    // Kechagi kun qaysi oyga tegishli?
    const yesterday = new Date(now);
    yesterday.setDate(0); // oldingi oyning oxirgi kuni
    const targetYear = yesterday.getFullYear();
    const targetMonth = yesterday.getMonth() + 1; // 1-12
    const reportLabel = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const reportId = `monthly-${reportLabel}`;

    const last30 = await loadDailyReports(31);
    const monthReports = last30.filter(r => {
      const d = new Date(r.shiftStart);
      return d.getFullYear() === targetYear && (d.getMonth() + 1) === targetMonth;
    });

    if (monthReports.length > 0) {
      let totalSessions = 0;
      let totalRevenue = 0;
      monthReports.forEach(r => {
        totalSessions += r.totalSessions;
        totalRevenue += r.totalRevenue;
      });

      const report: MonthlyReport = {
        id: reportId,
        year: targetYear,
        month: targetMonth,
        reportLabel,
        totalSessions,
        totalRevenue,
        workingDays: monthReports.length
      };

      await saveMonthlyReport(report);
    }
  }
}
