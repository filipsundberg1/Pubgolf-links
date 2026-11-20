import React, { useId } from 'react';
import {
  parseAvatarSeed,
  serializeAvatarConfig,
  type AvatarAnimationPose,
  type AvatarConfig,
  type FaceAccessory,
  type HatStyle,
  type JacketTheme,
  type PantsStyle,
  type SkinTone,
} from '../utils/golfRules';

interface GolferAvatarProps {
  avatarSeed?: string;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  pose?: AvatarAnimationPose;
  className?: string;
}

const JACKET_COLORS: Record<
  JacketTheme,
  { primary: string; lapel: string; accent: string; bgGlow: string; label: string }
> = {
  emerald: {
    primary: '#0b2b1e',
    lapel: '#071c13',
    accent: '#c5a059',
    bgGlow: '#174834',
    label: 'Masters Racing Green',
  },
  gold: {
    primary: '#7a591b',
    lapel: '#543c10',
    accent: '#f4d186',
    bgGlow: '#916b22',
    label: 'Claret Jug Gold',
  },
  navy: {
    primary: '#162844',
    lapel: '#0d192b',
    accent: '#93c5fd',
    bgGlow: '#1e3a63',
    label: 'St Andrews Midnight',
  },
  burgundy: {
    primary: '#4a1823',
    lapel: '#300d15',
    accent: '#fda4af',
    bgGlow: '#63202f',
    label: 'Royal Clubhouse Claret',
  },
  slate: {
    primary: '#222b2e',
    lapel: '#141a1c',
    accent: '#cbd5e1',
    bgGlow: '#334147',
    label: 'Nordic Links Slate',
  },
};

const PANTS_COLORS: Record<
  PantsStyle,
  { base: string; stripe1: string; stripe2: string; label: string }
> = {
  plaid: {
    base: '#1e4631',
    stripe1: '#c5a059',
    stripe2: '#991b1b',
    label: 'Tartan Skotskrutiga',
  },
  chino: {
    base: '#d6c5a5',
    stripe1: '#bfa882',
    stripe2: '#d6c5a5',
    label: 'Klassiska Sand Chinos',
  },
  navy: {
    base: '#17253b',
    stripe1: '#283d5e',
    stripe2: '#17253b',
    label: 'Marinblå Tourbyxor',
  },
  loud: {
    base: '#db2777',
    stripe1: '#facc15',
    stripe2: '#ffffff',
    label: 'John Daly Argyle Rosa',
  },
  corduroy: {
    base: '#5c3a21',
    stripe1: '#422815',
    stripe2: '#734a2b',
    label: 'Brun Manchester',
  },
};

const SKIN_COLORS: Record<SkinTone, { skin: string; cheek: string; ear: string; label: string }> = {
  light: {
    skin: '#fde2c8',
    cheek: '#f5b59c',
    ear: '#f3c6a3',
    label: 'Ljus',
  },
  warm: {
    skin: '#eab688',
    cheek: '#d99164',
    ear: '#d89f70',
    label: 'Solbränd Links',
  },
  medium: {
    skin: '#c68652',
    cheek: '#ab6938',
    ear: '#b07240',
    label: 'Oliv / Medium',
  },
  deep: {
    skin: '#7c4b2b',
    cheek: '#63371c',
    ear: '#693c20',
    label: 'Mörk',
  },
};

export const HAT_LABELS: Record<HatStyle, string> = {
  flatcap: 'Skotsk Tweedkeps',
  visor: 'PGA Tour Solskärm',
  cap: 'Klassisk Golfkeps',
  bucket: '90-tals Bucket Hat',
  beanie: 'December-Toppluva',
  none: 'Barhuvad (Vind i håret)',
};

export const ACCESSORY_LABELS: Record<FaceAccessory, string> = {
  clean: 'Slätrakad Tour-look',
  mustache: 'Mustasch',
  beard: 'Hel-skägg',
  sunglasses: 'Snabba Solbrillor',
  cigar: 'Segercigarr',
};

const SIZE_CLASSES: Record<NonNullable<GolferAvatarProps['size']>, string> = {
  xs: 'w-8 h-8',
  sm: 'w-11 h-11',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
  xl: 'w-36 h-36',
};

