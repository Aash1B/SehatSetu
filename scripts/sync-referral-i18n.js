const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../frontend/src/i18n/locales');
const languages = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'kn'];

const commonReferralTranslations = {
  en: {
    steps: {
      pending: 'Pending',
      scheduled: 'Scheduled',
      visited: 'Visited',
      completed: 'Completed',
      declined: 'Declined',
    },
    facilityTypes: {
      government: 'Government Hospital',
      private: 'Private Clinic',
      specialty: 'Specialty Center',
    },
    referredBy: 'Referred by',
    reason: 'Reason',
    scheduledDate: 'Scheduled Date',
    followUpNotes: 'Follow-up Notes',
    advancePipeline: 'Advance Status',
    markScheduled: 'Mark Scheduled',
    markVisited: 'Mark Visited',
    markCompleted: 'Mark Completed',
    updateStatusPrompt: 'Update Referral Details',
    selectDate: 'Scheduled Visit Date',
    addNotesOptional: 'Follow-up / ASHA Notes (optional)',
    myReferrals: 'Facility Referrals',
  },
  hi: {
    steps: {
      pending: 'लंबित',
      scheduled: 'निर्धारित',
      visited: 'दौरा किया',
      completed: 'पूर्ण',
      declined: 'अस्वीकृत',
    },
    facilityTypes: {
      government: 'सरकारी अस्पताल',
      private: 'निजी क्लिनिक',
      specialty: 'विशेषज्ञ केंद्र',
    },
    referredBy: 'द्वारा संदर्भित',
    reason: 'कारण',
    scheduledDate: 'निर्धारित तिथि',
    followUpNotes: 'फॉलो-अप नोट्स',
    advancePipeline: 'स्थिति आगे बढ़ाएं',
    markScheduled: 'निर्धारित चिह्नित करें',
    markVisited: 'दौरा किया चिह्नित करें',
    markCompleted: 'पूर्ण चिह्नित करें',
    updateStatusPrompt: 'रेफरल विवरण अपडेट करें',
    selectDate: 'निर्धारित यात्रा तिथि',
    addNotesOptional: 'फॉलो-अप / आशा नोट्स (वैकल्पिक)',
    myReferrals: 'अस्पताल रेफरल',
  },
  bn: {
    steps: {
      pending: 'মুলতুবি',
      scheduled: 'নির্ধারিত',
      visited: 'পরিদর্শিত',
      completed: 'সম্পন্ন',
      declined: 'প্রত্যাখ্যান',
    },
    facilityTypes: {
      government: 'সরকারি হাসপাতাল',
      private: 'বেসরকারি ক্লিনিক',
      specialty: 'বিশেষায়িত কেন্দ্র',
    },
    referredBy: 'দ্বারা রেফার করা হয়েছে',
    reason: 'কারণ',
    scheduledDate: 'নির্ধারিত তারিখ',
    followUpNotes: 'ফলো-আপ নোট',
    advancePipeline: 'অবস্থা এগিয়ে নিন',
    markScheduled: 'নির্ধারিত হিসেবে চিহ্নিত করুন',
    markVisited: 'পরিদর্শিত হিসেবে চিহ্নিত করুন',
    markCompleted: 'সম্পন্ন হিসেবে চিহ্নিত করুন',
    updateStatusPrompt: 'রেফারেল বিবরণ আপডেট করুন',
    selectDate: 'পরিদর্শনের তারিখ',
    addNotesOptional: 'ফলো-আপ / আশা নোট (ঐচ্ছিক)',
    myReferrals: 'হাসপাতাল রেফারেল',
  },
  te: {
    steps: {
      pending: 'పెండింగ్‌లో ఉంది',
      scheduled: 'షెడ్యూల్ చేయబడింది',
      visited: 'సందర్శించారు',
      completed: 'పూర్తయింది',
      declined: 'తిరస్కరించబడింది',
    },
    facilityTypes: {
      government: 'ప్రభుత్వ ఆసుపత్రి',
      private: 'ప్రైవేట్ క్లినిక్',
      specialty: 'స్పెషాలిటీ సెంటర్',
    },
    referredBy: 'సిఫార్సు చేసిన వారు',
    reason: 'కారణం',
    scheduledDate: 'షెడ్యూల్ తేదీ',
    followUpNotes: 'ఫాలో-అప్ నోట్స్',
    advancePipeline: 'స్థితిని ముందుకు తీసుకెళ్లండి',
    markScheduled: 'షెడ్యూల్ చేసినట్లు గుర్తించండి',
    markVisited: 'సందర్శించినట్లు గుర్తించండి',
    markCompleted: 'పూర్తయినట్లు గుర్తించండి',
    updateStatusPrompt: 'రిఫరల్ వివరాలను నవీకరించండి',
    selectDate: 'సందర్శన తేదీ',
    addNotesOptional: 'ఆశా ఫాలో-అప్ నోట్స్ (ఐచ్ఛికం)',
    myReferrals: 'ఆసుపత్రి రిఫరల్స్',
  },
  mr: {
    steps: {
      pending: 'प्रलंबित',
      scheduled: 'नियोजित',
      visited: 'भेट दिली',
      completed: 'पूर्ण झाले',
      declined: 'नाकारले',
    },
    facilityTypes: {
      government: 'शासकीय रुग्णालय',
      private: 'खाजगी क्लिनिक',
      specialty: 'विशेष केंद्र',
    },
    referredBy: 'यांच्याद्वारे संदर्भित',
    reason: 'कारण',
    scheduledDate: 'नियोजित तारीख',
    followUpNotes: 'फॉलो-अप नोंदी',
    advancePipeline: 'स्थिती पुढे करा',
    markScheduled: 'नियोजित चिन्हांकित करा',
    markVisited: 'भेट दिली चिन्हांकित करा',
    markCompleted: 'पूर्ण चिन्हांकित करा',
    updateStatusPrompt: 'रेफरल तपशील अद्यतनित करा',
    selectDate: 'नियोजित भेटीची तारीख',
    addNotesOptional: 'फॉलो-अप / आशा नोंदी (पर्यायी)',
    myReferrals: 'रुग्णालय रेफरल्स',
  },
  ta: {
    steps: {
      pending: 'நிலுவையில்',
      scheduled: 'திட்டமிடப்பட்டது',
      visited: 'பார்வையிடப்பட்டது',
      completed: 'நிறைவுற்றது',
      declined: 'நிராகரிக்கப்பட்டது',
    },
    facilityTypes: {
      government: 'அரசு மருத்துவமனை',
      private: 'தனியார் மருத்துவமனை',
      specialty: 'சிறப்பு மையம்',
    },
    referredBy: 'பரிந்துரைத்தவர்',
    reason: 'காரணம்',
    scheduledDate: 'திட்டமிடப்பட்ட தேதி',
    followUpNotes: 'பின்தொடர்தல் குறிப்புகள்',
    advancePipeline: 'நிலையை முன்னகர்த்துக',
    markScheduled: 'திட்டமிடப்பட்டது எனக் குறிக்க',
    markVisited: 'பார்வையிடப்பட்டது எனக் குறிக்க',
    markCompleted: 'நிறைவுற்றது எனக் குறிக்க',
    updateStatusPrompt: 'பரிந்துரை விவரங்களைப் புதுப்பிக்கவும்',
    selectDate: 'வருகை தேதி',
    addNotesOptional: 'பின்தொடர்தல் / ஆஷா குறிப்புகள் (விருப்பத்தேர்வு)',
    myReferrals: 'மருத்துவமனை பரிந்துரைகள்',
  },
  kn: {
    steps: {
      pending: 'ಬಾಕಿ ಉಳಿದಿದೆ',
      scheduled: 'ನಿಗದಿಯಾಗಿದೆ',
      visited: 'ಭೇಟಿ ನೀಡಲಾಗಿದೆ',
      completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
      declined: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
    },
    facilityTypes: {
      government: 'ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ',
      private: 'ಖಾಸಗಿ ಚಿಕಿತ್ಸಾಲಯ',
      specialty: 'ವಿಶೇಷ ಕೇಂದ್ರ',
    },
    referredBy: 'ಶಿಫಾರಸು ಮಾಡಿದವರು',
    reason: 'ಕಾರಣ',
    scheduledDate: 'ನಿಗದಿತ ದಿನಾಂಕ',
    followUpNotes: 'ಫಾಲೋ-ಅಪ್ ಟಿಪ್ಪಣಿಗಳು',
    advancePipeline: 'ಸ್ಥಿತಿಯನ್ನು ಮುನ್ನಡೆಸಿ',
    markScheduled: 'ನಿಗದಿಯಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    markVisited: 'ಭೇಟಿ ನೀಡಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    markCompleted: 'ಪೂರ್ಣಗೊಂಡಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    updateStatusPrompt: 'ರೆಫರಲ್ ವಿವರಗಳನ್ನು ನವೀಕರಿಸಿ',
    selectDate: 'ಭೇಟಿಯ ದಿನಾಂಕ',
    addNotesOptional: 'ಫಾಲೋ-ಅಪ್ / ಆಶಾ ಟಿಪ್ಪಣಿಗಳು (ಐಚ್ಛಿಕ)',
    myReferrals: 'ಆಸ್ಪತ್ರೆ ರೆಫರಲ್‌ಗಳು',
  },
};

