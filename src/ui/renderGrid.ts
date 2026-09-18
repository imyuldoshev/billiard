import { state } from '../state/store';
import { buildCard } from './renderCard';

export function renderGrid(gridEl: HTMLElement, onRenderStats: () => void) {
  gridEl.innerHTML = '';
  
  const onRender = () => {
    renderGrid(gridEl, onRenderStats);
    onRenderStats();
  };

  state.tables.forEach(t => {
    gridEl.appendChild(buildCard(t, onRender));
  });
}
