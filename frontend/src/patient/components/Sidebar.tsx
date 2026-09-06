import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { closeSidebar, setDashboardTab } from '../store/uiSlice';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuth } from '../../auth/authStorage';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../common/components/BrandLogo';

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOpen = useSelector((state: RootState) => state.ui.isSidebarOpen);
  const currentPage = useSelector((state: RootState) => state.ui.currentPage);
  const { t: tCommon } = useTranslation('common');
  const { t: tNavbar } = useTranslation('navbar');
  const { t: tFooter } = useTranslation('footer');
  const { t: tButtons } = useTranslation('buttons');

  const user = getUser();
  const userName = user?.fullName || 'Guest User';
  const userInitials = user?.fullName
    ? user.fullName
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'GU';
  const userIdDisplay = user?.id
    ? `Patient ID: #${user.id.slice(-5).toUpperCase()}`
    : 'Patient Portal';

  const handleLogout = () => {
    clearAuth();
    dispatch(closeSidebar());
    navigate('/patient/login');
  };

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

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={() => dispatch(closeSidebar())}
        aria-hidden="true"
      />

      {/* Slide-out Sidebar Drawer */}
      <aside className={`sidebar-drawer ${isOpen ? 'open' : ''}`} aria-label={tNavbar('openSidebar')}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo-icon">
              <BrandLogo showWordmark={false} markWrapperClassName="" markClassName="sidebar-logo-img" alt="" />
            </div>
            <div className="sidebar-brand-text">
              <BrandLogo showMark={false} wordmarkClassName="sidebar-brand-title" />
            </div>
          </div>
          <button 
            type="button" 
            className="sidebar-close-btn"
            onClick={() => dispatch(closeSidebar())}
            aria-label={tCommon('close')}
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
            <span className="sidebar-group-title">{tFooter('mainNavigation')}</span>
            <nav className="sidebar-menu">
              <a href="#home" className={`sidebar-item ${currentPage === 'landing' ? 'active' : ''}`} onClick={() => { navigate('/'); dispatch(closeSidebar()); }}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>{tCommon('home')}</span>
              </a>
              <button type="button" className={`sidebar-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => { navigate('/patient/dashboard'); dispatch(closeSidebar()); }}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                </svg>
                <span>{tCommon('dashboard')}</span>
              </button>
              <button type="button" className="sidebar-item" onClick={() => { navigate('/patient/appointments'); dispatch(closeSidebar()); }}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>My Appointments</span>
              </button>
              <button type="button" className="sidebar-item" onClick={() => { navigate('/patient/medical'); dispatch(closeSidebar()); }}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <span>Health Records</span>
              </button>
              <button type="button" className="sidebar-item" onClick={() => { navigate('/patient/mch'); dispatch(closeSidebar()); }}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
                <span>MCH Tracking</span>
              </button>
              <button type="button" className="sidebar-item" onClick={() => { dispatch(setDashboardTab('prescriptions')); navigate('/patient/dashboard'); dispatch(closeSidebar()); }}>
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
                <span>Prescriptions</span>
              </button>
             <a href="#services" className="sidebar-item" onClick={handleNavClick}>
               <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                 <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
               </svg>
               <span>{tFooter('ourServices')}</span>
             </a>
             <button
               type="button"
               className="sidebar-item"
               onClick={() => { navigate('/about'); dispatch(closeSidebar()); }}
             >
               <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <circle cx="12" cy="12" r="10"></circle>
                 <line x1="12" y1="16" x2="12" y2="12"></line>
                 <line x1="12" y1="8" x2="12.01" y2="8"></line>
               </svg>
               <span>{tFooter('aboutUs')}</span>
             </button>
            </nav>
          </div>

          {/* Section 4: Settings & Support */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">{tFooter('accountSupport')}</span>
            <nav className="sidebar-menu">
              <button 
                type="button" 
                className={`sidebar-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                  dispatch(setDashboardTab('profile'));
                  navigate('/patient/dashboard');
                  dispatch(closeSidebar());
                }}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>{tFooter('profileSettings')}</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Footer User Profile Card */}
        <div className="sidebar-footer">
          <div 
            className="sidebar-user-info cursor-pointer"
            onClick={() => {
              if (user) {
                dispatch(setDashboardTab('profile'));
                navigate('/patient/dashboard');
              } else {
                navigate('/patient/login');
              }
              dispatch(closeSidebar());
            }}
          >
            <div className="user-avatar">
              <span>{userInitials}</span>
              <span className="online-indicator"></span>
            </div>
            <div className="user-details">
              <span className="user-name">{userName}</span>
              <span className="user-id">{userIdDisplay}</span>
            </div>
          </div>
          {user ? (
            <button 
              type="button" 
              className="user-logout-btn" 
              title={tFooter('signOut')}
              onClick={handleLogout}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          ) : (
            <button 
              type="button" 
              className="user-logout-btn" 
              title={tButtons('signIn')}
              onClick={() => {
                dispatch(closeSidebar());
                navigate('/patient/login');
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
