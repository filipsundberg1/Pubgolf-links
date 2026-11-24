import React, { useId } from 'react';
import { Lock } from 'lucide-react';
import { PortraitGear, SwingGear } from './AvatarGear';
import {
  AvatarHead,
  COLOR_PALETTE,
  isSkirt,
  HAIR_PALETTE,
  PANTS_PALETTE,
  PantsPattern,
  SKIN_PALETTE,
  topColors,
  type HeadExpression,
} from './avatarArt';
import {
  EMPTY_UNLOCK_STATS,
  GEAR_CATALOG,
  TOP_UNLOCKS,
  isGearUnlocked,
  isTopUnlocked,
  parseAvatarSeed,
  serializeAvatarConfig,
  winStarTier,
  type AvatarAnimationPose,
  AVATAR_WARDROBE,
  switchAvatarBody,
  type AvatarBody,
  type AvatarConfig,
  type Earrings,
  type HairStyle,
  type EyeStyle,
  type FacialHair,
  type GearUnlockStats,
  type HairColor,
  type HatStyle,
  type JacketTheme,
  type MouthItem,
  type SkinTone,
  type TopStyle,
} from '../utils/golfRules';

interface GolferAvatarProps {
  avatarSeed?: string;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  pose?: AvatarAnimationPose;
  /** Antal vinster – ger en guldstjärna (större vid 5/10/20). */
  wins?: number;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<GolferAvatarProps['size']>, string> = {
  xs: 'w-8 h-8',
  sm: 'w-11 h-11',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
  xl: 'w-36 h-36',
};

/** Stjärnans storlek i px per avatarstorlek och nivå (1–4). */
const STAR_PX: Record<NonNullable<GolferAvatarProps['size']>, number> = { xs: 12, sm: 15, md: 17, lg: 22, xl: 34 };
const TIER_SCALE = [0, 1, 1.25, 1.5, 1.8];

/** Guldstjärna för vinster. Liten vid 1 vinst, större vid 5, 10 och 20. */
export const WinStar: React.FC<{ wins: number; px?: number; className?: string }> = ({ wins, px = 16, className = '' }) => {
  const gid = useId().replace(/:/g, '');
  const tier = winStarTier(wins);
  if (tier === 0) return null;
  const size = Math.round(px * TIER_SCALE[tier]);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 ${tier >= 4 ? 'drop-shadow-[0_0_4px_rgba(244,209,134,0.9)]' : 'drop-shadow-sm'} ${className}`}
      aria-label={`${wins} ${wins === 1 ? 'vinst' : 'vinster'}`}
    >
      <title>{`${wins} ${wins === 1 ? 'vinst' : 'vinster'}`}</title>
      <defs>
        <linearGradient id={`star-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor={tier >= 3 ? '#b7791f' : '#d4af37'} />
        </linearGradient>
      </defs>
      <path
        d="M12 1.8l3.1 6.4 7 1-5.1 4.9 1.2 7-6.2-3.3-6.2 3.3 1.2-7L1.9 9.2l7-1z"
        fill={`url(#star-${gid})`}
        stroke={tier >= 3 ? '#7a591b' : '#a07c1c'}
        strokeWidth={tier >= 2 ? 1.4 : 1}
        strokeLinejoin="round"
      />
      {tier >= 2 && (
        <text x="12" y="15.6" fontSize={wins >= 100 ? 5.5 : 7.5} fontWeight="900" fill="#3d2a07" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">
          {wins}
        </text>
      )}
    </svg>
  );
};

const poseToExpression = (pose: AvatarAnimationPose): HeadExpression => {
  if (pose === 'victory' || pose === 'celebrate') return 'happy';
  if (pose === 'sweat') return 'sweat';
  if (pose === 'cry') return 'cry';
  if (pose === 'disaster') return 'dizzy';
  return 'cool';
};

