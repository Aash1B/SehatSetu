import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Test the progressive typing calculation logic
// Replicates the core math from useChatbot.ts startProgressiveReply:
//   duration = max(800, min(fullText.length * 30, 5000))
//   progress = elapsed / duration
//   chars = floor(fullText.length * progress)

function calculateDuration(textLength: number): number {
  return Math.max(800, Math.min(textLength * 30, 5000));
}

function calculateProgress(elapsed: number, duration: number): number {
  return Math.min(elapsed / duration, 1);
}

function calculateChars(fullTextLength: number, progress: number): number {
  return Math.floor(fullTextLength * progress);
}

describe('progressive typing calculation', () => {
  it('minimum duration is 800ms for short text', () => {
    assert.equal(calculateDuration(10), 800);
    assert.equal(calculateDuration(1), 800);
  });

  it('duration scales with text length up to 5000ms', () => {
    // 200 chars * 30 = 6000 > 5000, so capped at 5000
    assert.equal(calculateDuration(200), 5000);
    // 100 chars * 30 = 3000, between 800 and 5000
    assert.equal(calculateDuration(100), 3000);
  });

  it('maximum duration is 5000ms', () => {
    assert.equal(calculateDuration(500), 5000);
    assert.equal(calculateDuration(1000), 5000);
  });

  it('progress is clamped to 1.0', () => {
    const duration = 1000;
    assert.equal(calculateProgress(500, duration), 0.5);
    assert.equal(calculateProgress(1000, duration), 1.0);
    assert.equal(calculateProgress(2000, duration), 1.0);
  });

  it('character count scales with progress', () => {
    const text = 'Hello, World!';
    const len = text.length;

    // At 0% progress, 0 chars
    assert.equal(calculateChars(len, 0), 0);
    // At 50% progress
    assert.equal(calculateChars(len, 0.5), Math.floor(len * 0.5));
    // At 100% progress, full text
    assert.equal(calculateChars(len, 1.0), len);
  });

  it('empty text has minimum duration', () => {
    assert.equal(calculateDuration(0), 800);
  });

  it('progress of 0 yields empty partial text', () => {
    const text = 'Hello';
    const progress = calculateProgress(0, 800);
    const chars = calculateChars(text.length, progress);
    assert.equal(text.slice(0, chars), '');
  });

  it('full progress yields complete text', () => {
    const text = 'Hello, World!';
    const duration = calculateDuration(text.length);
    const progress = calculateProgress(duration, duration);
    const chars = calculateChars(text.length, progress);
    assert.equal(text.slice(0, chars), text);
  });
});

describe('useProgressiveTyping (replicated from hook)', () => {
  it('computes correct msPerChar from wordsPerMinute', () => {
    const wordsPerMinute = 40;
    const wordsPerMs = wordsPerMinute / (60 * 1000);
    const msPerWord = 1 / wordsPerMs;
    const msPerChar = msPerWord / 6;

    // 40 wpm -> 1500 ms/word -> 250 ms/char
    assert.equal(msPerChar, 250);
  });

  it('computes target chars from elapsed time', () => {
    const msPerChar = 250;
    const fullText = 'Hello, World!';
    const targetChars = Math.floor(1000 / msPerChar); // 4 chars after 1000ms
    assert.equal(targetChars, 4);
    assert.equal(fullText.slice(0, targetChars + 1), 'Hello');
  });
});
