#!/usr/bin/env node
/**
 * i18n Validation Script
 * Validates that:
 *   1. All required namespaces exist in public/ for every language
 *   2. Every public/ JSON file is valid JSON
 *   3. src/ and public/ locale trees are structurally identical
 *   4. No public/ language file has fewer top-level keys than the EN baseline
 *   5. Reports English values appearing in non-English locales (simple heuristic)
 *
 * Exit code: 0 = pass, 1 = failures found
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, '..');
const SRC_LOCALES  = join(ROOT, 'src',    'i18n', 'locales');
const PUB_LOCALES  = join(ROOT, 'public', 'i18n', 'locales');

const LANGUAGES   = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'kn'];
const NAMESPACES  = [
  'common', 'navbar', 'footer', 'home', 'about', 'auth', 'buttons', 'forms',
  'errors', 'chatbot', 'doctor', 'patient', 'appointment', 'hospital', 'labs',
  'profile', 'settings', 'validation', 'bookingFlow', 'verifyOtp',
];

// Keys whose values are intentionally identical across languages (codes, numbers, symbols, dynamic)
const SKIP_VALUE_CHECK_KEYS = new Set([
  'country', 'wave', 'e.g.28', 'e.g.165', 'e.g.62', 'e.g.137', 'e.g.137lbs',
  'cm', 'ftIn', 'kg', 'lbs', 'charCount', 'required', 'heightCm', 'weightKg',
  'visa', 'mastercard', 'upi', 'paytm', 'gpay', 'phonePe', 'paytmWallet',
  'fees500to800', 'fees800to1200',
  'locationDelhi', 'locationMumbai', 'locationPune', 'locationBengaluru', 'locationHyderabad',
  'emailPlaceholder', 'emailOptionalPlaceholder',
  'connectedToDatabase', 'defaultDate', 'defaultTime',
]);

let failures = 0;
let warnings = 0;

function fail(msg)  { console.error(`  ✗ FAIL: ${msg}`); failures++; }
function warn(msg)  { console.warn( `  ⚠ WARN: ${msg}`); warnings++; }
function ok(msg)    { console.log(  `  ✓ ${msg}`); }

/** Load and parse a JSON file; return null + record failure on parse error */
function loadJson(path) {
  if (!existsSync(path)) return null;
  try {
    let raw = readFileSync(path, 'utf-8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip UTF-8 BOM
    return JSON.parse(raw);
  } catch (e) {
    fail(`Invalid JSON: ${path}\n     ${e.message}`);
    return null;
  }
}

/** Flatten nested object into dot-delimited key → value map, skipping arrays */
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, full));
    } else {
      out[full] = v;
    }
  }
  return out;
}

/** Check key-level parity between two flat maps */
function compareKeys(baseFlat, targetFlat, context) {
  const missing = Object.keys(baseFlat).filter(k => !(k in targetFlat));
  const extra   = Object.keys(targetFlat).filter(k => !(k in baseFlat));
  if (missing.length) fail(`${context} — missing ${missing.length} keys: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` … (+${missing.length - 10} more)` : ''}`);
  if (extra.length)   warn(`${context} — ${extra.length} extra keys not in baseline: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ' …' : ''}`);
  return missing.length;
}

// ─── 1. Check all required files exist in public/ ────────────────────────────
console.log('\n══ 1. Namespace presence check (public/) ══');
for (const lang of LANGUAGES) {
  for (const ns of NAMESPACES) {
    const path = join(PUB_LOCALES, lang, `${ns}.json`);
    if (!existsSync(path)) {
      fail(`MISSING: public/${lang}/${ns}.json`);
    }
  }
}
if (!failures) ok(`All ${LANGUAGES.length * NAMESPACES.length} required files present`);

// ─── 2. JSON validity ─────────────────────────────────────────────────────────
console.log('\n══ 2. JSON validity check ══');
let jsonErrors = 0;
for (const tree of [SRC_LOCALES, PUB_LOCALES]) {
  const treeLabel = tree.includes('public') ? 'public' : 'src';
  for (const lang of LANGUAGES) {
    for (const ns of NAMESPACES) {
      const path = join(tree, lang, `${ns}.json`);
      if (!existsSync(path)) continue;
      const result = loadJson(path);
      if (result === null) jsonErrors++;
    }
  }
}
if (!jsonErrors) ok('All locale JSON files are valid');

// ─── 3. src/ vs public/ structural parity ────────────────────────────────────
console.log('\n══ 3. src/ vs public/ structural parity ══');
let syncMismatches = 0;
for (const lang of LANGUAGES) {
  for (const ns of NAMESPACES) {
    const srcPath = join(SRC_LOCALES, lang, `${ns}.json`);
    const pubPath = join(PUB_LOCALES, lang, `${ns}.json`);
    if (!existsSync(srcPath) || !existsSync(pubPath)) continue;
    const srcObj = loadJson(srcPath);
    const pubObj = loadJson(pubPath);
    if (!srcObj || !pubObj) continue;
    const srcFlat = flatten(srcObj);
    const pubFlat = flatten(pubObj);
    const missingInPub = Object.keys(srcFlat).filter(k => !(k in pubFlat));
    if (missingInPub.length) {
      fail(`public/${lang}/${ns}.json missing ${missingInPub.length} keys from src/: ${missingInPub.slice(0, 8).join(', ')}${missingInPub.length > 8 ? ' …' : ''}`);
      syncMismatches++;
    }
  }
}
if (!syncMismatches) ok('src/ and public/ are structurally in sync');