/** Överkroppen i porträttet, beroende på plagg. */
const PortraitTorso: React.FC<{ config: AvatarConfig }> = ({ config }) => {
  const c = topColors(config);
  const body = 'M24 75 C24 56, 33 50, 50 50 C67 50, 76 56, 76 75 Z';
  // Damplagg: smalare, inskuren siluett
  const fitted = 'M27 75 C26 63, 31 52, 50 51 C69 52, 74 63, 73 75 C66 70, 34 70, 27 75 Z';
  const skin = SKIN_PALETTE[config.skin] || SKIN_PALETTE.warm;
  if (config.body === 'female') {
    switch (config.top) {
      case 'dress':
        return (
          <g>
            <path d={fitted} fill={c.body} stroke={c.outline} strokeWidth="1.2" />
            <path d="M42 51 L50 61 L58 51 Z" fill={skin.skin} />
            <path d="M33 70 Q50 74 67 70" fill="none" stroke={c.accent} strokeWidth="1.6" />
          </g>
        );
      case 'cardigan':
        return (
          <g>
            <path d={fitted} fill="#f9f6f0" stroke={c.outline} strokeWidth="1.2" />
            <path d="M27 75 C26 63, 31 52, 44 51 L47 73 C40 72, 32 73, 27 75 Z" fill={c.body} stroke={c.outline} strokeWidth="1" />
            <path d="M73 75 C74 63, 69 52, 56 51 L53 73 C60 72, 68 73, 73 75 Z" fill={c.body} stroke={c.outline} strokeWidth="1" />
            {[58, 63, 68].map((y) => (
              <circle key={y} cx="46" cy={y} r="1" fill={c.accent} />
            ))}
          </g>
        );
      case 'sportstop':
      case 'none':
        return (
          <g>
            <path d={fitted} fill={skin.skin} stroke="#1b1917" strokeWidth="1.2" />
            <path d="M31 57 C36 53, 43 55, 50 58 C57 55, 64 53, 69 57 L71 66 C63 68, 37 68, 29 66 Z" fill={c.lapel} stroke="#1b1917" strokeWidth="1" />
            <line x1="38" y1="53" x2="36" y2="57" stroke={c.lapel} strokeWidth="2.4" />
            <line x1="62" y1="53" x2="64" y2="57" stroke={c.lapel} strokeWidth="2.4" />
            <circle cx="50" cy="71" r="0.9" fill={skin.ear} />
          </g>
        );
      case 'ladypolo':
      case 'whitepike':
      default: {
        const white = config.top === 'whitepike';
        return (
          <g>
            <path d={fitted} fill={c.body} stroke={c.outline} strokeWidth="1.2" />
            <polygon points="42,51 50,56 45,59" fill={white ? '#ffffff' : c.lapel} stroke={c.outline} strokeWidth="0.8" />
            <polygon points="58,51 50,56 55,59" fill={white ? '#ffffff' : c.lapel} stroke={c.outline} strokeWidth="0.8" />
            <line x1="50" y1="56" x2="50" y2="63" stroke={c.outline} strokeWidth="0.9" />
            <circle cx="61" cy="62" r="2.3" fill={c.accent} opacity="0.95" />
          </g>
        );
      }
    }
  }
  switch (config.top) {
    case 'polo':
    case 'whitepike':
      return (
        <g>
          <path d={body} fill={c.body} stroke={c.outline} strokeWidth="1.3" />
          <polygon points="40,50 50,55 43,59" fill={config.top === 'whitepike' ? '#ffffff' : c.lapel} stroke={c.outline} strokeWidth="0.8" />
          <polygon points="60,50 50,55 57,59" fill={config.top === 'whitepike' ? '#ffffff' : c.lapel} stroke={c.outline} strokeWidth="0.8" />
          <line x1="50" y1="55" x2="50" y2="64" stroke={c.outline} strokeWidth="0.9" />
          <circle cx="50" cy="58.5" r="0.9" fill={c.outline} />
          <circle cx="50" cy="62" r="0.9" fill={c.outline} />
          <circle cx="61" cy="63" r="2.6" fill={c.accent} opacity="0.95" />
        </g>
      );
    case 'sweater':
      return (
        <g>
          <path d={body} fill="#f9f6f0" stroke={c.outline} strokeWidth="1.3" />
          <path d="M30 75 C30 60, 36 53, 42 51 L50 64 L58 51 C64 53, 70 60, 70 75 Z" fill={c.body} stroke={c.outline} strokeWidth="1.1" />
          {[66, 70].map((y) => (
            <line key={y} x1="31" y1={y} x2="69" y2={y} stroke={c.accent} strokeWidth="1.1" opacity="0.7" />
          ))}
          <polygon points="45,50 55,50 50,58" fill="#f9f6f0" />
        </g>
      );
    case 'none': {
      const hair = (HAIR_PALETTE[config.hair] || HAIR_PALETTE.brown).color;
      return (
        <g>
          <path d={body} fill={skin.skin} stroke="#1b1917" strokeWidth="1.2" />
          <path d="M40 61 Q44 64 48 61 M52 61 Q56 64 60 61" fill="none" stroke={skin.cheek} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="43" cy="62.5" r="1" fill={skin.cheek} />
          <circle cx="57" cy="62.5" r="1" fill={skin.cheek} />
          <path d="M48 66 Q50 64 52 66 M49 69 Q50 67.5 51 69" fill="none" stroke={hair} strokeWidth="0.8" opacity="0.6" />
          <circle cx="50" cy="72" r="0.9" fill={skin.ear} />
        </g>
      );
    }
    case 'jacket':
    default:
      return (
        <g>
          <path d={body} fill={c.body} stroke={c.outline} strokeWidth="1.4" />
          <polygon points="41,50 59,50 50,67" fill="#f9f6f0" />
          <polygon points="48.5,54 51.5,54 52.5,65 50,68 47.5,65" fill={c.accent} />
          <polygon points="39,50 50,67 34,63" fill={c.lapel} />
          <polygon points="61,50 50,67 66,63" fill={c.lapel} />
          <circle cx="61" cy="64" r="3.6" fill={c.accent} opacity="0.92" />
          <path d="M59.5 64 L62.5 64 M61 62.5 L61 65.5" stroke={c.body} strokeWidth="1" />
        </g>
      );
  }
};

