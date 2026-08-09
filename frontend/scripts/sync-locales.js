#!/usr/bin/env node
/**
 * Locale Sync Script
 * Copies src/i18n/locales/ → public/i18n/locales/
 * Overwrites existing files. Only copies .json files.
 * Run before every production build.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT        = resolve(__dirname, '..');
const SRC_LOCALES = join(ROOT, 'src',    'i18n', 'locales');
const PUB_LOCALES = join(ROOT, 'public', 'i18n', 'locales');

let copied = 0;
let errors = 0;

function syncDir(srcDir, pubDir) {
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const pubPath = join(pubDir, entry.name);
    if (entry.isDirectory()) {
      if (!existsSync(pubPath)) {
        mkdirSync(pubPath, { recursive: true });
        console.log(`  Created dir: ${pubPath}`);
      }
      syncDir(srcPath, pubPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        // Read, strip BOM if present, validate JSON, then write
        let raw = readFileSync(srcPath, 'utf-8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip UTF-8 BOM
        JSON.parse(raw); // throws if invalid
        writeFileSync(pubPath, raw, 'utf-8');
        copied++;
      } catch (e) {
        console.error(`  ERROR: ${srcPath} — ${e.message}`);
        errors++;
      }
    }
  }
}

console.log('\nSyncing locale files: src/ → public/');
console.log(`  Source : ${SRC_LOCALES}`);
console.log(`  Target : ${PUB_LOCALES}\n`);

if (!existsSync(PUB_LOCALES)) {
  mkdirSync(PUB_LOCALES, { recursive: true });
}

syncDir(SRC_LOCALES, PUB_LOCALES);

console.log(`\nSync complete: ${copied} files copied, ${errors} errors.`);
if (errors > 0) {
  console.error('Sync FAILED — fix JSON errors above.\n');
  process.exit(1);
}
process.exit(0);
