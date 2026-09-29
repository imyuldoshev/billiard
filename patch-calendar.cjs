const fs = require('fs');

let content = fs.readFileSync('src/main.ts', 'utf-8');

const regex = /function renderCalendar\(\) \{[\s\S]*?calendarGrid\.innerHTML = html;[\s\S]*?\}\n\}/;

const newFunction = `function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  calendarMonthYear.textContent = \`\${monthNames[month]} \${year}\`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Convert JS Sunday (0) to Monday (0) for our grid
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1);
  
  let html = "";
  for (let i = 0; i < startOffset; i++) {
    html += \`<div></div>\`;
  }
  
  const todayStr = new Date().toISOString().split("T")[0];
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = \`\${year}-\${String(month + 1).padStart(2, "0")}-\${String(i).padStart(2, "0")}\`;
    const isSelected = dStr === selectedDailyDateStr;
    const isToday = dStr === todayStr;
    
    let bg = "transparent";
    let color = "var(--text-color)";
    let border = "1px solid transparent";
    
    if (isSelected) {
      bg = "var(--accent)";
      color = "#fff";
    } else if (isToday) {
      border = "2px solid var(--accent)";
      color = "var(--accent)";
    }
    
    html += \`<div class="cal-day" data-date="\${dStr}" style="aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; border-radius: 10px; cursor: pointer; background: \${bg}; color: \${color}; border: \${border};">\${i}</div>\`;
  }
  
  // Fill remaining cells up to 42 (6 rows x 7 cols) to prevent jumping
  const totalCells = startOffset + daysInMonth;
  for (let i = totalCells; i < 42; i++) {
    html += \`<div></div>\`;
  }
  
  calendarGrid.innerHTML = html;
  
  calendarGrid.querySelectorAll(".cal-day").forEach(el => {
    el.addEventListener("click", (e) => {
      const dStr = (e.currentTarget as HTMLElement).dataset.date;
      if (dStr) {
        selectedDailyDateStr = dStr;
        updateDateDisplay();
        calendarDialogOverlay.classList.remove("open");
        renderDailyHistory(dStr);
      }
    });
  });
}`;

content = content.replace(regex, newFunction);
fs.writeFileSync('src/main.ts', content, 'utf-8');
console.log('Done.');
