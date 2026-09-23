const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../frontend/src/i18n/locales');
const languages = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'kn'];

const doctorDiagnosticsTranslations = {
  en: {
    nameRequired: 'Please enter a test name',
    orderFailed: 'Failed to create diagnostic order',
    orderNewTest: 'Order Diagnostic Investigation',
    orderSubtitle: 'Request lab or imaging tests for',
    quickSelect: 'Quick Select Standard Test',
    testName: 'Test Name',
    testType: 'Investigation Type',
    instructions: 'Instructions for Patient & Phlebotomist / Lab (Optional)',
    submitOrder: 'Order Investigation',
    activeOrders: 'Ordered Tests & Lab Results',
    noOrders: 'No diagnostic investigations ordered for this patient yet.',
    reviewResultTitle: 'Enter Clinical Finding / Diagnostic Summary',
    statusPending: 'Sample / Test Pending',
    statusReportUploaded: 'Report Uploaded',
    statusReviewed: 'Reviewed & Synced to EHR',
    reviewFindings: 'Review & Enter Findings',
    saveToEhr: 'Save Finding to Patient EHR',
    reviewPlaceholder: 'Document clinical conclusions, abnormal flags, or follow-up recommendations...',
  },
  hi: {
    nameRequired: 'कृपया जांच का नाम दर्ज करें',
    orderFailed: 'नैदानिक परीक्षण आदेश बनाने में विफल',
    orderNewTest: 'नैदानिक परीक्षण का आदेश दें',
    orderSubtitle: 'के लिए प्रयोगशाला या इमेजिंग परीक्षण का अनुरोध करें',
    quickSelect: 'मानक परीक्षण तुरंत चुनें',
    testName: 'परीक्षण का नाम',
    testType: 'जांच का प्रकार',
    instructions: 'रोगी एवं प्रयोगशाला/फ्लेबोटोमिस्ट हेतु निर्देश (वैकल्पिक)',
    submitOrder: 'परीक्षण आदेश दें',
    activeOrders: 'आदेशित परीक्षण एवं प्रयोगशाला परिणाम',
    noOrders: 'इस रोगी के लिए अभी तक कोई नैदानिक परीक्षण आदेशित नहीं किया गया है।',
    reviewResultTitle: 'नैदानिक निष्कर्ष / सारांश दर्ज करें',
    statusPending: 'नमूना / परीक्षण लंबित',
    statusReportUploaded: 'रिपोर्ट अपलोड की गई',
    statusReviewed: 'समीक्षित एवं ईएचआर में सिंक',
    reviewFindings: 'समीक्षा करें एवं निष्कर्ष दर्ज करें',
    saveToEhr: 'रोगी ईएचआर में निष्कर्ष सहेजें',
    reviewPlaceholder: 'नैदानिक निष्कर्ष, असामान्य मान या अनुवर्ती सिफारिशें लिखें...',
  },
  bn: {
    nameRequired: 'অনুগ্রহ করে পরীক্ষার নাম লিখুন',
    orderFailed: 'ডায়াগনস্টিক অর্ডার তৈরি করতে ব্যর্থ হয়েছে',
    orderNewTest: 'ডায়াগনস্টিক পরীক্ষার নির্দেশ দিন',
    orderSubtitle: 'এর জন্য ল্যাব বা ইমেজিং পরীক্ষার অনুরোধ করুন',
    quickSelect: 'সাধারণ পরীক্ষা দ্রুত নির্বাচন করুন',
    testName: 'পরীক্ষার নাম',
    testType: 'তদন্তের ধরন',
    instructions: 'রোগী এবং ল্যাবের জন্য নির্দেশাবলী (ঐচ্ছিক)',
    submitOrder: 'পরীক্ষার নির্দেশ দিন',
    activeOrders: 'নির্দেশিত পরীক্ষা এবং ল্যাব ফলাফল',
    noOrders: 'এই রোগীর জন্য এখনও কোনও ডায়াগনস্টিক পরীক্ষা নির্দেশ দেওয়া হয়নি।',
    reviewResultTitle: 'ক্লিনিক্যাল ফলাফল / ডায়াগনস্টিক সারাংশ লিখুন',
    statusPending: 'নমুনা / পরীক্ষা বাকি',
    statusReportUploaded: 'রিপোর্ট আপলোড করা হয়েছে',
    statusReviewed: 'পর্যালোচিত এবং ইএইচআর-এ সংরক্ষিত',
    reviewFindings: 'পর্যালোচনা করুন এবং ফলাফল লিখুন',
    saveToEhr: 'রোগীর ইএইচআর-এ ফলাফল সংরক্ষণ করুন',
    reviewPlaceholder: 'ক্লিনিক্যাল উপসংহার, অস্বাভাবিক ফলাফল বা সুপারিশ লিখুন...',
  },
  te: {
    nameRequired: 'దయచేసి పరీక్ష పేరు నమోదు చేయండి',
    orderFailed: 'డయాగ్నస్టిక్ ఆర్డర్ సృష్టించడంలో విఫలమైంది',
    orderNewTest: 'డయాగ్నస్టిక్ పరీక్షను ఆర్డర్ చేయండి',
    orderSubtitle: 'కొరకు ల్యాబ్ లేదా ఇమేజింగ్ పరీక్షలను అభ్యర్థించండి',
    quickSelect: 'ప్రామాణిక పరీక్షను త్వరగా ఎంచుకోండి',
    testName: 'పరీక్ష పేరు',
    testType: 'పరిశోధన రకం',
    instructions: 'రోగి & ల్యాబ్ కోసం సూచనలు (ఐచ్ఛికం)',
    submitOrder: 'పరీక్షను ఆర్డర్ చేయండి',
    activeOrders: 'ఆర్డర్ చేసిన పరీక్షలు & ల్యాబ్ ఫలితాలు',
    noOrders: 'ఈ రోగికి ఇంకా ఎలాంటి డయాగ్నస్టిక్ పరీక్షలు ఆర్డర్ చేయలేదు.',
    reviewResultTitle: 'క్లినికల్ ఫలితాలు / సారాంశం నమోదు చేయండి',
    statusPending: 'నమూనా / పరీక్ష పెండింగ్‌లో ఉంది',
    statusReportUploaded: 'నివేదిక అప్‌లోడ్ చేయబడింది',
    statusReviewed: 'సమీక్షించబడింది & EHRకి సమకాలీకరించబడింది',
    reviewFindings: 'సమీక్షించండి & ఫలితాలను నమోదు చేయండి',
    saveToEhr: 'రోగి EHRలో ఫలితాలను సేవ్ చేయండి',
    reviewPlaceholder: 'క్లినికల్ ఫలితాలు, అసాధారణ వివరాలు లేదా తదుపరి సిఫార్సులను రాయండి...',
  },
  mr: {
    nameRequired: 'कृपया चाचणीचे नाव प्रविष्ट करा',
    orderFailed: 'निदान चाचणी ऑर्डर तयार करण्यात अयशस्वी',
    orderNewTest: 'निदान चाचणीची ऑर्डर द्या',
    orderSubtitle: 'साठी लॅब किंवा इमेजिंग चाचणीची विनंती करा',
    quickSelect: 'मानक चाचणी द्रुत निवडा',
    testName: 'चाचणीचे नाव',
    testType: 'तपासणीचा प्रकार',
    instructions: 'रुग्ण आणि प्रयोगशाळेसाठी सूचना (पर्यायी)',
    submitOrder: 'चाचणी ऑर्डर द्या',
    activeOrders: 'ऑर्डर केलेल्या चाचण्या आणि लॅब निकाल',
    noOrders: 'या रुग्णासाठी अद्याप कोणत्याही चाचण्या ऑर्डर केलेल्या नाहीत.',
    reviewResultTitle: 'क्लिनिकल निष्कर्ष / निदान सारांश नोंदवा',
    statusPending: 'नमुना / चाचणी प्रलंबित',
    statusReportUploaded: 'अहवाल अपलोड केला',
    statusReviewed: 'पुनरावलोकन केले आणि EHR मध्ये सेव्ह केले',
    reviewFindings: 'पुनरावलोकन करा आणि निष्कर्ष नोंदवा',
    saveToEhr: 'रुग्ण EHR मध्ये निष्कर्ष सेव्ह करा',
    reviewPlaceholder: 'क्लिनिकल निष्कर्ष, असामान्य बाबी किंवा पुढील सूचना लिहा...',
  },
  ta: {
    nameRequired: 'பரிசோதனையின் பெயரை உள்ளிடவும்',
    orderFailed: 'பரிசோதனை ஆணையை உருவாக்க முடியவில்லை',
    orderNewTest: 'மருத்துவ பரிசோதனை ஆணை விடுங்கள்',
    orderSubtitle: 'க்கான ஆய்வக அல்லது ஸ்கேன் பரிசோதனையைக் கோருங்கள்',
    quickSelect: 'நிலையான சோதனையை விரைவாகத் தேர்வுசெய்க',
    testName: 'சோதனையின் பெயர்',
    testType: 'பரிசோதனை வகை',
    instructions: 'நோயாளி மற்றும் ஆய்வகத்திற்கான வழிமுறைகள் (விருப்பத்தேர்வு)',
    submitOrder: 'பரிசோதனைக்கு உத்தரவிடுங்கள்',
    activeOrders: 'பரிந்துரைக்கப்பட்ட சோதனைகள் & முடிவுகள்',
    noOrders: 'இந்த நோயாளிக்கு இன்னும் எந்த சோதனையும் பரிந்துரைக்கப்படவில்லை.',
    reviewResultTitle: 'மருத்துவ கண்டுபிடிப்புகள் / சுருக்கத்தை உள்ளிடவும்',
    statusPending: 'மாதிரி / சோதனை நிலுவையில் உள்ளது',
    statusReportUploaded: 'அறிக்கை பதிவேற்றப்பட்டது',
    statusReviewed: 'மதிப்பாய்வு செய்யப்பட்டு EHR-ல் சேமிக்கப்பட்டது',
    reviewFindings: 'மதிப்பாய்வு செய்து முடிவுகளைப் பதிவுசெய்க',
    saveToEhr: 'EHR-ல் முடிவுகளைப் பதிவு செய்க',
    reviewPlaceholder: 'மருத்துவ முடிவுகள், அசாதாரண அளவுகள் அல்லது பரிந்துரைகளை எழுதவும்...',
  },
  kn: {
    nameRequired: 'ದಯವಿಟ್ಟು ಪರೀಕ್ಷೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ',
    orderFailed: 'ಡಯಾಗ್ನೋಸ್ಟಿಕ್ ಆರ್ಡರ್ ರಚಿಸಲು ವಿಫಲವಾಗಿದೆ',
    orderNewTest: 'ಡಯಾಗ್ನೋಸ್ಟಿಕ್ ಪರೀಕ್ಷೆಯನ್ನು ಆದೇಶಿಸಿ',
    orderSubtitle: 'ಗಾಗಿ ಲ್ಯಾಬ್ ಅಥವಾ ಸ್ಕ್ಯಾನ್ ಪರೀಕ್ಷೆಗಳನ್ನು ವಿನಂತಿಸಿ',
    quickSelect: 'ಪ್ರಮಾಣಿತ ಪರೀಕ್ಷೆಯನ್ನು ತ್ವರಿತವಾಗಿ ಆಯ್ಕೆಮಾಡಿ',
    testName: 'ಪರೀಕ್ಷೆಯ ಹೆಸರು',
    testType: 'ತಪಾಸಣೆಯ ಪ್ರಕಾರ',
    instructions: 'ರೋಗಿ ಮತ್ತು ಲ್ಯಾಬ್‌ಗೆ ಸೂಚನೆಗಳು (ಐಚ್ಛಿಕ)',
    submitOrder: 'ಪರೀಕ್ಷೆಯನ್ನು ಆದೇಶಿಸಿ',
    activeOrders: 'ಆದೇಶಿಸಲಾದ ಪರೀಕ್ಷೆಗಳು ಮತ್ತು ಫಲಿತಾಂಶಗಳು',
    noOrders: 'ಈ ರೋಗಿಗೆ ಇನ್ನೂ ಯಾವುದೇ ಪರೀಕ್ಷೆಗಳನ್ನು ಆದೇಶಿಸಲಾಗಿಲ್ಲ.',
    reviewResultTitle: 'ಕ್ಲಿನಿಕಲ್ ಸಂಶೋಧನೆಗಳು / ಸಾರಾಂಶವನ್ನು ನಮೂದಿಸಿ',
    statusPending: 'ಮಾದರಿ / ಪರೀಕ್ಷೆ ಬಾಕಿ ಇದೆ',
    statusReportUploaded: 'ವರದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಲಾಗಿದೆ',
    statusReviewed: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ ಮತ್ತು EHR ಗೆ ಸಿಂಕ್ ಮಾಡಲಾಗಿದೆ',
    reviewFindings: 'ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಸಂಶೋಧನೆಗಳನ್ನು ದಾಖಲಿಸಿ',
    saveToEhr: 'ರೋಗಿಯ EHR ನಲ್ಲಿ ಫಲಿತಾಂಶಗಳನ್ನು ಉಳಿಸಿ',
    reviewPlaceholder: 'ಕ್ಲಿನಿಕಲ್ ತೀರ್ಮಾನಗಳು, ಅಸಹಜ ಅಂಶಗಳು ಅಥವಾ ಶಿಫಾರಸುಗಳನ್ನು ಬರೆಯಿರಿ...',
  },
};

