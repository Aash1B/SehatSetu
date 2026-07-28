import React, { useState, useRef, useEffect } from 'react';

export interface OptionItem {
  value: string;
  label: string;
}

interface CustomSelectProps {
  icon?: React.ReactNode;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  icon,
  options,
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-wrapper ${className}`} ref={containerRef}>
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {icon && <span className="custom-select-icon">{icon}</span>}
        <span className="custom-select-label">{selectedOption ? selectedOption.label : value}</span>
        <svg 
          className={`custom-select-arrow ${isOpen ? 'is-open' : ''}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          width="12" 
          height="12"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                className={`custom-select-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={isSelected}
              >
                <span className="option-text">{option.label}</span>
                {isSelected && (
                  <svg className="option-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
