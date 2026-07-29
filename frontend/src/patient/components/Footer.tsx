import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer id="contact" className="site-footer">
      <div className="footer-container">
        <div className="footer-columns-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <a href="#home" className="footer-logo">
              <div className="logo-badge">
                <svg viewBox="0 0 24 24" fill="none" className="logo-icon" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="var(--color-habanero)"/>
                  <path d="M12 7v6m-3-3h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="brand-title text-white">
                Sehat<span className="brand-title-accent">Setu</span>
              </span>
            </a>
            <p className="footer-about-text">
              Making quality healthcare simpler, more human, and accessible to everyone.
            </p>
            <div className="footer-social-icons">
              <a href="#email" aria-label="Email" className="social-circle">✉</a>
              <a href="#phone" aria-label="Phone" className="social-circle">📞</a>
              <a href="#instagram" aria-label="Instagram" className="social-circle">📷</a>
              <a href="#linkedin" aria-label="LinkedIn" className="social-circle">in</a>
            </div>
          </div>

          {/* Company Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links-list">
              <li><a href="#about">About us</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#press">Press</a></li>
            </ul>
          </div>

          {/* Services Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Services</h4>
            <ul className="footer-links-list">
              <li><a href="#doctors">Find a doctor</a></li>
              <li><a href="#doctors">Book appointment</a></li>
              <li><a href="#records">Health records</a></li>
            </ul>
          </div>

          {/* Support Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Support</h4>
            <ul className="footer-links-list">
              <li><a href="#help">Help center</a></li>
              <li><a href="#contact">Contact us</a></li>
              <li><a href="#privacy">Privacy policy</a></li>
            </ul>
          </div>

          {/* Connect Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Connect</h4>
            <p className="footer-connect-text">
              Have a question? Our care team is here for you.
            </p>
            <a href="#talk" className="talk-to-us-link">
              Talk to us →
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="copyright-text">
            Copyright © 2026 SehatSetu. All rights reserved.
          </div>
          <div className="bottom-links">
            <a href="#terms">Terms</a>
            <a href="#privacy">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
