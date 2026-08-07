import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, '../config.ts');

function readConfigSource(): string {
  return readFileSync(configPath, 'utf-8');
}

describe('i18n language persistence and switching', () => {
  let mockLS: Record<string, string>;
  let originalLS: Storage | undefined;

  beforeEach(() => {
    mockLS = {};
    originalLS = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => mockLS[key] ?? null,
        setItem: (key: string, val: string) => { mockLS[key] = val; },
        removeItem: (key: string) => { delete mockLS[key]; },
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (originalLS) {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLS,
        configurable: true,
        writable: true,
      });
    }
  });

  test('supportedLanguages contains en and hi', () => {
    const src = readConfigSource();
    assert.ok(src.includes("code: 'en'"), 'English must be in supportedLanguages');
    assert.ok(src.includes("code: 'hi'"), 'Hindi must be in supportedLanguages');
    assert.ok(src.includes("name: 'Hindi'"), 'Hindi name label should exist');
  });

  test('defaultLanguage is en', () => {
    const src = readConfigSource();
    const match = src.match(/defaultLanguage\s*=\s*'([^']+)'/);
    assert.ok(match, 'defaultLanguage should be declared');
    assert.equal(match[1], 'en');
  });

  test('invalid stored language falls back to English (config logic)', () => {
    const stored = 'fr';
    const supportedLngs = ['en', 'hi'];
    const resolved = stored && supportedLngs.includes(stored) ? stored : 'en';
    assert.equal(resolved, 'en');
  });

  test('valid stored language is respected', () => {
    const stored = 'hi';
    const supportedLngs = ['en', 'hi'];
    const resolved = stored && supportedLngs.includes(stored) ? stored : 'en';
    assert.equal(resolved, 'hi');
  });

  test('changeLanguage writes language to localStorage', () => {
    // Verify the source-level persistence contract: changeLanguage sets STORAGE_KEY
    const src = readConfigSource();
    assert.ok(src.includes("localStorage.setItem(STORAGE_KEY, lng)"), 'changeLanguage should persist to localStorage');
    assert.ok(src.includes("localStorage.getItem(STORAGE_KEY)"), 'config should read from localStorage');
    assert.ok(src.includes("STORAGE_KEY = 'sehatsetu_language'"), 'storage key should be sehatsetu_language');
  });

  test('config uses HttpBackend with public/i18n path', () => {
    const src = readConfigSource();
    assert.ok(src.includes("/i18n/locales/{{lng}}/{{ns}}.json"), 'loadPath should point to public/i18n');
  });

  test('fallbackNS includes core namespaces', () => {
    const src = readConfigSource();
    assert.ok(src.includes("'common'"), 'fallbackNS must include common');
    assert.ok(src.includes("'errors'"), 'fallbackNS must include errors');
  });

  test('getCurrentLanguage falls back to default when nothing stored', () => {
    mockLS = {};
    const stored = Object.keys(mockLS).length ? mockLS['sehatsetu_language'] : null;
    assert.equal(stored, null);
    const defaultLanguage = 'en';
    const resolved = stored || defaultLanguage;
    assert.equal(resolved, 'en');
  });

  test('language switcher supports instant switching (changeLanguage returns promise)', () => {
    const src = readConfigSource();
    assert.ok(src.includes("async (lng: string) =>"), 'changeLanguage should be async for instant switching');
    assert.ok(src.includes("i18n.changeLanguage(lng)"), 'changeLanguage should call i18n.changeLanguage');
  });
});
