import React from 'react';

/** Appens logga: en pint med en golfflagga i skummet. Samma bild som favicon.svg. */
export const BrandMark: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#112218"/>
      <path d="M19 23 H45 L41.5 55 H22.5 Z" fill="#D4AF37"/>
      <circle cx="22" cy="22" r="4.2" fill="#F6F4EE"/>
      <circle cx="28" cy="22" r="4.2" fill="#F6F4EE"/>
      <circle cx="34" cy="22" r="4.2" fill="#F6F4EE"/>
      <circle cx="40" cy="22" r="4.2" fill="#F6F4EE"/>
      <rect x="18" y="21" width="28" height="4" fill="#F6F4EE"/>
      <line x1="37" y1="6" x2="37" y2="20" stroke="#F6F4EE" strokeWidth="2.4" strokeLinecap="round"/>
      <path d="M37 6.5 L50 10.5 L37 14.5 Z" fill="#F6F4EE"/>
      <path d="M25 30 V50" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round"/>
      
  </svg>
);
