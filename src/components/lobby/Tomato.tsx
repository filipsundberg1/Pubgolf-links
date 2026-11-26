import React from 'react';

/** En tomat (ikon). */
export const TomatoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
    <circle cx="16" cy="18" r="12" fill="#e03131" />
    <ellipse cx="11.5" cy="14" rx="3.2" ry="2" fill="#fff" opacity="0.35" />
    <path
      d="M16 5.5l1.6 3.2 3.4-.9-1 3.3 3.2 1.3-3.4.8.6 3.4-3-1.7-1.4 3.2-1.4-3.2-3 1.7.6-3.4-3.4-.8 3.2-1.3-1-3.3 3.4.9z"
      fill="#2f9e44"
    />
  </svg>
);

/** Tomatkladd som poppar upp och tonar bort. */
export const Splat: React.FC<{ size?: number; className?: string }> = ({ size = 80, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={`pg-splat pointer-events-none ${className}`} aria-hidden="true">
    <path
      d="M50 12c6 0 7 10 13 9s9-8 14-3-2 11 3 15 13 1 13 8-10 6-9 12 9 10 4 15-12-1-15 4 1 13-6 14-8-8-14-7-7 11-13 9-3-11-9-13-13 5-15-1 6-9 2-14-12-4-11-11 10-6 10-12-8-11-3-15 11 2 14-3 1-11 7-12 7 6 9 5z"
      fill="#e03131"
    />
    <circle cx="20" cy="18" r="4" fill="#e03131" />
    <circle cx="86" cy="80" r="5" fill="#e03131" />
    <circle cx="14" cy="76" r="3" fill="#e03131" />
    <path d="M38 66c0 8-3 14-3 20" stroke="#c92a2a" strokeWidth="5" strokeLinecap="round" fill="none" />
    <path d="M62 64c0 6 2 10 2 16" stroke="#c92a2a" strokeWidth="4" strokeLinecap="round" fill="none" />
    <circle cx="44" cy="42" r="3" fill="#ffd8a8" opacity="0.8" />
    <circle cx="56" cy="50" r="2.5" fill="#ffd8a8" opacity="0.8" />
    <circle cx="48" cy="56" r="2" fill="#ffd8a8" opacity="0.8" />
  </svg>
);
