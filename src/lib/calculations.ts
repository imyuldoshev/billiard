export function formatMoney(n: number): string {
  return (
    Math.round(n).toLocaleString("ru-RU").replace(/\s/g, "\u00A0") +
    "\u00A0so'm"
  );
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function calcCost(ms: number, rate: number): number {
  const rawCost = (ms / 3600000) * rate;
  return Math.floor(rawCost / 1000) * 1000;
}

import type { Table } from "../types";

export function getEffectiveDuration(table: Table): number {
  if (!table.startTime) return 0;

  let start = Number(table.startTime);
  if (isNaN(start)) start = new Date(table.startTime).getTime();

  const now = Date.now();
  let duration = now - start - table.totalPauseDurationMs;

  if (table.isPaused && table.pauseStartTime) {
    let pStart = Number(table.pauseStartTime);
    if (isNaN(pStart)) pStart = new Date(table.pauseStartTime).getTime();
    duration -= now - pStart;
  }
  return Math.max(0, duration || 0);
}

// Smena (shift) har doim 09:00 da boshlanadi
export function getCurrentShiftStart(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  const hour = d.getHours();
  // Agar soat 00:00 dan 08:59 gacha bo'lsa, smena kecha 09:00 da boshlangan
  if (hour < 9) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

export function getCurrentShiftEnd(shiftStartMs: number): number {
  const d = new Date(shiftStartMs);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}
