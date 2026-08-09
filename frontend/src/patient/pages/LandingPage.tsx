import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import StatsBar from '../components/StatsBar';
import DoctorSearchSection from '../components/DoctorSearchSection';
import ServicesSection from '../components/ServicesSection';
import HowItWorksSection from '../components/HowItWorksSection';
import TestimonialsSection from '../components/TestimonialsSection';
import Footer from '../components/Footer';
import FloatingEmergencyButton from '../components/FloatingEmergencyButton';

const LandingPage: React.FC = () => {
  return (
    <div className="sehat-setu-landing-page">
      <Navbar />
      <main>
        <HeroSection />
        <StatsBar />
        {/* Find Your Doctor Search Bar & Carousel - Placed BEFORE Our Services */}
        <DoctorSearchSection />
        <ServicesSection />
        <HowItWorksSection />
        <TestimonialsSection />
      </main>
      <Footer />
      {/* Floating Emergency Button always visible in bottom-right corner */}
      <FloatingEmergencyButton />
    </div>
  );
};

export default LandingPage;
