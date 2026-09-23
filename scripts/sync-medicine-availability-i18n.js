const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../frontend/src/i18n/locales');
const languages = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'kn'];

const medicineAvailabilityTranslations = {
  en: {
    title: 'PHC / Government Medicine Availability',
    subtitle: 'Check free medicine inventory at your nearest Health Centre & Hospital',
    searchPlaceholder: 'Search medicine name (e.g. Paracetamol, Metformin)...',
    quickCheck: 'Quick check:',
    searching: 'Searching facility inventories...',
    noStockFound: 'No inventory records found for this medicine across nearby facilities. Please consult your ASHA worker or doctor for alternatives.',
    availableAtFacilities: 'Found in {{count}} health facilities:',
    inStock: 'In Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    freeGovt: 'Government Free Dispensation',
  },
  hi: {
    title: 'प्राथमिक स्वास्थ्य केंद्र / सरकारी दवा उपलब्धता',
    subtitle: 'अपने नजदीकी स्वास्थ्य केंद्र एवं अस्पताल में मुफ्त दवा स्टॉक की जांच करें',
    searchPlaceholder: 'दवा का नाम खोजें (उदा. पैरासिटामोल, मेटफॉर्मिन)...',
    quickCheck: 'त्वरित जांच:',
    searching: 'स्वास्थ्य केंद्र इन्वेंटरी खोजी जा रही है...',
    noStockFound: 'निकटवर्ती केंद्रों में इस दवा का कोई स्टॉक रिकॉर्ड नहीं मिला। कृपया अपनी आशा कार्यकर्ता या डॉक्टर से संपर्क करें।',
    availableAtFacilities: '{{count}} स्वास्थ्य केंद्रों में उपलब्ध:',
    inStock: 'उपलब्ध',
    lowStock: 'कम स्टॉक',
    outOfStock: 'स्टॉक समाप्त',
    freeGovt: 'सरकारी मुफ्त वितरण',
  },
  bn: {
    title: 'পিএইচসি / সরকারি ওষুধের প্রাপ্যতা',
    subtitle: 'নিকটবর্তী স্বাস্থ্য কেন্দ্র ও হাসপাতালে বিনামূল্যে ওষুধের স্টক পরীক্ষা করুন',
    searchPlaceholder: 'ওষুধের নাম অনুসন্ধান করুন (যেমন প্যারাসিটামল, মেটফর্মিন)...',
    quickCheck: 'দ্রুত পরীক্ষা:',
    searching: 'স্বাস্থ্য কেন্দ্রের স্টক অনুসন্ধান করা হচ্ছে...',
    noStockFound: 'কাছাকাছি কোনো কেন্দ্রে এই ওষুধের স্টক পাওয়া যায়নি। অনুগ্রহ করে আশা কর্মী বা ডাক্তারের পরামর্শ নিন।',
    availableAtFacilities: '{{count}}টি স্বাস্থ্য কেন্দ্রে উপলব্ধ:',
    inStock: 'মজুদ আছে',
    lowStock: 'সীমিত স্টক',
    outOfStock: 'স্টক শেষ',
    freeGovt: 'সরকারি বিনামূল্যে বিতরণ',
  },
  te: {
    title: 'PHC / ప్రభుత్వ మందుల లభ్యత',
    subtitle: 'మీ సమీప ఆరోగ్య కేంద్రం & ఆసుపత్రిలో ఉచిత మందుల నిల్వలను తనిఖీ చేయండి',
    searchPlaceholder: 'మందు పేరును శోధించండి (ఉదా. పారాసిటమాల్, మెట్‌ఫార్మిన్)...',
    quickCheck: 'త్వరిత తనిఖీ:',
    searching: 'ఆరోగ్య కేంద్రాల నిల్వలను శోధిస్తోంది...',
    noStockFound: 'సమీప కేంద్రాలలో ఈ ఔషధ నిల్వలు కనుగొనబడలేదు. దయచేసి మీ ఆశా కార్యకర్త లేదా వైద్యుడిని సంప్రదించండి.',
    availableAtFacilities: '{{count}} ఆరోగ్య కేంద్రాలలో అందుబాటులో ఉంది:',
    inStock: 'నిల్వ ఉంది',
    lowStock: 'తక్కువ నిల్వ',
    outOfStock: 'నిల్వ అయిపోయింది',
    freeGovt: 'ప్రభుత్వ ఉచిత పంపిణీ',
  },
  mr: {
    title: 'प्राथमिक आरोग्य केंद्र / सरकारी औषध उपलब्धता',
    subtitle: 'तुमच्या जवळच्या आरोग्य केंद्र आणि रुग्णालयात मोफत औषध साठा तपासा',
    searchPlaceholder: 'औषधाचे नाव शोधा (उदा. पॅरासिटामॉल, मेटफॉर्मिन)...',
    quickCheck: 'द्रुत तपासणी:',
    searching: 'आरोग्य केंद्रांचा साठा शोधत आहे...',
    noStockFound: 'जवळपासच्या केंद्रांवर या औषधाचा कोणताही साठा आढळला नाही. कृपया आशा कार्यकर्त्या किंवा डॉक्टरांशी संपर्क साधा.',
    availableAtFacilities: '{{count}} आरोग्य केंद्रांमध्ये उपलब्ध:',
    inStock: 'उपलब्ध',
    lowStock: 'कमी साठा',
    outOfStock: 'साठा संपला',
    freeGovt: 'सरकारी मोफत वाटप',
  },
  ta: {
    title: 'ஆரம்ப சுகாதார நிலையம் / அரசு மருந்து இருப்பு',
    subtitle: 'அருகிலுள்ள சுகாதார நிலையம் மற்றும் மருத்துவமனையில் இலவச மருந்து இருப்பைச் சரிபார்க்கவும்',
    searchPlaceholder: 'மருந்தின் பெயரைத் தேடுங்கள் (எ.கா. பாராசிட்டமால், மெட்ஃபோர்மின்)...',
    quickCheck: 'விரைவு சோதனை:',
    searching: 'மருந்து இருப்பு தேடப்படுகிறது...',
    noStockFound: 'அருகிலுள்ள மையங்களில் இந்த மருந்தின் இருப்பு இல்லை. உங்கள் ஆஷா பணியாளர் அல்லது மருத்துவரை அணுகவும்.',
    availableAtFacilities: '{{count}} சுகாதார மையங்களில் கிடைக்கிறது:',
    inStock: 'இருப்பில் உள்ளது',
    lowStock: 'குறைந்த இருப்பு',
    outOfStock: 'இருப்பு இல்லை',
    freeGovt: 'அரசு இலவச விநியோகம்',
  },
  kn: {
    title: 'ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರ / ಸರ್ಕಾರಿ ಔಷಧಿ ಲಭ್ಯತೆ',
    subtitle: 'ನಿಮ್ಮ ಹತ್ತಿರದ ಆರೋಗ್ಯ ಕೇಂದ್ರ ಮತ್ತು ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಉಚಿತ ಔಷಧಿ ದಾಸ್ತಾನು ಪರಿಶೀಲಿಸಿ',
    searchPlaceholder: 'ಔಷಧಿಯ ಹೆಸರನ್ನು ಹುಡುಕಿ (ಉದಾ. ಪ್ಯಾರಸಿಟಮಾಲ್, ಮೆಟ್‌ಫಾರ್ಮಿನ್)...',
    quickCheck: 'ತ್ವರಿತ ಪರಿಶೀಲನೆ:',
    searching: 'ಆರೋಗ್ಯ ಕೇಂದ್ರಗಳ ದಾಸ್ತಾನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
    noStockFound: 'ಹತ್ತಿರದ ಕೇಂದ್ರಗಳಲ್ಲಿ ಈ ಔಷಧಿಯ ದಾಸ್ತಾನು ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆಶಾ ಕಾರ್ಯಕರ್ತೆ ಅಥವಾ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    availableAtFacilities: '{{count}} ಆರೋಗ್ಯ ಕೇಂದ್ರಗಳಲ್ಲಿ ಲಭ್ಯವಿದೆ:',
    inStock: 'ದಾಸ್ತಾನು ಲಭ್ಯವಿದೆ',
    lowStock: 'ಕಡಿಮೆ ದಾಸ್ತಾನು',
    outOfStock: 'ದಾಸ್ತಾನು ಮುಗಿದಿದೆ',
    freeGovt: 'ಸರ್ಕಾರಿ ಉಚಿತ ವಿತರಣೆ',
  },
};

for (const lang of languages) {
  const patientFile = path.join(localesDir, lang, 'patient.json');
  if (fs.existsSync(patientFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(patientFile, 'utf8'));
      data.medicineAvailability = {
        ...(data.medicineAvailability || {}),
        ...medicineAvailabilityTranslations[lang],
      };
      fs.writeFileSync(patientFile, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated ${patientFile}`);
    } catch (e) {
      console.error(`Error updating ${patientFile}:`, e);
    }
  }
}

console.log('Medicine availability i18n synchronization complete.');
