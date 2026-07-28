import os

def resolve_file(path, strategy):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    out = []
    state = 'NORMAL'
    ours = []
    theirs = []
    
    for line in lines:
        if line.startswith('<<<<<<<'):
            state = 'OURS'
        elif line.startswith('======='):
            state = 'THEIRS'
        elif line.startswith('>>>>>>>'):
            state = 'NORMAL'
            
            if strategy == 'theirs': # stashed changes
                out.extend(theirs)
            elif strategy == 'ours': # upstream
                out.extend(ours)
            elif strategy == 'both':
                out.extend(ours)
                out.extend(theirs)
                
            ours = []
            theirs = []
        else:
            if state == 'OURS':
                ours.append(line)
            elif state == 'THEIRS':
                theirs.append(line)
            else:
                out.append(line)
                
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(out)

# Resolve rules:
# frontend/src/App.tsx -> theirs (we want our routing)
resolve_file('frontend/src/App.tsx', 'theirs')

# frontend/src/index.css -> both (keep their base, our theme)
resolve_file('frontend/src/index.css', 'both')

# tsconfig.json -> theirs (we want the workspace reference)
resolve_file('tsconfig.json', 'theirs')

# frontend/package.json -> theirs (keep our tailwind and react router)
resolve_file('frontend/package.json', 'theirs')

print("Resolved App.tsx, index.css, tsconfig.json, frontend/package.json")
