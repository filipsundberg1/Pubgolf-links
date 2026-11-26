import React from 'react';

/**
 * Kvällsscen över banan: solnedgång, trädrad, fairway med klippta ränder och en green med flagga.
 * Ritad (ingen bild) så att den skalar skarpt och laddar direkt.
 */
export const HomeHeroScene: React.FC = () => (
  <svg viewBox="0 0 800 320" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
    <defs>
      <linearGradient id="pg-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0b1a12" />
        <stop offset="0.55" stopColor="#1d3a28" />
        <stop offset="0.82" stopColor="#7a6a2e" />
        <stop offset="1" stopColor="#d4af37" />
      </linearGradient>
      <radialGradient id="pg-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff3c4" />
        <stop offset="0.35" stopColor="#f2cf63" />
        <stop offset="1" stopColor="#d4af37" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="pg-fair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2f7d46" />
        <stop offset="1" stopColor="#164a2a" />
      </linearGradient>
      <linearGradient id="pg-green" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4fae6a" />
        <stop offset="1" stopColor="#2e8a4b" />
      </linearGradient>
      <pattern id="pg-mow" width="70" height="320" patternUnits="userSpaceOnUse" patternTransform="skewX(-28)">
        <rect width="35" height="320" fill="#ffffff" opacity="0.05" />
      </pattern>
    </defs>

    <rect width="800" height="320" fill="url(#pg-sky)" />
    {/* Sol nära horisonten */}
    <circle cx="610" cy="205" r="120" fill="url(#pg-sun)" opacity="0.75" />
    <circle cx="610" cy="205" r="26" fill="#fff1bd" opacity="0.95" />

    {/* Trädrad i siluett */}
    <path
      d="M0 214 Q20 196 38 210 Q52 188 72 206 Q92 186 112 204 Q128 192 146 206 Q170 184 192 204 Q214 194 232 208 Q256 186 278 206 Q300 196 318 210 Q338 192 360 208 L360 232 L0 232 Z"
      fill="#0f2a1b"
    />
    <path
      d="M420 214 Q444 198 462 210 Q486 190 508 208 Q530 200 548 212 L548 232 L420 232 Z"
      fill="#0f2a1b"
    />
    <path d="M720 210 Q740 192 760 206 Q780 196 800 208 L800 232 L720 232 Z" fill="#0f2a1b" />

    {/* Fairway i lager */}
    <path d="M0 226 Q200 206 420 222 T800 214 L800 320 L0 320 Z" fill="#245f39" />
    <path d="M0 252 Q240 228 480 246 T800 238 L800 320 L0 320 Z" fill="url(#pg-fair)" />
    <path d="M0 252 Q240 228 480 246 T800 238 L800 320 L0 320 Z" fill="url(#pg-mow)" />

    {/* Greenen med flagga */}
    <ellipse cx="560" cy="286" rx="230" ry="44" fill="url(#pg-green)" />
    <ellipse cx="560" cy="286" rx="230" ry="44" fill="none" stroke="#7bc98f" strokeOpacity="0.35" strokeWidth="2" />
    <ellipse cx="455" cy="282" rx="7" ry="2.6" fill="#0b1a12" />
    <line x1="455" y1="282" x2="455" y2="198" stroke="#F6F4EE" strokeWidth="3" strokeLinecap="round" />
    <path d="M456 199 L492 210 L456 221 Z" fill="#D4AF37" />
    <circle cx="420" cy="290" r="4.5" fill="#ffffff" />

    {/* Sandbunker */}
    <path d="M150 300 Q190 284 240 296 Q220 312 170 310 Z" fill="#e9d9a6" opacity="0.9" />
  </svg>
);
