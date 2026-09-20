import { state, saveState } from "../state/store";

export let openCheckoutCallback: (id: number) => void;

export function setOpenCheckoutCallback(cb: (id: number) => void) {
  openCheckoutCallback = cb;
}

export function startTable(
  id: number,
  customerName: string,
  customRate: number | null,
  onRender: () => void,
) {
  const table = state.tables.find((t) => t.id === id);
  if (!table || table.occupied) return;
  table.occupied = true;
  table.startTime = Date.now().toString();
  table.customerName = customerName || "";
  table.customRate = customRate;
  table.isPaused = false;
  table.pauseStartTime = null;
  table.totalPauseDurationMs = 0;
  table.barOrders = [];
  saveState();
  onRender();
}

export function togglePause(id: number, onRender: () => void) {
  const table = state.tables.find((t) => t.id === id);
  if (!table || !table.occupied) return;
  if (table.isPaused) {
    if (table.pauseStartTime) {
      table.totalPauseDurationMs +=
        Date.now() - new Date(table.pauseStartTime).getTime();
    }
    table.isPaused = false;
    table.pauseStartTime = null;
  } else {
    table.isPaused = true;
    table.pauseStartTime = new Date().toISOString();
  }
  saveState();
  onRender();
}
