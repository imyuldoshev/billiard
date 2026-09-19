import { state, saveState } from '../state/store';
import { addBarItem, updateBarItem } from '../api/bar';
import { formatMoney } from '../lib/calculations';

const overlay = document.getElementById('barSettingsOverlay') as HTMLElement;
const closeBtn = document.getElementById('closeBarSettingsBtn') as HTMLButtonElement;
const nameInput = document.getElementById('barItemName') as HTMLInputElement;
const priceInput = document.getElementById('barItemPrice') as HTMLInputElement;
const categoryInput = document.getElementById('barItemCategory') as HTMLSelectElement;
const addBtn = document.getElementById('addBarItemBtn') as HTMLButtonElement;
const list = document.getElementById('barItemsList') as HTMLElement;

export function openBarSettings() {
  overlay.classList.add('open');
  renderList();
}

closeBtn?.addEventListener('click', () => {
  overlay.classList.remove('open');
});

addBtn?.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);
  const category = categoryInput.value;

  if (!name || isNaN(price) || price < 0) return;

  addBtn.disabled = true;
  addBtn.textContent = '...';

  const newItem = await addBarItem({ name, price, category });
  if (newItem) {
    state.barItems.push(newItem);
    saveState();
    nameInput.value = '';
    priceInput.value = '';
    renderList();
  }

  addBtn.disabled = false;
  addBtn.textContent = "Qo'shish";
});

function renderList() {
  if (!list) return;
  const activeItems = state.barItems.filter(i => i.isActive);
  if (activeItems.length === 0) {
    list.innerHTML = `<div style="text-align: center; padding: 20px;">Mahsulotlar yo'q</div>`;
    return;
  }

  list.innerHTML = activeItems.map(item => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <div>
        <b style="color:var(--cream);">${item.name}</b> <span style="font-size: 11px; opacity:0.7;">(${item.category})</span><br>
        ${formatMoney(item.price)}
      </div>
      <button class="btn btn-cancel" style="width: auto; padding: 6px 10px; font-size: 12px;" data-id="${item.id}">O'chirish</button>
    </div>
  `).join('');

  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id;
      if (!id) return;
      const success = await updateBarItem(id, { isActive: false });
      if (success) {
        const item = state.barItems.find(i => i.id === id);
        if (item) item.isActive = false;
        saveState();
        renderList();
      }
    });
  });
}