// ─── 4. Non-EN languages: key count parity vs EN baseline ────────────────────
console.log('\n══ 4. Key parity vs English baseline (public/) ══');
let parityFailures = 0;
for (const ns of NAMESPACES) {
  const enPath = join(PUB_LOCALES, 'en', `${ns}.json`);
  if (!existsSync(enPath)) continue;
  const enObj = loadJson(enPath);
  if (!enObj) continue;
  const enFlat = flatten(enObj);

  for (const lang of LANGUAGES.filter(l => l !== 'en')) {
    const langPath = join(PUB_LOCALES, lang, `${ns}.json`);
    if (!existsSync(langPath)) continue;
    const langObj = loadJson(langPath);
    if (!langObj) continue;
    const langFlat = flatten(langObj);
    const m = compareKeys(enFlat, langFlat, `public/${lang}/${ns}.json vs EN`);
    if (m) parityFailures++;
  }
}
if (!parityFailures) ok('All non-EN locale files have the same keys as EN baseline');

// ─── 5. Detect English values in non-EN locales (spot-check high-value keys) ─
console.log('\n══ 5. Translation presence check (spot-check key strings) ══');
// These keys MUST be different from EN in a properly translated file.
// We only check languages where translations are expected.
const SPOT_CHECK = {
  hi: {
    'patient.json': ['dashboard', 'myAppointments', 'bookAppointment'],
    'appointment.json': ['appointmentTitle', 'upcoming', 'cancelled'],
    'doctor.json': ['priority.P1', 'priority.P2'],
    'home.json': ['servicesSection.services', 'searchSection.findYourDoctor'],
    'buttons.json': ['specializationAll', 'resetFilters'],
    'common.json': ['loading', 'backToHome'],
  },
  bn: {
    'patient.json': ['dashboard', 'personalDetails'],
    'home.json': ['servicesSection.services'],
    'common.json': ['loading', 'backToHome'],
    'buttons.json': ['specializationAll'],
  },
  te: {
    'patient.json': ['dashboard', 'patientPortal'],
    'home.json': ['servicesSection.services'],
    'common.json': ['loading'],
    'buttons.json': ['specializationAll'],
    'doctor.json': ['priority.P1'],
  },
  mr: {
    'patient.json': ['dashboard', 'patientPortal'],
    'home.json': ['servicesSection.services'],
    'common.json': ['loading'],
    'buttons.json': ['specializationAll'],
    'doctor.json': ['priority.P1'],
  },
  ta: {
    'patient.json': ['dashboard', 'patientPortal'],
    'home.json': ['servicesSection.services'],
    'common.json': ['loading'],
    'buttons.json': ['specializationAll'],
    'doctor.json': ['priority.P1'],
  },
  kn: {
    'patient.json': ['dashboard', 'patientPortal'],
    'home.json': ['servicesSection.services'],
    'common.json': ['loading'],
    'buttons.json': ['specializationAll'],
    'doctor.json': ['priority.P1'],
  },
};

// Load EN baseline values for comparison
const enBaseline = {};
for (const ns of NAMESPACES) {
  const p = join(PUB_LOCALES, 'en', `${ns}.json`);
  if (existsSync(p)) {
    const obj = loadJson(p);
    if (obj) enBaseline[ns.replace('.json','')] = flatten(obj);
  }
}

let spotFails = 0;
for (const [lang, nsChecks] of Object.entries(SPOT_CHECK)) {
  for (const [nsFile, keys] of Object.entries(nsChecks)) {
    const ns = nsFile.replace('.json','');
    const langPath = join(PUB_LOCALES, lang, nsFile);
    if (!existsSync(langPath)) continue;
    const obj = loadJson(langPath);
    if (!obj) continue;
    const flat = flatten(obj);
    const enFlat = enBaseline[ns] || {};
    for (const key of keys) {
      const langVal = flat[key];
      const enVal   = enFlat[key];
      if (langVal === undefined) {
        fail(`${lang}/${nsFile}: key '${key}' is missing`);
        spotFails++;
      } else if (
        typeof langVal === 'string' &&
        langVal.trim() === (enVal || '').trim() &&
        !SKIP_VALUE_CHECK_KEYS.has(key) &&
        langVal.trim().length > 0
      ) {
        warn(`${lang}/${nsFile}: '${key}' still has English value: "${langVal}"`);
      } else {
        // good — has a translated value
      }
    }
  }
}
if (!spotFails) ok('All spot-checked translation keys are present');

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log(`  Failures : ${failures}`);
console.log(`  Warnings : ${warnings}`);
console.log('══════════════════════════════════════════\n');

if (failures > 0) {
  console.error('i18n validation FAILED — fix the issues above before building.\n');
  process.exit(1);
} else {
  console.log('i18n validation PASSED.\n');
  process.exit(0);
}
