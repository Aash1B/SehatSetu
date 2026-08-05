import React from 'react';
import { useNavigate } from 'react-router-dom';
import heroDoctorImg from '../../assets/hero_doctor.png';
import { getToken, getUser } from '../../auth/authStorage';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();
  const isAuthenticated = Boolean(token && user);

  const handlePrimaryAction = () => {
    if (isAuthenticated) {
      if (user?.role === 'DOCTOR') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/search');
      }
    } else {
      navigate('/patient/search');
    }
  };

  const handleSecondaryAction = () => {
    if (isAuthenticated) {
      if (user?.role === 'DOCTOR') {
        navigate('/doctor/availability');
      } else {
        navigate('/patient/search');
      }
    } else {
      navigate('/patient/search');
    }
  };

  return (
    <section id="home" className="w-full overflow-hidden bg-gradient-to-b from-purple-50/60 via-white to-slate-50/30">
      <div className="mx-auto grid min-h-[540px] max-w-7xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-[0.9fr_1.1fr] lg:min-h-[620px] lg:gap-14 lg:px-8">
        {/* Left Column: Heading, Description, CTA Buttons */}
        <div className="flex flex-col justify-center max-w-xl">
          {/* Top Badge */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-semibold text-purple-700 shadow-xs mb-4">
            <span className="flex h-2 w-2 rounded-full bg-purple-600 animate-pulse"></span>
            24/7 Virtual Health Clinic
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl leading-[1.15] mb-5">
            Instant Doctor <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Consultations</span> & Care
          </h1>

          {/* Description */}
          <p className="text-base text-slate-600 sm:text-lg leading-relaxed max-w-xl mb-7">
            Connect with verified medical specialists in minutes. Book online video appointments, receive instant digital prescriptions, and manage health records securely.
          </p>

          {/* CTA Buttons */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 cursor-pointer no-underline active:scale-[0.98] select-none"
            >
              Find a Doctor Now
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleSecondaryAction}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-purple-300 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 cursor-pointer no-underline active:scale-[0.98] select-none"
            >
              {isAuthenticated && user?.role === 'DOCTOR' ? 'Manage Schedule' : 'Book Appointment'}
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 text-slate-700 font-medium">
              <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified Specialists
            </span>

            <span className="inline-flex items-center gap-2 text-slate-700 font-medium">
              <svg className="h-4 w-4 text-purple-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Encrypted Consultations
            </span>
          </div>
        </div>

        {/* Right Column: Hero Image Frame */}
        <div className="relative w-full overflow-hidden rounded-2xl shadow-xl border border-slate-200/80 bg-slate-900/5 group">
          <img
            src={heroDoctorImg}
            alt="SehatSetu Doctor Consultation"
            className="h-[320px] w-full object-cover object-center sm:h-[400px] md:h-[460px] lg:h-[520px] transition-transform duration-500 group-hover:scale-[1.01]"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
