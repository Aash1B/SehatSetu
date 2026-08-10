import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../patient/components/Navbar';
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

  const handleExplore = () => {
    navigate('/patient/search');
  };

  return (
    <section className="about-features-section" aria-labelledby="about-features-title">
      <div className="about-section-container">
        <header className="about-section-header">
          <h2 id="about-features-title" className="about-section-title">{t('whatWeProvide')}</h2>
        </header>

        <div className="about-features-grid">
          {features.map((key) => (
            <div key={key} className="about-feature-card">
              <div className="about-feature-icon" aria-hidden="true">
                <FeatureIcon keyName={key} />
              </div>
              <h3 className="about-feature-title">{t(`${key}.title`)}</h3>
              <p className="about-feature-desc">{t(`${key}.desc`)}</p>
              {key === 'featureNearbyHospitals' && (
                <button
                  type="button"
                  className="about-feature-link"
                  onClick={() => navigate('/patient/search?emergency=true')}
                >
                  {t('featureNearbyHospitals.title')}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="about-features-cta">
          <button
            type="button"
            className="btn-cta-orange"
            onClick={handleExplore}
          >
            {t('secondaryCta')}
          </button>
        </div>
      </div>
    </section>
  );
};

const FeatureIcon: React.FC<{ keyName: string }> = ({ keyName }) => {
  const icons: Record<string, React.ReactElement> = {
    featureVerifiedDoctors: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9.13 9a3 3 0 1 1 5.73 1c0 1.42-.6 2-1.25 2.5a1.5 1.5 0 1 0 2.25 2" />
      </svg>
    ),
    featureOnlineConsultations: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22.54 4.91L3.46 12.9a1 1 0 0 0 .54 1.53l5.3 1.72v4.1l3.2-2.1a1 1 0 0 1 1.25.17l2.5 2.5a1 1 0 0 0 1.26.27l6.54-4.02a1 1 0 0 0 .46-1.34z" />
      </svg>
    ),
    featureSmartScheduling: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <path d="M9 12h6v6H9z" />
      </svg>
    ),
    featureAiAssistedCare: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8z" />
        <path d="M12 8v4l2 2" />
      </svg>
    ),
    featureDigitalPrescriptions: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
      </svg>
    ),
    featureHealthRecords: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 7l-8-4-8 4v10l8 4 8-4z" />
        <path d="M8 12l4 2 4-2" />
        <path d="M12 14v8" />
      </svg>
    ),
    featureNearbyHospitals: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10h-7.291a1 1 0 0 0-1 1.707l1.291 1.291a1 1 0 1 1-1.414 1.414L12 13.414l-1.586 1.586a1 1 0 1 1-1.414-1.414l1.291-1.291A1 1 0 0 0 10.291 10H3a1 1 0 0 1 0-2h3.291a1 1 0 0 0 1-1.707L5 5.293a1 1 0 1 1 1.414-1.414L9.808 6.03A1 1 0 0 0 9 7v.014" />
        <path d="M8 21h8a2 2 0 0 0 2-2V13l-5 3-5-3v6a2 2 0 0 0 2 2z" />
      </svg>
    ),
    featureLabGuidance: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 2h-6a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
        <path d="M8 7h8" />
        <path d="M8 12h8" />
        <path d="M8 17h8" />
      </svg>
    ),
    featureEmergencyGuidance: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.25 21.5c0 .714-.755 1.286-1.5 1.286S7.25 22.214 7.25 21.5V15c0-.565.435-1 1-1h9.5a1 1 0 1 0 0-2H9.25V7.5c0-1.24-.767-2.285-1.86-2.712a.75.75 0 0 0-.39.39A5.745 5.745 0 0 0 5 7.75v9.75a3.75 3.75 0 0 0 6 3.5v2.5z" />
        <path d="M18 6V2m0 0h-2m2 0l-3 3" />
      </svg>
    ),
  };
  return icons[keyName] || null;
};

const steps = [
  { key: 'step1', desc: 'step1Desc' },
  { key: 'step2', desc: 'step2Desc' },
  { key: 'step3', desc: 'step3Desc' },
  { key: 'step4', desc: 'step4Desc' },
] as const;

