import type { Table } from '../types';
import { state, saveState } from '../state/store';

// A simple global state for UI callbacks
// In a larger app we'd use event emitters or a framework.
export let openCheckoutCallback: (id: number) => void;

export function setOpenCheckoutCallback(cb: (id: number) => void) {
  openCheckoutCallback = cb;
}

export function startTable(id: number, customerName: string, customRate: number | null, onRender: () => void) {
  const table = state.tables.find(t => t.id === id);
  if (!table || table.occupied) return;
  table.occupied = true;
  table.startTime = Date.now().toString(); // Need to save as string in state? In store we use null initially.
  table.customerName = customerName || '';
  table.customRate = customRate;
  saveState();
  onRender();
}

export function buildCard(table: Table, onRender: () => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'table-card' + (table.occupied ? ' occupied' : '');
  card.dataset.id = table.id.toString();

  const topRow = document.createElement('div');
  topRow.className = 'top-row';
  const name = document.createElement('div');
  name.className = 'table-name';
  name.textContent = `${table.id}-stol`;
  const pill = document.createElement('div');
  pill.className = 'status-pill ' + (table.occupied ? 'occupied' : 'available');
  pill.textContent = table.occupied ? 'Band' : "Bo'sh";
  topRow.appendChild(name);
  topRow.appendChild(pill);
  card.appendChild(topRow);

  if (table.occupied) {
    if (table.customerName) {
      const cust = document.createElement('div');
      cust.className = 'customer-name';
      cust.textContent = table.customerName;
      card.appendChild(cust);
    }

    const timer = document.createElement('div');
    timer.className = 'timer-display';
    timer.dataset.role = 'timer';
    timer.textContent = '00:00:00';

    const cost = document.createElement('div');
    cost.className = 'cost-display';
    cost.dataset.role = 'cost';
    cost.innerHTML = `Joriy narx: <b>0 so'm</b>` + (table.customRate ? `<span class="custom-tag">(maxsus narx)</span>` : '');

    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn btn-stop';
    stopBtn.textContent = "To'xtatish";
    stopBtn.addEventListener('click', () => {
      if (openCheckoutCallback) openCheckoutCallback(table.id);
    });

    card.appendChild(timer);
    card.appendChild(cost);
    card.appendChild(stopBtn);
  } else {
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'field-input';
    nameInput.placeholder = 'Mijoz ismi (ixtiyoriy)';
    nameInput.dataset.role = 'nameDraft';

    const rateToggle = document.createElement('button');
    rateToggle.type = 'button';
    rateToggle.className = 'custom-rate-toggle';
    rateToggle.textContent = 'Bu stol uchun maxsus narx';

    const rateInputField = document.createElement('input');
    rateInputField.type = 'number';
    rateInputField.className = 'field-input';
    rateInputField.placeholder = `Standart: ${state.hourlyRate}`;
    rateInputField.min = '0';
    rateInputField.step = '1000';
    rateInputField.style.display = 'none';
    rateInputField.dataset.role = 'rateDraft';

    rateToggle.addEventListener('click', () => {
      const showing = rateInputField.style.display !== 'none';
      rateInputField.style.display = showing ? 'none' : 'block';
      rateToggle.textContent = showing ? 'Bu stol uchun maxsus narx' : 'Maxsus narxni bekor qilish';
      if (showing) rateInputField.value = '';
    });

    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-start';
    startBtn.textContent = 'Boshlash';
    startBtn.addEventListener('click', () => {
      const customerName = nameInput.value.trim();
      const rateVal = parseFloat(rateInputField.value);
      const customRate = rateInputField.style.display !== 'none' && !isNaN(rateVal) && rateVal >= 0 ? rateVal : null;
      startTable(table.id, customerName, customRate, onRender);
    });

    card.appendChild(nameInput);
    card.appendChild(rateToggle);
    card.appendChild(rateInputField);
    card.appendChild(startBtn);
  }

  return card;
}
