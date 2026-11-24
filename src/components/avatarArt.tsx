/**
 * Gemensamma delar för golfaren: färger, huvud (ansikte, hår, glasögon, skägg,
 * cigarr, hattar) och byxmönster. Används både av den runda avataren och av
 * bowlinganimationen så de alltid ser likadana ut.
 */
import React from 'react';
import type {
  AvatarConfig,
  HairColor,
  JacketTheme,
  PantsStyle,
  SkinTone,
  TopStyle,
} from '../utils/golfRules';

export const COLOR_PALETTE: Record<JacketTheme, { primary: string; lapel: string; accent: string; bgGlow: string; label: string }> = {
  emerald: { primary: '#0b2b1e', lapel: '#071c13', accent: '#c5a059', bgGlow: '#174834', label: 'Masters grön' },
  gold: { primary: '#7a591b', lapel: '#543c10', accent: '#f4d186', bgGlow: '#916b22', label: 'Claret guld' },
  navy: { primary: '#162844', lapel: '#0d192b', accent: '#93c5fd', bgGlow: '#1e3a63', label: 'St Andrews blå' },
  burgundy: { primary: '#4a1823', lapel: '#300d15', accent: '#fda4af', bgGlow: '#63202f', label: 'Vinröd' },
  slate: { primary: '#222b2e', lapel: '#141a1c', accent: '#cbd5e1', bgGlow: '#334147', label: 'Skiffer' },
  pink: { primary: '#be185d', lapel: '#831843', accent: '#fbcfe8', bgGlow: '#9d174d', label: 'Rosa' },
  sky: { primary: '#0369a1', lapel: '#0c4a6e', accent: '#bae6fd', bgGlow: '#075985', label: 'Himmelsblå' },
  orange: { primary: '#c2410c', lapel: '#7c2d12', accent: '#fed7aa', bgGlow: '#9a3412', label: 'Orange' },
};

export const PANTS_PALETTE: Record<PantsStyle, { base: string; stripe1: string; stripe2: string; label: string }> = {
  plaid: { base: '#1e4631', stripe1: '#c5a059', stripe2: '#991b1b', label: 'Rutiga' },
  chino: { base: '#d6c5a5', stripe1: '#bfa882', stripe2: '#d6c5a5', label: 'Chinos' },
  navy: { base: '#17253b', stripe1: '#283d5e', stripe2: '#17253b', label: 'Marinblå' },
  loud: { base: '#db2777', stripe1: '#facc15', stripe2: '#ffffff', label: 'Rosa argyle' },
  corduroy: { base: '#5c3a21', stripe1: '#422815', stripe2: '#734a2b', label: 'Manchester' },
  jeans: { base: '#2f4f8a', stripe1: '#c08a2e', stripe2: '#3b5f9e', label: 'Jeans' },
  shorts: { base: '#a8a07a', stripe1: '#8f875f', stripe2: '#a8a07a', label: 'Shorts' },
};

export const SKIN_PALETTE: Record<SkinTone, { skin: string; cheek: string; ear: string; label: string }> = {
  light: { skin: '#fde2c8', cheek: '#f5b59c', ear: '#f3c6a3', label: 'Ljus' },
  warm: { skin: '#eab688', cheek: '#d99164', ear: '#d89f70', label: 'Solbränd' },
  medium: { skin: '#c68652', cheek: '#ab6938', ear: '#b07240', label: 'Medium' },
  deep: { skin: '#7c4b2b', cheek: '#63371c', ear: '#693c20', label: 'Mörk' },
};

export const HAIR_PALETTE: Record<HairColor, { color: string; label: string }> = {
  brown: { color: '#3b2313', label: 'Brun' },
  black: { color: '#111827', label: 'Svart' },
  blonde: { color: '#d4a73a', label: 'Blond' },
  ginger: { color: '#b4532a', label: 'Röd' },
  grey: { color: '#9ca3af', label: 'Grå' },
};