export const GolferAvatar: React.FC<GolferAvatarProps> = ({
  avatarSeed = 'emerald',
  displayName = 'Spelare',
  size = 'md',
  pose = 'idle',
  wins = 0,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const config = parseAvatarSeed(avatarSeed);
  const color = COLOR_PALETTE[config.jacket] || COLOR_PALETTE.emerald;
  const skin = SKIN_PALETTE[config.skin] || SKIN_PALETTE.warm;
  const tops = topColors(config);
  const isHappy = pose === 'victory' || pose === 'celebrate';

  const avatar = (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden select-none border-2 shadow-sm ${SIZE_CLASSES[size]} ${winStarTier(wins) ? '' : className}`}
      style={{ borderColor: color.accent, backgroundColor: color.bgGlow }}
      title={displayName}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-label={`Golfavatar för ${displayName}`}>
        <defs>
          <PantsPattern id={`pants-${uid}`} pants={config.pants} />
        </defs>

        <circle cx="50" cy="50" r="50" fill={color.bgGlow} />
        <ellipse cx="50" cy="94" rx="46" ry="18" fill="#103826" opacity="0.65" />

        {pose === 'disaster' && (
          <g opacity="0.85">
            <line x1="22" y1="10" x2="18" y2="24" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="78" y1="12" x2="74" y2="26" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" />
            <polygon points="50,4 45,14 51,14 47,23 56,11 50,11" fill="#facc15" />
          </g>
        )}

        {/* Gear bakom kroppen (bryts vid katastrof) */}
        <PortraitGear gear={config.gear} snapped={pose === 'disaster'} ballCount={config.ballCount} />

        {/* Kjol, klänning eller byxor */}
        {isSkirt(config) ? (
          <g>
            <path d="M33 86 L47 86 L46 100 L32 100 Z" fill={skin.skin} stroke="#1b1917" strokeWidth="1" />
            <path d="M53 86 L67 86 L68 100 L54 100 Z" fill={skin.skin} stroke="#1b1917" strokeWidth="1" />
            {config.top === 'dress' ? (
              <path d="M29 72 L71 72 L76 92 Q50 96 24 92 Z" fill={tops.body} stroke={tops.outline} strokeWidth="1.2" />
            ) : (
              <>
                <path d="M31 73 L69 73 L73 91 Q50 94 27 91 Z" fill={`url(#pants-${uid})`} stroke="#0d1b15" strokeWidth="1.2" />
                {config.pants === 'skort' &&
                  [38, 44, 50, 56, 62].map((x) => (
                    <line key={x} x1={x} y1="76" x2={x + (x - 50) * 0.12} y2="91" stroke="#cbd5e1" strokeWidth="0.9" />
                  ))}
                <rect x="31" y="72" width="38" height="3.5" rx="1.5" fill={tops.body} stroke="#0d1b15" strokeWidth="0.6" />
              </>
            )}
          </g>
        ) : (
        <g>
          <path d="M32 76 L68 76 L71 100 L53 100 L50 86 L47 100 L29 100 Z" fill={`url(#pants-${uid})`} stroke="#0d1b15" strokeWidth="1.2" />
          {config.pants === 'shorts' && (
            <>
              <path d="M30 93 L48 93 L47 100 L29 100 Z" fill={skin.skin} />
              <path d="M52 93 L70 93 L71 100 L53 100 Z" fill={skin.skin} />
            </>
          )}
          {config.pants === 'jeans' && (
            <path d="M40 79 Q36 84 33 82 M60 79 Q64 84 67 82" fill="none" stroke={PANTS_PALETTE.jeans.stripe1} strokeWidth="0.9" />
          )}
          <rect x="31" y="73" width="38" height="4.5" rx="1.5" fill="#2c1a11" />
          <rect x="46" y="72.5" width="8" height="5.5" rx="1" fill="#c5a059" stroke="#141a17" strokeWidth="0.8" />
        </g>
        )}

        <PortraitTorso config={config} />

        {isHappy && (
          <g>
            <path d="M27 60 C17 52, 15 38, 20 28" fill="none" stroke={tops.sleeve} strokeWidth="7" strokeLinecap="round" />
            <circle cx="20" cy="27" r="4" fill={skin.skin} />
            <rect x="12" y="13" width="10" height="13" rx="1.5" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.2" />
            <rect x="11.5" y="11" width="11" height="4" rx="2" fill="#ffffff" />
          </g>
        )}

        {pose === 'cry' && (
          <g>
            <circle cx="33" cy="45" r="4" fill={skin.skin} stroke="#141a17" strokeWidth="0.8" />
            <circle cx="67" cy="45" r="4" fill={skin.skin} stroke="#141a17" strokeWidth="0.8" />
          </g>
        )}

        <g transform="translate(50 35)">
          <AvatarHead config={config} expression={poseToExpression(pose)} strokeWidth={1.2} />
        </g>

        {pose === 'sweat' && <path d="M64 25 C64 25, 67 30, 65.5 32.5 C64 34, 62 32.5, 62.5 30 Z" fill="#38bdf8" />}
        {(pose === 'cry' || pose === 'disaster') && (
          <>
            <path d="M41 37 Q39 43 41 46" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M59 37 Q61 43 59 46" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );

  if (!winStarTier(wins)) return avatar;
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {avatar}
      <span className="pointer-events-none absolute -right-1 -top-1">
        <WinStar wins={wins} px={STAR_PX[size]} />
      </span>
    </span>
  );
};

