import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, User, LogOut, FileCheck, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../patient/store';
import { closeSidebar } from '../../patient/store/uiSlice';
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
  const dispatch = useDispatch();
  const isSidebarOpen = useSelector((state: RootState) => state.ui.isSidebarOpen);

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
    dispatch(closeSidebar());
    const user = getUser();
    if (user?.id) {
      localStorage.removeItem(`sehat_doctor_profile_${user.id}`);
    }
    localStorage.removeItem('sehat_doctor_onboarding_data');
    localStorage.removeItem('sehat_active_doctor_id');
    clearAuth();
    navigate('/doctor/login');
  };

  const handleNavClick = (path: string) => {
    dispatch(closeSidebar());
    navigate(path);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header card with close button for mobile */}
      <div className="relative">
        <DoctorLogoHeader height="120px" className="bg-white shrink-0" />
        <button
          type="button"
          onClick={() => dispatch(closeSidebar())}
          className="md:hidden absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

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
                onClick={() => dispatch(closeSidebar())}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-5 py-3.5 rounded-xl text-lg md:text-xl transition-all relative border-l-4 group min-h-[44px]",
                    isActive
                      ? "bg-white text-[#223382] font-bold border-transparent shadow-md"
                      : "border-transparent text-slate-900 hover:bg-white/40 font-bold"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("w-6 h-6 md:w-7 md:h-7 transition-colors", isActive ? "text-[#223382]" : "text-slate-900 group-hover:text-slate-900")} />
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
                onClick={() => dispatch(closeSidebar())}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-5 py-3.5 rounded-xl text-lg md:text-xl transition-all relative border-l-4 group min-h-[44px]",
                    isActive
                      ? "bg-white text-[#223382] font-bold border-transparent shadow-md"
                      : "border-transparent text-slate-900 hover:bg-white/40 font-bold"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("w-6 h-6 md:w-7 md:h-7 transition-colors", isActive ? "text-[#223382]" : "text-slate-900 group-hover:text-slate-900")} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer Sign Out Section */}
      <div className="p-4 border-t border-slate-200 bg-white mt-auto shrink-0">
        <button
          onClick={handleLogout}
          title="Sign out"
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-lg font-medium transition-all text-slate-700 hover:text-[#223382] hover:bg-[#223382]/5 cursor-pointer group min-h-[44px]"
        >
          <span>Sign Out</span>
          <LogOut className="w-6 h-6 text-slate-600 group-hover:text-[#223382]" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className={cn("shrink-0 w-[320px] lg:w-[360px] bg-[#9BACD8] border-r border-slate-300 flex flex-col justify-between hidden md:flex h-full text-slate-800 font-sans", className)}>
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => dispatch(closeSidebar())}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-[280px] sm:w-[320px] bg-[#9BACD8] flex flex-col justify-between md:hidden shadow-2xl transition-transform duration-300 text-slate-800 font-sans",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default DoctorSidebar;
