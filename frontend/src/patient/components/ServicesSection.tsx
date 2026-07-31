import React from 'react';

const services = [
  {
    id: 'general',
    title: 'General Consultation',
    description: 'Expert guidance for everyday health concerns and wellness.',
    icon: '🩺',
  },
  {
    id: 'specialist',
    title: 'Specialist Referral',
    description: 'Get connected to the right specialist for your condition.',
    icon: '➡️',
  },
  {
    id: 'lab',
    title: 'Lab Tests',
    description: 'Convenient diagnostic testing with trusted lab partners.',
    icon: '📈',
  },
];

const ServicesSection: React.FC = () => {
  return (
    <section id="services" className="services-section">
      <div className="services-container">
        <div className="services-header">
          <div>
            <span className="section-subtag">CARE THAT FITS YOUR LIFE</span>
            <h2 className="services-title">Our Services</h2>
          </div>
          <a href="#all-services" className="link-explore-all">
            Explore all ›
          </a>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <div key={service.id} className="service-card">
              <div className="service-icon-box">{service.icon}</div>
              <h3 className="service-card-title">{service.title}</h3>
              <p className="service-card-desc">{service.description}</p>
              <a href={`#service-${service.id}`} className="service-learn-more">
                Learn more →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