const HowItWorksSection: React.FC = () => {
  const { t } = useTranslation('about');
  return (
    <section className="about-how-it-works-section" aria-labelledby="how-it-works-title">
      <div className="about-section-container">
        <header className="about-section-header">
          <h2 id="how-it-works-title" className="about-section-title">{t('howItWorks')}</h2>
        </header>

        <div className="about-steps-flow-container">
          <div className="about-steps-connecting-line" aria-hidden="true" />
          <ol className="about-steps-grid" role="list">
            {steps.map((step, index) => (
              <li key={step.key} className="about-step-card">
                <div
                  className="about-step-number-badge"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="about-step-card-title">{t(step.key)}</h3>
                <p className="about-step-card-desc">{t(step.desc)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

const values = [
  { key: 'valueAccessibility', variant: 'about-value-card-accessibility' },
  { key: 'valueTrust', variant: 'about-value-card-trust' },
  { key: 'valueHumanCentred', variant: 'about-value-card-human-centred' },
  { key: 'valueResponsibleInnovation', variant: 'about-value-card-innovation' },
] as const;

const ValuesSection: React.FC = () => {
  const { t } = useTranslation('about');
  return (
    <section className="about-values-section" aria-labelledby="values-title">
      <div className="about-section-container">
        <header className="about-section-header">
          <h2 id="values-title" className="about-section-title">{t('values')}</h2>
        </header>

        <div className="about-values-grid">
          {values.map((v) => (
            <div key={v.key} className={`about-value-card ${v.variant}`}>
              <h3 className="about-value-title">{t(`${v.key}.title`)}</h3>
              <p className="about-value-desc">{t(`${v.key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

  const About: React.FC = () => {
  const { t } = useTranslation(['about', 'home', 'common']);
  const navigate = useNavigate();

  const handleFindDoctor = () => {
    navigate('/patient/search');
  };

  const handleExploreServices = () => {
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    navigate('/');
  };

  return (
    <div className="patient-portal about-page">
      <Navbar />
      <main>
        <section
          className="about-hero-section"
          aria-label="About SehatSetu"
          aria-labelledby="about-hero-title"
        >
        <div className="about-hero-container">
          <div className="about-hero-eyebrow">{t('about:eyebrow')}</div>
          <h1 id="about-hero-title" className="about-hero-title">
            {t('about:heroTitle')}
          </h1>
          <p className="about-hero-desc">{t('about:heroDesc')}</p>
          <p className="about-hero-desc-secondary">{t('about:heroDescSecondary')}</p>

          <div className="about-hero-actions">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={handleFindDoctor}
            >
              {t('about:primaryCta')}
            </button>
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={handleExploreServices}
            >
              {t('about:secondaryCta')}
            </button>
          </div>
        </div>
      </section>

      <section className="about-story-section" aria-labelledby="our-story-title">
        <div className="about-section-container">
          <header className="about-section-header">
            <h2 id="our-story-title" className="about-section-title">{t('about:ourStory')}</h2>
            <h3 className="text-xl sm:text-2xl font-bold text-orange-500 mt-2">{t('about:storySubtitle')}</h3>
          </header>

          <div className="about-story-content max-w-4xl mx-auto space-y-6 text-slate-600 text-base sm:text-lg leading-relaxed mt-8">
            <p className="about-story-paragraph">{t('about:storyP1')}</p>
            <p className="about-story-paragraph">{t('about:storyP2')}</p>

            {/* How we deliver on that */}
            <div className="mt-12 pt-8 border-t border-slate-200/80">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-8 text-center sm:text-left">{t('about:howWeDeliverTitle')}</h3>
              <ul className="space-y-6 text-left list-none p-0">
                <li className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-2 shadow-xs"></span>
                  <div>
                    <span className="font-bold text-slate-900 text-lg mr-2">{t('about:deliverPoint1Title')}</span>
                    <span className="text-slate-600 text-base sm:text-lg leading-relaxed">{t('about:deliverPoint1Desc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-2 shadow-xs"></span>
                  <div>
                    <span className="font-bold text-slate-900 text-lg mr-2">{t('about:deliverPoint2Title')}</span>
                    <span className="text-slate-600 text-base sm:text-lg leading-relaxed">{t('about:deliverPoint2Desc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-2 shadow-xs"></span>
                  <div>
                    <span className="font-bold text-slate-900 text-lg mr-2">{t('about:deliverPoint3Title')}</span>
                    <span className="text-slate-600 text-base sm:text-lg leading-relaxed">{t('about:deliverPoint3Desc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-2 shadow-xs"></span>
                  <div>
                    <span className="font-bold text-slate-900 text-lg mr-2">{t('about:deliverPoint4Title')}</span>
                    <span className="text-slate-600 text-base sm:text-lg leading-relaxed">{t('about:deliverPoint4Desc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-2 shadow-xs"></span>
                  <div>
                    <span className="font-bold text-slate-900 text-lg mr-2">{t('about:deliverPoint5Title')}</span>
                    <span className="text-slate-600 text-base sm:text-lg leading-relaxed">{t('about:deliverPoint5Desc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-2 shadow-xs"></span>
                  <div>
                    <span className="font-bold text-slate-900 text-lg mr-2">{t('about:deliverPoint6Title')}</span>
                    <span className="text-slate-600 text-base sm:text-lg leading-relaxed">{t('about:deliverPoint6Desc')}</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Privacy Block */}
            <div className="mt-12 pt-8 border-t border-slate-200/80 text-left bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-8 sm:p-10 rounded-3xl shadow-xl">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">{t('about:privacyTitle')}</h3>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">{t('about:privacyBody')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-mission-vision-section" aria-labelledby="mission-vision-title">
        <div className="about-section-container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {/* Our Mission Card */}
            <div className="p-8 sm:p-10 bg-white rounded-3xl border border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div>
                <span className="inline-block px-3.5 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-bold uppercase tracking-wider mb-4">
                  {t('about:mission')}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug mb-4">
                  {t('about:missionHeadline')}
                </h3>
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-4">
                  {t('about:missionP1')}
                </p>
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                  {t('about:missionP2')}
                </p>
              </div>
            </div>

            {/* Our Vision Card */}
            <div className="p-8 sm:p-10 bg-white rounded-3xl border border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div>
                <span className="inline-block px-3.5 py-1 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4">
                  {t('about:vision')}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug mb-4">
                  {t('about:visionHeadline')}
                </h3>
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-4">
                  {t('about:visionP1')}
                </p>
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                  {t('about:visionP2')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeatureSection />

      <section className="about-ai-section" aria-labelledby="ai-section-title">
        <div className="about-section-container">
          <header className="about-section-header">
            <h2 id="ai-section-title" className="about-section-title">{t('about:aiHeadline')}</h2>
          </header>

          <div className="about-ai-content">
            <p className="about-ai-desc">{t('about:aiDesc')}</p>
            <p className="about-ai-desc">{t('about:aiDesc2')}</p>

            <ul className="about-ai-points" role="list">
              <li className="about-ai-point">{t('about:aiPoint1')}</li>
              <li className="about-ai-point">{t('about:aiPoint2')}</li>
              <li className="about-ai-point">{t('about:aiPoint3')}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="about-accessibility-section" aria-labelledby="accessibility-title">
        <div className="about-section-container">
          <header className="about-section-header">
            <h2 id="accessibility-title" className="about-section-title">{t('about:accessibility')}</h2>
          </header>

          <div className="about-accessibility-content">
            <p className="about-accessibility-desc">{t('about:accessibilityDesc')}</p>
          </div>
        </div>
      </section>

      <section className="about-privacy-section" aria-labelledby="privacy-title">
        <div className="about-section-container">
          <header className="about-section-header">
            <h2 id="privacy-title" className="about-section-title">{t('about:privacyHeadline')}</h2>
          </header>

          <div className="about-privacy-content">
            <p className="about-privacy-desc">{t('about:privacyDesc')}</p>
            <ul className="about-privacy-points" role="list">
              <li className="about-privacy-point">{t('about:privacyPoint1')}</li>
              <li className="about-privacy-point">{t('about:privacyPoint2')}</li>
              <li className="about-privacy-point">{t('about:privacyPoint3')}</li>
              <li className="about-privacy-point">{t('about:privacyPoint4')}</li>
            </ul>
          </div>
        </div>
      </section>

      <HowItWorksSection />

      <ValuesSection />

      <section className="about-final-cta-section" aria-label="Call to action">
        <div className="about-final-cta-container">
          <h2 className="about-final-cta-title">{t('about:finalCtaTitle')}</h2>
          <p className="about-final-cta-desc">{t('about:finalCtaDesc')}</p>
          <div className="about-final-cta-actions">
            <button
              type="button"
              className="btn-cta-orange"
              onClick={handleFindDoctor}
            >
              {t('about:finalCtaPrimary')}
            </button>
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => navigate('/patient/login')}
            >
              {t('about:finalCtaSecondary')}
            </button>
          </div>
        </div>
      </section>
      </main>
      <Footer />
      {/* Floating Emergency Button always visible in bottom-right corner */}
      <FloatingEmergencyButton />
    </div>
  );
};

export default About;
