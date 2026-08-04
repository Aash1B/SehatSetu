import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, User, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getActiveDoctor, type DoctorProfile } from '../utils/doctorProfile';
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

const DoctorSidebar: React.FC<DoctorSidebarProps> = ({ className }) => {
  const navigate = useNavigate();
  const storedUser = getUser();
  const fallback = getActiveDoctor();
  const [activeDoctor, setActiveDoctor] = useState<DoctorProfile>({
    ...fallback,
    name: storedUser?.fullName || fallback.name,
    initials: (storedUser?.fullName || fallback.name).split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
  });

  useEffect(() => {
    const handleDoctorChange = () => setActiveDoctor(getActiveDoctor());
    window.addEventListener('sehat_doctor_changed', handleDoctorChange);
    fetch('/api/doctors/me', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((profile) => {
        const name = profile.user?.fullName || storedUser?.fullName || profile.name || 'Doctor';
        setActiveDoctor({ id: profile.id, name, specialization: profile.specialty || 'General Physician', initials: name.split(/\s+/).filter(Boolean).map((part: string) => part[0]).slice(0, 2).join('').toUpperCase() });
      })
      .catch(() => undefined);
    return () => window.removeEventListener('sehat_doctor_changed', handleDoctorChange);
  }, []);

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem('sehat_doctor_onboarding_data');
    navigate('/doctor/login');
  };

  const user = getUser();
  const displayName = activeDoctor.name || (user?.fullName ? `Dr. ${user.fullName}` : 'Doctor');
  const displaySpec = activeDoctor.specialization || 'General Physician';
  const initials = activeDoctor.initials ||
    displayName.replace(/^Dr\.\s*/i, '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ||
    'DR';

  return (
    <aside className={cn("shrink-0 w-64 bg-deep-space border-r border-jodhpur-tan/30 flex flex-col justify-between hidden md:flex h-full", className)}>
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
                    ? "bg-habanero/20 text-habanero"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5" />
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
      <div className="p-4 m-4 bg-white/10 rounded-xl flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Doctor Account</p>

        <div className="flex items-center gap-3">
          {/* Avatar with initials */}
          <div className="w-9 h-9 rounded-full bg-habanero/80 text-white flex items-center justify-center font-bold text-sm shrink-0 select-none">
            {initials}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold text-white truncate leading-tight">{displayName}</p>
            <p className="text-[11px] text-white/60 truncate mt-0.5">{displaySpec}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-white/50 hover:text-red-400 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
