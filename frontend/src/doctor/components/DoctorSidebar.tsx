import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, User, LogOut, FileCheck } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { type DoctorProfile } from '../utils/doctorProfile';
import { getToken, getUser, clearAuth } from '../../auth/authStorage';
import BrandLogo from '../../common/components/BrandLogo';

export interface DoctorSidebarProps {
  className?: string;
}

const navItems = [
  { name: 'Home', path: '/doctor/dashboard', icon: Home },
  { name: 'Patients', path: '/doctor/consultations', icon: Users },
  { name: 'EHR Drafts', path: '/doctor/ehr-drafts', icon: FileCheck },
  { name: 'Availability', path: '/doctor/availability', icon: Calendar },
  { name: 'Profile', path: '/doctor/profile', icon: User },
];

const getInitials = (name: string) =>
  name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'DR';

const DoctorSidebar: React.FC<DoctorSidebarProps> = ({ className }) => {
  const navigate = useNavigate();
  // Always derive name from the JWT auth token — never from localStorage (which may be stale)
  const storedUser = getUser();
  const authName = storedUser?.fullName
    ? (storedUser.fullName.startsWith('Dr.') ? storedUser.fullName : `Dr. ${storedUser.fullName}`)
    : 'Doctor';

  const [activeDoctor, setActiveDoctor] = useState<DoctorProfile>({
    id: storedUser?.id || 'd-active',
    name: authName,
    specialization: 'General Physician',
    initials: getInitials(authName),
  });

  useEffect(() => {
    // After onboarding, update specialization — but always keep the auth user's name
    const handleDoctorChange = () => {
      if (storedUser) {
        const name = storedUser.fullName.startsWith('Dr.') ? storedUser.fullName : `Dr. ${storedUser.fullName}`;
        setActiveDoctor(prev => ({ ...prev, name, initials: getInitials(name) }));
      }
    };
    window.addEventListener('sehat_doctor_changed', handleDoctorChange);

    // Fetch backend profile to get specialization (name always comes from JWT)
    fetch('/api/doctors/me', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((profile) => {
        // Name always comes from JWT auth storage — never from the backend profile
        // which may have a different doctor's data if sessions overlap
        const name = storedUser?.fullName
          ? (storedUser.fullName.startsWith('Dr.') ? storedUser.fullName : `Dr. ${storedUser.fullName}`)
          : (profile.user?.fullName || profile.name || 'Doctor');
        setActiveDoctor({
          id: profile.id,
          name,
          specialization: profile.specialty || 'General Physician',
          initials: getInitials(name),
        });
      })
      .catch(() => undefined);

    return () => window.removeEventListener('sehat_doctor_changed', handleDoctorChange);
  }, []);

  const handleLogout = () => {
    const user = getUser();
    // Clear this specific user's profile from localStorage to prevent bleed-over
    if (user?.id) {
      localStorage.removeItem(`sehat_doctor_profile_${user.id}`);
    }
    localStorage.removeItem('sehat_doctor_onboarding_data');
    localStorage.removeItem('sehat_active_doctor_id');
    clearAuth();
    navigate('/doctor/login');
  };

  const displayName = activeDoctor.name || authName;
  const displaySpec = activeDoctor.specialization || 'General Physician';
  const initials = getInitials(displayName);

  return (
    <aside className={cn("shrink-0 w-72 bg-[#223382] border-r border-white/10 flex flex-col justify-between hidden md:flex h-full text-white", className)}>
      <div>
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <BrandLogo
            className="gap-3"
            markWrapperClassName="w-10 h-10 rounded-md bg-habanero flex items-center justify-center p-1.5"
            wordmarkClassName="font-bold text-2xl text-white tracking-tight"
            accentClassName="text-blue-400"
          />
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex flex-col gap-3 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-5 py-4 rounded-2xl text-lg font-bold transition-colors relative",
                  isActive
                    ? "bg-white/20 text-white font-extrabold shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-7 h-7 text-white" />
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="absolute right-5 w-2.5 h-2.5 rounded-full bg-habanero"></span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Doctor Account Display */}
      <div className="p-4 m-4 bg-white/15 rounded-xl flex flex-col gap-2.5 border border-white/10">
        <p className="text-xs uppercase tracking-wider text-white/70 font-extrabold">Doctor Account</p>

        <div className="flex items-center gap-3">
          {/* Avatar with initials */}
          <div className="w-10 h-10 rounded-full bg-habanero text-white flex items-center justify-center font-bold text-base shrink-0 select-none shadow-xs">
            {initials}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-base font-extrabold text-white truncate leading-tight">{displayName}</p>
            <p className="text-xs text-white/80 truncate mt-0.5 font-medium">{displaySpec}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="mt-1 flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
