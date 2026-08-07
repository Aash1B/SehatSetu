import os

def resolve_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    if '<<<<<<<' not in content:
        return

    lines = content.splitlines(keepends=True)
    out = []
    state = 'NORMAL'
    ours = []
    theirs = []
    count = 0

    for line in lines:
        if line.startswith('<<<<<<<'):
            state = 'OURS'
            count += 1
            ours = []
            theirs = []
        elif line.startswith('=======') and state == 'OURS':
            state = 'THEIRS'
        elif line.startswith('>>>>>>>') and state in ('OURS', 'THEIRS'):
            state = 'NORMAL'
            out.extend(ours)
            ours_stripped = set(l.strip() for l in ours if l.strip())
            for t in theirs:
                if t.strip() not in ours_stripped or len(t.strip()) < 3:
                    out.append(t)
            ours = []
            theirs = []
        else:
            if state == 'OURS':
                ours.append(line)
            elif state == 'THEIRS':
                theirs.append(line)
            else:
                out.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(out)
    print(f"Resolved {count} conflict(s) in {filepath}")

ws = r"c:\Users\shubh\Desktop\React\Webtech\SehatSetu"
for root, dirs, files in os.walk(ws):
    if 'node_modules' in root or '.git' in root or 'dist' in root or 'brain' in root or '.gemini' in root:
        continue
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md', '.py', '.prisma', '.env')):
            if file in ('resolve_conflicts.py', 'resolve_conflicts.cjs', 'resolve_all_conflicts.py', 'run_resolver.py'):
                continue
            resolve_file(os.path.join(root, file))

print("Conflict resolution complete!")