// ---------------------------------------------------------------------------
// Avatarredigeraren
// ---------------------------------------------------------------------------

interface AvatarCustomizerProps {
  value: string;
  onChange: (newSeed: string) => void;
  displayName?: string;
  /** Statistik som låser upp gear och vissa kläder. */
  unlockStats?: GearUnlockStats | null;
}

const BODY_OPTIONS: { id: AvatarBody; label: string }[] = [
  { id: 'male', label: 'Man' },
  { id: 'female', label: 'Kvinna' },
];

const COLOR_OPTIONS = (Object.keys(COLOR_PALETTE) as JacketTheme[]).map((id) => ({
  id,
  label: COLOR_PALETTE[id].label,
  swatch: COLOR_PALETTE[id].primary,
}));

const TOP_LABELS: Record<TopStyle, string> = {
  jacket: 'Klubbkavaj',
  polo: 'Piké',
  sweater: 'Pullover',
  whitepike: 'Vit tourpiké',
  none: 'Ingen tröja',
  dress: 'Golfklänning',
  ladypolo: 'Dampiké',
  cardigan: 'Kofta',
  sportstop: 'Sporttopp',
};

const HAT_LABELS: Record<HatStyle, string> = {
  flatcap: 'Tweedkeps',
  cap: 'Keps',
  visor: 'Solskärm',
  bucket: 'Bucket hat',
  beanie: 'Toppluva',
  cowboy: 'Cowboyhatt',
  santa: 'Tomteluva',
  none: 'Ingen',
  sunhat: 'Solhatt',
  beret: 'Basker',
  headband: 'Pannband',
};

