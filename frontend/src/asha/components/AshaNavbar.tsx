import React from 'react';
import { Menu, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toggleSidebar } from '../../patient/store/uiSlice';
import BrandLogo from '../../common/components/BrandLogo';
import { getUser } from '../../auth/authStorage';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export interface AshaNavbarProps {
  title?: string;
}

const AshaNavbar: React.FC<AshaNavbarProps> = ({ title }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation('asha');
  const storedUser = getUser();

  return (
    <header className="relative h-[60px] sm:h-[72px] px-3 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 w-full shrink-0 shadow-xs font-sans gap-2 safe-area-pt">
      {/* Left: Mobile hamburger & Logo */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 z-10">
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition min-w-[44px] min-h-[44px] flex items-center justify-center border-none bg-transparent cursor-pointer shrink-0"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="md:hidden shrink-0">
          <BrandLogo showWordmark={false} markWrapperClassName="w-8 h-8 rounded-lg flex items-center justify-center p-0.5" />
        </div>
      </div>

      {/* Center: Title */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center text-center max-w-[45%] sm:max-w-[55%] md:max-w-[60%] pointer-events-none">
        <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate">
          {/asha/i.test(t('dashboard.title')) ? (
            <>
              <span className="text-emerald-600 font-black">ASHA</span>
              {t('dashboard.title').replace(/asha/i, '')}
            </>
          ) : t('dashboard.title').includes('आशा') ? (
            <>
              <span className="text-emerald-600 font-black">आशा</span>
              {t('dashboard.title').replace('आशा', '')}
            </>
          ) : (
            <>
              <span className="text-emerald-600 font-black">ASHA</span> Dashboard
            </>
          )}
        </h1>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 z-10 ml-auto">
        {/* Language Switcher */}
        <LanguageSwitcher align="right" />


        {/* Quick Register CTA (hidden on narrow mobile to prevent header overflow) */}
        <button
          type="button"
          onClick={() => navigate('/asha/patients/new')}
          className="hidden sm:flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition min-h-[44px] border-none cursor-pointer shadow-xs shrink-0"
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          <span>{t('caseload.registerButton')}</span>
        </button>

        {/* Worker Avatar & Name badge */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
            {(storedUser?.fullName || 'AS').substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">
            {storedUser?.fullName || 'ASHA'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default AshaNavbar;
