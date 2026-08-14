import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <header className="h-[80px] px-8 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-40 w-full shrink-0 shadow-xs font-sans">
      {/* Left: Spacer (Logo resides in the sidebar top) */}
      <div className="flex-1" />

      {/* Center: DOCTOR PORTAL */}
      <div className="flex-1 flex items-center justify-center">
        <span
          className="text-xl md:text-2xl font-extrabold uppercase tracking-widest"
          style={{
            color: '#223382',
            letterSpacing: '2.5px',
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
          className="flex items-center gap-3 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-all cursor-pointer shadow-xs"
          title="View Doctor Profile"
        >
          <div className="w-10 h-10 rounded-full bg-[#111144] overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
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
          <span className="text-base font-extrabold text-slate-900 pr-1 max-w-[160px] truncate">
            {displayName}
          </span>
        </button>
      </div>
    </header>
  );
};

export default DoctorNavbar;
