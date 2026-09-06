import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { setCurrentPage } from '../patient/store/uiSlice';
import Navbar from '../patient/components/Navbar';
import Sidebar from '../patient/components/Sidebar';
import Footer from '../patient/components/Footer';
import FloatingEmergencyButton from '../patient/components/FloatingEmergencyButton';

import './About.css';

const features = [
  'featureVerifiedDoctors',
  'featureOnlineConsultations',
  'featureSmartScheduling',
  'featureAiAssistedCare',
  'featureDigitalPrescriptions',
  'featureHealthRecords',
  'featureNearbyHospitals',
  'featureLabGuidance',
  'featureEmergencyGuidance',
] as const;

const FeatureSection: React.FC = () => {
  const { t } = useTranslation('about');
  const navigate = useNavigate();
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleExplore = () => {
    navigate('/patient/search');
  };

  return (
    <section ref={sectionRef} className="about-features-section" aria-labelledby="about-features-title">
      <div className="about-section-container">
        <header className="about-section-header">
          <h2 id="about-features-title" className="about-section-title">
            WHY <span className="brand-sehat text-slate-900">Sehat</span><span className="brand-setu text-blue-600">Setu</span>?
          </h2>
        </header>

        <div className="about-features-grid">
          {features.map((key, index) => (
            <div
              key={key}
              className={`about-feature-card ${isVisible ? 'card-visible' : ''}`}
              style={{
                transitionDelay: isVisible ? `${index * 0.1}s` : '0s',
              }}
            >
              <div className="about-feature-icon" aria-hidden="true">
                <FeatureIcon keyName={key} />
              </div>
              <h3 className="about-feature-title">{t(`${key}.title`)}</h3>
              <p className="about-feature-desc">{t(`${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureIcon: React.FC<{ keyName: string }> = ({ keyName }) => {
  const icons: Record<string, React.ReactElement> = {
    featureVerifiedDoctors: (
      <img src="/z_clean.png" alt="Bridging India's healthcare gap" className="w-20 h-20 object-contain" />
    ),
    featureOnlineConsultations: (
      <img src="/x_clean.png" alt="Verified Care, Anywhere" className="w-20 h-20 object-contain" />
    ),
    featureSmartScheduling: (
      <img src="/c_clean.png" alt="AI-Powered Clinical Support" className="w-20 h-20 object-contain" />
    ),
    featureAiAssistedCare: (
      <img src="/v_clean.png" alt="Never Miss a Follow-Up" className="w-20 h-20 object-contain" />
    ),
    featureDigitalPrescriptions: (
      <img src="/b_clean.png" alt="Your Health, Permanently Recorded" className="w-20 h-20 object-contain" />
    ),
    featureHealthRecords: (
      <img src="/n_clean.png" alt="Privacy by Design" className="w-20 h-20 object-contain" />
    ),
    featureNearbyHospitals: (
      <img src="/m_clean.png" alt="Prevention First" className="w-20 h-20 object-contain" />
    ),
    featureLabGuidance: (
      <img src="/q_clean.png" alt="Smart Hospital Guidance" className="w-20 h-20 object-contain" />
    ),
    featureEmergencyGuidance: (
      <img src="/z_clean.png" alt="Care Without Barriers" className="w-20 h-20 object-contain" />
    ),
  };
  return icons[keyName] || null;
};

const MissionVisionSection: React.FC = () => {
  const { t } = useTranslation('about');
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="about-mission-vision-section" aria-labelledby="mission-vision-title">
      <div className="about-section-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          {/* Our Mission Card */}
          <div
            className={`about-mv-card ${isVisible ? 'card-visible' : ''}`}
            style={{ transitionDelay: isVisible ? '0s' : '0s' }}
          >
            <div>
              <p className="mv-card-header mb-4">
                {t('mission')}
              </p>
              <h3 className="mv-card-headline mb-4">
                {t('missionHeadline')}
              </h3>
              <p className="mv-card-body mb-4">
                {t('missionP1')}
              </p>
              <p className="mv-card-body">
                {t('missionP2')}
              </p>
            </div>
          </div>

          {/* Our Vision Card */}
          <div
            className={`about-mv-card ${isVisible ? 'card-visible' : ''}`}
            style={{ transitionDelay: isVisible ? '0.12s' : '0s' }}
          >
            <div>
              <p className="mv-card-header mb-4">
                {t('vision')}
              </p>
              <h3 className="mv-card-headline mb-4">
                {t('visionHeadline')}
              </h3>
              <p className="mv-card-body mb-4">
                {t('visionP1')}
              </p>
              <p className="mv-card-body">
                {t('visionP2')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── About Us Section ─────────────────────────────────────────────────────── */
const AboutUsSection: React.FC = () => {
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { setIsVisible(entry.isIntersecting); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const paragraphs = [
    `Healthcare is a fundamental right, yet millions of people across India continue to face barriers in accessing quality medical care. While urban hospitals often experience overwhelming patient loads and long waiting times, many rural communities struggle with limited healthcare infrastructure, shortages of qualified doctors, and the need to travel long distances even for routine consultations. These challenges delay timely diagnosis, increase healthcare costs, and discourage regular medical checkups, ultimately affecting the overall well-being of individuals and families.`,
    `SehatSetu was created to bridge this healthcare divide by bringing trusted medical professionals closer to every citizen through technology. Our platform leverages secure telemedicine, Artificial Intelligence, and Machine Learning to connect patients with verified doctors regardless of their geographical location. Whether someone lives in a metropolitan city or a remote village, quality healthcare should be equally accessible, affordable, and convenient.`,
    `SehatSetu enables patients to book secure video consultations with qualified doctors from the comfort of their homes, eliminating unnecessary travel and reducing waiting times. During consultations, our AI-powered speech recognition system automatically converts the doctor's conversation into structured digital prescriptions and consultation notes, reducing paperwork while improving documentation accuracy. Every consultation is securely stored as part of the patient's Electronic Health Record (EHR), allowing patients and healthcare professionals to access previous diagnoses, prescriptions, allergies, and treatment history whenever required.`,
    `For our most vulnerable patients, SehatSetu goes further. Our Maternal & Child Health (MCH) tracking system monitors the vitals that matter most during pregnancy and early childhood — flagging risk indicators like blood pressure and hemoglobin levels early, so warning signs are caught before they become emergencies. Because for a pregnant mother or a young child, a delay of even a few days can be the difference between manageable care and a crisis.`,
    `Beyond virtual consultations, SehatSetu promotes preventive and personalized healthcare. Based on a patient's medical condition, the platform provides AI-driven recommendations for balanced nutrition, essential vitamins and minerals, healthy lifestyle practices, and wellness guidance that support faster recovery and long-term health. When a medical condition requires physical examination, laboratory investigations, or emergency care, the platform intelligently recommends an in-person hospital visit, ensuring that patients receive the appropriate level of medical attention at the right time.`,
    `Recognizing India's linguistic diversity, SehatSetu offers multilingual accessibility with support for both English and Hindi, enabling users from different regions and backgrounds to interact comfortably with the platform. The interface is designed to remain simple, intuitive, and user-friendly, making digital healthcare accessible even to first-time technology users.`,
    `At SehatSetu, privacy and security remain at the heart of everything we build. Patient information is protected through secure authentication, encrypted data storage, and privacy-first practices aligned with the Digital Personal Data Protection (DPDP) Act, 2023. We believe that healthcare innovation must be accompanied by responsible data handling and complete transparency regarding how patient information is collected, stored, and used.`,
  ];

  return (
    <section
      ref={sectionRef}
      className={`about-us-section ${isVisible ? 'au-visible' : ''}`}
      aria-labelledby="about-us-title"
    >
      <div className="about-section-container">
        {/* Header */}
        <header className="au-header">
          {/* <span className="au-eyebrow"></span> */}
          <h2 id="about-us-title" className="au-title">
            About <span className="text-[#0B132B] font-bold">Sehat</span><span className="text-[#2563EB] font-bold">Setu</span>
          </h2>
          <p className="au-tagline">Bridging Healthcare. Connecting Lives.</p>
        </header>

        {/* Two-column prose grid */}
        <div className="au-prose-grid">
          {paragraphs.map((text, i) => (
            <p
              key={i}
              className="au-para"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
};

const About: React.FC = () => {
  const { t } = useTranslation('about');
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setCurrentPage('about'));
  }, [dispatch]);

  return (
    <div className="patient-portal about-page">
      <Sidebar />
      <Navbar />
      <main>
        <section className="about-story-section" aria-labelledby="our-story-title">
          <div className="about-section-container">
            <header className="about-section-header">
              <h2 id="our-story-title" className="about-section-title about-story-title-lg">{t('ourStory')}</h2>
            </header>

            <div className="about-story-content">
              <p className="about-story-paragraph">{t('storyP1')}</p>
              <p className="about-story-paragraph">{t('storyP2')}</p>
              <p className="about-story-paragraph">{t('storyP3')}</p>
              <p className="about-story-paragraph">{t('storyP4')}</p>

              {/* About Us inline block */}
              <AboutUsSection />

              {/* How We Deliver Better Care */}
              <div className="about-deliver-block">
                <h3 className="about-deliver-title">{t('howWeDeliverTitle')}</h3>
                <ul className="about-deliver-grid">
                  {(['deliverPoint1', 'deliverPoint2', 'deliverPoint3', 'deliverPoint4', 'deliverPoint5', 'deliverPoint6'] as const).map((pt) => (
                    <li key={pt} className="about-deliver-item">
                      <span className="about-deliver-dot" />
                      <div>
                        <span className="about-deliver-item-title">{t(`${pt}Title`)}</span>
                        <span className="about-deliver-item-desc">{t(`${pt}Desc`)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Privacy Point Item (Centered 7th point) */}
              <div className="about-deliver-privacy-centered mt-4">
                <div className="flex flex-col items-center text-center max-w-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="about-deliver-dot" />
                    <span className="about-deliver-item-title mb-0">{t('privacyTitle')}</span>
                  </div>
                  <span className="about-deliver-item-desc">{t('privacyBody')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MissionVisionSection />
        <FeatureSection />
      </main>
      <Footer />
      <FloatingEmergencyButton />
    </div>
  );
};

export default About;
