import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../store/uiSlice';
import type { RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import { getToken, getUser } from '../../auth/authStorage';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, changeLanguage, getCurrentLanguage } from '../../i18n';
import BrandLogo from '../../common/components/BrandLogo';
import { Globe, ChevronDown, Check } from 'lucide-react';

const Navbar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('navbar');
  const tCommon = (key: string) => i18n.t(key, { ns: 'common' });
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);
  
  const [authState, setAuthState] = useState(() => {
    const token = getToken();
    const user = getUser();
    return { token, user, isAuthenticated: Boolean(token && user) };
  });

  useEffect(() => {
    const handleAuthChange = () => {
      const token = getToken();
      const user = getUser();
      setAuthState({ token, user, isAuthenticated: Boolean(token && user) });
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const { isAuthenticated, user } = authState;
  const isDoctor = user?.role === 'DOCTOR';
  const currentLang = getCurrentLanguage();
  const isLandingPage = currentPage === 'landing';

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const selectedLangObj = supportedLanguages.find((l) => l.code === currentLang) || supportedLanguages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangDropdownOpen(false);
      }
    };
    if (langDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [langDropdownOpen]);

  const handleLanguageChange = async (lng: string) => {
    await changeLanguage(lng);
    setLangDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full pointer-events-none transition-all duration-300 px-2 sm:px-4 lg:px-6 flex justify-center py-2 sm:py-3">
      <div className="landing-navbar-shell pointer-events-auto w-full max-w-[98%] sm:max-w-[96%] lg:max-w-[95%] xl:max-w-[96%] bg-white/96 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 lg:py-4 flex items-center justify-between gap-2 sm:gap-4 rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.07)] border border-slate-100/90 transition-all duration-300 relative">
        
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
              className="relative py-1.5 text-sm font-semibold transition-colors cursor-pointer border-none bg-transparent nav-link text-slate-600 hover:text-slate-900"
              onClick={() => navigate("/")}
            >
              {t("home")}
            </button>
          )}
          {currentPage === 'landing' ? (
            <a href="#services" className="nav-link text-slate-600 hover:text-slate-900 font-bold text-sm">{t("services")}</a>
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
        <div className="landing-navbar-actions flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Language Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setLangDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={langDropdownOpen}
              aria-label={t("selectLanguage")}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-200/70 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" />
              <span className="max-w-[65px] sm:max-w-none truncate">{selectedLangObj.nativeName}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {langDropdownOpen && (
              <div
                role="listbox"
                aria-label={t("selectLanguage")}
                className="absolute right-0 top-full mt-2 w-48 bg-white/98 backdrop-blur-md rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.12)] border border-slate-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  {t("selectLanguage")}
                </div>
                <div className="max-h-60 overflow-y-auto py-0.5">
                  {supportedLanguages.map((lang) => {
                    const isSelected = currentLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl mx-auto my-0.5 transition cursor-pointer border-none ${
                          isSelected
                            ? 'bg-orange-50 text-orange-600 font-bold'
                            : 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-left">
                          <span>{lang.nativeName}</span>
                          {lang.nativeName !== lang.name && (
                            <span className="text-[10px] text-slate-400 font-normal">({lang.name})</span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0 ml-1.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {!isAuthenticated ? (
            <button
              type="button"
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-extrabold text-black bg-[#F98513] hover:bg-[#e0740b] rounded-full shadow-md shadow-orange-500/20 hover:shadow-lg transition-all transform active:scale-95 cursor-pointer border-none btn-sign-in"
              style={{ backgroundColor: '#F98513', color: '#000000' }}
              onClick={() => navigate('/patient/login')}
            >
              {t("signIn")}
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center justify-center px-3.5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-full shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all transform active:scale-95 cursor-pointer border-none btn-get-started"
              onClick={() => navigate(isDoctor ? '/doctor/dashboard' : '/patient/dashboard')}
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
