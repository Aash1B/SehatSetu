function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  if (trimmed.startsWith('javascript:')) {
    return '#';
  }
  return escapeHtml(trimmed);
}

function parseInline(text: string): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        result += `<code class="inline-code">${escapeHtml(text.slice(i + 1, end))}</code>`;
        i = end + 1;
        continue;
      }
    }

    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        result += `<strong>${parseInline(escapeHtml(text.slice(i + 2, end)))}</strong>`;
        i = end + 2;
        continue;
      }
    }

    if (text[i] === '_' && text[i + 1] === '_') {
      const end = text.indexOf('__', i + 2);
      if (end !== -1) {
        result += `<strong>${parseInline(escapeHtml(text.slice(i + 2, end)))}</strong>`;
        i = end + 2;
        continue;
      }
    }

    if (text[i] === '[' && text[i + 1] !== ']') {
      let j = i + 1;
      let linkText = '';
      while (j < text.length && text[j] !== ']') {
        if (text[j] === '\\' && text[j + 1]) {
          linkText += text[j + 1];
          j += 2;
          continue;
        }
        linkText += text[j];
        j++;
      }
      if (text[j] === ']' && text[j + 1] === '(' && text.slice(j + 2).includes(')')) {
        const closeParen = text.indexOf(')', j + 2);
        const url = text.slice(j + 2, closeParen);
        result += `<a href="${escapeUrl(url)}" class="chat-link" target="_blank" rel="noopener noreferrer">${parseInline(linkText)}</a>`;
        i = closeParen + 1;
        continue;
      }
    }

    result += escapeHtml(text[i]);
    i++;
  }

  return result;
}

export function renderMarkdown(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inParagraph = false;

  function closeParagraph() {
    if (inParagraph) {
      html.push('</p>');
      inParagraph = false;
    }
    if (inList === 'ul') html.push('</ul>');
    if (inList === 'ol') html.push('</ol>');
    if (inList) inList = null;
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    const line = raw.trimEnd();

    if (inCodeBlock) {
      if (line.trim().startsWith('```')) {
         html.push(`<pre class="code-block"><code class="language-${escapeHtml(codeLang)}">${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (line.trim().startsWith('```')) {
      inCodeBlock = true;
      codeLang = line.trim().slice(3).trim();
      codeLines = [];
      continue;
    }

    const trimmed = line.trim();

    if (trimmed === '') {
      closeParagraph();
      continue;
    }

    const h6 = /^(#{6})\s+(.*)$/.exec(trimmed);
    if (h6) { closeParagraph(); html.push(`<h6>${parseInline(h6[2])}</h6>`); continue; }
    const h5 = /^(#{5})\s+(.*)$/.exec(trimmed);
    if (h5) { closeParagraph(); html.push(`<h5>${parseInline(h5[2])}</h5>`); continue; }
    const h4 = /^(#{4})\s+(.*)$/.exec(trimmed);
    if (h4) { closeParagraph(); html.push(`<h4>${parseInline(h4[2])}</h4>`); continue; }
    const h3 = /^(#{3})\s+(.*)$/.exec(trimmed);
    if (h3) { closeParagraph(); html.push(`<h3>${parseInline(h3[2])}</h3>`); continue; }
    const h2 = /^(#{2})\s+(.*)$/.exec(trimmed);
    if (h2) { closeParagraph(); html.push(`<h2>${parseInline(h2[2])}</h2>`); continue; }
    const h1 = /^(#{1})\s+(.*)$/.exec(trimmed);
    if (h1) { closeParagraph(); html.push(`<h1>${parseInline(h1[2])}</h1>`); continue; }

    const hr = /^(-{3}|\*{3}|_{3})\s*$/.exec(trimmed);
    if (hr) { closeParagraph(); html.push('<hr class="chat-divider" />'); continue; }

    const ul = /^[-*]\s+(.*)$/.exec(trimmed);
    if (ul) {
      if (inList !== 'ul') {
        closeParagraph();
        html.push('<ul class="chat-list">');
        inList = 'ul';
      }
      html.push(`<li>${parseInline(ul[1])}</li>`);
      continue;
    }

    const ol = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ol) {
      if (inList !== 'ol') {
        closeParagraph();
        html.push('<ol class="chat-list">');
        inList = 'ol';
      }
      html.push(`<li>${parseInline(ol[1])}</li>`);
      continue;
    }

    closeParagraph();
    html.push(`<p>${parseInline(line)}`);
    inParagraph = true;
  }

  closeParagraph();

  if (inCodeBlock && codeLines.length > 0) {
    html.push(`<pre class="code-block"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return html.join('\n');
}
