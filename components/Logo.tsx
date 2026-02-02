
import React from 'react';
import { Theme } from '../types';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  theme?: Theme;
  hideText?: boolean;
  isWaiting?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  theme = 'light', 
  hideText = false,
  isWaiting = false
}) => {
  const isDark = theme === 'dark';
  const textFill = isDark ? '#FFFFFF' : '#502b6e';
  
  const widthClass = size === 'sm' ? 'w-40' : size === 'lg' ? 'w-full max-w-[480px]' : 'w-64';

  return (
    <div className={`flex flex-col items-center justify-center transition-all duration-700 ${className} ${widthClass} origin-center`}>
      <style>{`
        @keyframes floatPlane {
          0%, 100% { transform: translateY(0) rotate(0); }
          25% { transform: translateY(-10px) rotate(2deg); }
          75% { transform: translateY(5px) rotate(-1deg); }
        }
        @keyframes scannerGlow {
          0% { stop-color: #3299D9; stop-opacity: 0.2; }
          50% { stop-color: #E6397A; stop-opacity: 0.8; }
          100% { stop-color: #3299D9; stop-opacity: 0.2; }
        }
        .animate-float {
          animation: floatPlane 3s ease-in-out infinite;
        }
      `}</style>

      <div className="relative w-full aspect-[1366/400] flex items-center justify-center">
        {isWaiting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/3 aspect-square bg-gradient-to-r from-[#3299D9]/20 to-[#E6397A]/20 blur-3xl animate-pulse rounded-full"></div>
            <div className="absolute w-[120%] h-[2px] bg-gradient-to-r from-transparent via-[#E6397A]/40 to-transparent top-1/2 -translate-y-1/2 animate-bounce opacity-30"></div>
          </div>
        )}

        <svg 
          viewBox="150 200 1100 350" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full drop-shadow-md transition-all duration-1000 ${isWaiting ? 'animate-float' : 'hover:scale-105'}`}
        >
          <defs>
            <linearGradient id="plane-grad" x1="490.86" y1="388.06" x2="881.29" y2="388.06" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3299D9">
                {isWaiting && <animate attributeName="stop-color" values="#3299D9;#E6397A;#3299D9" dur="2s" repeatCount="indefinite" />}
              </stop>
              <stop offset="1" stopColor="#E6397A">
                {isWaiting && <animate attributeName="stop-color" values="#E6397A;#3299D9;#E6397A" dur="2s" repeatCount="indefinite" />}
              </stop>
            </linearGradient>
            
            <linearGradient id="stroke-grad" x1="824.56" y1="355.72" x2="1233.01" y2="355.72" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3299D9"/>
              <stop offset="1" stopColor="#E6397A"/>
            </linearGradient>

            <linearGradient id="stroke-grad-left" x1="173.68" y1="355.72" x2="508.56" y2="355.72" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3299D9"/>
              <stop offset="1" stopColor="#E6397A"/>
            </linearGradient>
          </defs>

          <g style={{ fill: textFill }}>
            <path d="M187.61,388.06c-3.53-.23-5.29-2-5.29-5.29v-52.5h15.74v42.06h13.16v-42.06h15.77v42.06h13.13v-42.06h15.77v52.5c0,3.29-1.76,5.06-5.29,5.29h-62.98Z"/>
            <path d="M319.51,351.29v-21.03h15.77v57.79h-15.77v-21.03h-42.06v21.03h-15.74v-57.79h15.74v21.03h42.06Z"/>
            <path d="M356.86,388.06h-15.74v-57.79h15.74v57.79Z"/>
            <path d="M392.12,346h-28.9v-15.74h73.57v15.74h-28.9v42.06h-15.77v-42.06Z"/>
            <path d="M516.19,330.26v15.74h-57.83v5.29h57.83v15.74h-57.83v5.29h57.83v15.74h-68.27c-3.53-.23-5.29-2-5.29-5.29v-48.02c0-2.8,1.76-4.29,5.29-4.48h68.27Z"/>
          </g>

          <g style={{ fill: textFill }}>
            <path d="M893.88,330.26v15.74h-57.83v5.29h52.54c3.53.24,5.29,1.99,5.29,5.26v26.22c0,3.29-1.76,5.06-5.29,5.29h-68.27v-15.74h57.79v-5.29h-52.5c-3.53-.23-5.29-1.99-5.29-5.26v-27.03c0-2.8,1.76-4.29,5.29-4.48h68.27Z"/>
            <path d="M973.29,346v42.06h-15.77v-36.77l-5.26-5.29h-7.87v42.06h-15.77v-42.06h-13.16v42.06h-15.74v-53.31c0-2.8,1.76-4.29,5.29-4.48h52.5l15.77,15.74Z"/>
            <path d="M1052.69,346v36.77c0,3.29-1.76,5.06-5.29,5.29h-62.98c-3.53-.23-5.29-2-5.29-5.29v-48.02c0-2.8,1.76-4.29,5.29-4.48h52.5l15.77,15.74ZM1036.92,351.29l-5.26-5.29h-36.8v26.32h42.06v-21.03Z"/>
            <path d="M1131.88,361.66l15.67,26.18-17.85.21-13.58-21.17h-41.92v20.96h-15.67v-57.58h15.67v20.96h41.92l13.58-20.75,17.85-.21-15.67,26.15v5.26Z"/>
            <path d="M1227.76,330.26v15.74h-57.83v5.29h57.83v15.74h-57.83v5.29h57.83v15.74h-68.27c-3.53-.23-5.29-2-5.29-5.29v-48.02c0-2.8,1.76-4.29,5.29-4.48h68.27Z"/>
          </g>

          <g className={isWaiting ? 'animate-float' : ''}>
            <path fill="#b5b5b5" d="M593.39,420.23l34.47,105.44c2.45,7.49,11.68,10.17,17.76,5.15l102.95-84.99s-109.4-42.67-109.4-40.35-45.78,14.74-45.78,14.74Z"/>
            <path fill="url(#plane-grad)" d="M865.02,217.58c-67.23,26.59-284.24,115.52-366.38,149.21-10.84,4.45-10.19,20.01.97,23.56l93.78,29.87,34.36,105.11c1.38,4.23,4.87,6.95,8.77,7.68,3.16.59,7.82-85.12,7.82-85.12,0,0,98.59,73.11,145.35,107.64,11.52,8.51,27.97,2.11,30.7-11.95,13.93-71.79,48.76-251.31,60.67-312.68,1.79-9.23-7.3-16.8-16.04-13.34Z"/>
            <path d="M636.52,533.03c3.16.59,7.82-85.12,7.82-85.12l161.96-152.13c1.09-1.03-.21-2.76-1.5-1.99l-211.41,126.45,34.36,105.11c1.38,4.23,4.87,6.95,8.77,7.68Z" fill="black" fillOpacity="0.15"/>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default Logo;
