import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../utils/markdown';
import { ChatError } from '../types/chatbot.types';

describe('renderMarkdown', () => {
  it('returns empty string for empty input', () => {
    assert.equal(renderMarkdown(''), '');
  });

  it('renders headings', () => {
    const result = renderMarkdown('# Title');
    assert.equal(result, '<h1>Title</h1>');
  });

  it('renders h2 heading', () => {
    const result = renderMarkdown('## Section');
    assert.equal(result, '<h2>Section</h2>');
  });

  it('renders h3 heading', () => {
    const result = renderMarkdown('### Subsection');
    assert.equal(result, '<h3>Subsection</h3>');
  });

  it('renders bold with **', () => {
    const result = renderMarkdown('**bold text**');
    assert.ok(result.includes('<p><strong>bold text</strong>'));
    assert.ok(result.includes('</p>'));
  });

  it('renders bold with __', () => {
    const result = renderMarkdown('__bold text__');
    assert.ok(result.includes('<p><strong>bold text</strong>'));
  });

  it('renders inline code', () => {
    const result = renderMarkdown('Use `const` keyword');
    assert.ok(result.includes('<code class="inline-code">const</code>'));
  });

  it('renders links', () => {
    const result = renderMarkdown('[Click here](https://example.com)');
    assert.ok(result.includes('<a href="https://example.com"'));
    assert.ok(result.includes('Click here'));
  });

  it('renders unordered lists', () => {
    const md = `- Item 1
- Item 2
- Item 3`;
    const result = renderMarkdown(md);
    assert.ok(result.includes('<ul class="chat-list">'));
    assert.ok(result.includes('<li>Item 1</li>'));
    assert.ok(result.includes('<li>Item 2</li>'));
    assert.ok(result.includes('<li>Item 3</li>'));
    assert.ok(result.includes('</ul>'));
  });

  it('renders ordered lists', () => {
    const md = `1. First
2. Second`;
    const result = renderMarkdown(md);
    assert.ok(result.includes('<ol class="chat-list">'));
    assert.ok(result.includes('<li>First</li>'));
    assert.ok(result.includes('<li>Second</li>'));
    assert.ok(result.includes('</ol>'));
  });

  it('renders code blocks', () => {
    const md = '```ts\nconst x = 1;\n```';
    const result = renderMarkdown(md);
    assert.ok(result.includes('<pre class="code-block">'));
    assert.ok(result.includes('<code class="language-ts">'));
    assert.ok(result.includes('const x = 1;'));
  });

  it('renders horizontal rule', () => {
    const result = renderMarkdown('---');
    assert.ok(result.includes('<hr class="chat-divider"'));
  });

  it('renders multiple paragraphs', () => {
    const md = 'First paragraph\n\nSecond paragraph';
    const result = renderMarkdown(md);
    assert.equal(result.match(/<p>/g)?.length, 2);
    assert.ok(result.includes('First paragraph'));
    assert.ok(result.includes('Second paragraph'));
  });

  it('renders text content as paragraph', () => {
    const result = renderMarkdown('Plain text here');
    assert.ok(result.includes('<p>Plain text here'));
    assert.ok(result.includes('</p>'));
  });

  it('renders paragraphs with inline formatting', () => {
    const result = renderMarkdown('**Hello** world');
    assert.ok(result.includes('<p><strong>Hello</strong> world'));
    assert.ok(result.includes('</p>'));
  });
});

