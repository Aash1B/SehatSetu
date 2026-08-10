import React from 'react';

// 1. Known Conditions: 3D Pink Heart with ECG Pulse Line
export const KnownConditionsIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pinkHeartGrad" x1="12" y1="8" x2="52" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF6584" />
        <stop offset="55%" stopColor="#FF2E55" />
        <stop offset="100%" stopColor="#D80032" />
      </linearGradient>
      <radialGradient id="pinkHeartHighlight" cx="24" cy="18" r="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#FF6584" stopOpacity="0" />
      </radialGradient>
      <filter id="heartShadow" x="0" y="2" width="64" height="62" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#990022" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#heartShadow)">
      <path
        d="M32 54C32 54 10 40.5 10 24.5C10 16.5 16.5 10 24.5 10C28.8 10 32 13 32 13C32 13 35.2 10 39.5 10C47.5 10 54 16.5 54 24.5C54 40.5 32 54 32 54Z"
        fill="url(#pinkHeartGrad)"
      />
      <path
        d="M32 54C32 54 10 40.5 10 24.5C10 16.5 16.5 10 24.5 10C28.8 10 32 13 32 13C32 13 35.2 10 39.5 10C47.5 10 54 16.5 54 24.5C54 40.5 32 54 32 54Z"
        fill="url(#pinkHeartHighlight)"
      />
      <path
        d="M14 31H23L26.5 23L31 38L35.5 27L38 31H50"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

// 2. Allergies: 3D Yellow Flower with Pollen Particles
export const AllergiesIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="flowerGrad" x1="18" y1="10" x2="46" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFEA6B" />
        <stop offset="60%" stopColor="#FFC107" />
        <stop offset="100%" stopColor="#FFA000" />
      </linearGradient>
      <linearGradient id="stemGrad" x1="28" y1="36" x2="38" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#FF6F00" />
      </linearGradient>
      <filter id="flowerShadow" x="2" y="2" width="60" height="60" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#885500" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#flowerShadow)">
      <path
        d="M32 32C32 44 38 48 34 56"
        stroke="url(#stemGrad)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="14" rx="5" ry="9" fill="url(#flowerGrad)" />
      <ellipse cx="32" cy="34" rx="5" ry="9" fill="url(#flowerGrad)" />
      <ellipse cx="22" cy="24" rx="9" ry="5" fill="url(#flowerGrad)" />
      <ellipse cx="42" cy="24" rx="9" ry="5" fill="url(#flowerGrad)" />
      <g transform="rotate(45 32 24)">
        <ellipse cx="32" cy="14" rx="5" ry="9" fill="url(#flowerGrad)" />
        <ellipse cx="32" cy="34" rx="5" ry="9" fill="url(#flowerGrad)" />
        <ellipse cx="22" cy="24" rx="9" ry="5" fill="url(#flowerGrad)" />
        <ellipse cx="42" cy="24" rx="9" ry="5" fill="url(#flowerGrad)" />
      </g>
      <circle cx="32" cy="24" r="7" fill="#FF8F00" />
      <circle cx="30" cy="22" r="5" fill="#FFA000" />
      <circle cx="17" cy="18" r="2.5" fill="#FFE082" />
      <circle cx="48" cy="18" r="3" fill="#FFCA28" />
      <circle cx="47" cy="32" r="2" fill="#FFE082" />
      <circle cx="16" cy="34" r="3" fill="#FFCA28" />
      <circle cx="38" cy="10" r="2" fill="#FFE082" />
    </g>
  </svg>
);

// 3. Past Surgeries / Procedures: 3D Royal Blue Shield with Medical Cross
export const PastSurgeriesIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGrad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4A80FF" />
        <stop offset="50%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
      <radialGradient id="shieldHighlight" cx="24" cy="16" r="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
      </radialGradient>
      <filter id="shieldShadow" x="4" y="4" width="56" height="58" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0A2540" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#shieldShadow)">
      <path
        d="M32 10C32 10 48 12 50 24C52 38 32 54 32 54C32 54 12 38 14 24C16 12 32 10 32 10Z"
        fill="url(#shieldGrad)"
      />
      <path
        d="M32 10C32 10 48 12 50 24C52 38 32 54 32 54C32 54 12 38 14 24C16 12 32 10 32 10Z"
        fill="url(#shieldHighlight)"
      />
      <path
        d="M27 23H37V28H42V36H37V41H27V36H22V28H27V23Z"
        fill="#FFFFFF"
      />
    </g>
  </svg>
);

