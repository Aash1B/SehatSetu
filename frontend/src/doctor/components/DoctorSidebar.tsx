import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, User, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { type DoctorProfile } from '../utils/doctorProfile';
import { getToken, getUser, clearAuth } from '../../auth/authStorage';

export interface DoctorSidebarProps {
  className?: string;
}

const navItems = [
  { name: 'Home', path: '/doctor/dashboard', icon: Home },
  { name: 'Patients', path: '/doctor/consultations', icon: Users },
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
    <aside className={cn("shrink-0 w-64 bg-[#223382] border-r border-white/10 flex flex-col justify-between hidden md:flex h-full text-white", className)}>
      <div>
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-habanero text-white flex items-center justify-center font-bold text-xl leading-none pt-1">
            s
          </div>
          <span className="font-bold text-xl text-white tracking-tight">Sehat Setu</span>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex flex-col gap-2 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors relative",
                  isActive
                    ? "bg-white/20 text-white font-bold shadow-xs"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5 text-white" />
                  {item.name}
                  {isActive && (
                    <span className="absolute right-4 w-1.5 h-1.5 rounded-full bg-habanero"></span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Doctor Account Display */}
      <div className="p-4 m-4 bg-white/15 rounded-xl flex flex-col gap-2 border border-white/10">
        <p className="text-[10px] uppercase tracking-wider text-white/60 font-bold">Doctor Account</p>

        <div className="flex items-center gap-3">
          {/* Avatar with initials */}
          <div className="w-9 h-9 rounded-full bg-habanero text-white flex items-center justify-center font-bold text-sm shrink-0 select-none shadow-xs">
            {initials}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold text-white truncate leading-tight">{displayName}</p>
            <p className="text-[11px] text-white/70 truncate mt-0.5">{displaySpec}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
