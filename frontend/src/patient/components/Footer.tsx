import React from 'react';
import { useTranslation } from 'react-i18next';

const footerLinkClass = 'footer-link';

const Footer: React.FC = () => {
  const { t } = useTranslation('footer');
  const tCommon = (key: string) => t(key, { ns: 'common' });

  const handleOpenChat = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-setu-ai'));
    const toggleBtn = document.querySelector('.chat-toggle-btn') as HTMLElement;
    if (toggleBtn) {
      toggleBtn.click();
    }
  };

  return (
    <footer id="contact" className="site-footer">
      <div className="footer-container">
        <div className="footer-top-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="footer-brand-col">
            <a href="#home" className="footer-logo">
              <img src="/logo.svg" alt={tCommon('brand.name')} className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 footer-logo-img" />
              <span className="brand-title text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
                {tCommon('brand.name').replace('Setu', '')}<span className="brand-title-accent">{tCommon('brand.taglineShort')}</span>
              </span>
            </a>
            <p className="mt-3 text-base sm:text-lg text-slate-300 font-medium">
              Reach Us at - <a href="mailto:sehatsetu26@gmail.com" className="text-orange-400 font-bold hover:underline">sehatsetu26@gmail.com</a>
            </p>
          </div>

          <div className="footer-right-links-wrapper" style={{ marginLeft: 'auto' }}>
            <div className="footer-links-col">
              <h4 className="footer-col-title">{t('connect')}</h4>
              <ul className="footer-links-list">
                <li><a href="/about" className={footerLinkClass}>{t('aboutUs')}</a></li>
                <li>
                  <button
                    type="button"
                    onClick={handleOpenChat}
                    className="talk-to-us-link cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1 font-bold text-orange-400 hover:text-orange-300 transition-colors text-base"
                  >
                    {t('talkToUs')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="copyright-text">
            {t('copyright')}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
