import React from 'react';

interface MehLogoProps {
  className?: string;
  size?: number | string;
}

export const MehLogo: React.FC<MehLogoProps> = ({ 
  className = "w-6 h-6", 
  size 
}) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="mehGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff3b5c" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id="mehBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      {/* Background soft pill */}
      <rect width="100" height="100" rx="26" fill="#141724" />
      <rect x="2" y="2" width="96" height="96" rx="24" stroke="#f43f5e" strokeWidth="2" strokeOpacity="0.3" />
      
      {/* Signal Arc */}
      <path 
        d="M26 23 C40 14, 60 14, 74 23" 
        stroke="url(#mehBlue)" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeDasharray="4 3" 
      />
      <circle cx="74" cy="23" r="2.5" fill="#38bdf8" />

      {/* Distinctive M-Monogram Remote Core */}
      <path 
        d="M 22 70 L 22 36 C 22 32, 25 30, 29 30 C 33 30, 36 32, 36 36 L 36 54 L 46 41 C 48 38, 52 38, 54 41 L 64 54 L 64 36 C 64 32, 67 30, 71 30 C 75 30, 78 32, 78 36 L 78 70 C 78 74, 75 76, 71 76 C 68 76, 65 74, 64 71 L 64 61 L 53 76 C 51 78, 49 78, 47 76 L 36 61 L 36 71 C 35 74, 32 76, 29 76 C 25 76, 22 74, 22 70 Z" 
        fill="url(#mehGrad)" 
      />
      
      {/* Center Node Laser */}
      <circle cx="50" cy="56" r="3.5" fill="#ffffff" />
      <circle cx="50" cy="56" r="1.8" fill="#0ea5e9" />
    </svg>
  );
};