const patientDiagnosticsTranslations = {
  en: {
    pendingTestsTitle: 'Diagnostic Tests & Lab Orders',
    awaitingCompletion: 'awaiting completion or review',
    allCompleted: 'All diagnostic investigations completed & synced to EHR',
    reportUploaded: 'Report Uploaded (Under Review)',
    samplePending: 'Sample / Report Pending',
    uploadReport: 'Upload Lab Report / Scan',
    uploading: 'Uploading...',
    reviewedByDoctor: 'Reviewed by Doctor & Synced to EHR',
    clinicalSummary: 'Clinical Finding / Doctor Summary',
  },
  hi: {
    pendingTestsTitle: 'नैदानिक परीक्षण एवं प्रयोगशाला आदेश',
    awaitingCompletion: 'परीक्षण या समीक्षा की प्रतीक्षा में',
    allCompleted: 'सभी नैदानिक परीक्षण पूरे हो गए और ईएचआर में सिंक हो गए',
    reportUploaded: 'रिपोर्ट अपलोड की गई (समीक्षाधीन)',
    samplePending: 'नमूना / रिपोर्ट लंबित',
    uploadReport: 'लैब रिपोर्ट / स्कैन अपलोड करें',
    uploading: 'अपलोड हो रहा है...',
    reviewedByDoctor: 'डॉक्टर द्वारा समीक्षित और ईएचआर में सिंक',
    clinicalSummary: 'नैदानिक निष्कर्ष / डॉक्टर का सारांश',
  },
  bn: {
    pendingTestsTitle: 'ডায়াগনস্টিক পরীক্ষা এবং ল্যাব অর্ডার',
    awaitingCompletion: 'সমাপ্তি বা পর্যালোচনার অপেক্ষায় রয়েছে',
    allCompleted: 'সমস্ত পরীক্ষা সম্পন্ন এবং ইএইচআর-এ সিঙ্ক হয়েছে',
    reportUploaded: 'রিপোর্ট আপলোড করা হয়েছে (পর্যালোচনাধীন)',
    samplePending: 'নমুনা / রিপোর্ট বাকি আছে',
    uploadReport: 'ল্যাব রিপোর্ট / স্ক্যান আপলোড করুন',
    uploading: 'আপলোড হচ্ছে...',
    reviewedByDoctor: 'ডাক্তার দ্বারা পর্যালোচিত এবং ইএইচআর-এ সংরক্ষিত',
    clinicalSummary: 'ক্লিনিক্যাল ফলাফল / ডাক্তারের সারাংশ',
  },
  te: {
    pendingTestsTitle: 'డయాగ్నస్టిక్ పరీక్షలు & ల్యాబ్ ఆర్డర్లు',
    awaitingCompletion: 'పూర్తి లేదా సమీక్ష కోసం వేచి ఉంది',
    allCompleted: 'అన్ని పరీక్షలు పూర్తయ్యాయి మరియు EHRకి సమకాలీకరించబడ్డాయి',
    reportUploaded: 'నివేదిక అప్‌లోడ్ చేయబడింది (సమీక్షలో ఉంది)',
    samplePending: 'నమూనా / నివేదిక పెండింగ్‌లో ఉంది',
    uploadReport: 'ల్యాబ్ నివేదిక / స్కాన్ అప్‌లోడ్ చేయండి',
    uploading: 'అప్‌లోడ్ అవుతోంది...',
    reviewedByDoctor: 'వైద్యునిచే సమీక్షించబడింది మరియు EHRకి సమకాలీకరించబడింది',
    clinicalSummary: 'క్లినికల్ ఫలితాలు / వైద్యుని సారాంశం',
  },
  mr: {
    pendingTestsTitle: 'निदान चाचण्या आणि लॅब ऑर्डर्स',
    awaitingCompletion: 'पूर्ण होण्याची किंवा पुनरावलोकनाची वाट पाहत आहे',
    allCompleted: 'सर्व चाचण्या पूर्ण झाल्या आणि EHR मध्ये सेव्ह झाल्या',
    reportUploaded: 'अहवाल अपलोड केला (पुनरावलोकन चालू आहे)',
    samplePending: 'नमुना / अहवाल प्रलंबित',
    uploadReport: 'लॅब अहवाल / स्कॅन अपलोड करा',
    uploading: 'अपलोड होत आहे...',
    reviewedByDoctor: 'डॉक्टरांनी पुनरावलोकन केले आणि EHR मध्ये सेव्ह केले',
    clinicalSummary: 'क्लिनिकल निष्कर्ष / डॉक्टरांचा सारांश',
  },
  ta: {
    pendingTestsTitle: 'பரிசோதனைகள் மற்றும் ஆய்வக ஆணைகள்',
    awaitingCompletion: 'முடிவு அல்லது மதிப்பாய்வுக்காக காத்திருக்கிறது',
    allCompleted: 'அனைத்து சோதனைகளும் முடிந்து EHR-ல் சேமிக்கப்பட்டன',
    reportUploaded: 'அறிக்கை பதிவேற்றப்பட்டது (மதிப்பாய்வில்)',
    samplePending: 'மாதிரி / அறிக்கை நிலுவையில் உள்ளது',
    uploadReport: 'ஆய்வக அறிக்கை / ஸ்கேன் பதிவேற்றவும்',
    uploading: 'பதிவேற்றப்படுகிறது...',
    reviewedByDoctor: 'மருத்துவரால மதிப்பாய்வு செய்யப்பட்டு EHR-ல் சேமிக்கப்பட்டது',
    clinicalSummary: 'மருத்துவ கண்டுபிடிப்புகள் / மருத்துவரின் சுருக்கம்',
  },
  kn: {
    pendingTestsTitle: 'ಡಯಾಗ್ನೋಸ್ಟಿಕ್ ಪರೀಕ್ಷೆಗಳು ಮತ್ತು ಲ್ಯಾಬ್ ಆದೇಶಗಳು',
    awaitingCompletion: 'ಪೂರ್ಣಗೊಳಿಸುವಿಕೆ ಅಥವಾ ಪರಿಶೀಲನೆಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ',
    allCompleted: 'ಎಲ್ಲಾ ಪರೀಕ್ಷೆಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ ಮತ್ತು EHR ಗೆ ಸಿಂಕ್ ಆಗಿವೆ',
    reportUploaded: 'ವರದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಲಾಗಿದೆ (ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ)',
    samplePending: 'ಮಾದರಿ / ವರದಿ ಬಾಕಿ ಇದೆ',
    uploadReport: 'ಲ್ಯಾಬ್ ವರದಿ / ಸ್ಕ್ಯಾನ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    uploading: 'ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    reviewedByDoctor: 'ವೈದ್ಯರಿಂದ ಪರಿಶೀಲಿಸಲಾಗಿದೆ ಮತ್ತು EHR ಗೆ ಸಿಂಕ್ ಮಾಡಲಾಗಿದೆ',
    clinicalSummary: 'ಕ್ಲಿನಿಕಲ್ ಸಂಶೋಧನೆಗಳು / ವೈದ್ಯರ ಸಾರಾಂಶ',
  },
};

for (const lang of languages) {
  const doctorFile = path.join(localesDir, lang, 'doctor.json');
  if (fs.existsSync(doctorFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(doctorFile, 'utf8'));
      data.diagnostics = { ...(data.diagnostics || {}), ...doctorDiagnosticsTranslations[lang] };
      fs.writeFileSync(doctorFile, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated ${doctorFile}`);
    } catch (e) {
      console.error(`Error updating ${doctorFile}:`, e);
    }
  }

  const patientFile = path.join(localesDir, lang, 'patient.json');
  if (fs.existsSync(patientFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(patientFile, 'utf8'));
      data.diagnostics = { ...(data.diagnostics || {}), ...patientDiagnosticsTranslations[lang] };
      fs.writeFileSync(patientFile, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated ${patientFile}`);
    } catch (e) {
      console.error(`Error updating ${patientFile}:`, e);
    }
  }
}

console.log('Diagnostic i18n synchronization complete.');
