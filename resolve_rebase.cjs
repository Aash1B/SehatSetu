const fs = require('fs');
const path = require('path');

function resolveFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('<<<<<<<')) return;

  const lines = content.split('\n');
  const newLines = [];
  let inConflict = false;
  let inIncoming = false;
  let currentHead = [];
  let currentIncoming = [];

  for (const line of lines) {
    if (line.startsWith('<<<<<<<')) {
      inConflict = true;
      inIncoming = false;
      currentHead = [];
      currentIncoming = [];
    } else if (line.startsWith('=======')) {
      inIncoming = true;
    } else if (line.startsWith('>>>>>>>')) {
      inConflict = false;
      // Prefer currentIncoming if non-empty, otherwise currentHead
      const chosen = currentIncoming.length > 0 ? currentIncoming : currentHead;
      newLines.push(...chosen);
    } else if (inConflict) {
      if (inIncoming) {
        currentIncoming.push(line);
      } else {
        currentHead.push(line);
      }
    } else {
      newLines.push(line);
    }
  }

  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  console.log(`Resolved: ${filePath}`);
}

const files = [
  '.env.example',
  'frontend/package.json',
  'frontend/src/App.tsx',
  'frontend/src/App.css',
  'frontend/src/doctor/components/StatusBadge.tsx',
  'frontend/src/doctor/pages/Dashboard.tsx',
  'frontend/src/patient/components/HeroSection.tsx',
  'frontend/src/patient/components/Navbar.tsx',
  'frontend/src/patient/components/Sidebar.tsx',
  'frontend/src/patient/pages/DashboardPage.tsx',
  'frontend/src/patient/pages/DoctorSearchPage.tsx',
  'frontend/src/patient/pages/VideoConsultationPage.tsx',
  'package.json',
  'package-lock.json'
];

files.forEach(resolveFile);
