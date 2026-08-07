import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const LOCALES_DIR = join(ROOT, 'src', 'i18n', 'locales');

function loadJson(lang: string, ns: string): Record<string, unknown> {
  const file = join(LOCALES_DIR, lang, `${ns}.json`);
  assert.ok(existsSync(file), `Missing locale file: ${lang}/${ns}.json`);
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function leafKeys(obj: unknown, prefix = ''): string[] {
  const keys: string[] = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys.push(...leafKeys(v, full));
      } else {
        keys.push(full);
      }
    }
  }
  return keys;
}

const EN = 'en';
const HI = 'hi';

const namespaces = readdirSync(join(LOCALES_DIR, EN))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

describe('i18n locale integrity', () => {
  test('all namespace files are valid JSON for en and hi', () => {
    for (const ns of namespaces) {
      const en = loadJson(EN, ns);
      const hi = loadJson(HI, ns);
      assert.ok(en, `en/${ns}.json should not be empty`);
      assert.ok(hi, `hi/${ns}.json should not be empty`);
    }
  });

  test('every English namespace has matching Hindi namespace', () => {
    for (const ns of namespaces) {
      const enFile = join(LOCALES_DIR, HI, `${ns}.json`);
      assert.ok(existsSync(enFile), `hi/${ns}.json is missing — Hindi parity broken`);
    }
  });

  test('Hindi has all leaf keys present in English for every namespace', () => {
    for (const ns of namespaces) {
      const en = loadJson(EN, ns);
      const hi = loadJson(HI, ns);
      const enKeys = leafKeys(en);
      const hiKeys = leafKeys(hi);
      const missing = enKeys.filter((k) => !hiKeys.includes(k));
      assert.equal(missing.length, 0, `hi/${ns}.json missing keys: ${missing.join(', ')}`);
    }
  });

  test('English is the default language and Hindi is supported', () => {
    const enCommon = loadJson(EN, 'common');
    assert.equal((enCommon.brand as Record<string, string>).name, 'SehatSetu');
    const hiCommon = loadJson(HI, 'common');
    assert.equal((hiCommon.country as string), 'India', 'Hindi should use native Devanagari for country if desired');
  });
});

describe('i18n key safety (no raw keys in fallback)', () => {
  test('chatbot welcomeReplies is an array with 5 entries', () => {
    const chatbot = loadJson(EN, 'chatbot');
    assert.ok(Array.isArray(chatbot.welcomeReplies), 'welcomeReplies should be an array');
    assert.equal(chatbot.welcomeReplies.length, 5);
  });

  test('validation namespace has all expected keys', () => {
    const v = loadJson(EN, 'validation');
    assert.ok(v.required, 'validation.required missing');
    assert.ok(v.invalidEmail, 'validation.invalidEmail missing');
    assert.ok(v.passwordsDoNotMatch, 'validation.passwordsDoNotMatch missing');
  });

  test('all namespaces referenced in config exist', () => {
    const configPath = join(ROOT, 'src', 'i18n', 'config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    const nsMatch = configContent.match(/namespaceList\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(nsMatch, 'namespaceList not found in config.ts');
    const declaredNs = nsMatch[1]
      .split('\n')
      .map((l) => l.trim().replace(/['',]/g, '').trim())
      .filter(Boolean);
    for (const ns of declaredNs) {
      assert.ok(namespaces.includes(ns), `namespaceList declares '${ns}' but no en/${ns}.json file exists`);
    }
  });
});
