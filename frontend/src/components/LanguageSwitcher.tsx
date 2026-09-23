import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { supportedLanguages, changeLanguage, getCurrentLanguage } from '../i18n';

interface LanguageSwitcherProps {
  align?: 'left' | 'right';
  className?: string;
  dropUp?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  align = 'right',
  className = '',
  dropUp = false,
}) => {
  const { t } = useTranslation('common');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const currentLang = getCurrentLanguage();
  const selectedLangObj = supportedLanguages.find((l) => l.code === currentLang) || supportedLanguages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangDropdownOpen(false);
      }
    };
    if (langDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [langDropdownOpen]);

  const handleLanguageChange = async (lng: string) => {
    await changeLanguage(lng);
    setLangDropdownOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={langDropdownRef}>
      <button
        type="button"
        onClick={() => setLangDropdownOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={langDropdownOpen}
        aria-label={t('selectLanguage', 'Select Language')}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-200/70 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
      >
        <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" />
        <span className="max-w-[75px] sm:max-w-none truncate">{selectedLangObj.nativeName}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
            langDropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {langDropdownOpen && (
        <div
          role="listbox"
          aria-label={t('selectLanguage', 'Select Language')}
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } w-48 bg-white/98 backdrop-blur-md rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.12)] border border-slate-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            {t('selectLanguage', 'Select Language')}
          </div>
          <div className="max-h-60 overflow-y-auto py-0.5">
            {supportedLanguages.map((lang) => {
              const isSelected = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl mx-auto my-0.5 transition cursor-pointer border-none ${
                    isSelected
                      ? 'bg-orange-50 text-orange-600 font-bold'
                      : 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 text-left">
                    <span>{lang.nativeName}</span>
                    {lang.nativeName !== lang.name && (
                      <span className="text-[10px] text-slate-400 font-normal">({lang.name})</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
