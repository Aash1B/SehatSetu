import React from 'react';
import { useTranslation } from 'react-i18next';

const HowItWorksSection: React.FC = () => {
  const { t } = useTranslation('home');

  const steps = [
    {
      step: '01',
      title: t('step1Title'),
      desc: t('step1Desc'),
    },
    {
      step: '02',
      title: t('step2Title'),
      desc: t('step2Desc'),
    },
    {
      step: '03',
      title: t('step3Title'),
      desc: t('step3Desc'),
    },
  ];

  return (
    <section id="how-it-works" className="how-it-works-section">
      <div className="how-it-works-container">
        <div className="section-center-header">
          <span className="section-subtag"></span>
          <h2 className="how-it-works-title">{t('howItWorks')}</h2>
        </div>

        <div className="steps-flow-container">
          <div className="steps-connecting-line"></div>
          <div className="steps-grid">
            {steps.map((item) => (
              <div key={item.step} className="step-card">
                <div className="step-number-badge">{item.step}</div>
                <h3 className="step-card-title">{item.title}</h3>
                <p className="step-card-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
