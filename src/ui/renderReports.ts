import { loadDailyReports, loadMonthlyReports } from "../api/reports";
import { formatMoney } from "../lib/calculations";

const dailyOverlay = document.getElementById(
  "dailyArchiveOverlay",
) as HTMLElement;
const monthlyOverlay = document.getElementById(
  "monthlyArchiveOverlay",
) as HTMLElement;
const dailyList = document.getElementById("dailyArchiveList") as HTMLElement;
const monthlyList = document.getElementById(
  "monthlyArchiveList",
) as HTMLElement;

document
  .getElementById("closeDailyArchiveBtn")
  ?.addEventListener("click", () => dailyOverlay.classList.remove("open"));
document
  .getElementById("closeMonthlyArchiveBtn")
  ?.addEventListener("click", () => monthlyOverlay.classList.remove("open"));

export async function openDailyArchive() {
  dailyOverlay.classList.add("open");
  dailyList.innerHTML = `<div style="padding: 20px;">Yuklanmoqda...</div>`;
  const reports = await loadDailyReports();
  if (reports.length === 0) {
    dailyList.innerHTML = `<div style="padding: 20px; color: var(--cream-dim);">Arxivlar topilmadi.</div>`;
    return;
  }

  dailyList.innerHTML = reports
    .map(
      (r) => `
    <div style="min-width: 200px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-soft); border-radius: 12px; padding: 12px; font-size: 13px;">
      <div style="font-weight: bold; color: var(--gold-soft); margin-bottom: 8px;">${r.reportDate}</div>
      <div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span>O'yinlar:</span> <b style="color:var(--cream);">${r.totalSessions} ta</b></div>
      <div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span>O'yin daromadi:</span> <b style="color:var(--cream);">${formatMoney(r.gameRevenue)}</b></div>
      <div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span>Bar daromadi:</span> <b style="color:var(--cream);">${formatMoney(r.barRevenue)}</b></div>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
      <div style="display:flex; justify-content:space-between; margin-bottom: 4px; font-weight: bold; color:var(--green-avail);"><span>JAMI:</span> <span>${formatMoney(r.totalRevenue)}</span></div>
      <div style="display:flex; justify-content:space-between; color: var(--cream-dim); font-size: 11px; margin-top:8px;">
        <span>💵 ${formatMoney(r.cashAmount)}</span>
        <span>💳 ${formatMoney(r.cardAmount)}</span>
      </div>
    </div>
  `,
    )
    .join("");
}

export async function openMonthlyArchive() {
  monthlyOverlay.classList.add("open");
  monthlyList.innerHTML = `<div style="padding: 20px;">Yuklanmoqda...</div>`;
  const reports = await loadMonthlyReports();
  if (reports.length === 0) {
    monthlyList.innerHTML = `<div style="padding: 20px; color: var(--cream-dim);">Arxivlar topilmadi.</div>`;
    return;
  }

  monthlyList.innerHTML = reports
    .map(
      (r) => `
    <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-soft); border-radius: 12px; padding: 12px; font-size: 14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
        <span style="font-weight: bold; color: var(--gold-soft); font-size: 16px;">${r.reportLabel} (${r.year}-${String(r.month).padStart(2, "0")})</span>
        <span style="color: var(--cream-dim); font-size: 12px;">${r.workingDays} ish kuni</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
        <span>O'yinlar soni:</span> <b style="color:var(--cream);">${r.totalSessions} ta</b>
      </div>
      <div style="display:flex; justify-content:space-between; font-weight: bold;">
        <span>Jami daromad:</span> <span style="color:var(--green-avail);">${formatMoney(r.totalRevenue)}</span>
      </div>
    </div>
  `,
    )
    .join("");
}