const doctorReferralTranslations = {
  en: {
    modalTitle: 'Create Facility Referral',
    patient: 'Patient',
    selectFacility: 'Target Healthcare Facility',
    facilityType: 'Facility Type',
    clinicalReason: 'Clinical Reason for Referral',
    recommendedDate: 'Recommended Date of Visit (Optional)',
    additionalNotes: 'Follow-up Notes / Instructions for ASHA (Optional)',
    sendReferral: 'Create Referral',
    reasonRequired: 'Please provide a reason for referral',
    creationFailed: 'Failed to create referral',
  },
  hi: {
    modalTitle: 'अस्पताल रेफरल बनाएं',
    patient: 'मरीज़',
    selectFacility: 'लक्षित स्वास्थ्य केंद्र',
    facilityType: 'केंद्र का प्रकार',
    clinicalReason: 'रेफरल का चिकित्सीय कारण',
    recommendedDate: 'दौरे की अनुशंसित तिथि (वैकल्पिक)',
    additionalNotes: 'आशा / फॉलो-अप हेतु निर्देश (वैकल्पिक)',
    sendReferral: 'रेफरल बनाएं',
    reasonRequired: 'कृपया रेफरल का कारण प्रदान करें',
    creationFailed: 'रेफरल बनाने में विफल',
  },
  bn: {
    modalTitle: 'হাসপাতাল রেফারেল তৈরি করুন',
    patient: 'রোগী',
    selectFacility: 'টার্গেট স্বাস্থ্য কেন্দ্র',
    facilityType: 'কেন্দ্রের ধরন',
    clinicalReason: 'রেফারেলের চিকিৎসাগত কারণ',
    recommendedDate: 'পরিদর্শনের প্রস্তাবিত তারিখ (ঐচ্ছিক)',
    additionalNotes: 'আশা / ফলো-আপের জন্য নির্দেশিকা (ঐচ্ছিক)',
    sendReferral: 'রেফারেল তৈরি করুন',
    reasonRequired: 'অনুগ্রহ করে রেফারেলের একটি কারণ দিন',
    creationFailed: 'রেফারেল তৈরি করতে ব্যর্থ হয়েছে',
  },
  te: {
    modalTitle: 'ఆసుపత్రి రిఫరల్‌ను సృష్టించండి',
    patient: 'రోగి',
    selectFacility: 'లక్ష్య ఆరోగ్య కేంద్రం',
    facilityType: 'కేంద్రం రకం',
    clinicalReason: 'రిఫరల్ కోసం వైద్య కారణం',
    recommendedDate: 'సిఫార్సు చేయబడిన సందర్శన తేదీ (ఐచ్ఛಿಕం)',
    additionalNotes: 'ఆశా / ఫాలో-అప్ కోసం సూచనలు (ఐచ్ఛಿಕం)',
    sendReferral: 'రిఫరల్ సృష్టించండి',
    reasonRequired: 'దయచేసి రిఫరల్ కోసం కారణాన్ని తెలపండి',
    creationFailed: 'రిఫరల్ సృష్టించడం విఫలమైంది',
  },
  mr: {
    modalTitle: 'रुग्णालय रेफरल तयार करा',
    patient: 'रुग्ण',
    selectFacility: 'लक्षित आरोग्य केंद्र',
    facilityType: 'केंद्राचा प्रकार',
    clinicalReason: 'रेफरलचे वैद्यकीय कारण',
    recommendedDate: 'भेटीची शिफारस केलेली तारीख (पर्यायी)',
    additionalNotes: 'आशा / फॉलो-अपसाठी सूचना (पर्यायी)',
    sendReferral: 'रेफरल तयार करा',
    reasonRequired: 'कृपया रेफरलचे कारण नमूद करा',
    creationFailed: 'रेफरल तयार करण्यात अयशस्वी',
  },
  ta: {
    modalTitle: 'மருத்துவமனை பரிந்துரையை உருவாக்கவும்',
    patient: 'நோயாளி',
    selectFacility: 'இலக்கு சுகாதார மையம்',
    facilityType: 'மைய வகை',
    clinicalReason: 'பரிந்துரைக்கான மருத்துவக் காரணம்',
    recommendedDate: 'பரிந்துரைக்கப்பட்ட வருகை தேதி (விருப்பத்தேர்வு)',
    additionalNotes: 'ஆஷா / பின்தொடர்தல் குறிப்புகள் (விருப்பத்தேர்வு)',
    sendReferral: 'பரிந்துரையை உருவாக்கவும்',
    reasonRequired: 'பரிந்துரைக்கான காரணத்தைக் குறிப்பிடவும்',
    creationFailed: 'பரிந்துரையை உருவாக்குவது தோல்வியடைந்தது',
  },
  kn: {
    modalTitle: 'ಆಸ್ಪತ್ರೆ ರೆಫರಲ್ ರಚಿಸಿ',
    patient: 'ರೋಗಿ',
    selectFacility: 'ಗುರಿ ಆರೋಗ್ಯ ಕೇಂದ್ರ',
    facilityType: 'ಕೇಂದ್ರದ ಪ್ರಕಾರ',
    clinicalReason: 'ರೆಫರಲ್ ವೈದ್ಯಕೀಯ ಕಾರಣ',
    recommendedDate: 'ಶಿಫಾರಸು ಮಾಡಿದ ಭೇಟಿಯ ದಿನಾಂಕ (ಐಚ್ಛಿಕ)',
    additionalNotes: 'ಆಶಾ / ಫಾಲೋ-ಅಪ್ ಸೂಚನೆಗಳು (ಐಚ್ಛಿಕ)',
    sendReferral: 'ರೆಫರಲ್ ರಚಿಸಿ',
    reasonRequired: 'ದಯವಿಟ್ಟು ರೆಫರಲ್ ಕಾರಣವನ್ನು ತಿಳಿಸಿ',
    creationFailed: 'ರೆಫರಲ್ ರಚಿಸಲು ವಿಫಲವಾಗಿದೆ',
  },
};