// 4. Current Medications: 3D Green Pill Bottle & Capsule
export const CurrentMedicationsIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottleGrad" x1="16" y1="18" x2="44" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="60%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="capGrad" x1="18" y1="12" x2="42" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E2E8F0" />
      </linearGradient>
      <linearGradient id="pillGreen" x1="36" y1="36" x2="52" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
      <filter id="bottleShadow" x="4" y="6" width="56" height="54" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#044E36" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#bottleShadow)">
      <rect x="18" y="20" width="24" height="30" rx="6" fill="url(#bottleGrad)" />
      <rect x="16" y="14" width="28" height="7" rx="3.5" fill="url(#capGrad)" />
      <path d="M27 31H33V33H35V37H33V39H27V37H25V33H27V31Z" fill="#FFFFFF" />
      <g transform="rotate(-35 44 44)">
        <rect x="36" y="34" width="16" height="8" rx="4" fill="#FFFFFF" />
        <rect x="44" y="34" width="8" height="8" rx="4" fill="url(#pillGreen)" />
      </g>
    </g>
  </svg>
);

// 5. Last Updated: 3D Purple Calendar & Clock Badge
export const LastUpdatedIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="calGrad" x1="12" y1="16" x2="48" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="60%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
      <linearGradient id="calHeader" x1="12" y1="16" x2="48" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#6D28D9" />
      </linearGradient>
      <linearGradient id="clockGrad" x1="36" y1="36" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#6D28D9" />
      </linearGradient>
      <filter id="calShadow" x="4" y="6" width="56" height="54" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#3B0764" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#calShadow)">
      <rect x="12" y="16" width="36" height="34" rx="8" fill="url(#calGrad)" />
      <path d="M12 22C12 18.6863 14.6863 16 18 16H42C45.3137 16 48 18.6863 48 22V25H12V22Z" fill="url(#calHeader)" />
      <rect x="20" y="11" width="4" height="8" rx="2" fill="#DDD6FE" />
      <rect x="36" y="11" width="4" height="8" rx="2" fill="#DDD6FE" />
      <rect x="17" y="29" width="5" height="5" rx="1.5" fill="#DDD6FE" />
      <rect x="25" y="29" width="5" height="5" rx="1.5" fill="#DDD6FE" />
      <rect x="33" y="29" width="5" height="5" rx="1.5" fill="#DDD6FE" />
      <rect x="17" y="37" width="5" height="5" rx="1.5" fill="#DDD6FE" />
      <rect x="25" y="37" width="5" height="5" rx="1.5" fill="#DDD6FE" />
      <circle cx="44" cy="44" r="11" fill="url(#clockGrad)" stroke="#FFFFFF" strokeWidth="2.5" />
      <path d="M44 38V44L48 46" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

// 6. Medical Summary: 3D Blue Document & User Avatar Badge
export const MedicalSummaryIcon: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="docGrad" x1="14" y1="10" x2="46" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#BFDBFE" />
        <stop offset="50%" stopColor="#93C5FD" />
        <stop offset="100%" stopColor="#60A5FA" />
      </linearGradient>
      <linearGradient id="foldGrad" x1="36" y1="10" x2="46" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
      <linearGradient id="userBadgeGrad" x1="34" y1="34" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
      <filter id="docShadow" x="4" y="4" width="56" height="56" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#1E3A8A" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#docShadow)">
      <path d="M16 10H36L46 20V50C46 53.3137 43.3137 56 40 56H16C12.6863 56 10 53.3137 10 50V16C10 12.6863 12.6863 10 16 10Z" fill="url(#docGrad)" />
      <path d="M36 10V18C36 19.1046 36.8954 20 38 20H46L36 10Z" fill="url(#foldGrad)" />
      <rect x="16" y="24" width="16" height="3" rx="1.5" fill="#1D4ED8" />
      <rect x="16" y="31" width="22" height="3" rx="1.5" fill="#2563EB" />
      <rect x="16" y="38" width="14" height="3" rx="1.5" fill="#2563EB" />
      <circle cx="44" cy="44" r="11" fill="url(#userBadgeGrad)" stroke="#FFFFFF" strokeWidth="2.5" />
      <circle cx="44" cy="41" r="3.5" fill="#FFFFFF" />
      <path d="M38 49C38 46 41 45 44 45C47 45 50 46 50 49" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);
