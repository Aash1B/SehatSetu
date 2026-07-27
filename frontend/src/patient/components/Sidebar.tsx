import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { closeSidebar, setCurrentPage, setDashboardTab, type DashboardTabType } from '../store/uiSlice';

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state: RootState) => state.ui.isSidebarOpen);
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);
  const activeTab = useSelector((state: RootState) => state.ui.dashboardTab);

  // Close sidebar on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        dispatch(closeSidebar());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dispatch]);

  // Prevent background scroll when sidebar drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavClick = () => {
    dispatch(closeSidebar());
  };

  const handleDashboardTabClick = (tab: DashboardTabType) => {
    dispatch(setDashboardTab(tab));
    dispatch(setCurrentPage('dashboard'));
    dispatch(closeSidebar());
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={() => dispatch(closeSidebar())}
        aria-hidden="true"
      />

      {/* Slide-out Sidebar Drawer */}
      <aside className={`sidebar-drawer ${isOpen ? 'open' : ''}`} aria-label="Sidebar Menu">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F97316"/>
                <path d="M12 7v6m-3-3h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <span className="sidebar-brand-title">
                Sehat<span className="brand-title-accent">Setu</span>
              </span>
              <span className="sidebar-portal-badge">Patient Portal</span>
            </div>
          </div>
          <button 
            type="button" 
            className="sidebar-close-btn"
            onClick={() => dispatch(closeSidebar())}
            aria-label="Close sidebar menu"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content Navigation */}
        <div className="sidebar-content">
          {/* Section 1: Main Menu */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Main Navigation</span>
            <nav className="sidebar-menu">
              <a href="#home" className={`sidebar-item ${currentPage === 'landing' ? 'active' : ''}`} onClick={() => { dispatch(setCurrentPage('landing')); dispatch(closeSidebar()); }}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>Home</span>
              </a>
              <a href="#services" className="sidebar-item" onClick={handleNavClick}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <span>Our Services</span>
              </a>
              <a href="#how-it-works" className="sidebar-item" onClick={handleNavClick}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>How It Works</span>
              </a>
              <a href="#testimonials" className="sidebar-item" onClick={handleNavClick}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Patient Reviews</span>
              </a>
            </nav>
          </div>

          {/* Section 3: Emergency Card */}
          <div className="sidebar-emergency-card">
            <div className="emergency-card-header">
              <div className="emergency-icon-pulse">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v20M2 12h20" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <span className="emergency-card-title">24/7 Emergency Line</span>
                <span className="emergency-card-subtitle">Immediate Assistance</span>
              </div>
            </div>
            <a href="tel:108" className="emergency-call-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>Call Emergency (108)</span>
            </a>
          </div>

          {/* Section 4: Settings & Support */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Account & Support</span>
            <nav className="sidebar-menu">
              <a href="#profile" className="sidebar-item" onClick={handleNavClick}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Profile & Settings</span>
              </a>
              <a href="#help" className="sidebar-item" onClick={handleNavClick}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Help & FAQs</span>
              </a>
            </nav>
          </div>
        </div>

        {/* Footer User Profile Card */}
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="user-avatar">
              <span>AS</span>
              <span className="online-indicator"></span>
            </div>
            <div className="user-details">
              <span className="user-name">Ananya Sharma</span>
              <span className="user-id">Patient ID: #SS-89421</span>
            </div>
          </div>
          <button 
            type="button" 
            className="user-logout-btn" 
            title="Sign Out"
            onClick={handleNavClick}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
