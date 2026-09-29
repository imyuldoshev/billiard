const fs = require('fs');
let content = fs.readFileSync('src/main.ts', 'utf-8');

content = content.replace(
  /font-size: 16px; font-weight: 500;/g,
  'font-size: 20px; font-weight: 700;'
);

fs.writeFileSync('src/main.ts', content, 'utf-8');
console.log("Done");