/** Färger för överkroppen beroende på plagg. `sleeve` = ärmens färg. */
export function topColors(config: AvatarConfig): { body: string; lapel: string; accent: string; sleeve: string; outline: string } {
  const color = COLOR_PALETTE[config.jacket] || COLOR_PALETTE.emerald;
  const skin = SKIN_PALETTE[config.skin] || SKIN_PALETTE.warm;
  const byTop: Record<TopStyle, { body: string; lapel: string; accent: string; sleeve: string; outline: string }> = {
    jacket: { body: color.primary, lapel: color.lapel, accent: color.accent, sleeve: color.primary, outline: '#0a1410' },
    polo: { body: color.primary, lapel: color.lapel, accent: color.accent, sleeve: color.primary, outline: '#0a1410' },
    sweater: { body: color.primary, lapel: color.lapel, accent: color.accent, sleeve: '#f9f6f0', outline: '#0a1410' },
    whitepike: { body: '#f8fafc', lapel: '#e2e8f0', accent: '#D4AF37', sleeve: '#f8fafc', outline: '#64748b' },
    none: { body: skin.skin, lapel: skin.ear, accent: skin.cheek, sleeve: skin.skin, outline: '#1b1917' },
  };
  return byTop[config.top] || byTop.jacket;
}

/** <pattern> för byxtyget. Lägg i <defs>. */
export const PantsPattern: React.FC<{ id: string; pants: PantsStyle }> = ({ id, pants }) => {
  const p = PANTS_PALETTE[pants] || PANTS_PALETTE.plaid;
  return (
    <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill={p.base} />
      {pants === 'plaid' && (
        <>
          <line x1="0" y1="5" x2="10" y2="5" stroke={p.stripe1} strokeWidth="1.5" />
          <line x1="5" y1="0" x2="5" y2="10" stroke={p.stripe2} strokeWidth="1.5" />
        </>
      )}
      {pants === 'loud' && <polygon points="5,0 10,5 5,10 0,5" fill={p.stripe1} opacity="0.75" />}
      {pants === 'corduroy' && (
        <>
          <line x1="2" y1="0" x2="2" y2="10" stroke={p.stripe1} strokeWidth="1" />
          <line x1="6" y1="0" x2="6" y2="10" stroke={p.stripe2} strokeWidth="1" />
        </>
      )}
      {pants === 'jeans' && (
        <>
          <line x1="0" y1="0" x2="10" y2="10" stroke={p.stripe2} strokeWidth="0.8" opacity="0.6" />
          <line x1="0" y1="5" x2="5" y2="10" stroke={p.stripe2} strokeWidth="0.8" opacity="0.6" />
        </>
      )}
    </pattern>
  );
};

export type HeadExpression = 'ecstatic' | 'happy' | 'cool' | 'sweat' | 'cry' | 'dizzy';

/**
 * Huvudet centrerat i (0,0): ansiktet är en ellips med rx 16.5 / ry 17.5.
 * Avataren placerar det med translate(50 35), animationen flyttar det fritt.
 */
