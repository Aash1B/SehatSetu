import React from 'react';
import { useNavigate } from 'react-router-dom';

const services = [
  {
    id: 'lab_nearby',
    title: 'Lab Tests Nearby',
    description: 'Find trusted diagnostic labs and blood testing centers near your location.',
    icon: '🧪',
    route: 'google',
  },
  {
    id: 'specialist',
    title: 'Specialist Referral',
    description: 'Get connected to the right specialist for your condition.',
    icon: '➡️',
    route: '/patient/search',
  },
  {
    id: 'emergency',
    title: 'Emergency Care',
    description: 'Fast, reliable support when every second matters.',
    icon: '💝',
    route: '/patient/search?emergency=true',
  },
];

const ServicesSection: React.FC = () => {
  const navigate = useNavigate();

  const handleCardClick = (id: string, route: string) => {
    if (id === 'lab_nearby') {
      window.open('https://www.google.com/search?q=lab+tests+nearby', '_blank', 'noopener,noreferrer');
      return;
    }
    if (id === 'emergency') {
      const floatingEmergencyBtn = document.querySelector('.floating-emergency-btn') as HTMLButtonElement;
      if (floatingEmergencyBtn) {
        floatingEmergencyBtn.click();
      } else {
        window.location.href = 'tel:102';
      }
      return;
    }
    navigate(route);
  };

  return (
    <section id="services" className="services-section">
      <div className="services-container">
        <div className="services-header">
          <div>
            <span className="section-subtag">CARE THAT FITS YOUR LIFE</span>
            <h2 className="services-title">Our Services</h2>
          </div>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <div 
              key={service.id} 
              className="service-card"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCardClick(service.id, service.route)}
            >
              <div className="service-icon-box">{service.icon}</div>
              <h3 className="service-card-title">{service.title}</h3>
              <p className="service-card-desc">{service.description}</p>
              <button 
                type="button" 
                className="service-learn-more"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(service.id, service.route);
                }}
              >
                Learn more →
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
