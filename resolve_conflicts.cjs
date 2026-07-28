const fs = require('fs');

function resolveFile(path, strategy) {
    const lines = fs.readFileSync(path, 'utf-8').split('\n');
    const out = [];
    let state = 'NORMAL';
    let ours = [];
    let theirs = [];
    
    for (const line of lines) {
        if (line.startsWith('<<<<<<<')) {
            state = 'OURS';
        } else if (line.startsWith('=======')) {
            state = 'THEIRS';
        } else if (line.startsWith('>>>>>>>')) {
            state = 'NORMAL';
            
            if (strategy === 'theirs') { // stashed changes
                out.push(...theirs);
            } else if (strategy === 'ours') { // upstream
                out.push(...ours);
            } else if (strategy === 'both') {
                out.push(...ours);
                out.push(...theirs);
            }
            
            ours = [];
            theirs = [];
        } else {
            if (state === 'OURS') {
                ours.push(line);
            } else if (state === 'THEIRS') {
                theirs.push(line);
            } else {
                out.push(line);
            }
        }
    }
    fs.writeFileSync(path, out.join('\n'), 'utf-8');
}

resolveFile('frontend/src/App.tsx', 'theirs');
resolveFile('frontend/src/index.css', 'both');
resolveFile('tsconfig.json', 'theirs');
resolveFile('frontend/package.json', 'theirs');

console.log("Resolved App.tsx, index.css, tsconfig.json, frontend/package.json");
