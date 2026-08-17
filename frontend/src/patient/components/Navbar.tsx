import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../store/uiSlice';
import type { RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import { getToken, getUser } from '../../auth/authStorage';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, changeLanguage, getCurrentLanguage } from '../../i18n';
import BrandLogo from '../../common/components/BrandLogo';

const Navbar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('navbar');
  const tCommon = (key: string) => i18n.t(key, { ns: 'common' });
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);
  const token = getToken();
  const user = getUser();
  const isAuthenticated = Boolean(token && user);
  const isDoctor = user?.role === 'DOCTOR';
  const currentLang = getCurrentLanguage();
  const isLandingPage = currentPage === 'landing';

  const handleLanguageChange = async (lng: string) => {
    await changeLanguage(lng);
  };

  return (
    <header className="sticky top-0 z-50 w-full pointer-events-none transition-all duration-300 px-2 sm:px-4 lg:px-6 flex justify-center py-2 sm:py-3">
      <div className="landing-navbar-shell pointer-events-auto w-full max-w-[98%] sm:max-w-[96%] lg:max-w-[95%] xl:max-w-[96%] bg-white/96 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 lg:py-4 flex items-center justify-between gap-2 sm:gap-4 rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.07)] border border-slate-100/90 transition-all duration-300">
        
        {/* Left: Mobile Hamburger Toggle + Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition border-none bg-transparent cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => dispatch(toggleSidebar())}
            aria-label={t("openSidebar")}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Brand Logo */}
          <button
            type="button"
            className="flex items-center gap-2 border-none bg-transparent cursor-pointer p-0 group"
            onClick={() => navigate('/')}
          >
            <BrandLogo
              markWrapperClassName="landing-brand-mark rounded-xl bg-transparent flex items-center justify-center p-1 shadow-none transition group-hover:scale-105"
              wordmarkClassName="landing-brand-wordmark font-extrabold text-slate-900 tracking-tight text-sm sm:text-base"
              accentClassName="brand-title-accent-royal"
            />
          </button>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 absolute left-1/2 -translate-x-1/2">
          {currentPage !== 'landing' && (
            <button
              type="button"
              className="relative py-1.5 text-sm font-medium transition-colors cursor-pointer border-none bg-transparent nav-link text-slate-600 hover:text-slate-900"
              onClick={() => navigate("/")}
            >
              {t("home")}
            </button>
          )}
          {currentPage === 'landing' ? (
            <a href="#services" className="nav-link text-slate-600 hover:text-slate-900 font-bold">{t("services")}</a>
          ) : (
            <button
              type="button"
              className="relative py-1.5 text-sm font-bold transition-colors cursor-pointer border-none bg-transparent nav-link text-slate-600 hover:text-slate-900"
              onClick={() => {
                navigate('/#services');
                setTimeout(() => {
                  const elem = document.querySelector('#services');
                  if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              {t("services")}
            </button>
          )}
          {currentPage !== 'doctors' && (
            <button
              type="button"
              className="relative py-1.5 text-sm font-bold transition-colors cursor-pointer border-none bg-transparent nav-link text-slate-600 hover:text-slate-900"
              onClick={() => navigate('/patient/search')}
            >
              {t('doctors')}
            </button>
          )}
          {currentPage !== 'about' && (
            <button
              type="button"
              className="relative py-1.5 text-sm font-bold transition-colors cursor-pointer border-none bg-transparent nav-link text-slate-600 hover:text-slate-900"
              onClick={() => navigate('/about')}
            >
              {tCommon('about')}
            </button>
          )}
        </nav>

        {/* Right: Language Selector & Actions */}
        <div className="landing-navbar-actions flex items-center gap-2 sm:gap-6 shrink-0">
          {/* Language Toggle */}
          <div className="language-toggle language-toggle-desktop flex items-center bg-slate-100/80 p-0.5 sm:p-1 rounded-full border border-slate-200/60" role="radiogroup" aria-label={t("selectLanguage")}>
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`lang-btn px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all border-none cursor-pointer ${
                  currentLang === lang.code
                    ? 'bg-white text-orange-600 shadow-xs ring-1 ring-orange-400/30 bg-orange-100 text-orange-700'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
                aria-pressed={currentLang === lang.code}
              >
                {lang.nativeName}
              </button>
            ))}
          </div>
          <label className="language-select-mobile-label">
            <span className="sr-only">{t("selectLanguage")}</span>
            <select
              className="language-select-mobile"
              value={currentLang}
              onChange={(event) => handleLanguageChange(event.target.value)}
              aria-label={t("selectLanguage")}
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.code.toUpperCase()}</option>
              ))}
            </select>
          </label>

          {!isAuthenticated && !isLandingPage && (
            <button
              type="button"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-orange-600 border border-orange-500/40 hover:bg-orange-50 rounded-full transition cursor-pointer btn-sign-in border-2 border-orange-500"
              onClick={() => navigate('/patient/login')}
            >
              {t("signIn")}
            </button>
          )}

          {!isDoctor && (
            <button
              type="button"
              className="inline-flex items-center justify-center px-3.5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-full shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all transform active:scale-95 cursor-pointer border-none btn-get-started"
              onClick={() => navigate('/patient/dashboard')}
            >
              {t("dashboard")}
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;