const HAIRSTYLE_LABELS: Record<HairStyle, string> = {
  short: 'Kort',
  long: 'Långt',
  ponytail: 'Hästsvans',
  bun: 'Knut',
  bob: 'Page',
  braids: 'Flätor',
};

const EARRING_OPTIONS: { id: Earrings; label: string }[] = [
  { id: 'none', label: 'Inga' },
  { id: 'pearls', label: 'Pärlor' },
  { id: 'hoops', label: 'Ringar' },
];
const SKIN_OPTIONS = (Object.keys(SKIN_PALETTE) as SkinTone[]).map((id) => ({ id, label: SKIN_PALETTE[id].label, swatch: SKIN_PALETTE[id].skin }));
const HAIR_OPTIONS = (Object.keys(HAIR_PALETTE) as HairColor[]).map((id) => ({ id, label: HAIR_PALETTE[id].label, swatch: HAIR_PALETTE[id].color }));
const EYE_OPTIONS: { id: EyeStyle; label: string }[] = [
  { id: 'none', label: 'Inga' },
  { id: 'sunglasses', label: 'Solglasögon' },
  { id: 'glasses', label: 'Glasögon' },
];
const FACIAL_HAIR_OPTIONS: { id: FacialHair; label: string }[] = [
  { id: 'clean', label: 'Slätrakad' },
  { id: 'stubble', label: 'Skäggstubb' },
  { id: 'mustache', label: 'Mustasch' },
  { id: 'beard', label: 'Helskägg' },
];
const MOUTH_OPTIONS: { id: MouthItem; label: string }[] = [
  { id: 'none', label: 'Inget' },
  { id: 'cigar', label: 'Cigarr' },
];

const chipClass = (active: boolean, locked = false) =>
  `flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition sm:py-1.5 ${
    active
      ? 'border-[#c5a059] bg-[#0b2b1e] text-[#f4efe4] shadow-xs'
      : locked
      ? 'cursor-not-allowed border-dashed border-[#d8d0c0] bg-[#efeae0] text-[#141a17]/45'
      : 'cursor-pointer border-[#d8d0c0] bg-white text-[#141a17] hover:border-[#0b2b1e]'
  }`;

