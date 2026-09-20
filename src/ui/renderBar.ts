import { state, saveState } from "../state/store";
import { formatMoney } from "../lib/calculations";
import { showDialog } from "./dialog";

const overlay = document.getElementById("barOrderOverlay") as HTMLElement;
const closeBtn = document.getElementById(
  "cancelBarOrderBtn",
) as HTMLButtonElement;
const confirmBtn = document.getElementById(
  "confirmBarOrderBtn",
) as HTMLButtonElement;
const list = document.getElementById("barOrderItems") as HTMLElement;
const totalLabel = document.getElementById(
  "barOrderTotalAmount",
) as HTMLElement;

let currentDraft: Record<string, number> = {}; // itemId -> quantity
let onConfirmCb: (() => void) | null = null;

export function openBarOrder(onConfirm?: () => void) {
  const select = document.getElementById(
    "barOrderTableSelect",
  ) as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = "";
  const occupiedTables = state.tables.filter((t) => t.occupied);
  if (occupiedTables.length === 0) {
    showDialog({
      type: "alert",
      message: "Barcha stollar bo'sh. Avval stolni boshlang!",
    });
    return;
  }

  occupiedTables.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id.toString();
    opt.textContent = `${t.id}-stol`;
    select.appendChild(opt);
  });

  currentDraft = {};
  onConfirmCb = onConfirm || null;
  renderList();
  overlay.classList.add("open");
}

closeBtn?.addEventListener("click", () => {
  overlay.classList.remove("open");
});

confirmBtn?.addEventListener("click", () => {
  const select = document.getElementById(
    "barOrderTableSelect",
  ) as HTMLSelectElement;
  if (!select || !select.value) return;
  const tid = parseInt(select.value);
  const table = state.tables.find((t) => t.id === tid);
  if (!table) return;

  const activeItems = state.barItems.filter((i) => i.isActive);
  for (const itemId in currentDraft) {
    const qty = currentDraft[itemId];
    if (qty > 0) {
      const item = activeItems.find((i) => i.id === itemId);
      if (item) {
        // Find if already ordered
        const existing = table.barOrders.find((o) => o.itemId === itemId);
        if (existing) {
          existing.qty += qty;
        } else {
          table.barOrders.push({
            itemId,
            name: item.name,
            price: item.price,
            qty,
          });
        }
      }
    }
  }

  saveState();
  if (onConfirmCb) onConfirmCb();
  overlay.classList.remove("open");
});

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderList() {
  if (!list) return;
  const activeItems = state.barItems.filter((i) => i.isActive);
  if (activeItems.length === 0) {
    list.innerHTML = `<div style="text-align: center; padding: 20px;">Mahsulotlar yo'q. Bar boshqaruvidan qo'shing.</div>`;
    updateTotal();
    return;
  }

  // Kategoriyalar
  const byCategory: Record<string, typeof activeItems> = {};
  activeItems.forEach((i) => {
    if (!byCategory[i.category]) byCategory[i.category] = [];
    byCategory[i.category].push(i);
  });

  let html = "";
  for (const cat in byCategory) {
    html += `<div style="font-weight: 700; color: var(--gold-soft); margin: 10px 0 5px; text-transform: uppercase; font-size: 11px;">${esc(cat)}</div>`;
    byCategory[cat].forEach((item) => {
      const qty = currentDraft[item.id] || 0;
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="color:var(--cream);">${esc(item.name)}</div>
            <div style="font-size: 12px;">${formatMoney(item.price)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-cancel" style="padding: 2px 8px; font-size: 14px; width: auto;" data-action="minus" data-id="${item.id}">-</button>
            <span style="width: 20px; text-align: center; color: var(--cream); font-weight: bold;">${qty}</span>
            <button class="btn btn-start" style="padding: 2px 8px; font-size: 14px; width: auto; margin: 0;" data-action="plus" data-id="${item.id}">+</button>
          </div>
        </div>
      `;
    });
  }
  list.innerHTML = html;

  list.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const id = target.dataset.id;
      const action = target.dataset.action;
      if (!id) return;
      if (!currentDraft[id]) currentDraft[id] = 0;

      if (action === "plus") {
        currentDraft[id]++;
      } else if (action === "minus" && currentDraft[id] > 0) {
        currentDraft[id]--;
      }
      renderList();
    });
  });

  updateTotal();
}

function updateTotal() {
  if (!totalLabel) return;
  const activeItems = state.barItems.filter((i) => i.isActive);
  let sum = 0;
  for (const itemId in currentDraft) {
    const qty = currentDraft[itemId];
    if (qty > 0) {
      const item = activeItems.find((i) => i.id === itemId);
      if (item) sum += item.price * qty;
    }
  }
  totalLabel.textContent = formatMoney(sum);
}
