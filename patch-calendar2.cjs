const fs = require('fs');
let content = fs.readFileSync('src/main.ts', 'utf-8');

const oldHtmlLine = '      html += `<div class="cal-day" data-date="${dStr}" style="aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 500; border-radius: 12px; cursor: pointer; background: ${bg}; color: ${color}; border: ${border};">${i}</div>`;';

const newHtmlLine = '      html += `<div class="cal-day" data-date="${dStr}" style="aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; border-radius: 12px; cursor: pointer; background: ${bg}; color: ${color}; border: ${border};">${i}</div>`;';

content = content.replace(oldHtmlLine, newHtmlLine);

// Next we replace the calendarGrid.innerHTML = html; with the padding cells logic
const oldEnd = `  calendarGrid.innerHTML = html;`;
const newEnd = `  // Fill remaining cells up to 42 (6 rows x 7 cols) to prevent jumping
  const totalCells = startOffset + daysInMonth;
  for (let i = totalCells; i < 42; i++) {
    html += \`<div></div>\`;
  }
  
  calendarGrid.innerHTML = html;`;

content = content.replace(oldEnd, newEnd);

fs.writeFileSync('src/main.ts', content, 'utf-8');
console.log("Done");
