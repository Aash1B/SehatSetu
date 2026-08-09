import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('footer');
  const tCommon = (key: string) => t(key, { ns: 'common' });

  const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate('/about');
  };

  return (
    <footer id="contact" className="site-footer">
      <div className="footer-container">
        <div className="footer-top-row">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <a href="#home" className="footer-logo">
              <img src="/logo.svg" alt={tCommon('brand.name')} className="footer-logo-img" />
              <span className="brand-title text-white">
                {tCommon('brand.name')}<span className="brand-title-accent">{tCommon('brand.taglineShort')}</span>
              </span>
            </a>
          </div>

          {/* Right Link Columns Clustered Together */}
          <div className="footer-right-links-wrapper">
            {/* Services Links */}
            <div className="footer-links-col">
              <h4 className="footer-col-title">{t('services')}</h4>
              <ul className="footer-links-list">
                <li><a href="#doctors">{t('findDoctor')}</a></li>
                <li><a href="#doctors">{t('bookAppointment')}</a></li>
                <li><a href="#records">{t('healthRecords')}</a></li>
              </ul>
            </div>

            {/* Support Links */}
            <div className="footer-links-col">
              <h4 className="footer-col-title">{t('support')}</h4>
              <ul className="footer-links-list">
                <li><a href="#help">{t('helpCenter')}</a></li>
                <li><a href="#contact">{t('contactUs')}</a></li>
                <li><a href="#privacy">{t('privacyPolicy')}</a></li>
              </ul>
            </div>

            {/* Connect Column */}
            <div className="footer-links-col">
              <h4 className="footer-col-title">{t('connect')}</h4>
              <ul className="footer-links-list mb-2">
                <li><a href="/about" onClick={handleAboutClick}>{t('aboutUs')}</a></li>
              </ul>
              <a href="#talk" className="talk-to-us-link">
                {t('talkToUs')}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="copyright-text">
            {t('copyright')}
          </div>
          <div className="bottom-links">
            <a href="#terms">{t('terms')}</a>
            <a href="#privacy">{t('privacy')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
