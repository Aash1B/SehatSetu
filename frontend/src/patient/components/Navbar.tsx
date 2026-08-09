import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../store/uiSlice';
import type { RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import { getToken, getUser } from '../../auth/authStorage';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, changeLanguage, getCurrentLanguage } from '../../i18n';

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

  const handleLanguageChange = async (lng: string) => {
    await changeLanguage(lng);
    window.location.reload();
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div className="brand-group">
          {/* Sidebar Toggle Button */}
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => dispatch(toggleSidebar())}
            aria-label={t('openSidebarTitle')}
            title={t('openSidebarTitle')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="17" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Brand Logo */}
          <button
            type="button"
            className="brand-logo btn-logo-reset"
            onClick={() => navigate('/')}
          >
            <div className="logo-badge">
              <img src="/logo.svg" alt={t('logoAlt')} className="logo-icon" />
            </div>
            <span className="brand-title">
              {tCommon("brand.name").replace("Setu", "")}<span className="brand-title-accent">Setu</span>
            </span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="nav-links">
          <button
            type="button"
            className={`nav-link ${currentPage === "landing" ? "active" : ""}`}
            onClick={() => navigate("/")}
          >
            {t("home")}
          </button>
          <a href="#services" className="nav-link">{t("services")}</a>
           <button
             type="button"
             className={`nav-link ${currentPage === "doctors" ? "active" : ""}`}
             onClick={() => navigate("/patient/search")}
           >
             {t("doctors")}
           </button>
           <button
             type="button"
             className={`nav-link ${currentPage === "about" ? "active" : ""}`}
             onClick={() => navigate("/about")}
           >
             {tCommon("about")}
           </button>
        </nav>

        {/* Language Toggle */}
        <div className="language-toggle flex items-center gap-1.5" role="radiogroup" aria-label={t("selectLanguage")}>
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`lang-btn px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                currentLang === lang.code
                  ? "bg-orange-100 text-orange-700 ring-1 ring-orange-400"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              aria-pressed={currentLang === lang.code}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="nav-actions flex items-center gap-3">
          {!isAuthenticated && (
            <button
              type="button"
              className="btn-sign-in border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-bold px-4 py-2 rounded-full transition-all text-sm cursor-pointer"
              onClick={() => navigate("/patient/login")}
            >
              {t("signIn")}
            </button>
          )}
          {!isDoctor && (
            <button
              type="button"
              className="btn-get-started cursor-pointer"
              onClick={() => navigate("/patient/dashboard")}
            >
              {t("dashboard")}
            </button>
          )}
          <button
            type="button"
            className="mobile-toggle"
            onClick={() => dispatch(toggleSidebar())}
            aria-label={t("toggleNav")}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
