import { state, saveState } from '../state/store';
import { formatMoney } from '../lib/calculations';


const overlay = document.getElementById('barOrderOverlay') as HTMLElement;
const closeBtn = document.getElementById('cancelBarOrderBtn') as HTMLButtonElement;
const confirmBtn = document.getElementById('confirmBarOrderBtn') as HTMLButtonElement;
const list = document.getElementById('barOrderItems') as HTMLElement;
const totalLabel = document.getElementById('barOrderTotalAmount') as HTMLElement;
const tableLabel = document.getElementById('barOrderTableLabel') as HTMLElement;

let currentTableId: number | null = null;
let currentDraft: Record<string, number> = {}; // itemId -> quantity
let onConfirmCb: (() => void) | null = null;

export function openBarOrder(tableId: number, onConfirm: () => void) {
  currentTableId = tableId;
  currentDraft = {};
  onConfirmCb = onConfirm;
  tableLabel.textContent = `${tableId}-stol uchun bardan mahsulot tanlash`;
  renderList();
  overlay.classList.add('open');
}

closeBtn?.addEventListener('click', () => {
  overlay.classList.remove('open');
  currentTableId = null;
});

confirmBtn?.addEventListener('click', () => {
  if (currentTableId === null) return;
  const table = state.tables.find(t => t.id === currentTableId);
  if (!table) return;

  const activeItems = state.barItems.filter(i => i.isActive);
  for (const itemId in currentDraft) {
    const qty = currentDraft[itemId];
    if (qty > 0) {
      const item = activeItems.find(i => i.id === itemId);
      if (item) {
        // Find if already ordered
        const existing = table.barOrders.find(o => o.itemId === itemId);
        if (existing) {
          existing.qty += qty;
        } else {
          table.barOrders.push({ itemId, name: item.name, price: item.price, qty });
        }
      }
    }
  }

  saveState();
  if (onConfirmCb) onConfirmCb();
  overlay.classList.remove('open');
  currentTableId = null;
});

function renderList() {
  if (!list) return;
  const activeItems = state.barItems.filter(i => i.isActive);
  if (activeItems.length === 0) {
    list.innerHTML = `<div style="text-align: center; padding: 20px;">Mahsulotlar yo'q. Bar boshqaruvidan qo'shing.</div>`;
    updateTotal();
    return;
  }

  // Kategoriyalar
  const byCategory: Record<string, typeof activeItems> = {};
  activeItems.forEach(i => {
    if (!byCategory[i.category]) byCategory[i.category] = [];
    byCategory[i.category].push(i);
  });

  let html = '';
  for (const cat in byCategory) {
    html += `<div style="font-weight: 700; color: var(--gold-soft); margin: 10px 0 5px; text-transform: uppercase; font-size: 11px;">${cat}</div>`;
    byCategory[cat].forEach(item => {
      const qty = currentDraft[item.id] || 0;
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="color:var(--cream);">${item.name}</div>
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

  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const id = target.dataset.id;
      const action = target.dataset.action;
      if (!id) return;
      if (!currentDraft[id]) currentDraft[id] = 0;

      if (action === 'plus') {
        currentDraft[id]++;
      } else if (action === 'minus' && currentDraft[id] > 0) {
        currentDraft[id]--;
      }
      renderList();
    });
  });

  updateTotal();
}

function updateTotal() {
  if (!totalLabel) return;
  const activeItems = state.barItems.filter(i => i.isActive);
  let sum = 0;
  for (const itemId in currentDraft) {
    const qty = currentDraft[itemId];
    if (qty > 0) {
      const item = activeItems.find(i => i.id === itemId);
      if (item) sum += item.price * qty;
    }
  }
  totalLabel.textContent = formatMoney(sum);
}