describe('XSS / security hardening', () => {
  it('escapes <script> tags in text', () => {
    const result = renderMarkdown('<script>alert(1)</script>');
    assert.ok(!result.includes('<script>'));
    assert.ok(result.includes('&lt;script&gt;'));
  });

  it('escapes <iframe> tags in text', () => {
    const result = renderMarkdown('<iframe src="evil.com"></iframe>');
    assert.ok(!result.includes('<iframe'));
    assert.ok(result.includes('&lt;iframe'));
  });

  it('escapes HTML entities to prevent double-encoding issues', () => {
    const result = renderMarkdown('A & B');
    assert.ok(result.includes('A &amp; B'));
    assert.ok(!result.includes('A & B'));
  });

  it('escapes quotes in text', () => {
    const result = renderMarkdown('"quoted" text');
    assert.ok(result.includes('&quot;quoted&quot;'));
  });

  it('escapes single quotes in text', () => {
    const result = renderMarkdown("'quoted' text");
    assert.ok(result.includes('&#39;quoted&#39;'));
  });

  it('prevents javascript: URLs in links', () => {
    const result = renderMarkdown('[Click](javascript:alert(1))');
    assert.ok(!result.includes('javascript:') || result.includes('href="#"'));
    assert.ok(!result.includes('href="javascript:alert(1)"'));
  });

  it('allows safe https: URLs in links', () => {
    const result = renderMarkdown('[Example](https://example.com)');
    assert.ok(result.includes('href="https://example.com"'));
  });

  it('allows safe http: URLs in links', () => {
    const result = renderMarkdown('[Site](http://example.com)');
    assert.ok(result.includes('href="http://example.com"'));
  });

  it('preserves markdown formatting while escaping malicious text', () => {
    const result = renderMarkdown('**bold** <script>alert(1)</script>');
    assert.ok(result.includes('<strong>bold</strong>'));
    assert.ok(!result.includes('<script>'));
    assert.ok(result.includes('&lt;script&gt;'));
  });

  it('escapes HTML in code blocks', () => {
    const md = '```ts\n<script>alert(1)</script>\n```';
    const result = renderMarkdown(md);
    assert.ok(!result.includes('<script>'));
    assert.ok(result.includes('&lt;script&gt;'));
  });

  it('escapes HTML in inline code', () => {
    const result = renderMarkdown('Use `const x = <script>()`');
    assert.ok(!result.includes('<script>'));
    assert.ok(result.includes('&lt;script&gt;'));
  });

  it('escapes HTML in list items', () => {
    const md = `- Item with <img src=x onerror=alert(1)>`;
    const result = renderMarkdown(md);
    assert.ok(!result.includes('<img'));
    assert.ok(result.includes('&lt;img'));
  });

  it('escapes HTML in headings', () => {
    const result = renderMarkdown('# <script>alert(1)</script>');
    assert.ok(!result.includes('<script>'));
    assert.ok(result.includes('&lt;script&gt;'));
  });

  it('code block language is escaped', () => {
    const md = '```"onload=alert(1)\ncode\n```';
    const result = renderMarkdown(md);
    assert.ok(!result.includes('class="language-"onload'));
    assert.ok(result.includes('&quot;'));
  });

  it('handles img tag injection attempt', () => {
    const result = renderMarkdown('<img src=x onerror=alert(1)>');
    assert.ok(!result.includes('<img'));
    assert.ok(result.includes('&lt;img'));
  });

  it('handles SVG-based XSS attempts', () => {
    const result = renderMarkdown('<svg onload=alert(1)>');
    assert.ok(!result.includes('<svg'));
    assert.ok(result.includes('&lt;svg'));
  });

  it('handles data: URL injection in links', () => {
    const result = renderMarkdown('[x](data:text/html,<script>alert(1)</script>)');
    assert.ok(!result.includes('data:text/html,<script'));
  });
});

describe('ChatError types', () => {
  it('supports offline error type', () => {
    const error: ChatError = { type: 'offline', message: 'No internet', canRetry: true };
    assert.equal(error.type, 'offline');
    assert.equal(error.canRetry, true);
  });

  it('supports timeout error type', () => {
    const error: ChatError = { type: 'timeout', message: 'Timed out', canRetry: true };
    assert.equal(error.type, 'timeout');
  });

  it('supports backend_unavailable error type', () => {
    const error: ChatError = { type: 'backend_unavailable', message: 'Server down', canRetry: true };
    assert.equal(error.type, 'backend_unavailable');
  });

  it('supports auth_required error type', () => {
    const error: ChatError = { type: 'auth_required', message: 'Unauthorized', canRetry: false };
    assert.equal(error.canRetry, false);
  });

  it('supports ai_unavailable error type', () => {
    const error: ChatError = { type: 'ai_unavailable', message: 'AI busy', canRetry: true };
    assert.equal(error.type, 'ai_unavailable');
  });

  it('supports location_denied error type', () => {
    const error: ChatError = { type: 'location_denied', message: 'Denied', canRetry: false };
    assert.equal(error.canRetry, false);
  });

  it('supports unknown error type', () => {
    const error: ChatError = { type: 'unknown', message: 'Unknown', canRetry: true };
    assert.equal(error.type, 'unknown');
  });
});
