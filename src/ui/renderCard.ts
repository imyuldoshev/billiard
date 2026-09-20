import type { Table } from '../types';

import { openTableModal } from './renderTableModal';




export function buildCard(table: Table, onRender: () => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'table-card' + (table.occupied ? (table.isPaused ? ' paused' : ' occupied') : '');
  card.dataset.id = table.id.toString();

  // Top Row: Icon + Name & Status Pill
  const topRow = document.createElement('div');
  topRow.className = 'card-top-row';
  
  const infoGroup = document.createElement('div');
  infoGroup.className = 'table-info';
  
  const iconWrap = document.createElement('div');
  iconWrap.className = 'table-icon';
  // Minimal billiard table SVG
  iconWrap.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/></svg>`;
  
  const titleGroup = document.createElement('div');
  titleGroup.className = 'table-card-titles';
  const name = document.createElement('div');
  name.className = 'table-name';
  name.textContent = `${table.id}-stol`;
  titleGroup.appendChild(name);
  if (table.occupied && table.customerName) {
    const cust = document.createElement('div');
    cust.className = 'customer-name';
    cust.textContent = table.customerName;
    titleGroup.appendChild(cust);
  }
  
  infoGroup.appendChild(iconWrap);
  infoGroup.appendChild(titleGroup);
  
  const pill = document.createElement('div');
  pill.className = 'status-pill ' + (table.occupied ? (table.isPaused ? 'paused' : 'occupied') : 'available');
  pill.textContent = table.occupied ? (table.isPaused ? 'Pauza' : 'Band') : "Bo'sh";

  topRow.appendChild(infoGroup);
  topRow.appendChild(pill);
  card.appendChild(topRow);

  // Metrics (Timer & Cost for occupied, or Empty Space for available)
  const metrics = document.createElement('div');
  metrics.className = 'card-metrics';
  
  if (table.occupied) {
    const timerDisplay = document.createElement('div');
    timerDisplay.className = 'timer-display';
    timerDisplay.dataset.role = 'timer';
    timerDisplay.textContent = '00:00:00';
    
    const costDisplay = document.createElement('div');
    costDisplay.className = 'cost-display';
    costDisplay.dataset.role = 'cost';
    costDisplay.innerHTML = `Joriy narx: <b>0 so'm</b>`;
    
    metrics.appendChild(timerDisplay);
    metrics.appendChild(costDisplay);
  } else {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-line';
    emptyMsg.textContent = 'Stol bo\'sh, o\'yinni boshlash mumkin.';
    metrics.appendChild(emptyMsg);
  }
  card.appendChild(metrics);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  
  if (table.occupied) {
    const checkoutBtn = document.createElement('button');
    checkoutBtn.className = 'btn btn-stop';
    checkoutBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Hisobni yopish`;
    checkoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTableModal(table.id, onRender);
    });
    actions.appendChild(checkoutBtn);
  } else {
    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-start';
    startBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Boshlash`;
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTableModal(table.id, onRender);
    });
    actions.appendChild(startBtn);
  }
  card.appendChild(actions);

  // Click on card itself also opens modal
  card.addEventListener('click', () => {
    openTableModal(table.id, onRender);
  });

  return card;
}
