const fs = require('fs');

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
  'frontend/src/patient/components/CtaBanner.tsx',
  'frontend/src/patient/components/DoctorSearchSection.tsx',
  'frontend/src/patient/pages/BookAppointmentPage.tsx',
  'frontend/src/patient/pages/DashboardPage.tsx',
  'frontend/src/patient/pages/DoctorSearchPage.tsx',
  'frontend/src/patient/pages/VideoConsultationPage.tsx',
];

files.forEach(resolveFile);
