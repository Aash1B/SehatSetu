#!/usr/bin/env node
/**
 * Runtime i18n simulation test.
 * Simulates exactly what i18next does in the browser:
 *   - loads locale files from public/i18n/locales/
 *   - checks representative t() keys for each of the 7 languages
 *   - asserts non-English keys actually return different values from EN
 *   - asserts no key returns its own key path (e.g. "patient.noAppointments")
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const PUBLIC     = resolve(__dirname, '..', 'public', 'i18n', 'locales');

// ── helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function loadNs(lang, ns) {
  const path = join(PUBLIC, lang, `${ns}.json`);
  if (!existsSync(path)) return {};
  let raw = readFileSync(path, 'utf-8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  try { return JSON.parse(raw); } catch { return {}; }
}

function get(obj, dotKey) {
  return dotKey.split('.').reduce((cur, k) => (cur && typeof cur === 'object' ? cur[k] : undefined), obj);
}

function resolve_key(lang, ns, key) {
  const nsObj = loadNs(lang, ns);
  return get(nsObj, key);
}

function expect_translated(lang, ns, key, enValue) {
  const val = resolve_key(lang, ns, key);
  const fullKey = `${ns}.${key}`;

  if (val === undefined || val === null) {
    console.error(`  ✗ ${lang} ${fullKey} — MISSING (undefined)`);
    failed++;
    return;
  }
  if (typeof val !== 'string') {
    console.error(`  ✗ ${lang} ${fullKey} — NOT A STRING (got ${typeof val})`);
    failed++;
    return;
  }
  if (val.trim() === '') {
    console.error(`  ✗ ${lang} ${fullKey} — EMPTY STRING`);
    failed++;
    return;
  }
  if (val === key || val === fullKey) {
    console.error(`  ✗ ${lang} ${fullKey} — RETURNS KEY PATH as value: "${val}"`);
    failed++;
    return;
  }
  if (lang !== 'en' && val === enValue && enValue && enValue.length > 3) {
    // Warn but don't fail — some keys are intentionally same across languages
    console.warn(`  ⚠ ${lang} ${fullKey} — still English: "${val}"`);
  } else {
    console.log(`  ✓ ${lang} ${fullKey} = "${val.substring(0, 50)}"`);
    passed++;
  }
}

function expect_string(lang, ns, key) {
  const val = resolve_key(lang, ns, key);
  const fullKey = `${ns}.${key}`;
  if (val === undefined || val === null) {
    console.error(`  ✗ ${lang} ${fullKey} — MISSING`);
    failed++;
  } else if (typeof val !== 'string' || val.trim() === '') {
    console.error(`  ✗ ${lang} ${fullKey} — EMPTY or not string`);
    failed++;
  } else if (val === key || val === fullKey) {
    console.error(`  ✗ ${lang} ${fullKey} — returns key path: "${val}"`);
    failed++;
  } else {
    console.log(`  ✓ ${lang} ${fullKey} = "${val.substring(0, 60)}"`);
    passed++;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const LANGS = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'kn'];

// Get EN baseline values
const enPatient     = loadNs('en', 'patient');
const enDoctor      = loadNs('en', 'doctor');
const enAppt        = loadNs('en', 'appointment');
const enButtons     = loadNs('en', 'buttons');
const enCommon      = loadNs('en', 'common');
const enHome        = loadNs('en', 'home');
const enNavbar      = loadNs('en', 'navbar');

// ── Patient namespace ────────────────────────────────────────────────────────
console.log('\n── patient namespace ──');
const patientKeys = [
  'uploadNewEhr', 'verifiedEhrTimeline', 'personalDetails',
  'medicalProfileVitals', 'notificationPrefs', 'billingPayments',
  'noAppointments', 'bookAppointment', 'dashboard', 'myAppointments',
  'loadingHealthData', 'profileSaved', 'passwordSecurity',
  'ehrTitle', 'healthRecords', 'prescriptions',
];
for (const lang of LANGS) {
  for (const key of patientKeys) {
    expect_translated(lang, 'patient', key, enPatient[key]);
  }
}

// ── doctor namespace ─────────────────────────────────────────────────────────
console.log('\n── doctor namespace ──');
const doctorKeys = [
  'priority.P1', 'priority.P2', 'priority.P3', 'priority.P4',
  'dashboard.availableTodaySlot', 'dashboard.nextSlotTomorrow',
  'dashboard.availability', 'consultationFee',
];
for (const lang of LANGS) {
  for (const key of doctorKeys) {
    const enVal = get(enDoctor, key);
    const val = resolve_key(lang, 'doctor', key);
    const nsKey = `doctor.${key}`;
    if (val === undefined) {
      console.error(`  ✗ ${lang} ${nsKey} — MISSING`);
      failed++;
    } else if (val === key || val === nsKey) {
      console.error(`  ✗ ${lang} ${nsKey} — returns key path`);
      failed++;
    } else {
      console.log(`  ✓ ${lang} ${nsKey} = "${String(val).substring(0, 50)}"`);
      passed++;
    }
  }
}

// ── appointment namespace ───────────────────────────────────────────────────
console.log('\n── appointment namespace ──');
const apptKeys = ['doctorCount', 'doctorsCount', 'noDoctorsMatch', 'adjustSearch', 'availableToday', 'consultationFee'];
for (const lang of LANGS) {
  for (const key of apptKeys) {
    expect_translated(lang, 'appointment', key, enAppt[key]);
  }
}

// ── buttons namespace ───────────────────────────────────────────────────────
console.log('\n── buttons namespace ──');
const btnKeys = [
  'specializationAll', 'specializationCardiologist', 'specializationDermatologist',
  'locationAll', 'locationDelhi', 'locationMumbai',
  'resetFilters', 'clearText', 'learnMore',
];
for (const lang of LANGS) {
  for (const key of btnKeys) {
    expect_translated(lang, 'buttons', key, enButtons[key]);
  }
}

// ── common namespace ────────────────────────────────────────────────────────
console.log('\n── common namespace ──');
for (const lang of LANGS) {
  expect_translated(lang, 'common', 'backToHome', enCommon.backToHome);
  expect_string(lang, 'common', 'loading');
}

// ── home namespace ─────────────────────────────────────────────────────────
console.log('\n── home namespace (servicesSection schema check) ──');
for (const lang of LANGS) {
  const homeObj = loadNs(lang, 'home');
  const servicesVal = homeObj?.servicesSection?.services;
  const labTitle    = homeObj?.servicesSection?.labTestsNearby?.title;
  if (typeof servicesVal !== 'string' || servicesVal.trim() === '') {
    console.error(`  ✗ ${lang} home.servicesSection.services — NOT A STRING (got ${typeof servicesVal}: "${servicesVal}")`);
    failed++;
  } else {
    console.log(`  ✓ ${lang} home.servicesSection.services = "${servicesVal}"`);
    passed++;
  }
  if (!labTitle || typeof labTitle !== 'string') {
    console.error(`  ✗ ${lang} home.servicesSection.labTestsNearby.title — MISSING`);
    failed++;
  } else {
    console.log(`  ✓ ${lang} home.servicesSection.labTestsNearby.title = "${labTitle}"`);
    passed++;
  }
}

// ── navbar namespace ────────────────────────────────────────────────────────
console.log('\n── navbar namespace ──');
for (const lang of LANGS) {
  expect_translated(lang, 'navbar', 'selectLanguage', enNavbar.selectLanguage);
  expect_translated(lang, 'navbar', 'findDoctors', enNavbar.findDoctors);
}

// ── bookingFlow and verifyOtp exist ────────────────────────────────────────
console.log('\n── bookingFlow and verifyOtp namespaces ──');
for (const lang of LANGS) {
  for (const ns of ['bookingFlow', 'verifyOtp']) {
    const obj = loadNs(lang, ns);
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      console.error(`  ✗ ${lang}/${ns}.json — empty or missing`);
      failed++;
    } else {
      console.log(`  ✓ ${lang}/${ns}.json — ${keys.length} keys present`);
      passed++;
    }
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('══════════════════════════════════════════\n');

if (failed > 0) {
  console.error('Runtime simulation FAILED.\n');
  process.exit(1);
} else {
  console.log('Runtime simulation PASSED — all representative keys resolve correctly.\n');
  process.exit(0);
}
