import React from 'react';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../common/components/BrandLogo';

const footerLinkClass = 'footer-link';

const Footer: React.FC = () => {
  const { t } = useTranslation('footer');
  const { t: tChatbot } = useTranslation('chatbot');

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
              <BrandLogo
                className="gap-4"
                markWrapperClassName="shrink-0 footer-logo-img"
                markClassName="w-full h-full object-contain"
                wordmarkClassName="brand-title text-white text-3xl sm:text-4xl font-extrabold tracking-tight"
                accentClassName="text-orange-500 brand-title-accent"
              />
            </a>
            <p className="mt-3 text-base sm:text-lg text-slate-300 font-medium">
              {t('contactUs')}: <a href="mailto:sehatsetu26@gmail.com" className="text-orange-400 font-bold hover:underline">sehatsetu26@gmail.com</a>
            </p>
          </div>

          <div className="footer-right-links-wrapper" style={{ marginLeft: '0' }}>
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
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-normal">
                {tChatbot('title')}
              </p>
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