const Section: React.FC<{ title: string; extra?: React.ReactNode; children: React.ReactNode }> = ({ title, extra, children }) => (
  <div>
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#54635b]">{title}</label>
      {extra}
    </div>
    {children}
  </div>
);

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({ value, onChange, displayName = 'Din golfare', unlockStats }) => {
  const current = parseAvatarSeed(value);
  const stats = unlockStats || EMPTY_UNLOCK_STATS;
  const unlockedGear = GEAR_CATALOG.filter((g) => isGearUnlocked(g.id, stats)).length;

  const update = (patch: Partial<AvatarConfig>) => onChange(serializeAvatarConfig({ ...current, ...patch }));
  const female = current.body === 'female';
  const wardrobe = AVATAR_WARDROBE[current.body];

  return (
    <div data-testid="avatar-customizer" className="space-y-4 rounded-xl border border-[#d8d0c0] bg-[#f9f6f0] p-4">
      <div className="flex flex-col items-center gap-4 border-b border-[#e5dec9] pb-3 sm:flex-row">
        <div className="flex gap-2">
          <GolferAvatar avatarSeed={value} displayName={displayName} size="lg" pose="idle" wins={stats.wins} />
          <GolferAvatar avatarSeed={value} displayName={displayName} size="lg" pose="celebrate" />
        </div>
        <div className="text-center sm:text-left">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#856a32]">Spelarklädsel</div>
          <h4 className="font-serif text-lg font-bold text-[#141a17]">Bygg din pubgolf-avatar</h4>
          <p className="mt-0.5 text-xs text-[#54635b]">Kombinera fritt. Vissa saker låses upp när du spelar.</p>
        </div>
      </div>

      <Section title="Kön">
        <div className="grid grid-cols-2 gap-1.5">
          {BODY_OPTIONS.map((opt) => (
            <button key={opt.id} type="button" data-testid={`avatar-body-${opt.id}`}
              onClick={() => onChange(serializeAvatarConfig(switchAvatarBody(current, opt.id)))}
              className={chipClass(current.body === opt.id)}>
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Färg">
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {COLOR_OPTIONS.map((opt) => (
            <button key={opt.id} type="button" title={opt.label} aria-label={opt.label} data-testid={`avatar-jacket-${opt.id}`}
              onClick={() => update({ jacket: opt.id })} className={chipClass(current.jacket === opt.id)}>
              <span className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: opt.swatch }} />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Överdel">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {wardrobe.tops.map((id) => {
            const opt = { id, label: TOP_LABELS[id] };
            const unlocked = isTopUnlocked(opt.id, stats);
            const rule = TOP_UNLOCKS[opt.id];
            return (
              <button key={opt.id} type="button" disabled={!unlocked} data-testid={`avatar-top-${opt.id}`}
                title={unlocked ? opt.label : `Låses upp: ${rule?.requirement}`}
                onClick={() => update({ top: opt.id })} className={`${chipClass(current.top === opt.id, !unlocked)} flex-col`}>
                <span className="flex items-center gap-1">
                  {!unlocked && <Lock className="h-3 w-3" />}
                  {opt.label}
                </span>
                {!unlocked && rule && <span className="text-[10px] font-medium leading-tight">{rule.requirement}</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {!(female && current.top === 'dress') && (
        <Section title={female ? 'Kjol & byxor' : 'Byxor'}>
          <div className={`grid grid-cols-3 gap-1.5 ${female ? 'sm:grid-cols-5' : 'sm:grid-cols-7'}`}>
            {wardrobe.bottoms.map((id) => (
              <button key={id} type="button" data-testid={`avatar-pants-${id}`}
                onClick={() => update({ pants: id })} className={chipClass(current.pants === id)}>
                {PANTS_PALETTE[id].label}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Huvudbonad">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {wardrobe.hats.map((id) => (
            <button key={id} type="button" data-testid={`avatar-hat-${id}`}
              onClick={() => update({ hat: id })} className={chipClass(current.hat === id)}>
              {HAT_LABELS[id]}
            </button>
          ))}
        </div>
      </Section>

      {female && (
        <Section title="Frisyr">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {wardrobe.hairStyles.map((id) => (
              <button key={id} type="button" data-testid={`avatar-hairstyle-${id}`}
                onClick={() => update({ hairStyle: id })} className={chipClass(current.hairStyle === id)}>
                {HAIRSTYLE_LABELS[id]}
              </button>
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Hårfärg">
          <div className="grid grid-cols-5 gap-1.5">
            {HAIR_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" title={opt.label} aria-label={opt.label}
                onClick={() => update({ hair: opt.id })} className={chipClass(current.hair === opt.id)}>
                <span className="h-4 w-4 rounded-full border border-black/20" style={{ backgroundColor: opt.swatch }} />
              </button>
            ))}
          </div>
        </Section>
        <Section title="Hudton">
          <div className="grid grid-cols-4 gap-1.5">
            {SKIN_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" title={opt.label} aria-label={opt.label} data-testid={`avatar-skin-${opt.id}`}
                onClick={() => update({ skin: opt.id })} className={chipClass(current.skin === opt.id)}>
                <span className="h-4 w-4 rounded-full border border-black/20" style={{ backgroundColor: opt.swatch }} />
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Section title="Ögon">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-1">
            {EYE_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" onClick={() => update({ eyes: opt.id })} className={chipClass(current.eyes === opt.id)}>
                {opt.label}
              </button>
            ))}
          </div>
        </Section>
        {female ? (
          <Section title="Örhängen">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-1">
              {EARRING_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" onClick={() => update({ earrings: opt.id })} className={chipClass(current.earrings === opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>
        ) : (
          <Section title="Skägg">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1">
              {FACIAL_HAIR_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" onClick={() => update({ facialHair: opt.id })} className={chipClass(current.facialHair === opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>
        )}
        <Section title="I munnen">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1">
            {MOUTH_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" onClick={() => update({ mouth: opt.id })} className={chipClass(current.mouth === opt.id)}>
                {opt.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Gear" extra={<span className="text-[11px] font-semibold text-[#856a32]">{unlockedGear}/{GEAR_CATALOG.length} upplåsta</span>}>
        <div className="grid grid-cols-1 gap-1.5 min-[400px]:grid-cols-2">
          {GEAR_CATALOG.map((opt) => {
            const active = current.gear === opt.id;
            const unlocked = isGearUnlocked(opt.id, stats);
            const [have, goal] = opt.progress(stats);
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`avatar-gear-${opt.id}`}
                disabled={!unlocked}
                onClick={() => update({ gear: opt.id, ballCount: opt.id === 'ball' ? stats.careerHoleInOnes : current.ballCount })}
                title={unlocked ? opt.label : `Låses upp: ${opt.requirement}`}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs font-semibold transition ${
                  active
                    ? 'border-[#c5a059] bg-[#0b2b1e] text-[#f4efe4]'
                    : unlocked
                    ? 'cursor-pointer border-[#d8d0c0] bg-white text-[#141a17] hover:border-[#0b2b1e]'
                    : 'cursor-not-allowed border-dashed border-[#d8d0c0] bg-[#efeae0] text-[#141a17]/45'
                }`}
              >
                <svg viewBox="-16 -24 60 78" className={`h-10 w-10 shrink-0 rounded-md ${active ? 'bg-white/10' : 'bg-[#0b2b1e]/90'} ${unlocked ? '' : 'opacity-40 grayscale'}`} aria-hidden="true">
                  <SwingGear gear={opt.id} ballCount={Math.max(1, stats.careerHoleInOnes)} />
                </svg>
                <span className="min-w-0">
                  <span className="flex items-center gap-1">
                    {!unlocked && <Lock className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {!unlocked && (
                    <span className="block text-[11px] font-medium leading-tight">
                      {opt.requirement} ({Math.min(have, goal)}/{goal})
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
};
