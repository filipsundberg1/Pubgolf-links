import React, { useEffect, useId, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { SwingGear } from './AvatarGear';
import { AvatarHead, COLOR_PALETTE, PantsPattern, SKIN_PALETTE, isSkirt, topColors, type HeadExpression } from './avatarArt';
import { parseAvatarSeed, type ScoreCelebrationClip } from '../utils/golfRules';

interface BowlingScoreAnimationOverlayProps {
  clip: ScoreCelebrationClip | null;
  onDismiss: () => void;
}

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
  const tops = topColors(config);
  const female = config.body === 'female';
  const skirt = isSkirt(config);
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

  const expression: HeadExpression = isAceOrEagle
    ? 'ecstatic'
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
                {/* Byxtyg */}
                <PantsPattern id={`actor-pants-${patternId}`} pants={config.pants} />

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
                    fill={skirt ? skin.skin : `url(#actor-pants-${patternId})`}
                    stroke={skirt ? '#1b1917' : '#0d1b15'}
                    strokeWidth="1.5"
                  />
                  {config.pants === 'shorts' && (
                    <rect x="-13.5" y="58" width="10" height="17" rx="4" fill={skin.skin} stroke="#1b1917" strokeWidth="1" />
                  )}
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
                    fill={skirt ? skin.skin : `url(#actor-pants-${patternId})`}
                    stroke={skirt ? '#1b1917' : '#0d1b15'}
                    strokeWidth="1.5"
                  />
                  {config.pants === 'shorts' && (
                    <rect x="3.5" y="58" width="10" height="17" rx="4" fill={skin.skin} stroke="#1b1917" strokeWidth="1" />
                  )}
                  {/* Golf shoe */}
                  <path d="M1 74 L17 74 L21 81 L0 81 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                </motion.g>

                {/* Kjol eller klänningens kjoldel */}
                {skirt && (
                  <g>
                    <path d="M-20 38 L20 38 L25 58 Q0 62 -25 58 Z"
                      fill={config.top === 'dress' ? tops.body : `url(#actor-pants-${patternId})`}
                      stroke="#0d1b15" strokeWidth="1.4" />
                    {config.pants === 'skort' && config.top !== 'dress' &&
                      [-12, -6, 0, 6, 12].map((x) => (
                        <line key={x} x1={x} y1="41" x2={x * 1.2} y2="58" stroke="#cbd5e1" strokeWidth="1" />
                      ))}
                  </g>
                )}

                {/* Överkropp beroende på plagg */}
                <g>
                  <path
                    d={female ? 'M-19 42 C-21 26, -18 2, 0 1 C18 2, 21 26, 19 42 C10 36, -10 36, -19 42 Z' : 'M-22 42 C-24 12, -16 0, 0 0 C16 0, 24 12, 22 42 Z'}
                    fill={config.top === 'sweater' || config.top === 'cardigan' ? '#f9f6f0' : tops.body}
                    stroke={tops.outline}
                    strokeWidth="1.6"
                  />
                  {config.top === 'jacket' && (
                    <>
                      <polygon points="-9,0 9,0 0,20" fill="#f9f6f0" />
                      <polygon points="-2,4 2,4 3,18 0,22 -3,18" fill={tops.accent} />
                      <polygon points="-11,0 0,20 -16,15" fill={tops.lapel} />
                      <polygon points="11,0 0,20 16,15" fill={tops.lapel} />
                      <circle cx="11" cy="18" r="4" fill={tops.accent} />
                    </>
                  )}
                  {(config.top === 'polo' || config.top === 'whitepike' || config.top === 'ladypolo') && (
                    <>
                      <polygon points="-11,0 0,6 -7,10" fill={config.top === 'whitepike' ? '#ffffff' : tops.lapel} stroke={tops.outline} strokeWidth="0.9" />
                      <polygon points="11,0 0,6 7,10" fill={config.top === 'whitepike' ? '#ffffff' : tops.lapel} stroke={tops.outline} strokeWidth="0.9" />
                      <line x1="0" y1="6" x2="0" y2="17" stroke={tops.outline} strokeWidth="1" />
                      <circle cx="11" cy="16" r="3" fill={tops.accent} />
                    </>
                  )}
                  {config.top === 'sweater' && (
                    <>
                      <path d="M-17 42 C-18 20, -12 6, -6 2 L0 16 L6 2 C12 6, 18 20, 17 42 Z" fill={tops.body} stroke={tops.outline} strokeWidth="1.3" />
                      <line x1="-16" y1="34" x2="16" y2="34" stroke={tops.accent} strokeWidth="1.4" opacity="0.7" />
                    </>
                  )}
                  {(config.top === 'sportstop' || (config.top === 'none' && female)) && (
                    <path d="M-17 10 C-11 5, -5 8, 0 11 C5 8, 11 5, 17 10 L18 22 C9 25, -9 25, -18 22 Z" fill={(COLOR_PALETTE[config.jacket] || COLOR_PALETTE.emerald).primary} stroke="#1b1917" strokeWidth="1.2" />
                  )}
                  {config.top === 'dress' && <path d="M-7 1 L0 12 L7 1 Z" fill={skin.skin} />}
                  {config.top === 'cardigan' && (
                    <>
                      <path d="M-19 42 C-21 26, -18 2, -6 1 L-3 38 Z" fill={tops.body} stroke={tops.outline} strokeWidth="1.2" />
                      <path d="M19 42 C21 26, 18 2, 6 1 L3 38 Z" fill={tops.body} stroke={tops.outline} strokeWidth="1.2" />
                    </>
                  )}
                  {config.top === 'none' && config.body !== 'female' && (
                    <>
                      <circle cx="-8" cy="16" r="1.3" fill={skin.cheek} />
                      <circle cx="8" cy="16" r="1.3" fill={skin.cheek} />
                      <circle cx="0" cy="32" r="1.1" fill={skin.ear} />
                    </>
                  )}
                  {/* Bälte (inte på klänning) */}
                  {config.top !== 'dress' && (
                    <>
                      <rect x={female ? -19 : -21} y="38" width={female ? 38 : 42} height="5.5" rx="2" fill="#2c1a11" />
                      <rect x="-5" y="37.5" width="10" height="6.5" rx="1.2" fill="#c5a059" stroke="#141a17" strokeWidth="0.9" />
                    </>
                  )}
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
                    fill={tops.sleeve}
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
                    fill={tops.sleeve}
                    stroke="#0a1410"
                    strokeWidth="1.4"
                  />
                  <circle cx="21" cy="38" r="5" fill={skin.skin} stroke="#1b1917" strokeWidth="1.2" />

                  {/* Golf Club (Intact unless Disaster Act 2 where it snaps in two!) */}
                  {!(isDisaster && act === 'react') && (
                    <g transform="translate(21, 38)">
                      <SwingGear gear={config.gear} ballCount={config.ballCount} />
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
                  <AvatarHead config={config} expression={expression} strokeWidth={1.4} />

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