export const AvatarHead: React.FC<{ config: AvatarConfig; expression: HeadExpression; strokeWidth?: number }> = ({
  config,
  expression,
  strokeWidth = 1.3,
}) => {
  const skin = SKIN_PALETTE[config.skin] || SKIN_PALETTE.warm;
  const color = COLOR_PALETTE[config.jacket] || COLOR_PALETTE.emerald;
  const hair = (HAIR_PALETTE[config.hair] || HAIR_PALETTE.brown).color;
  const isHappy = expression === 'ecstatic' || expression === 'happy';
  const isSad = expression === 'sweat' || expression === 'cry' || expression === 'dizzy';
  const hideEyes = config.eyes === 'sunglasses';
  const female = config.body === 'female';

  return (
    <g>
      {/* Långt hår bakom huvudet (kvinna) – syns även under hattar */}
      {female && (
        <path
          d="M-18 -8 C-23 6, -22 20, -15 27 C-11 30, -6 28, -6 24 L6 24 C6 28, 11 30, 15 27 C22 20, 23 6, 18 -8 Z"
          fill={hair}
          stroke="#1b1917"
          strokeWidth={strokeWidth * 0.6}
        />
      )}

      {/* Hals och öron */}
      <rect x="-6" y="9" width="12" height="10" rx="3" fill={skin.ear} />
      <circle cx="-17" cy="1" r="3.9" fill={skin.ear} />
      <circle cx="17" cy="1" r="3.9" fill={skin.ear} />
      {/* Ansikte */}
      <ellipse cx="0" cy="0" rx="16.5" ry="17.5" fill={skin.skin} stroke="#1b1917" strokeWidth={strokeWidth} />
      <circle cx="-11" cy="4" r="3" fill={skin.cheek} opacity="0.55" />
      <circle cx="11" cy="4" r="3" fill={skin.cheek} opacity="0.55" />

      {/* Ögon */}
      {!hideEyes && (
        <g>
          {expression === 'dizzy' ? (
            <>
              <path d="M-10 -4 L-5 1 M-5 -4 L-10 1" stroke="#1b1917" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 -4 L10 1 M10 -4 L5 1" stroke="#1b1917" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : isHappy ? (
            <>
              <path d="M-11 -1 Q-7.5 -5 -4 -1" fill="none" stroke="#1b1917" strokeWidth="2.1" strokeLinecap="round" />
              <path d="M4 -1 Q7.5 -5 11 -1" fill="none" stroke="#1b1917" strokeWidth="2.1" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="-7.5" cy="-1.5" r="2.1" fill="#1b1917" />
              <circle cx="7.5" cy="-1.5" r="2.1" fill="#1b1917" />
              <circle cx="-6.8" cy="-2.2" r="0.7" fill="#ffffff" />
              <circle cx="8.2" cy="-2.2" r="0.7" fill="#ffffff" />
            </>
          )}
        </g>
      )}

      {/* Ögonfransar (kvinna) */}
      {female && !hideEyes && expression !== 'dizzy' && (
        <g stroke="#1b1917" strokeWidth="1.2" strokeLinecap="round">
          <line x1="-10" y1="-3" x2="-12.2" y2="-4.8" />
          <line x1="-9" y1="-3.8" x2="-10.4" y2="-6" />
          <line x1="10" y1="-3" x2="12.2" y2="-4.8" />
          <line x1="9" y1="-3.8" x2="10.4" y2="-6" />
        </g>
      )}

      {/* Ögonbryn i hårfärgen */}
      {!hideEyes &&
        (isSad ? (
          <>
            <line x1="-12" y1="-5.5" x2="-4" y2="-7.5" stroke={hair} strokeWidth={female ? 1.3 : 1.9} strokeLinecap="round" />
            <line x1="4" y1="-7.5" x2="12" y2="-5.5" stroke={hair} strokeWidth={female ? 1.3 : 1.9} strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="-12" y1="-6.5" x2="-4" y2="-7" stroke={hair} strokeWidth={female ? 1.3 : 1.9} strokeLinecap="round" />
            <line x1="4" y1="-7" x2="12" y2="-6.5" stroke={hair} strokeWidth={female ? 1.3 : 1.9} strokeLinecap="round" />
          </>
        ))}

      {config.eyes === 'sunglasses' && (
        <g>
          <line x1="-16" y1="-3" x2="16" y2="-3" stroke="#c5a059" strokeWidth="1.8" />
          <rect x="-14" y="-5" width="12" height="7.5" rx="2" fill="#0f172a" stroke="#c5a059" strokeWidth="1.3" />
          <rect x="2" y="-5" width="12" height="7.5" rx="2" fill="#0f172a" stroke="#c5a059" strokeWidth="1.3" />
          <line x1="-12" y1="-3" x2="-8" y2="1" stroke="#ffffff" strokeWidth="1.1" opacity="0.6" />
          <line x1="4" y1="-3" x2="8" y2="1" stroke="#ffffff" strokeWidth="1.1" opacity="0.6" />
        </g>
      )}
      {config.eyes === 'glasses' && (
        <g fill="none" stroke="#1f2937" strokeWidth="1.3">
          <circle cx="-7.5" cy="-1.5" r="5" />
          <circle cx="7.5" cy="-1.5" r="5" />
          <line x1="-2.5" y1="-1.5" x2="2.5" y2="-1.5" />
          <line x1="-12.5" y1="-2" x2="-16" y2="-3" />
          <line x1="12.5" y1="-2" x2="16" y2="-3" />
        </g>
      )}

      {/* Näsa */}
      <path d="M0 -2 L-1.5 3.5 L1.5 3.5" fill="none" stroke="#8c583a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />

      {/* Skägg */}
      {config.facialHair === 'beard' && (
        <path d="M-15.5 3 C-15.5 15, -8 19, 0 19 C8 19, 15.5 15, 15.5 3 C13 6, 7 7.5, 0 7.5 C-7 7.5, -13 6, -15.5 3 Z" fill={hair} />
      )}
      {config.facialHair === 'stubble' && (
        <path d="M-15 4 C-15 14, -8 18, 0 18 C8 18, 15 14, 15 4 C12 9, 7 11, 0 11 C-7 11, -12 9, -15 4 Z" fill={hair} opacity="0.28" />
      )}

      {/* Mun */}
      {isHappy ? (
        <path d="M-8 7.5 Q0 14.5 8 7.5 Z" fill="#ffffff" stroke="#1b1917" strokeWidth="1.3" />
      ) : isSad ? (
        <path d="M-7 11.5 Q0 6 7 11.5" fill="none" stroke="#1b1917" strokeWidth="2" strokeLinecap="round" />
      ) : female ? (
        <path d="M-5.5 8.5 Q-2.5 7 0 8.2 Q2.5 7 5.5 8.5 Q0 12.5 -5.5 8.5 Z" fill="#c2415d" stroke="#7f1d2d" strokeWidth="0.8" />
      ) : (
        <path d="M-6 8.5 Q0 11.5 6 8.5" fill="none" stroke="#1b1917" strokeWidth="1.8" strokeLinecap="round" />
      )}

      {config.facialHair === 'mustache' && (
        <path d="M-10 7.5 C-7 4.5, -2 5.5, 0 7 C2 5.5, 7 4.5, 10 7.5 C7 9, 2 8.5, 0 7.8 C-2 8.5, -7 9, -10 7.5 Z" fill={hair} />
      )}

      {config.mouth === 'cigar' && (
        <g>
          <rect x="2" y="8" width="14" height="3.6" rx="1.5" fill="#78350f" stroke="#1b1917" strokeWidth="0.8" transform="rotate(8 2 8)" />
          <rect x="13" y="9" width="3" height="3.4" fill="#ef4444" transform="rotate(8 13 9)" />
          <circle cx="19" cy="5" r="2.2" fill="#cbd5e1" opacity="0.7" />
          <circle cx="22" cy="1" r="3" fill="#cbd5e1" opacity="0.5" />
        </g>
      )}

      {/* Hår (syns utan hatt och under solskärm) */}
      {config.hat === 'none' &&
        (female ? (
          <path d="M-17.5 -4 C-19 -19, -6 -23, 4 -22 C15 -21, 19 -14, 17.5 -4 C15 -10, 9 -14, 2 -12 C-4 -15, -12 -12, -17.5 -4 Z" fill={hair} />
        ) : (
          <path d="M-17 -8 C-18 -20, -5 -22, 5 -21 C14 -20, 18 -16, 17 -8 C12 -14, 3 -15, -6 -14 C-12 -13, -15 -11, -17 -8 Z" fill={hair} />
        ))}
      {config.hat === 'visor' && <path d="M-14 -14 C-10 -23, 10 -23, 14 -14 Z" fill={hair} />}

      {/* Hattar */}
      {config.hat === 'flatcap' && (
        <g>
          <path d="M-19 -11 C-19 -22, 18 -23, 18 -11 Z" fill="#57534e" stroke="#1c1917" strokeWidth="1.3" />
          <path d="M-22 -11 Q0 -15 23 -10 Q2 -8 -22 -11 Z" fill="#44403c" stroke="#1c1917" strokeWidth="1.2" />
          <circle cx="-1" cy="-21" r="2" fill="#c5a059" />
        </g>
      )}
      {config.hat === 'cap' && (
        <g>
          <path d="M-17 -10 C-17 -23, 17 -23, 17 -10 Z" fill={color.primary} stroke="#0a1410" strokeWidth="1.3" />
          <path d="M-19 -11 Q2 -14 25 -9 Q5 -7 -19 -11 Z" fill={color.accent} stroke="#0a1410" strokeWidth="1" />
          <circle cx="0" cy="-16" r="3" fill="#ffffff" opacity="0.9" />
        </g>
      )}
      {config.hat === 'visor' && (
        <g>
          <path d="M-18 -14 L18 -14 L19 -10 L-19 -10 Z" fill="#f9f6f0" stroke="#141a17" strokeWidth="1.2" />
          <path d="M-19 -11 Q2 -13 24 -9 Q2 -7 -19 -11 Z" fill={color.accent} stroke="#141a17" strokeWidth="1" />
        </g>
      )}
      {config.hat === 'bucket' && (
        <g>
          <path d="M-14 -21 L14 -21 L18 -11 L-18 -11 Z" fill="#eab308" stroke="#141a17" strokeWidth="1.2" />
          <rect x="-16" y="-15" width="32" height="3" fill={color.primary} />
          <path d="M-24 -11 Q0 -14 24 -11 Q27 -7 20 -7 Q0 -10 -20 -7 Q-27 -7 -24 -11 Z" fill="#facc15" stroke="#141a17" strokeWidth="1.2" />
        </g>
      )}
      {config.hat === 'beanie' && (
        <g>
          <circle cx="0" cy="-26" r="4.5" fill="#f9f6f0" stroke="#141a17" strokeWidth="1" />
          <path d="M-17 -11 C-16 -23, 16 -23, 17 -11 Z" fill="#991b1b" stroke="#141a17" strokeWidth="1.2" />
          <rect x="-18" y="-14" width="36" height="5" rx="2" fill="#f9f6f0" stroke="#141a17" strokeWidth="1.1" />
        </g>
      )}
      {config.hat === 'cowboy' && (
        <g>
          <path d="M-13 -13 C-14 -28, -4 -24, 0 -27 C4 -24, 14 -28, 13 -13 Z" fill="#92400e" stroke="#1c1917" strokeWidth="1.2" />
          <rect x="-13" y="-16.5" width="26" height="3.5" fill="#1c1917" />
          <path d="M-28 -14 Q-26 -9 0 -10 Q26 -9 28 -14 Q30 -18 24 -16 Q0 -11 -24 -16 Q-30 -18 -28 -14 Z" fill="#a16207" stroke="#1c1917" strokeWidth="1.2" />
        </g>
      )}
      {config.hat === 'santa' && (
        <g>
          <path d="M-17 -11 C-15 -25, 6 -31, 21 -23 L14 -11 Z" fill="#dc2626" stroke="#141a17" strokeWidth="1.2" />
          <circle cx="22" cy="-23" r="4.2" fill="#f9f6f0" stroke="#141a17" strokeWidth="1" />
          <rect x="-19" y="-14" width="37" height="5.5" rx="2.5" fill="#f9f6f0" stroke="#141a17" strokeWidth="1.1" />
        </g>
      )}
    </g>
  );
};
