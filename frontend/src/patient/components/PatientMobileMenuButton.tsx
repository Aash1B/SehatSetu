import React from 'react';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '../store/uiSlice';

interface PatientMobileMenuButtonProps {
  visible: boolean;
}

const PatientMobileMenuButton: React.FC<PatientMobileMenuButtonProps> = ({ visible }) => {
  const dispatch = useDispatch();

  if (!visible) return null;

  return (
    <button
      type="button"
      className="patient-mobile-menu-button"
      onClick={() => dispatch(toggleSidebar())}
      aria-label="Open navigation menu"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
};

export default PatientMobileMenuButton;
