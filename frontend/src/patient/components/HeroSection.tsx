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
      className="w-full bg-gradient-to-b from-brand-50/60 via-white to-slate-50/30"
    >
      <div className="grid w-full grid-cols-1 items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:px-16 lg:py-14 xl:gap-14 xl:px-20">
        {/* Left Column: Badge, Heading, Description, CTA Buttons, Trust Badges */}
        <div className="relative z-10 min-w-0">
{/* Heading */}
          <h1 className="mb-4 text-base font-semibold text-brand-600 sm:text-lg lg:text-xl">
            <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              {tCommon('brand.tagline')}
            </span>
          </h1>

          {/* Tagline */}
          <p className="mb-5 text-2xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            {t('headline')}
            <span className="bg-gradient-to-b from-[#FF9933] via-[#FFFFFF] to-[#138808] bg-clip-text text-transparent font-extrabold" style={{ textShadow: '0 0 8px rgba(255,255,255,0.6)' }}>
              {' '}{t('country')}
            </span>
          </p>

          {/* Description */}
          <p className="mb-7 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {t('description')}
          </p>

          {/* CTA Button */}
          <div className="mb-6 mt-7 flex justify-start">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="inline-flex min-h-12 cursor-pointer select-none items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md no-underline transition hover:bg-primary-hover hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              {t('cta')}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {/* Trust Indicators */}
          <ul className="mt-5 grid grid-cols-1 gap-x-12 gap-y-5 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-6 text-lg font-semibold text-slate-700">
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

        {/* Right Column: Hero Image Frame (landscape, not full-page) */}
        <div className="relative w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-900/5 shadow-xl">
          <img
            src="/hero.jpeg"
            alt={t('heroAlt')}
            width={1920}
            height={840}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="block h-full w-full object-cover object-center"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
