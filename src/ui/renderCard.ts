import type { Table } from "../types";
import {
  formatMoney,
  getEffectiveDuration,
  formatDuration,
  calcCost,
} from "../lib/calculations";
import { state } from "../state/store";
import { startTable, openCheckoutCallback } from "./tableActions";

export function buildCard(table: Table, onRender: () => void): HTMLElement {
  const card = document.createElement("div");

  if (!table.occupied) {
    card.className = "table-card empty";
    card.innerHTML = `
      <div class="tc-status-icon">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <div class="tc-number">${table.id}</div>
      <div class="tc-name">${table.id}-stol</div>
      <button class="btn btn-primary" style="margin-top: 8px;">Boshlash</button>
    `;
    const startBtn = card.querySelector(".btn") as HTMLButtonElement;
    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startTable(table.id, "", null, onRender);
    });
  } else {
    card.className = "table-card occupied";
    card.innerHTML = `
      <div class="tc-header">
        <div class="tc-title">${table.id}-stol</div>
      </div>
      <div class="tc-timer" data-role="timer">00:00:00</div>
      <div class="tc-amount" data-role="cost">0 so'm</div>
      <div class="tc-actions">
        <button class="btn btn-secondary btn-bar">+ Bar</button>
        <button class="btn btn-danger btn-stop">To'xtatish</button>
      </div>
    `;

    const timerDisplay = card.querySelector(".tc-timer") as HTMLElement;
    const costDisplay = card.querySelector(".tc-amount") as HTMLElement;

    const update = () => {
      const durationMs = getEffectiveDuration(table);
      const rate = table.customRate ?? state.hourlyRate;
      timerDisplay.textContent = formatDuration(durationMs);

      const gameCost = calcCost(durationMs, rate);
      let barCost = 0;
      if (table.barOrders && table.barOrders.length > 0) {
        barCost = table.barOrders.reduce((sum, o) => sum + o.price * o.qty, 0);
      }

      costDisplay.innerHTML = `<b>${formatMoney(gameCost + barCost)}</b>`;
    };
    update();

    // Use an interval dataset to clear it later if needed, but simple re-renders work too.
    const intervalId = window.setInterval(() => {
      if (!document.body.contains(card)) {
        clearInterval(intervalId);
        return;
      }
      update();
    }, 1000);

    const barBtn = card.querySelector(".btn-bar") as HTMLButtonElement;
    barBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Tab navigation to bar, pre-select table
      document
        .querySelector('[data-target="tab-bar"]')
        ?.dispatchEvent(new Event("click"));
      const select = document.getElementById(
        "barOrderTableSelect",
      ) as HTMLSelectElement;
      if (select) {
        select.value = table.id.toString();
        select.dispatchEvent(new Event("change"));
      }
    });

    const stopBtn = card.querySelector(".btn-stop") as HTMLButtonElement;
    stopBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openCheckoutCallback(table.id);
    });
  }

  return card;
}
