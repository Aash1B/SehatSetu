/**
 * SehatSetu i18n Validation Script
 * Validates translation files for completeness and correctness
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const LANGUAGES = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'kn'];
const REQUIRED_NAMESPACES = [
  'common',
  'navbar',
  'footer',
  'home',
  'about',
  'auth',
  'buttons',
  'forms',
  'errors',
  'chatbot',
  'doctor',
  'patient',
  'appointment',
  'hospital',
  'labs',
  'profile',
  'settings',
  'validation',
  'bookingFlow',
  'verifyOtp'
];

function readJsonFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    return { success: true, data: JSON.parse(content), error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

function getKeysFromObject(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj || {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getKeysFromObject(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function validateTranslationFiles() {
  console.log('🔍 Starting i18n validation...\n');

  const results = {
    totalErrors: 0,
    totalWarnings: 0,
    filesWithErrors: [],
    missingKeys: {},
    objectKeys: []
  };

  for (const lang of LANGUAGES) {
    console.log(`\n📋 Checking language: ${lang}`);
    const langDir = path.join(LOCALES_DIR, lang);

    if (!fs.existsSync(langDir)) {
      console.log(`  ❌ Language directory not found: ${langDir}`);
      results.totalErrors++;
      continue;
    }

    for (const namespace of REQUIRED_NAMESPACES) {
      const filePath = path.join(langDir, `${namespace}.json`);

      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  Missing namespace: ${namespace}.json`);
        results.totalWarnings++;
        if (!results.missingKeys[lang]) results.missingKeys[lang] = [];
        results.missingKeys[lang].push(namespace);
        continue;
      }

      const { success, data, error } = readJsonFile(filePath);

      if (!success) {
        console.log(`  ❌ Invalid JSON in ${namespace}.json: ${error}`);
        results.totalErrors++;
        results.filesWithErrors.push(`${lang}/${namespace}.json`);
        continue;
      }

      const keys = getKeysFromObject(data);

      // Check for object keys that should be strings
      for (const key of keys) {
        const parts = key.split('.');
        let current = data;
        let valid = true;
        for (const part of parts) {
          if (current && current[part] && typeof current[part] === 'object' && current[part] !== null && !Array.isArray(current[part])) {
            results.objectKeys.push({ lang, namespace, key: `${key}.${part}` });
            valid = false;
            break;
          }
          current = current?.[part];
        }
      }

      console.log(`  ✓ ${namespace}.json - ${keys.length} keys`);
    }
  }

  // Summary
  console.log('\n\n📊 VALIDATION SUMMARY');
  console.log('=====================');
  console.log(`Total Errors: ${results.totalErrors}`);
  console.log(`Total Warnings: ${results.totalWarnings}`);
  console.log(`Files with JSON errors: ${results.filesWithErrors.length}`);

  if (results.missingKeys && Object.keys(results.missingKeys).length > 0) {
    console.log('\nMissing namespaces by language:');
    for (const [lang, namespaces] of Object.entries(results.missingKeys)) {
      console.log(`  ${lang}: ${namespaces.join(', ')}`);
    }
  }

  if (results.objectKeys.length > 0) {
    console.log('\nKeys that resolve to objects (should be strings):');
    for (const { lang, namespace, key } of results.objectKeys) {
      console.log(`  ${lang}/${namespace}.json: ${key}`);
    }
  }

  console.log('\n✅ Validation complete!');
}

validateTranslationFiles();