import { state } from "../state/store";
import {
  formatMoney,
  formatDuration,
  getEffectiveDuration,
  calcCost,
} from "../lib/calculations";
import { startTable, togglePause, openCheckoutCallback } from "./tableActions";

let modalTimerInterval: number | null = null;

export function openTableModal(tableId: number, onRender: () => void) {
  const table = state.tables.find((t) => t.id === tableId);
  if (!table) return;

  const overlay = document.getElementById("tableModalOverlay");
  const content = document.getElementById("tableModalContent");
  if (!overlay || !content) return;

  content.innerHTML = "";
  stopModalTimer();

  if (!table.occupied) {
    // Bo'sh stol modali
    const title = document.createElement("h3");
    title.style.margin = "0 0 16px 0";
    title.textContent = `${table.id}-stol`;

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "field-input";
    nameInput.style.width = "100%";
    nameInput.style.marginBottom = "12px";
    nameInput.placeholder = "Mijoz ismi (ixtiyoriy)";

    const rateToggle = document.createElement("button");
    rateToggle.type = "button";
    rateToggle.className = "custom-rate-toggle";
    rateToggle.style.marginBottom = "12px";
    rateToggle.textContent = "Bu stol uchun maxsus narx";

    const rateInputField = document.createElement("input");
    rateInputField.type = "number";
    rateInputField.className = "field-input";
    rateInputField.style.width = "100%";
    rateInputField.style.marginBottom = "12px";
    rateInputField.placeholder = `Standart: ${state.hourlyRate}`;
    rateInputField.min = "0";
    rateInputField.step = "1000";
    rateInputField.style.display = "none";

    rateToggle.addEventListener("click", () => {
      const showing = rateInputField.style.display !== "none";
      rateInputField.style.display = showing ? "none" : "block";
      rateToggle.textContent = showing
        ? "Bu stol uchun maxsus narx"
        : "Maxsus narxni bekor qilish";
      if (showing) rateInputField.value = "";
    });

    const startBtn = document.createElement("button");
    startBtn.className = "btn btn-start";
    startBtn.style.width = "100%";
    startBtn.textContent = "Boshlash";
    startBtn.addEventListener("click", () => {
      const customerName = nameInput.value.trim();
      const rateVal = parseFloat(rateInputField.value);
      const customRate =
        rateInputField.style.display !== "none" &&
        !isNaN(rateVal) &&
        rateVal >= 0
          ? rateVal
          : null;

      startTable(table.id, customerName, customRate, onRender);
      closeTableModal();
    });

    content.appendChild(title);
    content.appendChild(nameInput);
    content.appendChild(rateToggle);
    content.appendChild(rateInputField);
    content.appendChild(startBtn);
  } else {
    // Band stol modali
    const title = document.createElement("h3");
    title.style.margin = "0 0 16px 0";
    title.textContent = `${table.id}-stol — ${table.isPaused ? "Pauza" : "Band"}`;

    if (table.customerName) {
      const custName = document.createElement("div");
      custName.style.fontSize = "14px";
      custName.style.color = "var(--cream-dim)";
      custName.style.marginBottom = "8px";
      custName.textContent = `Mijoz: ${table.customerName}`;
      content.appendChild(custName);
    }

    const timerWrapper = document.createElement("div");
    timerWrapper.style.display = "flex";
    timerWrapper.style.justifyContent = "space-between";
    timerWrapper.style.alignItems = "center";
    timerWrapper.style.marginBottom = "16px";
    timerWrapper.style.paddingBottom = "16px";
    timerWrapper.style.borderBottom = "1px solid rgba(255,255,255,0.1)";

    const timerDisplay = document.createElement("div");
    timerDisplay.className = "timer-display";
    timerDisplay.style.fontSize = "24px";

    const costDisplay = document.createElement("div");
    costDisplay.className = "cost-display";
    costDisplay.style.textAlign = "right";

    timerWrapper.appendChild(timerDisplay);
    timerWrapper.appendChild(costDisplay);

    let barTotal = 0;
    if (table.barOrders && table.barOrders.length > 0) {
      const barInfo = document.createElement("div");
      barInfo.style.marginBottom = "16px";
      barInfo.style.fontSize = "14px";

      const barList = table.barOrders
        .map(
          (o) =>
            `<div style="display:flex; justify-content:space-between; margin-bottom:4px; color:var(--cream-dim);"><span>${o.name} (x${o.qty})</span><span>${formatMoney(o.price * o.qty)}</span></div>`,
        )
        .join("");

      barTotal = table.barOrders.reduce((sum, o) => sum + o.price * o.qty, 0);
      barInfo.innerHTML = `
        <div style="font-weight:600; margin-bottom:8px;">Bar buyurtmalari:</div>
        ${barList}
        <div style="display:flex; justify-content:space-between; margin-top:8px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:8px;">
          <b>Jami bar:</b> <b style="color:var(--gold-soft);">${formatMoney(barTotal)}</b>
        </div>
      `;
      content.appendChild(barInfo);
    }

    const updateTimerAndCost = () => {
      const durationMs = getEffectiveDuration(table);
      const rate = table.customRate ?? state.hourlyRate;

      if (table.isPaused) {
        timerDisplay.innerHTML = `<span style="color:var(--gold-soft);">${formatDuration(durationMs)}</span>`;
      } else {
        timerDisplay.textContent = formatDuration(durationMs);
      }

      costDisplay.innerHTML =
        `O'yin: <b style="color:var(--cream);">${formatMoney(calcCost(durationMs, rate))}</b>` +
        (table.customRate
          ? `<br><span class="custom-tag" style="font-size:11px; color:var(--gold-soft);">(maxsus narx)</span>`
          : "");
    };

    updateTimerAndCost();

    if (!table.isPaused) {
      modalTimerInterval = window.setInterval(updateTimerAndCost, 1000);
    }

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "8px";
    btnRow.style.flexDirection = "column";

    const addBarDiv = document.createElement("div");
    addBarDiv.style.marginTop = "16px";
    addBarDiv.style.paddingTop = "16px";
    addBarDiv.style.borderTop = "1px dashed rgba(255,255,255,0.1)";

    const addBarTitle = document.createElement("div");
    addBarTitle.style.fontWeight = "600";
    addBarTitle.style.marginBottom = "8px";
    addBarTitle.style.fontSize = "14px";
    addBarTitle.textContent = "Bardan sotish:";

    const addBarControls = document.createElement("div");
    addBarControls.style.display = "flex";
    addBarControls.style.gap = "8px";

    const barSelect = document.createElement("select");
    barSelect.className = "field-input";
    barSelect.style.flex = "1";

    const activeItems = state.barItems.filter((i) => i.isActive);
    if (activeItems.length > 0) {
      activeItems.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = `${item.name} (${formatMoney(item.price)})`;
        barSelect.appendChild(opt);
      });
    } else {
      const opt = document.createElement("option");
      opt.textContent = "Mahsulotlar yo'q";
      opt.disabled = true;
      barSelect.appendChild(opt);
    }

    const barAddBtn = document.createElement("button");
    barAddBtn.className = "btn btn-confirm";
    barAddBtn.style.width = "auto";
    barAddBtn.textContent = "Qo'shish";
    barAddBtn.disabled = activeItems.length === 0;

    barAddBtn.addEventListener("click", () => {
      const itemId = barSelect.value;
      const item = activeItems.find((i) => i.id === itemId);
      if (item) {
        const existing = table.barOrders.find((o) => o.itemId === itemId);
        if (existing) {
          existing.qty += 1;
        } else {
          table.barOrders.push({
            itemId,
            name: item.name,
            price: item.price,
            qty: 1,
          });
        }
        import("../state/store").then(({ saveState }) => saveState());
        openTableModal(table.id, onRender); // Qayta render qilish
        onRender();
      }
    });

    addBarControls.appendChild(barSelect);
    addBarControls.appendChild(barAddBtn);
    addBarDiv.appendChild(addBarTitle);
    addBarDiv.appendChild(addBarControls);

    const actionRow = document.createElement("div");
    actionRow.style.display = "flex";
    actionRow.style.gap = "8px";

    const pauseBtn = document.createElement("button");
    pauseBtn.className = "btn btn-pause";
    pauseBtn.style.flex = "1";
    pauseBtn.textContent = table.isPaused ? "▶ Davom" : "⏸ Pauza";
    pauseBtn.addEventListener("click", () => {
      togglePause(table.id, onRender);
      openTableModal(table.id, onRender); // Re-render
    });

    const stopBtn = document.createElement("button");
    stopBtn.className = "btn btn-stop";
    stopBtn.style.flex = "1";
    stopBtn.textContent = "⏹ To'xtatish";
    stopBtn.addEventListener("click", () => {
      closeTableModal();
      if (openCheckoutCallback) openCheckoutCallback(table.id);
    });

    actionRow.appendChild(pauseBtn);
    actionRow.appendChild(stopBtn);

    btnRow.appendChild(actionRow);

    content.appendChild(timerWrapper);
    content.appendChild(addBarDiv);
    content.appendChild(btnRow);
  }

  overlay.classList.add("open");
}

export function closeTableModal() {
  const overlay = document.getElementById("tableModalOverlay");
  if (overlay) overlay.classList.remove("open");
  stopModalTimer();
}

function stopModalTimer() {
  if (modalTimerInterval !== null) {
    clearInterval(modalTimerInterval);
    modalTimerInterval = null;
  }
}

document
  .getElementById("tableModalClose")
  ?.addEventListener("click", closeTableModal);
