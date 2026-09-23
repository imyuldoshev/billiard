import { state, addTable, removeTable, saveState } from "../state/store";
import { buildCard } from "./renderCard";
import { showPinConfirm } from "./dialog";

export function renderGrid(gridEl: HTMLElement, onRenderStats: () => void) {
  gridEl.innerHTML = "";

  const onRender = () => {
    renderGrid(gridEl, onRenderStats);
    onRenderStats();
  };

  state.tables.forEach((t) => {
    try {
      const card = buildCard(t, onRender);

      // Bo'sh stol uchun — o'chirish tugmasi
      if (!t.occupied) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-table-delete";
        deleteBtn.title = "Stolni o'chirish";
        deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showPinConfirm({
            message: `${t.id}-stolni o'chirmoqchisiz. Tasdiqlash uchun PIN kodni kiriting.`,
            onSuccess: () => {
              const ok = removeTable(t.id);
              if (ok) {
                saveState();
                onRender();
              }
            },
          });
        });
        card.appendChild(deleteBtn);
      }

      gridEl.appendChild(card);
    } catch (e) {
      console.error("Error building card for table", t.id, e);
    }
  });

  // "Stol qo'shish" kartasi
  const addCard = document.createElement("div");
  addCard.className = "table-card table-card-add";
  addCard.innerHTML = `
    <div class="tc-add-icon">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    </div>
    <div class="tc-add-label">Stol qo'shish</div>
  `;
  addCard.addEventListener("click", () => {
    addTable();
    saveState();
    onRender();
  });
  gridEl.appendChild(addCard);
}
