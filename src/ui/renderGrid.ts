import { state } from '../state/store';
import { buildCard } from './renderCard';

export function renderGrid(gridEl: HTMLElement, onRenderStats: () => void) {
  gridEl.innerHTML = '';
  
  const onRender = () => {
    renderGrid(gridEl, onRenderStats);
    onRenderStats();
  };

  state.tables.forEach(t => {
    try {
      const card = buildCard(t, onRender);
      gridEl.appendChild(card);
    } catch (e) {
      console.error("Error building card for table", t.id, e);
    }
  });
}
