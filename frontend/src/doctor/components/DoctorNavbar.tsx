import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '../../patient/store/uiSlice';
import BrandLogo from '../../common/components/BrandLogo';
import { getToken, getUser } from '../../auth/authStorage';
import type { Doctor } from '../../types';

export interface DoctorNavbarProps {
  doctor?: {
    id?: string;
    name?: string;
    imageUrl?: string;
    initials?: string;
    specialization?: string;
  };
}

const DoctorNavbar: React.FC<DoctorNavbarProps> = ({ doctor }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const storedUser = getUser();
  const authName = storedUser?.fullName
    ? (storedUser.fullName.startsWith('Dr.') ? storedUser.fullName : `Dr. ${storedUser.fullName}`)
    : 'Doctor';

  const [fetchedImage, setFetchedImage] = useState<string>('');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    setImageLoadFailed(false);
    if (doctor?.imageUrl) {
      setFetchedImage(doctor.imageUrl);
    } else {
      fetch('/api/doctors/me', { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(async (res) => (res.ok ? res.json() : null))
        .then((profile) => {
          if (profile?.imageUrl) {
            setFetchedImage(profile.imageUrl);
          }
        })
        .catch(() => null);
    }
  }, [doctor?.imageUrl]);

  const displayName = doctor?.name || authName;
  const imageUrl = doctor?.imageUrl || fetchedImage;

  return (
    <header className="h-[64px] sm:h-[80px] px-3 sm:px-6 md:px-8 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-40 w-full shrink-0 shadow-xs font-sans gap-2">
      {/* Left: Mobile Hamburger Menu & Logo */}
      <div className="flex items-center gap-2 flex-1">
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition border-none bg-transparent cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open Navigation Menu"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div className="md:hidden">
          <BrandLogo showWordmark={false} markWrapperClassName="w-8 h-8 rounded-lg bg-transparent flex items-center justify-center p-0.5" />
        </div>
      </div>

      {/* Center: DOCTOR PORTAL Title */}
      <div className="flex items-center justify-center">
        <span
          className="text-xs sm:text-base md:text-2xl font-extrabold uppercase tracking-wider sm:tracking-widest truncate"
          style={{
            color: '#223382',
            display: 'inline-block'
          }}
        >
          DOCTOR PORTAL
        </span>
      </div>

      {/* Right: Profile Image & Pill */}
      <div className="flex-1 flex items-center justify-end">
        <button
          type="button"
          onClick={() => navigate('/doctor/profile')}
          className="flex items-center gap-2 sm:gap-3 p-1 sm:px-4 sm:py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-all cursor-pointer shadow-xs min-h-[40px]"
          title="View Doctor Profile"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#111144] overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
            {imageUrl && !imageLoadFailed ? (
              <img
                src={imageUrl}
                alt={`${displayName} profile`}
                className="w-full h-full object-cover"
                onError={() => setImageLoadFailed(true)}
              />
            ) : (
              <svg viewBox="0 0 100 100" className="w-[75%] h-[75%]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="50" cy="39" r="16" fill="#FFFFFF" />
                <path d="M 10 100 C 10 74, 26 60, 50 60 C 74 60, 90 74, 90 100 Z" fill="#FFFFFF" />
              </svg>
            )}
          </div>
          <span className="hidden sm:inline-block text-sm sm:text-base font-extrabold text-slate-900 pr-1 max-w-[120px] md:max-w-[160px] truncate">
            {displayName}
          </span>
        </button>
      </div>
    </header>
  );
};

export default DoctorNavbar;