export const GolferAvatar: React.FC<GolferAvatarProps> = ({
  avatarSeed = 'emerald',
  displayName = 'Spelare',
  size = 'md',
  pose = 'idle',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const config = parseAvatarSeed(avatarSeed);
  const jacket = JACKET_COLORS[config.jacket] || JACKET_COLORS.emerald;
  const pants = PANTS_COLORS[config.pants] || PANTS_COLORS.plaid;
  const skin = SKIN_COLORS[config.skin] || SKIN_COLORS.warm;

  const isHappy = pose === 'victory' || pose === 'celebrate';
  const isSad = pose === 'sweat' || pose === 'cry' || pose === 'disaster';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden select-none border-2 shadow-sm ${SIZE_CLASSES[size]} ${className}`}
      style={{
        borderColor: jacket.accent,
        backgroundColor: jacket.bgGlow,
      }}
      title={`${displayName} (${jacket.label}, ${HAT_LABELS[config.hat]}, ${PANTS_COLORS[config.pants].label})`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        aria-label={`Golfavatar för ${displayName}`}
      >
        <defs>
          <pattern
            id={`pants-${uid}`}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <rect width="10" height="10" fill={pants.base} />
            {config.pants === 'plaid' && (
              <>
                <line x1="0" y1="5" x2="10" y2="5" stroke={pants.stripe1} strokeWidth="1.5" />
                <line x1="5" y1="0" x2="5" y2="10" stroke={pants.stripe2} strokeWidth="1.5" />
              </>
            )}
            {config.pants === 'loud' && (
              <polygon points="5,0 10,5 5,10 0,5" fill={pants.stripe1} opacity="0.75" />
            )}
            {config.pants === 'corduroy' && (
              <>
                <line x1="2" y1="0" x2="2" y2="10" stroke={pants.stripe1} strokeWidth="1" />
                <line x1="6" y1="0" x2="6" y2="10" stroke={pants.stripe2} strokeWidth="1" />
              </>
            )}
          </pattern>
        </defs>

        {/* Background subtle fairway horizon */}
        <circle cx="50" cy="50" r="50" fill={jacket.bgGlow} />
        <ellipse cx="50" cy="94" rx="46" ry="18" fill="#103826" opacity="0.65" />

        {/* Disaster raincloud effect inside avatar */}
        {pose === 'disaster' && (
          <g opacity="0.85">
            <line x1="22" y1="10" x2="18" y2="24" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="78" y1="12" x2="74" y2="26" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" />
            <polygon points="50,4 45,14 51,14 47,23 56,11 50,11" fill="#facc15" />
          </g>
        )}

        {/* Golf club behind torso (intact or snapped on disaster!) */}
        {pose === 'disaster' ? (
          <g>
            <line x1="16" y1="45" x2="35" y2="62" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="78" y1="42" x2="64" y2="60" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="15" cy="43" rx="5" ry="3" fill="#94a3b8" transform="rotate(-25 15 43)" />
          </g>
        ) : (
          <g>
            <line x1="20" y1="24" x2="76" y2="85" stroke="#cbd5e1" strokeWidth="2.4" strokeLinecap="round" />
            <ellipse cx="19" cy="22" rx="6" ry="3.4" fill="#e2e8f0" transform="rotate(-35 19 22)" />
          </g>
        )}

        {/* GOLF TROUSERS / LEGS (Visible at bottom) */}
        <g>
          {/* Left & Right trouser legs */}
          <path
            d="M32 76 L68 76 L71 100 L53 100 L50 86 L47 100 L29 100 Z"
            fill={`url(#pants-${uid})`}
            stroke="#0d1b15"
            strokeWidth="1.2"
          />
          {/* Leather belt & golden buckle */}
          <rect x="31" y="73" width="38" height="4.5" rx="1.5" fill="#2c1a11" />
          <rect x="46" y="72.5" width="8" height="5.5" rx="1" fill="#c5a059" stroke="#141a17" strokeWidth="0.8" />
        </g>

        {/* CLUB JACKET & POLO SHIRT */}
        <g>
          {/* Jacket body */}
          <path
            d="M24 75 C24 56, 33 50, 50 50 C67 50, 76 56, 76 75 Z"
            fill={jacket.primary}
            stroke="#0a1410"
            strokeWidth="1.4"
          />
          {/* White polo shirt & collar V-neck */}
          <polygon points="41,50 59,50 50,67" fill="#f9f6f0" />
          {/* Tie / cravat */}
          <polygon points="48.5,54 51.5,54 52.5,65 50,68 47.5,65" fill={jacket.accent} />
          {/* Jacket lapels */}
          <polygon points="39,50 50,67 34,63" fill={jacket.lapel} />
          <polygon points="61,50 50,67 66,63" fill={jacket.lapel} />
          {/* Golden Club Crest on breast pocket */}
          <circle cx="61" cy="64" r="3.6" fill={jacket.accent} opacity="0.92" />
          <path d="M59.5 64 L62.5 64 M61 62.5 L61 65.5" stroke={jacket.primary} strokeWidth="1" />
        </g>

        {/* ARMS / CELEBRATION OR BOGEY GESTURES */}
        {isHappy && (
          <g>
            {/* Raised left arm holding a foamy pint glass! */}
            <path
              d="M27 60 C17 52, 15 38, 20 28"
              fill="none"
              stroke={jacket.primary}
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="20" cy="27" r="4" fill={skin.skin} />
            {/* Pint glass */}
            <rect x="12" y="13" width="10" height="13" rx="1.5" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.2" />
            <rect x="11.5" y="11" width="11" height="4" rx="2" fill="#ffffff" />
          </g>
        )}

        {pose === 'cry' && (
          <g>
            {/* Hands on cheeks in disbelief */}
            <circle cx="33" cy="45" r="4" fill={skin.skin} stroke="#141a17" strokeWidth="0.8" />
            <circle cx="67" cy="45" r="4" fill={skin.skin} stroke="#141a17" strokeWidth="0.8" />
          </g>
        )}

        {/* NECK & HEAD */}
        <g>
          <rect x="44" y="44" width="12" height="9" rx="3" fill={skin.ear} />
          {/* Ears */}
          <circle cx="33" cy="36" r="3.8" fill={skin.ear} />
          <circle cx="67" cy="36" r="3.8" fill={skin.ear} />
          {/* Face oval */}
          <ellipse
            cx="50"
            cy="35"
            rx="16.5"
            ry="17.5"
            fill={skin.skin}
            stroke="#1b1917"
            strokeWidth="1.2"
          />
          {/* Rosy pub cheeks */}
          <circle cx="39" cy="39" r="3" fill={skin.cheek} opacity="0.55" />
          <circle cx="61" cy="39" r="3" fill={skin.cheek} opacity="0.55" />
        </g>

        {/* EYES & EYEBROWS */}
        {config.accessory === 'sunglasses' ? (
          <g>
            {/* Aviator / Tour shades */}
            <line x1="34" y1="32" x2="66" y2="32" stroke="#c5a059" strokeWidth="1.8" />
            <rect x="36" y="30" width="12" height="7.5" rx="2" fill="#0f172a" stroke="#c5a059" strokeWidth="1.3" />
            <rect x="52" y="30" width="12" height="7.5" rx="2" fill="#0f172a" stroke="#c5a059" strokeWidth="1.3" />
            <line x1="38" y1="32" x2="42" y2="36" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
            <line x1="54" y1="32" x2="58" y2="36" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
          </g>
        ) : (
          <g>
            {pose === 'disaster' ? (
              <>
                {/* Dizzy X eyes for triple bogey+ */}
                <path d="M40 31 L45 36 M45 31 L40 36" stroke="#1b1917" strokeWidth="2" strokeLinecap="round" />
                <path d="M55 31 L60 36 M60 31 L55 36" stroke="#1b1917" strokeWidth="2" strokeLinecap="round" />
              </>
            ) : isHappy ? (
              <>
                {/* Happy squinting arcs */}
                <path d="M39 34 Q42.5 30 46 34" fill="none" stroke="#1b1917" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M54 34 Q57.5 30 61 34" fill="none" stroke="#1b1917" strokeWidth="2.2" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="42.5" cy="33.5" r="2.1" fill="#1b1917" />
                <circle cx="57.5" cy="33.5" r="2.1" fill="#1b1917" />
                <circle cx="43.2" cy="32.8" r="0.7" fill="#ffffff" />
                <circle cx="58.2" cy="32.8" r="0.7" fill="#ffffff" />
              </>
            )}

            {/* Eyebrows */}
            {isSad ? (
              <>
                <line x1="38" y1="29.5" x2="46" y2="27.5" stroke="#3b2618" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="54" y1="27.5" x2="62" y2="29.5" stroke="#3b2618" strokeWidth="1.8" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="38" y1="28.5" x2="46" y2="28" stroke="#3b2618" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="54" y1="28" x2="62" y2="28.5" stroke="#3b2618" strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
          </g>
        )}

        {/* Sweat drop or tears on Bogey / Double Bogey */}
        {pose === 'sweat' && (
          <path
            d="M64 25 C64 25, 67 30, 65.5 32.5 C64 34, 62 32.5, 62.5 30 Z"
            fill="#38bdf8"
          />
        )}
        {(pose === 'cry' || pose === 'disaster') && (
          <>
            <path d="M41 37 Q39 43 41 46" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M59 37 Q61 43 59 46" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}

        {/* Nose */}
        <path d="M50 33 L48.5 38.5 L51.5 38.5" fill="none" stroke="#8c583a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />

        {/* FACIAL HAIR / BEARD / MUSTACHE */}
        {config.accessory === 'beard' && (
          <path
            d="M34.5 38 C34.5 50, 42 54, 50 54 C58 54, 65.5 50, 65.5 38 C63 41, 57 42.5, 50 42.5 C43 42.5, 37 41, 34.5 38 Z"
            fill="#3b2313"
          />
        )}

        {/* MOUTH EXPRESSION */}
        {isHappy ? (
          <path
            d="M42 42.5 Q50 49.5 58 42.5 Z"
            fill="#ffffff"
            stroke="#1b1917"
            strokeWidth="1.3"
          />
        ) : isSad ? (
          <path
            d="M43 46.5 Q50 41 57 46.5"
            fill="none"
            stroke="#1b1917"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M44 43.5 Q50 46.5 56 43.5"
            fill="none"
            stroke="#1b1917"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}

        {config.accessory === 'mustache' && (
          <path
            d="M40 42.5 C43 39.5, 48 40.5, 50 42 C52 40.5, 57 39.5, 60 42.5 C57 44, 52 43.5, 50 42.8 C48 43.5, 43 44, 40 42.5 Z"
            fill="#3b2313"
          />
        )}

        {config.accessory === 'cigar' && (
          <g>
            <rect x="52" y="43" width="14" height="3.6" rx="1.5" fill="#78350f" stroke="#1b1917" strokeWidth="0.8" transform="rotate(8 52 43)" />
            <rect x="63" y="44" width="3" height="3.4" fill="#ef4444" transform="rotate(8 63 44)" />
            <circle cx="69" cy="40" r="2.2" fill="#cbd5e1" opacity="0.7" />
            <circle cx="72" cy="36" r="3" fill="#cbd5e1" opacity="0.5" />
          </g>
        )}

        {/* HEADWEAR / HAT */}
        {config.hat === 'flatcap' && (
          <g>
            {/* Classic St Andrews Tweed Flatcap */}
            <path
              d="M31 24 C31 13, 68 12, 68 24 Z"
              fill="#57534e"
              stroke="#1c1917"
              strokeWidth="1.3"
            />
            <path
              d="M28 24 Q50 20 73 25 Q52 27 28 24 Z"
              fill="#44403c"
              stroke="#1c1917"
              strokeWidth="1.2"
            />
            <circle cx="49" cy="14" r="2" fill="#c5a059" />
          </g>
        )}

        {config.hat === 'cap' && (
          <g>
            {/* Pro Tour Baseball Cap */}
            <path
              d="M33 25 C33 12, 67 12, 67 25 Z"
              fill={jacket.primary}
              stroke="#0a1410"
              strokeWidth="1.3"
            />
            <path
              d="M31 24 Q52 21 75 26 Q55 28 31 24 Z"
              fill={jacket.accent}
              stroke="#0a1410"
              strokeWidth="1"
            />
            <circle cx="50" cy="19" r="3" fill="#ffffff" opacity="0.9" />
          </g>
        )}

        {config.hat === 'visor' && (
          <g>
            {/* Hair puff on top + Tour Visor */}
            <path d="M36 21 C40 12, 60 12, 64 21 Z" fill="#452715" />
            <path d="M32 21 L68 21 L69 25 L31 25 Z" fill="#f9f6f0" stroke="#141a17" strokeWidth="1.2" />
            <path d="M31 24 Q52 22 74 26 Q52 28 31 24 Z" fill={jacket.accent} stroke="#141a17" strokeWidth="1" />
          </g>
        )}

        {config.hat === 'bucket' && (
          <g>
            {/* 90s Bucket Hat */}
            <path d="M36 14 L64 14 L68 24 L32 24 Z" fill="#eab308" stroke="#141a17" strokeWidth="1.2" />
            <rect x="34" y="20" width="32" height="3" fill={jacket.primary} />
            <path d="M26 24 Q50 21 74 24 Q77 28 70 28 Q50 25 30 28 Q23 28 26 24 Z" fill="#facc15" stroke="#141a17" strokeWidth="1.2" />
          </g>
        )}

        {config.hat === 'beanie' && (
          <g>
            {/* December Pom-Pom Winter Golf Beanie */}
            <circle cx="50" cy="9" r="4.5" fill="#f9f6f0" stroke="#141a17" strokeWidth="1" />
            <path d="M33 24 C34 12, 66 12, 67 24 Z" fill="#991b1b" stroke="#141a17" strokeWidth="1.2" />
            <rect x="32" y="21" width="36" height="5" rx="2" fill="#f9f6f0" stroke="#141a17" strokeWidth="1.1" />
          </g>
        )}

        {config.hat === 'none' && (
          <g>
            {/* Classic side-parted hair */}
            <path
              d="M33 27 C32 15, 45 13, 55 14 C64 15, 68 19, 67 27 C62 21, 53 20, 44 21 C38 22, 35 24, 33 27 Z"
              fill="#3b2313"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

interface AvatarCustomizerProps {
  value: string;
  onChange: (newSeed: string) => void;
  displayName?: string;
}

const JACKET_OPTIONS: { id: JacketTheme; label: string; swatch: string }[] = [
  { id: 'emerald', label: 'Masters Grön', swatch: '#0b2b1e' },
  { id: 'gold', label: 'Claret Guld', swatch: '#7a591b' },
  { id: 'navy', label: 'St Andrews Blå', swatch: '#162844' },
  { id: 'burgundy', label: 'Royal Vinröd', swatch: '#4a1823' },
  { id: 'slate', label: 'Links Skiffer', swatch: '#222b2e' },
];

const HAT_OPTIONS: { id: HatStyle; label: string }[] = [
  { id: 'flatcap', label: 'Tweedkeps' },
  { id: 'cap', label: 'Tourkeps' },
  { id: 'visor', label: 'Solskärm' },
  { id: 'bucket', label: 'Bucket Hat' },
  { id: 'beanie', label: 'Toppluva' },
  { id: 'none', label: 'Barhuvad' },
];

const PANTS_OPTIONS: { id: PantsStyle; label: string }[] = [
  { id: 'plaid', label: 'Skotskrutiga' },
  { id: 'chino', label: 'Sand Chinos' },
  { id: 'navy', label: 'Marinblå' },
  { id: 'loud', label: 'Rosa Argyle' },
  { id: 'corduroy', label: 'Manchester' },
];

const SKIN_OPTIONS: { id: SkinTone; label: string; swatch: string }[] = [
  { id: 'light', label: 'Ljus', swatch: '#fde2c8' },
  { id: 'warm', label: 'Solbränd', swatch: '#eab688' },
  { id: 'medium', label: 'Medium', swatch: '#c68652' },
  { id: 'deep', label: 'Mörk', swatch: '#7c4b2b' },
];

const ACC_OPTIONS: { id: FaceAccessory; label: string }[] = [
  { id: 'clean', label: 'Slätrakad' },
  { id: 'mustache', label: 'Mustasch' },
  { id: 'beard', label: 'Skägg' },
  { id: 'sunglasses', label: 'Solbrillor' },
  { id: 'cigar', label: 'Segercigarr' },
];

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  value,
  onChange,
  displayName = 'Din Golfare',
}) => {
  const current = parseAvatarSeed(value);

  const updateField = <K extends keyof AvatarConfig>(key: K, val: AvatarConfig[K]) => {
    const next: AvatarConfig = {
      ...current,
      [key]: val,
    };
    onChange(serializeAvatarConfig(next));
  };

  return (
    <div
      data-testid="avatar-customizer"
      className="bg-[#f9f6f0] border border-[#d8d0c0] rounded-xl p-4 space-y-4"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 pb-3 border-b border-[#e5dec9]">
        <GolferAvatar avatarSeed={value} displayName={displayName} size="lg" pose="celebrate" />
        <div className="text-center sm:text-left">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[#856a32] font-bold">
            PGA Tour Avatar & Spelarklädsel
          </div>
          <h4 className="font-serif text-lg font-bold text-[#141a17]">
            Bygg din pubgolf-avatar
          </h4>
          <p className="text-xs text-[#54635b] mt-0.5">
            Välj klädsel och utseende för din spelare.
          </p>
        </div>
      </div>

      {/* 1. Klubbjackans Färgtema */}
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-[#54635b] font-semibold mb-1.5">
          1. Klubbjackans Färgtema
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {JACKET_OPTIONS.map((opt) => {
            const active = current.jacket === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`avatar-jacket-${opt.id}`}
                onClick={() => updateField('jacket', opt.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  active
                    ? 'bg-[#0b2b1e] text-[#f4efe4] border-[#c5a059] shadow-xs'
                    : 'bg-white text-[#141a17] border-[#d8d0c0] hover:border-[#0b2b1e]'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                  style={{ backgroundColor: opt.swatch }}
                />
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Keps / Huvudbonad */}
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-[#54635b] font-semibold mb-1.5">
          2. Keps & Huvudbonad
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
          {HAT_OPTIONS.map((opt) => {
            const active = current.hat === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`avatar-hat-${opt.id}`}
                onClick={() => updateField('hat', opt.id)}
                className={`px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  active
                    ? 'bg-[#0b2b1e] text-[#f4efe4] border-[#c5a059]'
                    : 'bg-white text-[#141a17] border-[#d8d0c0] hover:border-[#0b2b1e]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Golfbyxor */}
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-[#54635b] font-semibold mb-1.5">
          3. Golfbyxor
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {PANTS_OPTIONS.map((opt) => {
            const active = current.pants === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`avatar-pants-${opt.id}`}
                onClick={() => updateField('pants', opt.id)}
                className={`px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  active
                    ? 'bg-[#0b2b1e] text-[#f4efe4] border-[#c5a059]'
                    : 'bg-white text-[#141a17] border-[#d8d0c0] hover:border-[#0b2b1e]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Utseende & Ansiktsdetalj + Hudton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#54635b] font-semibold mb-1.5">
            4. Utseende & Detalj
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {ACC_OPTIONS.map((opt) => {
              const active = current.accessory === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`avatar-accessory-${opt.id}`}
                  onClick={() => updateField('accessory', opt.id)}
                  className={`px-2 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    active
                      ? 'bg-[#0b2b1e] text-[#f4efe4] border-[#c5a059]'
                      : 'bg-white text-[#141a17] border-[#d8d0c0] hover:border-[#0b2b1e]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#54635b] font-semibold mb-1.5">
            5. Hudton
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {SKIN_OPTIONS.map((opt) => {
              const active = current.skin === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`avatar-skin-${opt.id}`}
                  onClick={() => updateField('skin', opt.id)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    active
                      ? 'bg-[#0b2b1e] text-[#f4efe4] border-[#c5a059]'
                      : 'bg-white text-[#141a17] border-[#d8d0c0] hover:border-[#0b2b1e]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                    style={{ backgroundColor: opt.swatch }}
                  />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
