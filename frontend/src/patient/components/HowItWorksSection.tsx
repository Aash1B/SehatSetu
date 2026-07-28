import React from 'react';

const steps = [
  {
    step: '01',
    title: 'Create Your Account',
    desc: 'Sign up in seconds',
  },
  {
    step: '02',
    title: 'Find Your Doctor',
    desc: 'Browse specialists by condition or location',
  },
  {
    step: '03',
    title: 'Book & Consult',
    desc: 'Schedule instantly and consult online or in-person',
  },
];

const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="how-it-works-section">
      <div className="how-it-works-container">
        <div className="section-center-header">
          <span className="section-subtag">SIMPLE BY DESIGN</span>
          <h2 className="how-it-works-title">How It Works</h2>
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
