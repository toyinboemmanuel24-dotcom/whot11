import React from 'react';
import { Card, CardShape } from '../types/wott';
import { SHAPE_CONFIG } from '../utils/wottDeck';

interface CardViewProps {
  card?: Card;
  isBack?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  onClick?: () => void;
  className?: string;
  badge?: string;
}

export const ShapeIcon: React.FC<{ shape: CardShape; size?: number; className?: string }> = ({
  shape,
  size = 28,
  className = '',
}) => {
  switch (shape) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="currentColor">
          <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" fillOpacity="0.85" />
          <circle cx="50" cy="50" r="18" fill="#FFFFFF" fillOpacity="0.4" />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="currentColor">
          <polygon points="50,12 90,85 10,85" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" fillOpacity="0.88" />
          <polygon points="50,42 68,76 32,76" fill="#FFFFFF" fillOpacity="0.4" />
        </svg>
      );
    case 'cross':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="currentColor">
          <path
            d="M 36,8 L 64,8 L 64,36 L 92,36 L 92,64 L 64,64 L 64,92 L 36,92 L 36,64 L 8,64 L 8,36 L 36,36 Z"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinejoin="round"
            fillOpacity="0.88"
          />
        </svg>
      );
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="currentColor">
          <rect x="15" y="15" width="70" height="70" rx="10" stroke="currentColor" strokeWidth="6" fillOpacity="0.88" />
          <rect x="35" y="35" width="30" height="30" rx="4" fill="#FFFFFF" fillOpacity="0.4" />
        </svg>
      );
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="currentColor">
          <polygon
            points="50,6 63,35 95,37 70,58 78,89 50,71 22,89 30,58 5,37 37,35"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinejoin="round"
            fillOpacity="0.9"
          />
        </svg>
      );
    case 'whot':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
          <defs>
            <linearGradient id="whotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="35%" stopColor="#EC4899" />
              <stop offset="70%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <path
            d="M 15 75 L 85 75 L 80 40 L 65 60 L 50 25 L 35 60 L 20 40 Z"
            fill="url(#whotGrad)"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="36" r="6" fill="#FDE047" />
          <circle cx="50" cy="21" r="7" fill="#FDE047" />
          <circle cx="80" cy="36" r="6" fill="#FDE047" />
        </svg>
      );
    default:
      return null;
  }
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isBack = false,
  isPlayable = false,
  isSelected = false,
  size = 'md',
  onClick,
  className = '',
  badge,
}) => {
  // Dimensions per size
  const sizeClasses = {
    sm: 'w-14 h-20 text-xs rounded-lg',
    md: 'w-20 h-28 sm:w-24 sm:h-34 text-sm rounded-xl',
    lg: 'w-28 h-40 sm:w-32 sm:h-46 text-base rounded-2xl',
    hero: 'w-36 h-52 sm:w-44 sm:h-64 text-lg rounded-2xl',
  }[size];

  // Card Back Rendering (Used for opponent hand, general market deck, etc.)
  if (isBack || !card) {
    return (
      <div
        onClick={onClick}
        className={`relative ${sizeClasses} select-none transition-all duration-200 shadow-md flex flex-col items-center justify-center border-2 border-amber-800/80 bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 text-amber-200 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 ${className}`}
      >
        {/* Card Back Geometric Pattern */}
        <div className="absolute inset-1.5 border border-amber-600/40 rounded-lg flex flex-col items-center justify-center p-1 bg-amber-900/20">
          <div className="w-full h-full border border-dashed border-amber-500/30 rounded flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:8px_8px]" />
            <div className="text-center font-black tracking-widest text-amber-400/90 text-sm sm:text-base drop-shadow">
              WOTT
            </div>
            <div className="text-[9px] uppercase tracking-wider text-amber-200/60 font-semibold mt-0.5">
              Classic
            </div>
          </div>
        </div>
        {badge && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-stone-950 font-black px-1.5 py-0.5 text-[10px] rounded-full shadow-lg border border-amber-200">
            {badge}
          </div>
        )}
      </div>
    );
  }

  const shapeConfig = SHAPE_CONFIG[card.shape];
  const isWhot = card.number === 20 || card.shape === 'whot';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative ${sizeClasses} select-none transition-all duration-200 shadow-md flex flex-col justify-between p-1.5 sm:p-2 bg-gradient-to-b from-white via-stone-50 to-amber-50/40 border-2 overflow-hidden ${
        isSelected
          ? 'ring-4 ring-amber-400 -translate-y-3 shadow-amber-500/30 shadow-2xl'
          : isPlayable
          ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/20 cursor-pointer hover:-translate-y-2 hover:shadow-xl animate-pulse-subtle'
          : 'border-stone-300 opacity-90'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        boxShadow: isPlayable ? '0 8px 24px -4px rgba(245, 158, 11, 0.45)' : undefined,
      }}
    >
      {/* Top Left Corner Value & Shape */}
      <div className="flex flex-col items-start leading-none z-10">
        <span
          className={`font-black tracking-tight ${
            isWhot ? 'text-pink-600 font-extrabold' : shapeConfig.textClass
          } ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-2xl'}`}
        >
          {card.number}
        </span>
        <div className={`mt-0.5 ${shapeConfig.textClass}`}>
          <ShapeIcon shape={card.shape} size={size === 'sm' ? 12 : size === 'md' ? 16 : 22} />
        </div>
      </div>

      {/* Center Icon & Action Badge */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 pointer-events-none">
        <div className={`${shapeConfig.textClass} drop-shadow-sm transition-transform duration-300`}>
          <ShapeIcon
            shape={card.shape}
            size={size === 'sm' ? 24 : size === 'md' ? 38 : size === 'lg' ? 52 : 72}
          />
        </div>

        {/* Action Title on card if special */}
        {card.actionTitle && (
          <div
            className={`mt-1 px-1.5 py-0.5 rounded text-center font-bold tracking-tight uppercase leading-none shadow-sm ${
              card.number === 5
                ? 'bg-red-600 text-white'
                : card.number === 2
                ? 'bg-blue-600 text-white'
                : card.number === 14
                ? 'bg-amber-600 text-white'
                : card.number === 1
                ? 'bg-emerald-600 text-white'
                : card.number === 8
                ? 'bg-purple-600 text-white'
                : 'bg-gradient-to-r from-pink-500 to-indigo-600 text-white'
            } ${size === 'sm' ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'}`}
          >
            {card.actionTitle}
          </div>
        )}
      </div>

      {/* Bottom Right Corner Value & Shape (Rotated 180deg) */}
      <div className="flex flex-col items-end leading-none rotate-180 z-10 self-end">
        <span
          className={`font-black tracking-tight ${
            isWhot ? 'text-pink-600' : shapeConfig.textClass
          } ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-2xl'}`}
        >
          {card.number}
        </span>
        <div className={`mt-0.5 ${shapeConfig.textClass}`}>
          <ShapeIcon shape={card.shape} size={size === 'sm' ? 12 : size === 'md' ? 16 : 22} />
        </div>
      </div>

      {/* Corner badge (e.g. "+3", "+2", "MKT") */}
      {card.isSpecial && (
        <div className="absolute top-1 right-1">
          {card.number === 5 && (
            <span className="bg-red-500 text-white text-[9px] font-black px-1 rounded-sm">
              +3
            </span>
          )}
          {card.number === 2 && (
            <span className="bg-blue-500 text-white text-[9px] font-black px-1 rounded-sm">
              +2
            </span>
          )}
          {card.number === 14 && (
            <span className="bg-amber-500 text-stone-900 text-[9px] font-black px-1 rounded-sm">
              MKT
            </span>
          )}
        </div>
      )}

      {badge && (
        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white font-black px-1.5 py-0.5 text-[10px] rounded-full shadow-lg border border-emerald-200">
          {badge}
        </div>
      )}
    </div>
  );
};
