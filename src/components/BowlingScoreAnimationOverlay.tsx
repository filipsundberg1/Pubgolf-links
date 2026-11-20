import React, { useEffect, useId, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import {
  parseAvatarSeed,
  type AvatarConfig,
  type JacketTheme,
  type PantsStyle,
  type ScoreCelebrationClip,
  type SkinTone,
} from '../utils/golfRules';

interface BowlingScoreAnimationOverlayProps {
  clip: ScoreCelebrationClip | null;
  onDismiss: () => void;
}

const JACKET_PALETTE: Record<
  JacketTheme,
  { primary: string; lapel: string; accent: string }
> = {
  emerald: { primary: '#0b2b1e', lapel: '#071c13', accent: '#c5a059' },
  gold: { primary: '#7a591b', lapel: '#543c10', accent: '#f4d186' },
  navy: { primary: '#162844', lapel: '#0d192b', accent: '#93c5fd' },
  burgundy: { primary: '#4a1823', lapel: '#300d15', accent: '#fda4af' },
  slate: { primary: '#222b2e', lapel: '#141a1c', accent: '#cbd5e1' },
};

const PANTS_PALETTE: Record<
  PantsStyle,
  { base: string; stripe1: string; stripe2: string }
> = {
  plaid: { base: '#1e4631', stripe1: '#c5a059', stripe2: '#991b1b' },
  chino: { base: '#d6c5a5', stripe1: '#bfa882', stripe2: '#d6c5a5' },
  navy: { base: '#17253b', stripe1: '#283d5e', stripe2: '#17253b' },
  loud: { base: '#db2777', stripe1: '#facc15', stripe2: '#ffffff' },
  corduroy: { base: '#5c3a21', stripe1: '#422815', stripe2: '#734a2b' },
};

const SKIN_PALETTE: Record<SkinTone, { skin: string; cheek: string; ear: string }> = {
  light: { skin: '#fde2c8', cheek: '#f5b59c', ear: '#f3c6a3' },
  warm: { skin: '#eab688', cheek: '#d99164', ear: '#d89f70' },
  medium: { skin: '#c68652', cheek: '#ab6938', ear: '#b07240' },
  deep: { skin: '#7c4b2b', cheek: '#63371c', ear: '#693c20' },
};

/**
 * Renders the player's custom head (skin, eyes, mouth, mustache/beard/sunglasses/cigar, and hat)
 * centered at (0, 0) so it can bob, tilt, nod, or shake during the animation.
 */
const GolferHeadPart: React.FC<{
  config: AvatarConfig;
  expression: ' ecstatic' | 'happy' | 'cool' | 'sweat' | 'cry' | 'dizzy';
}> = ({ config, expression }) => {
  const skin = SKIN_PALETTE[config.skin] || SKIN_PALETTE.warm;
  const jacket = JACKET_PALETTE[config.jacket] || JACKET_PALETTE.emerald;
  const isHappy = expression === ' ecstatic' || expression === 'happy';
  const isSad = expression === 'sweat' || expression === 'cry' || expression === 'dizzy';

  return (
    <g>
      {/* Neck */}
      <rect x="-6" y="10" width="12" height="10" rx="3" fill={skin.ear} />
      {/* Ears */}
      <circle cx="-17" cy="0" r="4" fill={skin.ear} />
      <circle cx="17" cy="0" r="4" fill={skin.ear} />
      {/* Face */}
      <ellipse
        cx="0"
        cy="0"
        rx="16.5"
        ry="17.5"
        fill={skin.skin}
        stroke="#1b1917"
        strokeWidth="1.4"
      />
      <circle cx="-10" cy="4" r="3.2" fill={skin.cheek} opacity="0.55" />
      <circle cx="10" cy="4" r="3.2" fill={skin.cheek} opacity="0.55" />

      {/* Eyes / Sunglasses */}
      {config.accessory === 'sunglasses' ? (
        <g>
          <line x1="-16" y1="-3" x2="16" y2="-3" stroke="#c5a059" strokeWidth="2" />
          <rect x="-14" y="-5" width="12" height="8" rx="2" fill="#0f172a" stroke="#c5a059" strokeWidth="1.4" />
          <rect x="2" y="-5" width="12" height="8" rx="2" fill="#0f172a" stroke="#c5a059" strokeWidth="1.4" />
          <line x1="-12" y1="-3" x2="-8" y2="1" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
          <line x1="4" y1="-3" x2="8" y2="1" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
        </g>
      ) : (
        <g>
          {expression === 'dizzy' ? (
            <>
              <path d="M-10 -4 L-5 1 M-5 -4 L-10 1" stroke="#1b1917" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M5 -4 L10 1 M10 -4 L5 1" stroke="#1b1917" strokeWidth="2.2" strokeLinecap="round" />
            </>
          ) : isHappy ? (
            <>
              <path d="M-11 -1 Q-7.5 -6 -4 -1" fill="none" stroke="#1b1917" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M4 -1 Q7.5 -6 11 -1" fill="none" stroke="#1b1917" strokeWidth="2.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="-7.5" cy="-1.5" r="2.2" fill="#1b1917" />
              <circle cx="7.5" cy="-1.5" r="2.2" fill="#1b1917" />
              <circle cx="-6.8" cy="-2.2" r="0.8" fill="#ffffff" />
              <circle cx="8.2" cy="-2.2" r="0.8" fill="#ffffff" />
            </>
          )}
          {isSad ? (
            <>
              <line x1="-12" y1="-5.5" x2="-4" y2="-7.5" stroke="#3b2618" strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="-7.5" x2="12" y2="-5.5" stroke="#3b2618" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="-12" y1="-6.5" x2="-4" y2="-7" stroke="#3b2618" strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="-7" x2="12" y2="-6.5" stroke="#3b2618" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </g>
      )}

      {/* Nose */}
      <path d="M0 -2 L-1.5 3.5 L1.5 3.5" fill="none" stroke="#8c583a" strokeWidth="1.5" strokeLinecap="round" />

      {/* Beard */}
      {config.accessory === 'beard' && (
        <path
          d="M-15.5 3 C-15.5 15, -8 19, 0 19 C8 19, 15.5 15, 15.5 3 C13 6, 7 7.5, 0 7.5 C-7 7.5, -13 6, -15.5 3 Z"
          fill="#3b2313"
        />
      )}

      {/* Mouth */}
      {isHappy ? (
        <path d="M-8 7 Q0 16 8 7 Z" fill="#ffffff" stroke="#1b1917" strokeWidth="1.4" />
      ) : isSad ? (
        <path d="M-7 12 Q0 5 7 12" fill="none" stroke="#1b1917" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M-6 8.5 Q0 11.5 6 8.5" fill="none" stroke="#1b1917" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Mustache */}
      {config.accessory === 'mustache' && (
        <path
          d="M-10 7.5 C-7 4.5, -2 5.5, 0 7 C2 5.5, 7 4.5, 10 7.5 C7 9, 2 8.5, 0 7.8 C-2 8.5, -7 9, -10 7.5 Z"
          fill="#3b2313"
        />
      )}

      {/* Cigar */}
      {config.accessory === 'cigar' && (
        <g>
          <rect x="2" y="8" width="14" height="3.8" rx="1.5" fill="#78350f" stroke="#1b1917" strokeWidth="0.9" transform="rotate(8 2 8)" />
          <rect x="13" y="9" width="3" height="3.5" fill="#ef4444" transform="rotate(8 13 9)" />
        </g>
      )}

      {/* Hats */}
      {config.hat === 'flatcap' && (
        <g>
          <path d="M-19 -11 C-19 -22, 18 -23, 18 -11 Z" fill="#57534e" stroke="#1c1917" strokeWidth="1.4" />
          <path d="M-22 -11 Q0 -15 23 -10 Q2 -8 -22 -11 Z" fill="#44403c" stroke="#1c1917" strokeWidth="1.3" />
          <circle cx="-1" cy="-21" r="2.2" fill="#c5a059" />
        </g>
      )}
      {config.hat === 'cap' && (
        <g>
          <path d="M-17 -10 C-17 -23, 17 -23, 17 -10 Z" fill={jacket.primary} stroke="#0a1410" strokeWidth="1.4" />
          <path d="M-19 -11 Q2 -14 25 -9 Q5 -7 -19 -11 Z" fill={jacket.accent} stroke="#0a1410" strokeWidth="1.1" />
          <circle cx="0" cy="-16" r="3" fill="#ffffff" opacity="0.9" />
        </g>
      )}
      {config.hat === 'visor' && (
        <g>
          <path d="M-14 -14 C-10 -23, 10 -23, 14 -14 Z" fill="#452715" />
          <path d="M-18 -14 L18 -14 L19 -10 L-19 -10 Z" fill="#f9f6f0" stroke="#141a17" strokeWidth="1.2" />
          <path d="M-19 -11 Q2 -13 24 -9 Q2 -7 -19 -11 Z" fill={jacket.accent} stroke="#141a17" strokeWidth="1" />
        </g>
      )}
      {config.hat === 'bucket' && (
        <g>
          <path d="M-14 -21 L14 -21 L18 -11 L-18 -11 Z" fill="#eab308" stroke="#141a17" strokeWidth="1.2" />
          <rect x="-16" y="-15" width="32" height="3" fill={jacket.primary} />
          <path d="M-24 -11 Q0 -14 24 -11 Q27 -7 20 -7 Q0 -10 -20 -7 Q-27 -7 -24 -11 Z" fill="#facc15" stroke="#141a17" strokeWidth="1.2" />
        </g>
      )}
      {config.hat === 'beanie' && (
        <g>
          <circle cx="0" cy="-26" r="4.8" fill="#f9f6f0" stroke="#141a17" strokeWidth="1.1" />
          <path d="M-17 -11 C-16 -23, 16 -23, 17 -11 Z" fill="#991b1b" stroke="#141a17" strokeWidth="1.2" />
          <rect x="-18" y="-14" width="36" height="5" rx="2" fill="#f9f6f0" stroke="#141a17" strokeWidth="1.1" />
        </g>
      )}
      {config.hat === 'none' && (
        <path
          d="M-17 -8 C-18 -20, -5 -22, 5 -21 C14 -20, 18 -16, 17 -8 C12 -14, 3 -15, -6 -14 C-12 -13, -15 -11, -17 -8 Z"
          fill="#3b2313"
        />
      )}
    </g>
  );
};

export const BowlingScoreAnimationOverlay: React.FC<BowlingScoreAnimationOverlayProps> = ({
  clip,
  onDismiss,
}) => {
  const patternId = useId().replace(/:/g, '');
  const [act, setAct] = useState<'swing' | 'react'>('swing');

  useEffect(() => {
    if (!clip) return;
    setAct('swing');
    const actTimer = window.setTimeout(() => {
      setAct('react');
    }, 1350);
    const dismissTimer = window.setTimeout(() => {
      onDismiss();
    }, 6200);
    return () => {
      window.clearTimeout(actTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [clip, onDismiss]);

  if (!clip) return null;

  const config = parseAvatarSeed(clip.avatarSeed);
  const jacket = JACKET_PALETTE[config.jacket] || JACKET_PALETTE.emerald;
  const pants = PANTS_PALETTE[config.pants] || PANTS_PALETTE.plaid;
  const skin = SKIN_PALETTE[config.skin] || SKIN_PALETTE.warm;

  const key = clip.evalResult.key;
  const isAceOrEagle = key === 'hole-in-one' || key === 'albatross' || key === 'eagle';
  const isBirdie = key === 'birdie';
  const isPar = key === 'par';
  const isBogey = key === 'bogey';
  const isDoubleBogey = key === 'double-bogey';
  const isDisaster = key === 'triple-bogey-plus';

  const badgeColors = isAceOrEagle
    ? 'from-[#f4d186] via-[#c5a059] to-[#9a7428] text-[#07160f] border-[#fef08a]'
    : isBirdie
    ? 'from-[#34d399] via-[#10b981] to-[#059669] text-[#041f14] border-[#a7f3d0]'
    : isPar
    ? 'from-[#e2e8f0] via-[#cbd5e1] to-[#94a3b8] text-[#0f172a] border-white'
    : isBogey
    ? 'from-[#fbbf24] via-[#f59e0b] to-[#d97706] text-[#1c1917] border-[#fde68a]'
    : 'from-[#f87171] via-[#ef4444] to-[#b91c1c] text-white border-[#fecaca]';

  const expression = isAceOrEagle
    ? ' ecstatic'
    : isBirdie
    ? 'happy'
    : isPar
    ? 'cool'
    : isBogey
    ? 'sweat'
    : isDoubleBogey
    ? 'cry'
    : 'dizzy';

  // Character X/Y body motion depending on outcome & act
  const bodyAnimate =
    act === 'swing'
      ? { x: 165, y: 175, rotate: 0, scale: 1 }
      : isAceOrEagle
      ? { x: 215, y: [175, 138, 175, 142, 175], rotate: [0, -6, 6, -4, 0], scale: 1.08 }
      : isBirdie
      ? { x: [165, 210, 190, 215], y: [175, 150, 175, 155, 175], rotate: [0, 5, -5, 0], scale: 1.04 }
      : isPar
      ? { x: 190, y: 175, rotate: 0, scale: 1.02 }
      : isBogey
      ? { x: 165, y: [175, 182, 175, 182, 175], rotate: [-2, 3, -3, 2, 0], scale: 1 }
      : isDoubleBogey
      ? { x: 165, y: 205, rotate: [0, -3, 3, -2, 0], scale: 0.96 }
      : { x: 115, y: 215, rotate: -38, scale: 0.95 };

  // Golf ball trajectory from tee (x=220, y=252) toward the hole cup (x=475, y=248)
  const ballAnimate =
    isAceOrEagle
      ? {
          cx: [220, 340, 475, 475],
          cy: [252, 95, 244, 262],
          opacity: [1, 1, 1, 0],
        }
      : isBirdie || isPar
      ? {
          cx: [220, 360, 475, 475],
          cy: [252, 248, 248, 262],
          opacity: [1, 1, 1, 0],
        }
      : isBogey
      ? {
          // Rolls to the cup, lips out, and bounces back!
          cx: [220, 472, 482, 435],
          cy: [252, 248, 244, 256],
          opacity: [1, 1, 1, 1],
        }
      : isDoubleBogey
      ? {
          // Bunker shot pops up and plugs right back in the sand!
          cx: [220, 260, 285],
          cy: [252, 185, 258],
          opacity: [1, 1, 1],
        }
      : {
          // Disaster shot flies straight into the water hazard on the left!
          cx: [220, 150, 95],
          cy: [252, 160, 265],
          opacity: [1, 1, 0],
        };

  return (
    <AnimatePresence>
      <motion.div
        key={clip.id}
        data-testid="bowling-score-animation-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md cursor-pointer"
        role="dialog"
        aria-modal="true"
        aria-label={`${clip.evalResult.svLabel} — ${clip.playerName}`}
      >
        <motion.div
          initial={{ scale: 0.78, y: 35, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl rounded-3xl overflow-hidden border-4 border-[#c5a059] bg-[#07160f] shadow-2xl"
        >
          {/* Close button in corner */}
          <button
            type="button"
            data-testid="dismiss-score-animation-btn"
            onClick={onDismiss}
            aria-label="Stäng animation"
            className="absolute top-4 right-4 z-30 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white/90 border border-white/20 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Minimal Punchy Arcade Header: ONLY Score Term + Who Did It */}
          <div className="relative z-20 pt-4 sm:pt-5 pb-2.5 sm:pb-3 px-4 sm:px-6 text-center bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <motion.div
              initial={{ scale: 0.4, rotate: -6 }}
              animate={{ scale: [0.4, 1.12, 1], rotate: [-6, 3, 0] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="inline-block max-w-full"
            >
              <span
                className={`inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 sm:px-7 py-1.5 sm:py-2 rounded-2xl border-2 bg-gradient-to-b font-serif text-xl sm:text-5xl font-black uppercase tracking-tight shadow-xl ${badgeColors}`}
              >
                <span>{clip.evalResult.svLabel}!</span>
                <span className="text-base sm:text-3xl opacity-90 font-mono">
                  ({clip.evalResult.diffFormatted})
                </span>
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base font-bold text-[#f4efe4]"
            >
              <span className="text-[#f4d186]">{clip.playerName}</span>
              <span className="text-white/50">·</span>
              <span className="text-white/85">
                Hål {clip.holeNumber} ({clip.sips} {clip.sips === 1 ? 'klunk' : 'klunkar'})
              </span>
            </motion.div>
          </div>

          {/* 16:9 FULL ANIMATED CARTOON STAGE */}
          <div className="relative w-full aspect-[16/10] bg-[#07160f] overflow-hidden">
            <svg
              viewBox="0 0 600 340"
              className="w-full h-full block select-none"
              aria-label="Animerad pubgolf-scen"
            >
              <defs>
                {/* Trouser fabric pattern */}
                <pattern
                  id={`actor-pants-${patternId}`}
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="10" height="10" fill={pants.base} />
                  {config.pants === 'plaid' && (
                    <>
                      <line x1="0" y1="5" x2="10" y2="5" stroke={pants.stripe1} strokeWidth="1.6" />
                      <line x1="5" y1="0" x2="5" y2="10" stroke={pants.stripe2} strokeWidth="1.6" />
                    </>
                  )}
                  {config.pants === 'loud' && (
                    <polygon points="5,0 10,5 5,10 0,5" fill={pants.stripe1} opacity="0.8" />
                  )}
                  {config.pants === 'corduroy' && (
                    <line x1="4" y1="0" x2="4" y2="10" stroke={pants.stripe1} strokeWidth="1.4" />
                  )}
                </pattern>

                <linearGradient id={`sky-${patternId}`} x1="0" y1="0" x2="0" y2="1">
                  {isBogey || isDoubleBogey || isDisaster ? (
                    <>
                      <stop offset="0%" stopColor="#1e1b2e" />
                      <stop offset="100%" stopColor="#3b1d2e" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#092218" />
                      <stop offset="100%" stopColor="#174e36" />
                    </>
                  )}
                </linearGradient>
              </defs>

              {/* Sky / Stadium Backdrop */}
              <rect width="600" height="340" fill={`url(#sky-${patternId})`} />

              {/* Animated Stadium Spotlights for Under Par */}
              {(isAceOrEagle || isBirdie) && (
                <g opacity="0.28">
                  <motion.polygon
                    points="120,0 40,340 210,340"
                    fill="#f4d186"
                    animate={{ rotate: [-12, 12, -12] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ originX: '120px', originY: '0px' }}
                  />
                  <motion.polygon
                    points="480,0 390,340 560,340"
                    fill="#34d399"
                    animate={{ rotate: [10, -14, 10] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ originX: '480px', originY: '0px' }}
                  />
                </g>
              )}

              {/* Distant Rolling Hills & Fairway */}
              <path d="M0 220 Q160 185 340 215 T600 205 L600 340 L0 340 Z" fill="#0d3523" />
              <ellipse cx="310" cy="275" rx="340" ry="70" fill="#155d3e" />
              {/* Putting Green Surface */}
              <ellipse cx="360" cy="262" rx="220" ry="38" fill="#228b57" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.3" />

              {/* Water Hazard on Left (Active on Triple Bogey+ Disaster) */}
              {isDisaster && (
                <g>
                  <ellipse cx="95" cy="272" rx="85" ry="26" fill="#0284c7" stroke="#bae6fd" strokeWidth="2" />
                  <path d="M40 270 Q70 263 100 270 T155 270" fill="none" stroke="#e0f2fe" strokeWidth="2" />
                </g>
              )}

              {/* Sand Bunker around golfer on Double Bogey */}
              {isDoubleBogey && (
                <g>
                  <ellipse cx="195" cy="258" rx="92" ry="24" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
                  <path d="M130 258 Q195 245 260 258" fill="#facc15" />
                </g>
              )}

              {/* THE GOLF HOLE CUP & ANIMATED FLAGSTICK (at x=475, y=248) */}
              <g transform="translate(475, 248)">
                {/* Hole cup */}
                <ellipse cx="0" cy="4" rx="16" ry="6" fill="#06140d" stroke="#d1fae5" strokeWidth="1.5" />
                {/* Flagstick (bounces up in the air on Hole-in-One/Eagle/Birdie!) */}
                <motion.g
                  animate={
                    act === 'react' && (isAceOrEagle || isBirdie)
                      ? { y: [0, -28, 0, -12, 0], rotate: [0, 8, -5, 0] }
                      : { y: 0, rotate: 0 }
                  }
                  transition={{ duration: 1.1 }}
                >
                  <line x1="0" y1="4" x2="0" y2="-115" stroke="#fef3c7" strokeWidth="3.5" />
                  <polygon points="0,-115 48,-98 0,-82" fill="#ef4444" />
                  <text x="10" y="-94" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    #{clip.holeNumber}
                  </text>
                </motion.g>
              </g>

              {/* ANIMATED GOLF BALL */}
              <motion.circle
                r="6.5"
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                initial={{ cx: 220, cy: 252, opacity: 1 }}
                animate={ballAnimate}
                transition={{ duration: 1.25, ease: 'easeInOut' }}
              />

              {/* Flaming Comet Trail on Hole-in-One / Eagle */}
              {isAceOrEagle && act === 'swing' && (
                <motion.path
                  d="M220 252 Q340 95 475 244"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="5"
                  strokeDasharray="10 6"
                  initial={{ pathLength: 0, opacity: 0.9 }}
                  animate={{ pathLength: 1, opacity: 0 }}
                  transition={{ duration: 1.2 }}
                />
              )}

              {/* Flying Green Birdie on Birdie! */}
              {isBirdie && act === 'react' && (
                <motion.g
                  initial={{ x: 475, y: 240, scale: 0.3, opacity: 0 }}
                  animate={{
                    x: [475, 410, 320, 260],
                    y: [240, 140, 95, 70],
                    scale: [0.4, 1.15, 1.1, 1],
                    opacity: [0, 1, 1, 1],
                  }}
                  transition={{ duration: 1.8, ease: 'easeOut' }}
                >
                  {/* Cute flapping birdie */}
                  <ellipse cx="0" cy="0" rx="14" ry="10" fill="#34d399" stroke="#064e3b" strokeWidth="2" />
                  <motion.path
                    d="M-6 -4 Q-18 -24 -2 -12"
                    fill="#6ee7b7"
                    stroke="#064e3b"
                    strokeWidth="2"
                    animate={{ rotate: [-25, 25, -25] }}
                    transition={{ duration: 0.25, repeat: Infinity }}
                  />
                  <circle cx="-6" cy="-2" r="2" fill="#064e3b" />
                  <polygon points="-14,0 -22,-3 -14,4" fill="#f59e0b" />
                </motion.g>
              )}

              {/* ============================================================ */}
              {/* ARTICULATED FULL-BODY GOLFER ACTOR                           */}
              {/* ============================================================ */}
              <motion.g
                initial={{ x: 165, y: 175, rotate: 0, scale: 1 }}
                animate={bodyAnimate}
                transition={{
                  duration: act === 'swing' ? 0.6 : 1.2,
                  repeat: act === 'react' && (isAceOrEagle || isBirdie || isBogey) ? Infinity : 0,
                  repeatType: 'mirror',
                }}
              >
                {/* Shadow under golfer */}
                <ellipse cx="0" cy="82" rx="28" ry="7" fill="#04120b" opacity="0.45" />

                {/* LEFT LEG */}
                <motion.g
                  animate={
                    act === 'react' && (isAceOrEagle || isBirdie)
                      ? { rotate: [-18, 14, -18] }
                      : act === 'react' && isBogey
                      ? { y: [0, -10, 0] }
                      : isDoubleBogey && act === 'react'
                      ? { rotate: 65, y: 12 }
                      : { rotate: 0, y: 0 }
                  }
                  transition={{ duration: 0.45, repeat: act === 'react' ? Infinity : 0 }}
                  style={{ originX: '-8px', originY: '42px' }}
                >
                  <rect
                    x="-15"
                    y="40"
                    width="13"
                    height="36"
                    rx="5"
                    fill={`url(#actor-pants-${patternId})`}
                    stroke="#0d1b15"
                    strokeWidth="1.5"
                  />
                  {/* Golf shoe */}
                  <path d="M-17 74 L-1 74 L3 81 L-18 81 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                </motion.g>

                {/* RIGHT LEG */}
                <motion.g
                  animate={
                    act === 'react' && (isAceOrEagle || isBirdie)
                      ? { rotate: [16, -18, 16] }
                      : act === 'react' && isBogey
                      ? { y: [-8, 0, -8] }
                      : isDoubleBogey && act === 'react'
                      ? { rotate: -65, y: 12 }
                      : { rotate: 0, y: 0 }
                  }
                  transition={{ duration: 0.45, repeat: act === 'react' ? Infinity : 0 }}
                  style={{ originX: '8px', originY: '42px' }}
                >
                  <rect
                    x="2"
                    y="40"
                    width="13"
                    height="36"
                    rx="5"
                    fill={`url(#actor-pants-${patternId})`}
                    stroke="#0d1b15"
                    strokeWidth="1.5"
                  />
                  {/* Golf shoe */}
                  <path d="M1 74 L17 74 L21 81 L0 81 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                </motion.g>

                {/* TORSO (CLUB JACKET, TIE, BELT & CREST) */}
                <g>
                  <path
                    d="M-22 42 C-24 12, -16 0, 0 0 C16 0, 24 12, 22 42 Z"
                    fill={jacket.primary}
                    stroke="#0a1410"
                    strokeWidth="1.6"
                  />
                  {/* White Polo V-Neck */}
                  <polygon points="-9,0 9,0 0,20" fill="#f9f6f0" />
                  {/* Club Tie */}
                  <polygon points="-2,4 2,4 3,18 0,22 -3,18" fill={jacket.accent} />
                  {/* Lapels */}
                  <polygon points="-11,0 0,20 -16,15" fill={jacket.lapel} />
                  <polygon points="11,0 0,20 16,15" fill={jacket.lapel} />
                  {/* Golden Crest */}
                  <circle cx="11" cy="18" r="4" fill={jacket.accent} />
                  {/* Belt */}
                  <rect x="-21" y="38" width="42" height="5.5" rx="2" fill="#2c1a11" />
                  <rect x="-5" y="37.5" width="10" height="6.5" rx="1.2" fill="#c5a059" stroke="#141a17" strokeWidth="0.9" />
                </g>

                {/* LEFT ARM (Holds Foaming Pint Glass on Celebration/Par or Wipes Forehead on Bogey) */}
                <motion.g
                  animate={
                    act === 'swing'
                      ? { rotate: [20, -65, 35] }
                      : isAceOrEagle || isBirdie
                      ? { rotate: [-135, -165, -130] }
                      : isPar
                      ? { rotate: [-55, -80, -55] }
                      : isBogey
                      ? { rotate: [-110, -95, -110] }
                      : { rotate: [45, 70, 45] }
                  }
                  transition={{
                    duration: act === 'swing' ? 0.9 : 0.55,
                    repeat: act === 'react' ? Infinity : 0,
                    repeatType: 'mirror',
                  }}
                  style={{ originX: '-18px', originY: '8px' }}
                >
                  <rect
                    x="-26"
                    y="6"
                    width="10"
                    height="30"
                    rx="5"
                    fill={jacket.primary}
                    stroke="#0a1410"
                    strokeWidth="1.4"
                  />
                  <circle cx="-21" cy="38" r="5" fill={skin.skin} stroke="#1b1917" strokeWidth="1.2" />

                  {/* Foaming Pint Glass in hand! */}
                  {(isAceOrEagle || isBirdie || isPar || isBogey) && (
                    <g transform="translate(-31, 36)">
                      <rect x="0" y="0" width="14" height="19" rx="2" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.5" />
                      <rect x="-1" y="-4" width="16" height="6" rx="2.5" fill="#ffffff" />
                    </g>
                  )}
                </motion.g>

                {/* RIGHT ARM + GOLF CLUB (Swings through the ball in Act 1, then Celebrates or Snaps Club in Act 2!) */}
                <motion.g
                  animate={
                    act === 'swing'
                      ? { rotate: [55, -110, 45] }
                      : isAceOrEagle
                      ? { rotate: [-140, -170, -140] }
                      : isBirdie
                      ? { rotate: [-120, -150, -120] }
                      : isPar
                      ? { rotate: [-25, -40, -25] }
                      : { rotate: [15, 35, 15] }
                  }
                  transition={{
                    duration: act === 'swing' ? 0.95 : 0.5,
                    repeat: act === 'react' ? Infinity : 0,
                    repeatType: 'mirror',
                  }}
                  style={{ originX: '18px', originY: '8px' }}
                >
                  <rect
                    x="16"
                    y="6"
                    width="10"
                    height="30"
                    rx="5"
                    fill={jacket.primary}
                    stroke="#0a1410"
                    strokeWidth="1.4"
                  />
                  <circle cx="21" cy="38" r="5" fill={skin.skin} stroke="#1b1917" strokeWidth="1.2" />

                  {/* Golf Club (Intact unless Disaster Act 2 where it snaps in two!) */}
                  {!(isDisaster && act === 'react') && (
                    <g transform="translate(21, 38)">
                      <line x1="0" y1="0" x2="26" y2="42" stroke="#e2e8f0" strokeWidth="3.2" strokeLinecap="round" />
                      <ellipse cx="29" cy="44" rx="8" ry="4.2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.2" transform="rotate(-20 29 44)" />
                    </g>
                  )}
                </motion.g>

                {/* HEAD (Bobs, nods, tilts back to chug, or shakes in disbelief) */}
                <motion.g
                  animate={
                    act === 'swing'
                      ? { y: -22, rotate: [0, -8, 10] }
                      : isAceOrEagle
                      ? { y: [-22, -26, -22], rotate: [-14, 10, -14] }
                      : isBirdie
                      ? { y: [-22, -25, -22], rotate: [-6, 6, -6] }
                      : isBogey || isDoubleBogey
                      ? { y: -20, rotate: [-10, 10, -10] }
                      : { y: -22, rotate: 0 }
                  }
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: 'mirror' }}
                >
                  <GolferHeadPart config={config} expression={expression} />

                  {/* Fountain of Cartoon Tears on Double Bogey / Disaster */}
                  {act === 'react' && (isDoubleBogey || isDisaster) && (
                    <g>
                      <motion.path
                        d="M-10 -2 Q-28 -10 -38 14"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3.5"
                        strokeDasharray="6 4"
                        animate={{ strokeDashoffset: [0, -20] }}
                        transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.path
                        d="M10 -2 Q28 -10 38 14"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3.5"
                        strokeDasharray="6 4"
                        animate={{ strokeDashoffset: [0, -20] }}
                        transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
                      />
                    </g>
                  )}
                </motion.g>
              </motion.g>

              {/* ============================================================ */}
              {/* SPECIAL EVENT EFFECTS & PROPS (BY OUTCOME)                   */}
              {/* ============================================================ */}

              {/* 1. SAND BUNKER EXPLOSION CLOUD ON DOUBLE BOGEY */}
              {isDoubleBogey && (
                <motion.g
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{
                    scale: [0.3, 1.5, 1.2],
                    opacity: [0, 0.95, 0.75],
                    y: [0, -35, -15],
                  }}
                  transition={{ duration: 1.2, delay: 0.4 }}
                >
                  <circle cx="205" cy="235" r="24" fill="#ca8a04" opacity="0.85" />
                  <circle cx="180" cy="225" r="20" fill="#eab308" opacity="0.9" />
                  <circle cx="230" cy="225" r="22" fill="#facc15" opacity="0.85" />
                </motion.g>
              )}

              {/* 2. SNAPPED GOLF CLUB FLYING PIECES & WATER SPLASH ON DISASTER */}
              {isDisaster && act === 'react' && (
                <g>
                  {/* Broken shaft flying spinning through the air */}
                  <motion.g
                    initial={{ x: 180, y: 190, rotate: 0 }}
                    animate={{ x: 290, y: 90, rotate: 540 }}
                    transition={{ duration: 1.3, ease: 'easeOut' }}
                  >
                    <line x1="-20" y1="0" x2="20" y2="0" stroke="#e2e8f0" strokeWidth="4" />
                    <ellipse cx="22" cy="0" rx="8" ry="4" fill="#94a3b8" />
                  </motion.g>
                  {/* Big Water Splash */}
                  <motion.path
                    d="M55 268 Q75 205 95 268 Q115 195 135 268"
                    fill="#38bdf8"
                    stroke="#e0f2fe"
                    strokeWidth="3"
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: [0, 1.3, 0.9], opacity: [0, 1, 0.85] }}
                    transition={{ duration: 0.8 }}
                  />
                </g>
              )}

              {/* 3. STORM CLOUD & LIGHTNING OVER GOLFER ON BOGEY / DOUBLE BOGEY */}
              {(isBogey || isDoubleBogey) && act === 'react' && (
                <motion.g
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <g transform="translate(165, 58)">
                    <ellipse cx="0" cy="0" rx="46" ry="20" fill="#334155" />
                    <circle cx="-22" cy="-8" r="18" fill="#475569" />
                    <circle cx="18" cy="-10" r="20" fill="#475569" />
                    {/* Animated Raindrops */}
                    <motion.line
                      x1="-20"
                      y1="22"
                      x2="-25"
                      y2="52"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      animate={{ y: [0, 35], opacity: [1, 0] }}
                      transition={{ duration: 0.45, repeat: Infinity }}
                    />
                    <motion.line
                      x1="0"
                      y1="24"
                      x2="-5"
                      y2="54"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      animate={{ y: [0, 35], opacity: [1, 0] }}
                      transition={{ duration: 0.45, delay: 0.15, repeat: Infinity }}
                    />
                    <motion.line
                      x1="20"
                      y1="22"
                      x2="15"
                      y2="52"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      animate={{ y: [0, 35], opacity: [1, 0] }}
                      transition={{ duration: 0.45, delay: 0.3, repeat: Infinity }}
                    />
                  </g>
                </motion.g>
              )}

              {/* 4. FIREWORKS & GOLDEN BURSTS AROUND THE CUP ON BIRDIE / EAGLE / ACE */}
              {(isAceOrEagle || isBirdie) && act === 'react' && (
                <g>
                  {[
                    { cx: 475, cy: 115, color: '#f4d186', delay: 0 },
                    { cx: 360, cy: 90, color: '#34d399', delay: 0.2 },
                    { cx: 120, cy: 95, color: '#f59e0b', delay: 0.35 },
                  ].map((fw, i) => (
                    <motion.g
                      key={i}
                      transform={`translate(${fw.cx}, ${fw.cy})`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.35, 1], opacity: [0, 1, 0] }}
                      transition={{
                        duration: 1.2,
                        delay: fw.delay,
                        repeat: Infinity,
                        repeatDelay: 0.3,
                      }}
                    >
                      <circle cx="0" cy="0" r="6" fill={fw.color} />
                      <circle cx="0" cy="-28" r="4" fill={fw.color} />
                      <circle cx="0" cy="28" r="4" fill={fw.color} />
                      <circle cx="-28" cy="0" r="4" fill={fw.color} />
                      <circle cx="28" cy="0" r="4" fill={fw.color} />
                      <circle cx="-20" cy="-20" r="3.5" fill={fw.color} />
                      <circle cx="20" cy="-20" r="3.5" fill={fw.color} />
                      <circle cx="-20" cy="20" r="3.5" fill={fw.color} />
                      <circle cx="20" cy="20" r="3.5" fill={fw.color} />
                    </motion.g>
                  ))}
                </g>
              )}
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
