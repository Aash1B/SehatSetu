import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../store/uiSlice';
import type { RootState } from '../store';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div className="brand-group">
          {/* Sidebar Toggle Button */}
          <button 
            type="button" 
            className="sidebar-toggle-btn"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Open sidebar menu"
            title="Open Sidebar"
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
              <svg viewBox="0 0 24 24" fill="none" className="logo-icon" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F97316"/>
                <path d="M12 7v6m-3-3h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="brand-title">
              Sehat<span className="brand-title-accent">Setu</span>
            </span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="nav-links">
          <button 
            type="button" 
            className={`nav-link ${currentPage === 'landing' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            Home
          </button>
          <a href="#services" className="nav-link">Services</a>
          <button 
            type="button" 
            className={`nav-link ${currentPage === 'doctors' ? 'active' : ''}`}
            onClick={() => navigate('/patient/search')}
          >
            Doctors
          </button>
        </nav>

        {/* Actions */}
        <div className="nav-actions">
          <button type="button" className="btn-sign-in">
            Sign In
          </button>
          <button type="button" className="btn-get-started" onClick={() => navigate('/patient/dashboard')}>
            Dashboard
          </button>
          <button 
            type="button" 
            className="mobile-toggle" 
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Toggle Navigation Sidebar"
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
