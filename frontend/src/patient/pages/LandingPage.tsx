import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import StatsBar from '../components/StatsBar';
import DoctorSearchSection from '../components/DoctorSearchSection';
import ServicesSection from '../components/ServicesSection';
import HowItWorksSection from '../components/HowItWorksSection';
import TestimonialsSection from '../components/TestimonialsSection';
import Footer from '../components/Footer';
import FloatingEmergencyButton from '../components/FloatingEmergencyButton';
import { setCurrentPage } from '../store/uiSlice';

const LandingPage: React.FC = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    dispatch(setCurrentPage('landing'));
    if (location.hash) {
      const scrollToHash = () => {
        const elem = document.querySelector(location.hash);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      };
      scrollToHash();
      const t1 = setTimeout(scrollToHash, 100);
      const t2 = setTimeout(scrollToHash, 350);
      const t3 = setTimeout(scrollToHash, 700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [dispatch, location]);

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
