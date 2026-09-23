import React from 'react';
import { Home, Users, UserPlus, CalendarPlus, AlertTriangle, Clock, LogOut, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { RootState } from '../../patient/store';
import { closeSidebar } from '../../patient/store/uiSlice';
import { cn } from '../../lib/utils';
import { getUser, clearAuth } from '../../auth/authStorage';
import BrandLogo from '../../common/components/BrandLogo';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export interface AshaSidebarProps {
  className?: string;
}

const AshaSidebar: React.FC<AshaSidebarProps> = ({ className }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation('asha');
  const isSidebarOpen = useSelector((state: RootState) => state.ui.isSidebarOpen);
  const storedUser = getUser();

  const navItems = [
    { name: t('nav.dashboard'), path: '/asha/dashboard', icon: Home },
    { name: t('nav.caseload'), path: '/asha/patients', icon: Users },
    { name: t('nav.quickRegister'), path: '/asha/patients/new', icon: UserPlus },
    { name: t('nav.bookOnBehalf'), path: '/asha/book', icon: CalendarPlus },
  ];

  const handleLogout = () => {
    dispatch(closeSidebar());
    clearAuth();
    navigate('/asha/login');
  };

  const content = (
    <aside
      className={cn(
        'w-64 bg-white border-r border-slate-200 flex flex-col h-full font-sans transition-all duration-300',
        className,
      )}
    >
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo showWordmark={true} />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            ASHA
          </span>
          <button
            type="button"
            onClick={() => dispatch(closeSidebar())}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer border-none bg-transparent"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Worker Area Badge */}
      <div className="mx-4 mt-4 p-3 bg-emerald-50/80 rounded-xl border border-emerald-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {(storedUser?.fullName || 'AS').substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 truncate">
            {storedUser?.fullName || 'ASHA Worker'}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium truncate">
            {storedUser?.ashaWorker?.assignedArea || storedUser?.ashaWorker?.village || t('portalTitle')}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => dispatch(closeSidebar())}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px]',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
              )
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Footer / Language Switcher & Logout */}
      <div className="p-4 border-t border-slate-100 space-y-2.5 safe-area-pb">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {t('nav.language', 'Language')}
          </span>
          <LanguageSwitcher align="right" dropUp={true} />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition min-h-[44px] cursor-pointer border-none bg-transparent"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex h-screen sticky top-0 shrink-0 z-30">
        {content}
      </div>

      {/* Mobile Backdrop & Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => dispatch(closeSidebar())}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 doctor-mobile-sidebar animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

export default AshaSidebar;
