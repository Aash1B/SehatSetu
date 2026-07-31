const fs = require('fs');
const css = fs.readFileSync('frontend/src/App.css', 'utf8');

const lines = css.split('\n');
let imports = [];
let root = [];
let rest = [];

let inRoot = false;

for (let line of lines) {
  if (line.startsWith('@import')) {
    imports.push(line);
  } else if (line.startsWith(':root {')) {
    inRoot = true;
    root.push(line);
  } else if (inRoot) {
    root.push(line);
    if (line.startsWith('}')) {
      inRoot = false;
    }
  } else {
    rest.push(line);
  }
}

// Replace 'body {' with '.patient-portal {' so background colors apply to the wrapper
const scopedRest = rest.join('\n').replace(/^body\s*{/gm, '.patient-portal {');

const newCss = [
  ...imports,
  '',
  ...root,
  '',
  '.patient-portal {',
  scopedRest,
  '}'
].join('\n');

fs.writeFileSync('frontend/src/Patient.css', newCss);
console.log('Successfully created Patient.css');
