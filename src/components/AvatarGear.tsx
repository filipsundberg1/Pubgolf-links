import React from 'react';
import type { GearItem } from '../utils/golfRules';

/**
 * Gear held by the golfer in the round portrait avatar (100x100 viewBox).
 * Drawn behind the torso, along the same diagonal the classic driver used.
 */
export const PortraitGear: React.FC<{ gear: GearItem; snapped?: boolean }> = ({ gear, snapped }) => {
  if (snapped) {
    // Disaster pose: whatever you held is now in two pieces.
    return (
      <g>
        <line x1="16" y1="45" x2="35" y2="62" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="78" y1="42" x2="64" y2="60" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="15" cy="43" rx="5" ry="3" fill="#94a3b8" transform="rotate(-25 15 43)" />
      </g>
    );
  }

  switch (gear) {
    case 'putter':
      return (
        <g>
          <line x1="22" y1="22" x2="76" y2="85" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <rect x="12" y="16" width="13" height="4.5" rx="1.2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.8" transform="rotate(-35 18 18)" />
        </g>
      );
    case 'golden':
      return (
        <g>
          <line x1="20" y1="24" x2="76" y2="85" stroke="#f4d186" strokeWidth="2.6" strokeLinecap="round" />
          <ellipse cx="19" cy="22" rx="6.5" ry="3.6" fill="#D4AF37" stroke="#7a591b" strokeWidth="0.8" transform="rotate(-35 19 22)" />
          <path d="M10 10 L11.2 13 L14 14 L11.2 15 L10 18 L8.8 15 L6 14 L8.8 13 Z" fill="#fef3c7" />
          <path d="M30 12 L30.8 14 L32.6 14.6 L30.8 15.2 L30 17 L29.2 15.2 L27.4 14.6 L29.2 14 Z" fill="#fef3c7" />
        </g>
      );
    case 'flag':
      return (
        <g>
          <line x1="24" y1="8" x2="74" y2="86" stroke="#f9f6f0" strokeWidth="2" strokeLinecap="round" />
          <polygon points="24,8 42,11 27,20" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.8" />
          <text x="31" y="15.5" fontSize="5" fontWeight="900" fill="#fff" textAnchor="middle">19</text>
        </g>
      );
    case 'umbrella':
      return (
        <g>
          <line x1="22" y1="22" x2="74" y2="86" stroke="#1c1917" strokeWidth="1.8" strokeLinecap="round" />
          <g transform="translate(22 22) rotate(-40)">
            <path d="M-17 0 A17 13 0 0 1 17 0 Z" fill="#f9f6f0" stroke="#1c1917" strokeWidth="1" />
            <path d="M-17 0 A17 13 0 0 1 -6 -11 L0 0 Z" fill="#166534" />
            <path d="M6 -11 A17 13 0 0 1 17 0 L0 0 Z" fill="#166534" />
            <path d="M-17 0 Q-11.5 3 -6 0 Q0 3 6 0 Q11.5 3 17 0" fill="none" stroke="#1c1917" strokeWidth="1" />
          </g>
        </g>
      );
    case 'jug':
      return (
        <g>
          {/* Claret jug proudly held next to the hip */}
          <path d="M78 58 L90 58 L88 64 Q93 70 89 78 L90 84 L78 84 L79 78 Q75 70 80 64 Z" fill="#e5e7eb" stroke="#475569" strokeWidth="1" />
          <path d="M89 63 Q96 64 94 71 Q93 75 89 75" fill="none" stroke="#475569" strokeWidth="1.6" />
          <rect x="77" y="56" width="14" height="3" rx="1" fill="#D4AF37" stroke="#7a591b" strokeWidth="0.6" />
          <rect x="76.5" y="83" width="14" height="3.5" rx="1" fill="#D4AF37" stroke="#7a591b" strokeWidth="0.6" />
          <line x1="81" y1="66" x2="81" y2="76" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
        </g>
      );
    case 'driver':
    default:
      return (
        <g>
          <line x1="20" y1="24" x2="76" y2="85" stroke="#cbd5e1" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="19" cy="22" rx="6" ry="3.4" fill="#e2e8f0" transform="rotate(-35 19 22)" />
        </g>
      );
  }
};

/**
 * Gear in the swinging hand of the big bowling-style celebration clip.
 * Origin (0,0) is the hand; the club points towards (26,42).
 */
export const SwingGear: React.FC<{ gear: GearItem }> = ({ gear }) => {
  switch (gear) {
    case 'putter':
      return (
        <g>
          <line x1="0" y1="0" x2="26" y2="42" stroke="#94a3b8" strokeWidth="2.8" strokeLinecap="round" />
          <rect x="20" y="41" width="18" height="6" rx="1.5" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.2" transform="rotate(-20 29 44)" />
        </g>
      );
    case 'golden':
      return (
        <g>
          <line x1="0" y1="0" x2="26" y2="42" stroke="#f4d186" strokeWidth="3.4" strokeLinecap="round" />
          <ellipse cx="29" cy="44" rx="8.5" ry="4.5" fill="#D4AF37" stroke="#7a591b" strokeWidth="1.2" transform="rotate(-20 29 44)" />
          <circle cx="36" cy="38" r="1.8" fill="#fef3c7" />
          <circle cx="22" cy="50" r="1.4" fill="#fef3c7" />
        </g>
      );
    case 'flag':
      return (
        <g>
          <line x1="0" y1="0" x2="30" y2="50" stroke="#f9f6f0" strokeWidth="3" strokeLinecap="round" />
          <polygon points="4,6 26,4 10,18" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
        </g>
      );
    case 'umbrella':
      return (
        <g>
          <line x1="0" y1="0" x2="26" y2="42" stroke="#1c1917" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M-2 2 Q-8 -4 -3 -7" fill="none" stroke="#1c1917" strokeWidth="2.4" strokeLinecap="round" />
          <polygon points="10,14 20,10 30,46 26,44" fill="#166534" stroke="#0a1410" strokeWidth="1" />
          <polygon points="13,16 18,14 27,44" fill="#f9f6f0" opacity="0.85" />
        </g>
      );
    case 'jug':
      return (
        <g transform="translate(-2 -6)">
          <path d="M-8 0 L8 0 L6 7 Q13 15 7 26 L8 33 L-8 33 L-7 26 Q-13 15 -6 7 Z" fill="#e5e7eb" stroke="#475569" strokeWidth="1.3" />
          <path d="M7 6 Q17 8 14 17 Q12 22 7 21" fill="none" stroke="#475569" strokeWidth="2" />
          <rect x="-9" y="-2" width="18" height="3.5" rx="1" fill="#D4AF37" stroke="#7a591b" strokeWidth="0.8" />
          <rect x="-9.5" y="31.5" width="19" height="4" rx="1" fill="#D4AF37" stroke="#7a591b" strokeWidth="0.8" />
        </g>
      );
    case 'driver':
    default:
      return (
        <g>
          <line x1="0" y1="0" x2="26" y2="42" stroke="#e2e8f0" strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="29" cy="44" rx="8" ry="4.2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.2" transform="rotate(-20 29 44)" />
        </g>
      );
  }
};
