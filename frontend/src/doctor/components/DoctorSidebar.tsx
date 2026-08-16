import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, User, LogOut, FileCheck } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { type DoctorProfile } from '../utils/doctorProfile';
import { getToken, getUser, clearAuth } from '../../auth/authStorage';
import { API_BASE_URL } from '../../patient/utils/constants';
import DoctorLogoHeader from './DoctorLogoHeader';

export interface DoctorSidebarProps {
  className?: string;
}

const navItems = [
  { name: 'Dashboard', path: '/doctor/dashboard', icon: Home },
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
    fetch(`${API_BASE_URL}/doctors/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((profile) => {
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
    if (user?.id) {
      localStorage.removeItem(`sehat_doctor_profile_${user.id}`);
    }
    localStorage.removeItem('sehat_doctor_onboarding_data');
    localStorage.removeItem('sehat_active_doctor_id');
    clearAuth();
    navigate('/doctor/login');
  };

  return (
    <aside className={cn("shrink-0 w-[320px] lg:w-[360px] bg-[#9BACD8] border-r border-slate-300 flex flex-col justify-between hidden md:flex h-full text-slate-800 font-sans", className)}>
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Standalone modular Doctor Logo Header Card */}
        <DoctorLogoHeader height="120px" className="bg-white shrink-0" />

        {/* Navigation Content */}
        <div className="py-6 px-4 flex flex-col gap-7 flex-1 bg-[#9BACD8]">
          {/* Main Navigation Group */}
          <div className="flex flex-col gap-2.5">
            <span className="text-base md:text-lg font-extrabold tracking-[1.5px] text-slate-900 uppercase px-5 mb-1.5">
              Main Navigation
            </span>
            <nav className="flex flex-col gap-2">
              {navItems.slice(0, 4).map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  title={item.name}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-4 px-5 py-3.5 rounded-xl text-xl transition-all relative border-l-4 group",
                      isActive
                        ? "bg-white text-[#223382] font-bold border-transparent shadow-md"
                        : "border-transparent text-slate-900 hover:bg-white/40 font-bold"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn("w-7 h-7 transition-colors", isActive ? "text-[#223382]" : "text-slate-900 group-hover:text-slate-900")} />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Account & Support Group */}
          <div className="flex flex-col gap-2.5">
            <span className="text-base md:text-lg font-extrabold tracking-[1.5px] text-slate-900 uppercase px-5 mb-1.5">
              Account & Support
            </span>
            <nav className="flex flex-col gap-2">
              {navItems.slice(4).map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  title={item.name}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-4 px-5 py-3.5 rounded-xl text-xl transition-all relative border-l-4 group",
                      isActive
                        ? "bg-white text-[#223382] font-bold border-transparent shadow-md"
                        : "border-transparent text-slate-900 hover:bg-white/40 font-bold"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn("w-7 h-7 transition-colors", isActive ? "text-[#223382]" : "text-slate-900 group-hover:text-slate-900")} />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Footer Sign Out Section */}
      <div className="p-4 border-t border-slate-200 bg-white mt-auto shrink-0">
        <button
          onClick={handleLogout}
          title="Sign out"
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-lg font-medium transition-all text-slate-700 hover:text-[#223382] hover:bg-[#223382]/5 cursor-pointer group"
        >
          <span>Sign Out</span>
          <LogOut className="w-6 h-6 text-slate-600 group-hover:text-[#223382]" />
        </button>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
