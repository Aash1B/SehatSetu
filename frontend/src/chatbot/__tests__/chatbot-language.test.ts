import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const chatApiPath = resolve(__dirname, '../services/chatApi.ts');

function readChatApiSource(): string {
  return readFileSync(chatApiPath, 'utf-8');
}

describe('chatbot language propagation', () => {
  test('ChatRequest interface includes optional language field', () => {
    const src = readChatApiSource();
    const reqStart = src.indexOf('export interface ChatRequest');
    const reqEnd = src.indexOf('}', reqStart);
    const reqBlock = src.slice(reqStart, reqEnd);
    assert.ok(reqBlock.includes('language?'), 'ChatRequest should have optional language field');
    assert.ok(reqStart > -1, 'ChatRequest interface should exist');
  });

  test('ChatRequest language field is typed as en | hi', () => {
    const src = readChatApiSource();
    assert.ok(src.includes("language?: 'en' | 'hi'"), 'language field must be typed as \'en\' | \'hi\'');
  });

  test('sendChatMessage injects language from getCurrentLanguage', () => {
    const src = readChatApiSource();
    const idx = src.indexOf('export async function sendChatMessage');
    const fnEnd = src.indexOf('\nexport', idx + 1);
    const fnBlock = fnEnd > idx ? src.slice(idx, fnEnd) : src.slice(idx);
    assert.ok(fnBlock.includes('getCurrentLanguage'), 'sendChatMessage must read current language');
    assert.ok(fnBlock.includes('language'), 'sendChatMessage must include language in payload');
    assert.ok(fnBlock.includes("'hi'"), 'sendChatMessage must map hi language');
    assert.ok(fnBlock.includes("'en'"), 'sendChatMessage must map en language');
  });

  test('sendChatMessage spreads request and adds language (backward compatible)', () => {
    const src = readChatApiSource();
    assert.ok(src.includes('{ ...request, language }'),
      'Request should be spread with language added, preserving existing fields');
  });

  test('getHeaders sends Authorization only when token exists', () => {
    const src = readChatApiSource();
    assert.ok(src.includes('Authorization'), 'getHeaders should include Authorization header');
    assert.ok(src.includes('Bearer'), 'getHeaders should set Bearer token');
  });
});
