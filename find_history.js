const fs = require('fs');
const path = require('path');

const historyDirCode = path.join(process.env.APPDATA, 'Code', 'User', 'History');
const historyDirAnti = path.join(process.env.APPDATA, 'Antigravity IDE', 'User', 'History');

function searchHistory(historyDir) {
  if (!fs.existsSync(historyDir)) {
    console.log(`Directory not found: ${historyDir}`);
    return;
  }
  const folders = fs.readdirSync(historyDir);
  let found = 0;
  for (const folder of folders) {
    if (found >= 10) break;
    const folderPath = path.join(historyDir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const entriesPath = path.join(folderPath, 'entries.json');
    if (!fs.existsSync(entriesPath)) continue;
    
    try {
      const data = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
      if (data.resource) {
        if (data.resource.toLowerCase().includes('app.tsx') || data.resource.toLowerCase().includes('index.css')) {
            console.log(`Found ${data.resource} in ${folderPath}`);
            console.log(data.entries.slice(-2));
            found++;
        }
      }
    } catch (e) {}
  }
}

console.log("Searching Code...");
searchHistory(historyDirCode);
console.log("Searching Antigravity IDE...");
searchHistory(historyDirAnti);
