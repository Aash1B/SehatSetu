import React from 'react';
import heroDoctorImg from '../../assets/hero_doctor.png';

const HeroSection: React.FC = () => {
  return (
    <section id="home" className="hero-section">
      <img 
        src={heroDoctorImg} 
        alt="SehatSetu Doctor Consultation" 
        className="hero-consultation-main-img"
      />
    </section>
  );
};

export default HeroSection;
