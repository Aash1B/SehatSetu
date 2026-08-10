import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUser } from '../../auth/authStorage';
import { useTranslation } from 'react-i18next';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['home', 'common']);
  const tCommon = (key: string) => i18n.t(key, { ns: 'common' });
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

  return (
    <section
      id="home"
      className="w-full bg-gradient-to-b from-brand-50/60 via-white to-slate-50/30 -mt-16 sm:-mt-20 pt-16 sm:pt-18 lg:pt-20 pb-8 px-2 sm:px-4 lg:px-6 flex justify-center"
    >
      {/* Pop-out Hero Card container matching Navbar width & shadow */}
      <div className="w-full max-w-[98%] sm:max-w-[96%] lg:max-w-[95%] xl:max-w-[96%] bg-white/95 backdrop-blur-md rounded-[28px] sm:rounded-[36px] shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-slate-100/90 py-10 sm:py-14 lg:py-16 px-6 sm:px-10 lg:px-12 transition-all duration-300">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12 xl:gap-14">
        {/* Left Column: Badge, Heading, Description, CTA Buttons, Trust Badges */}
        <div className="relative z-10 min-w-0">
          {/* Heading */}
          <h1 className="mb-4 text-base font-semibold text-brand-600 sm:text-lg lg:text-xl">
            <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              {tCommon('brand.tagline')}
            </span>
          </h1>

          {/* Tagline */}
          <p className="mb-6 text-3xl font-extrabold leading-[1.17] tracking-tight text-slate-900 sm:text-4xl lg:text-[42px]">
            <span className="hero-headline-gradient font-extrabold">
              {t('headline')}
            </span>
            <span className="bg-gradient-to-r from-[#FF9933] to-[#138808] bg-clip-text text-transparent font-extrabold">
              {' '}{t('country')}
            </span>
          </p>

          {/* Description */}
          <p className="mb-7 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg lg:text-xl">
            {t('description')}
          </p>

          {/* CTA Button - Popping Pill Style */}
          <div className="mb-7 mt-7 flex justify-start">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="inline-flex min-h-13 cursor-pointer select-none items-center justify-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 border-none group"
            >
              <span>{t('cta')}</span>
              <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {/* Trust Indicators */}
          <ul className="mt-6 grid grid-cols-1 gap-x-12 gap-y-5 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-6 text-lg sm:text-xl font-semibold text-slate-700">
            <li className="inline-flex items-start gap-3 transition-colors hover:text-brand-600">
              <svg className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500 transition-transform hover:scale-110" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{t('verifiedDoctors')}</span>
            </li>
            <li className="inline-flex items-start gap-3 transition-colors hover:text-brand-600">
              <svg className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500 transition-transform hover:scale-110" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{t('aiAssistedCare')}</span>
            </li>
            <li className="inline-flex items-start gap-3 transition-colors hover:text-brand-600">
              <svg className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500 transition-transform hover:scale-110" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{t('secureRecords')}</span>
            </li>
            <li className="inline-flex items-start gap-3 transition-colors hover:text-brand-600">
              <svg className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500 transition-transform hover:scale-110" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                {t('ruralUrban')}
                <span className="block text-sm font-normal text-slate-400 mt-1">      </span>
              </span>
            </li>
          </ul>
        </div>

        {/* Right Column: Hero Image Frame */}
        <div className="relative w-full aspect-[1600/959] min-w-0 overflow-hidden rounded-[28px] sm:rounded-[32px] border border-slate-100/90 bg-white/95 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/5 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          <div className="absolute top-4 right-4 z-10 p-2 bg-slate-900/30 backdrop-blur-md text-white rounded-full shadow-xs hover:bg-slate-900/50 transition cursor-pointer">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </div>

          <img
            src="/hero.jpeg"
            alt={t('heroAlt')}
            width={1600}
            height={959}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="block h-full w-full object-contain object-center transition-transform duration-500"
          />
        </div>
      </div>
    </div>
  </section>
  );
};

export default HeroSection;