for (const lang of languages) {
  const commonFile = path.join(localesDir, lang, 'common.json');
  if (fs.existsSync(commonFile)) {
    const data = JSON.parse(fs.readFileSync(commonFile, 'utf8'));
    data.referral = commonReferralTranslations[lang] || commonReferralTranslations.en;
    fs.writeFileSync(commonFile, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated common.json for ${lang}`);
  }

  const doctorFile = path.join(localesDir, lang, 'doctor.json');
  if (fs.existsSync(doctorFile)) {
    const data = JSON.parse(fs.readFileSync(doctorFile, 'utf8'));
    data.referral = doctorReferralTranslations[lang] || doctorReferralTranslations.en;
    fs.writeFileSync(doctorFile, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated doctor.json for ${lang}`);
  }

  const ashaFile = path.join(localesDir, lang, 'asha.json');
  if (fs.existsSync(ashaFile)) {
    const data = JSON.parse(fs.readFileSync(ashaFile, 'utf8'));
    if (!data.patientDetail) data.patientDetail = {};
    if (!data.patientDetail.tabs) data.patientDetail.tabs = {};
    const refTabs = {
      en: 'Referrals',
      hi: 'रेफरल',
      bn: 'রেফারেল',
      te: 'రిಫరల్స్',
      mr: 'रेफरल्स',
      ta: 'பரிந்துரைகள்',
      kn: 'ರೆಫರಲ್‌ಗಳು',
    };
    data.patientDetail.tabs.referrals = refTabs[lang] || 'Referrals';
    fs.writeFileSync(ashaFile, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated asha.json for ${lang}`);
  }
}

console.log('All referral i18n keys successfully synced across 7 languages!');
