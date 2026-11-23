export type DrinkCategory =
  | 'stout'
  | 'lager'
  | 'ipa'
  | 'cider'
  | 'cocktail'
  | 'shot'
  | 'glögg'
  | 'alkoholfritt';

export type FairwayShape =
  | 'straight'
  | 'dogleg-left'
  | 'dogleg-right'
  | 'island-green'
  | 'double-dogleg';

export interface PubHole {
  holeNumber: number; // 1..9
  courseId: string;
  ownerId: string;
  pubName: string;
  pubAddress: string;
  drinkName: string;
  drinkType: DrinkCategory;
  volumeCl: number;
  par: number; // 1..6 (antal klunkar/svep för Par)
  lengthMeters: number; // visuell golfhålslängd i meter
  shape: FairwayShape;
  hazardTitle: string;
  hazardRule: string;
  caddieTip: string;
}

export type PubGolfGameMode = 'single' | 'brutal';

export interface PubCourse {
  courseId: string;
  appId: string;
  inviteCode: string;
  title: string;
  subtitle: string;
  city: string;
  eventDate: string;
  ownerId: string;
  ownerName: string;
  gameMode?: PubGolfGameMode;
  /** Öppen runda (syns under Spela, ingen kod krävs). Saknas = privat (kod). */
  isPublic?: boolean;
}

/**
 * En runda = ett faktiskt spelat tillfälle på en bana (mall).
 * Dokument-id är rundans kod (t.ex. PG-7KQ2MX) – bara den som har koden hittar rundan.
 */
export type RoundStatus = 'active' | 'deleted';

export interface PubRound {
  roundId: string;
  appId: string;
  courseId: string;
  courseTitle: string;
  city: string;
  eventDate: string;
  ownerId: string;
  ownerName: string;
  gameMode: PubGolfGameMode;
  memberIds: string[];
  locked: boolean;
  status: RoundStatus;
}

/** Rundan i samma form som en PubCourse, så leaderboard/statistik kan återanvändas. */
export function roundAsCourse(round: PubRound, course?: PubCourse | null): PubCourse {
  return {
    courseId: round.roundId,
    appId: round.appId,
    inviteCode: round.roundId,
    title: course?.title || round.courseTitle,
    subtitle: course?.subtitle || '',
    city: round.city,
    eventDate: round.eventDate,
    ownerId: round.ownerId,
    ownerName: round.ownerName,
    gameMode: round.gameMode,
    isPublic: course?.isPublic === true,
  };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Rundkod med 6 slumpade tecken (~1 miljard kombinationer). */
export function generateRoundCode(random: () => number = Math.random): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return `PG-${suffix}`;
}

export const ROUND_CODE_PATTERN = /^PG-[A-Z0-9]{4,8}$/;
export const PLAYER_CODE_PATTERN = /^[A-Z]{2}[0-9]{4}$/;

/** Spelar-ID: initialer + fyra siffror, t.ex. "Filip Sundberg" -> FS4821. */
export function generatePlayerCode(displayName: string, random: () => number = Math.random): string {
  const letters = (displayName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let initials =
    letters.length >= 2 ? letters[0][0] + letters[letters.length - 1][0] : (letters[0] || '').slice(0, 2);
  if (initials.length < 2) initials = (initials + 'PG').slice(0, 2);
  const digits = String(Math.floor(random() * 10000)).padStart(4, '0');
  return `${initials}${digits}`;
}

export function normalizePlayerCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}

export interface ReusablePlayerProfile {
  uid: string;
  appId: string;
  displayName: string;
  nickname: string;
  country: string;
  homePub: string;
  signatureDrink: string;
  favoriteClub: string;
  handicap: string;
  bio: string;
  avatarSeed: string;
  /** Spelar-ID som ägare använder för att lägga till spelare, t.ex. FS4821. */
  playerCode?: string;
}

export interface PlayerTourProfile extends ReusablePlayerProfile {
  /** För rundor: rundans id (kod). */
  courseId: string;
  /** false = spelaren har valt att rundan inte ska räknas i HCP. */
  countsForHcp?: boolean;
  /** true = ägaren raderade rundan och spelaren valde att spara sitt resultat. */
  keptResult?: boolean;
  teamId?: string;
  teamName?: string;
  sips: number[]; // length 9, 0 = ej spelat, >= 1 = antal klunkar/svep
  totalSips: number;
  totalToPar: number;
  thruHoles: number;
}

export type GolfScoreTermKey =
  | 'unplayed'
  | 'hole-in-one'
  | 'albatross'
  | 'eagle'
  | 'birdie'
  | 'par'
  | 'bogey'
  | 'double-bogey'
  | 'triple-bogey-plus';

export interface GolfScoreEvaluation {
  key: GolfScoreTermKey;
  svLabel: string;
  shortLabel: string;
  diff: number;
  diffFormatted: string;
  description: string;
  shapeStyle:
    | 'double-circle-gold'
    | 'double-circle'
    | 'single-circle'
    | 'none'
    | 'single-square'
    | 'double-square';
}

export const APP_ID = 'december-links';

export interface DrinkCatalogEntry {
  label: string;
  defaultCl: number;
  brands: string[];
}

/** Dryckestyper med märken för scrollmenyn när man skapar en runda. */
export const DRINK_CATALOG: Record<DrinkCategory, DrinkCatalogEntry> = {
  lager: {
    label: 'Öl – ljus lager',
    defaultCl: 40,
    brands: ['Norrlands Guld', 'Mariestads', 'Pripps Blå', 'Falcon', 'Staropramen', 'Carlsberg', 'Heineken', 'Sofiero', 'Spendrups'],
  },
  ipa: {
    label: 'Öl – IPA',
    defaultCl: 40,
    brands: ['BrewDog Punk IPA', 'Oppigårds Amarillo', 'Brutal IPA', 'Mikkeller', 'Omnipollo'],
  },
  stout: {
    label: 'Öl – stout/porter',
    defaultCl: 40,
    brands: ['Guinness', "Murphy's", 'Carnegie Porter', 'Brooklyn Black Chocolate Stout'],
  },
  cider: {
    label: 'Cider',
    defaultCl: 33,
    brands: ['Somersby', 'Briska', 'Kopparberg', 'Rekorderlig', 'Strongbow'],
  },
  cocktail: {
    label: 'Drink/cocktail',
    defaultCl: 25,
    brands: ['Gin & tonic', 'Mojito', 'Espresso martini', 'Aperol spritz', 'Moscow mule', 'Margarita'],
  },
  shot: {
    label: 'Shot',
    defaultCl: 4,
    brands: ['Jägermeister', 'Fernet Branca', 'Tequila', 'Minttu', 'Sambuca', 'Fireball'],
  },
  glögg: {
    label: 'Glögg',
    defaultCl: 15,
    brands: ['Blossa', 'Saturnus', 'Husets glögg'],
  },
  alkoholfritt: {
    label: 'Alkoholfritt',
    defaultCl: 33,
    brands: ['Alkoholfri öl', 'Coca-Cola', 'Sprite', 'Ramlösa', 'Loka'],
  },
};

export const GAME_MODE_LABELS: Record<PubGolfGameMode, { title: string; description: string }> = {
  single: { title: 'Slagspel', description: 'Var för sig – lägst antal klunkar vinner.' },
  brutal: { title: 'Lagspel', description: 'Lag om 2 som delas in när alla gått med – lagets klunkar räknas ihop.' },
};

/** Visar ett datum som "fre 27 nov 2026" om det är ISO (åååå-mm-dd), annars som det är. */
export function formatEventDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export const VALID_DRINK_TYPES: DrinkCategory[] = [
  'stout',
  'lager',
  'ipa',
  'cider',
  'cocktail',
  'shot',
  'glögg',
  'alkoholfritt',
];

export const VALID_SHAPES: FairwayShape[] = [
  'straight',
  'dogleg-left',
  'dogleg-right',
  'island-green',
  'double-dogleg',
];

/**
 * Generates a human-friendly uppercase invite code matching ^[A-Z0-9\-]+$ (e.g. PG-4829)
 */
export function generateInviteCode(seed?: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  const base = typeof seed === 'number' ? seed : Date.now() + Math.floor(Math.random() * 100000);
  let val = Math.abs(base);
  for (let i = 0; i < 4; i++) {
    suffix += chars[val % chars.length];
    val = Math.floor(val / chars.length) + (i + 1) * 7;
  }
  return `PG-${suffix}`;
}

/**
 * Creates 9 clean, unconfigured holes for a newly created round so the course creator
 * can define each pub, drink, and par from scratch.
 */
export function createBlankHolesForCourse(courseId: string, ownerId: string): PubHole[] {
  const defaultShapes: FairwayShape[] = [
    'straight',
    'dogleg-left',
    'island-green',
    'dogleg-right',
    'straight',
    'double-dogleg',
    'dogleg-left',
    'island-green',
    'straight',
  ];

  return Array.from({ length: 9 }, (_, idx) => {
    const holeNumber = idx + 1;
    return {
      holeNumber,
      courseId,
      ownerId,
      pubName: `Hål ${holeNumber} (Ange pub)`,
      pubAddress: 'Ange gatuadress',
      drinkName: 'Välj dryck i banguiden',
      drinkType: 'lager',
      volumeCl: 40,
      par: 4,
      lengthMeters: 350,
      shape: defaultShapes[idx] || 'straight',
      hazardTitle: 'Lokalt pubhinder',
      hazardRule: 'Ange lokal regel eller pliktslag för detta hål.',
      caddieTip: 'Klicka på Anpassa Hål för att bestämma pub, dryck och par.',
    };
  });
}

/**
 * Evaluates a hole score (klunkar/svep) relative to the hole's Par.
 */
export function evaluateGolfHoleScore(sips: number, par: number): GolfScoreEvaluation {
  if (!Number.isFinite(sips) || sips <= 0) {
    return {
      key: 'unplayed',
      svLabel: 'Ej spelat',
      shortLabel: '—',
      diff: 0,
      diffFormatted: '—',
      description: 'Inväntar utslag vid baren',
      shapeStyle: 'none',
    };
  }

  const diff = sips - par;
  const diffFormatted = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;

  if (sips === 1) {
    return {
      key: 'hole-in-one',
      svLabel: 'Hole-in-One (Svep!)',
      shortLabel: 'ACE',
      diff,
      diffFormatted,
      description:
        par > 1 ? 'Hela glaset i ett enda legendariskt svep!' : 'Spikrakt utslag enligt par 1!',
      shapeStyle: 'double-circle-gold',
    };
  }

  if (diff <= -3) {
    return {
      key: 'albatross',
      svLabel: 'Albatross',
      shortLabel: 'ALB',
      diff,
      diffFormatted,
      description: 'Tre klunkar under par — extremt sällsynt tourprestation!',
      shapeStyle: 'double-circle-gold',
    };
  }

  if (diff === -2) {
    return {
      key: 'eagle',
      svLabel: 'Eagle',
      shortLabel: 'EAG',
      diff,
      diffFormatted,
      description: 'Två klunkar under par — kraftfullt utslag!',
      shapeStyle: 'double-circle',
    };
  }

  if (diff === -1) {
    return {
      key: 'birdie',
      svLabel: 'Birdie',
      shortLabel: 'BIR',
      diff,
      diffFormatted,
      description: 'En klunk under par — kirurgisk klunkprecision!',
      shapeStyle: 'single-circle',
    };
  }

  if (diff === 0) {
    return {
      key: 'par',
      svLabel: 'Par',
      shortLabel: 'PAR',
      diff: 0,
      diffFormatted: 'E',
      description: 'Stabilt tourtempo exakt på banans par.',
      shapeStyle: 'none',
    };
  }

  if (diff === 1) {
    return {
      key: 'bogey',
      svLabel: 'Bogey',
      shortLabel: 'BOG',
      diff: 1,
      diffFormatted: '+1',
      description: 'En klunk över par — hamnade lätt i semiruffen.',
      shapeStyle: 'single-square',
    };
  }

  if (diff === 2) {
    return {
      key: 'double-bogey',
      svLabel: 'Dubbelbogey',
      shortLabel: 'DBOG',
      diff,
      diffFormatted,
      description: 'Två klunkar över par — besök i bunker vid bardisken.',
      shapeStyle: 'double-square',
    };
  }

  return {
    key: 'triple-bogey-plus',
    svLabel: diff === 3 ? 'Trippelbogey' : `+${diff} Över Par`,
    shortLabel: `+${diff}`,
    diff,
    diffFormatted,
    description: 'Tungt vattenhinder på hålet — rädda scorekortet på nästa tee!',
    shapeStyle: 'double-square',
  };
}

export interface RoundSummary {
  totalSips: number;
  totalParPlayed: number;
  totalCoursePar: number;
  totalToPar: number;
  toParFormatted: string;
  thruHoles: number;
  frontFiveSips: number;
  frontFivePar: number;
  backFourSips: number;
  backFourPar: number;
  acesAndAlbatrosses: number;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeysOrWorse: number;
  sipPrecisionPct: number;
  underParStreak: number;
}

export function calculateRoundSummary(sips: number[], holes: PubHole[]): RoundSummary {
  const orderedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  let totalSips = 0;
  let totalParPlayed = 0;
  let totalCoursePar = 0;
  let thruHoles = 0;
  let frontFiveSips = 0;
  let frontFivePar = 0;
  let backFourSips = 0;
  let backFourPar = 0;

  let acesAndAlbatrosses = 0;
  let eagles = 0;
  let birdies = 0;
  let pars = 0;
  let bogeys = 0;
  let doubleBogeysOrWorse = 0;
  let parOrBetterCount = 0;
  let currentStreak = 0;
  let maxStreak = 0;

  for (let i = 0; i < 9; i++) {
    const hole = orderedHoles[i];
    const holePar = hole ? hole.par : 4;
    const holeSips = sips[i] ?? 0;

    totalCoursePar += holePar;
    if (i < 5) {
      frontFivePar += holePar;
    } else {
      backFourPar += holePar;
    }

    if (holeSips > 0) {
      thruHoles += 1;
      totalSips += holeSips;
      totalParPlayed += holePar;

      if (i < 5) {
        frontFiveSips += holeSips;
      } else {
        backFourSips += holeSips;
      }

      const evalResult = evaluateGolfHoleScore(holeSips, holePar);
      if (evalResult.key === 'hole-in-one' || evalResult.key === 'albatross') {
        acesAndAlbatrosses += 1;
      } else if (evalResult.key === 'eagle') {
        eagles += 1;
      } else if (evalResult.key === 'birdie') {
        birdies += 1;
      } else if (evalResult.key === 'par') {
        pars += 1;
      } else if (evalResult.key === 'bogey') {
        bogeys += 1;
      } else if (evalResult.key === 'double-bogey' || evalResult.key === 'triple-bogey-plus') {
        doubleBogeysOrWorse += 1;
      }

      if (holeSips <= holePar) {
        parOrBetterCount += 1;
        currentStreak += 1;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    } else {
      currentStreak = 0;
    }
  }

  const totalToPar = thruHoles === 0 ? 0 : totalSips - totalParPlayed;
  const toParFormatted =
    thruHoles === 0 ? 'E' : totalToPar === 0 ? 'E' : totalToPar > 0 ? `+${totalToPar}` : `${totalToPar}`;
  const sipPrecisionPct = thruHoles === 0 ? 0 : Math.round((parOrBetterCount / thruHoles) * 100);

  return {
    totalSips,
    totalParPlayed,
    totalCoursePar,
    totalToPar,
    toParFormatted,
    thruHoles,
    frontFiveSips,
    frontFivePar,
    backFourSips,
    backFourPar,
    acesAndAlbatrosses,
    eagles,
    birdies,
    pars,
    bogeys,
    doubleBogeysOrWorse,
    sipPrecisionPct,
    underParStreak: maxStreak,
  };
}

export interface LeaderboardEntry {
  rank: number;
  positionLabel: string;
  player: PlayerTourProfile;
  summary: RoundSummary;
}

export function buildLeaderboard(players: PlayerTourProfile[], holes: PubHole[]): LeaderboardEntry[] {
  const enriched = players.map((player) => ({
    player,
    summary: calculateRoundSummary(player.sips, holes),
  }));

  enriched.sort((a, b) => {
    const aStarted = a.summary.thruHoles > 0 ? 1 : 0;
    const bStarted = b.summary.thruHoles > 0 ? 1 : 0;
    if (aStarted !== bStarted) return bStarted - aStarted;

    if (a.summary.totalToPar !== b.summary.totalToPar) {
      return a.summary.totalToPar - b.summary.totalToPar;
    }

    if (a.summary.thruHoles !== b.summary.thruHoles) {
      return b.summary.thruHoles - a.summary.thruHoles;
    }

    if (a.summary.totalSips !== b.summary.totalSips) {
      return a.summary.totalSips - b.summary.totalSips;
    }

    return a.player.displayName.localeCompare(b.player.displayName, 'sv');
  });

  const scoreCounts = new Map<string, number>();
  for (const item of enriched) {
    const key = item.summary.thruHoles > 0 ? `started:${item.summary.totalToPar}` : 'unstarted';
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }

  let currentRank = 1;
  return enriched.map((item, idx) => {
    if (idx > 0) {
      const prev = enriched[idx - 1];
      const sameGroup =
        (item.summary.thruHoles > 0 &&
          prev.summary.thruHoles > 0 &&
          item.summary.totalToPar === prev.summary.totalToPar) ||
        (item.summary.thruHoles === 0 && prev.summary.thruHoles === 0);
      if (!sameGroup) {
        currentRank = idx + 1;
      }
    }

    const key = item.summary.thruHoles > 0 ? `started:${item.summary.totalToPar}` : 'unstarted';
    const isTied = (scoreCounts.get(key) ?? 0) > 1 && item.summary.thruHoles > 0;
    const positionLabel = item.summary.thruHoles === 0 ? '—' : isTied ? `T${currentRank}` : `${currentRank}`;

    return {
      rank: currentRank,
      positionLabel,
      player: item.player,
      summary: item.summary,
    };
  });
}

export interface BrutalBallTeamLeaderboardEntry {
  rank: number;
  positionLabel: string;
  teamId: string;
  teamName: string;
  isAutoPaired: boolean;
  members: LeaderboardEntry[]; // 1 or 2 players
  holeSips: number[]; // length 9, combined sips per hole
  holeEffectivePars: number[]; // length 9, combined par for members who played that hole
  frontFiveSips: number;
  backFourSips: number;
  totalSips: number;
  totalToPar: number;
  toParFormatted: string;
  thruHoles: number;
}

/**
 * Builds the 2-player team leaderboard for Brutal Ball ("lag om 2 och 2 och ens lagscore är singelscoren men ihoplagt").
 * Players with a matching `teamId` (or `teamName`) are grouped into 2-player teams first; any remaining
 * unassigned players are automatically paired 2 & 2 in deterministic order so Brutal Ball works immediately.
 */
export function buildBrutalBallLeaderboard(
  players: PlayerTourProfile[],
  holes: PubHole[]
): BrutalBallTeamLeaderboardEntry[] {
  const orderedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  const individualEntries: LeaderboardEntry[] = players.map((player) => ({
    rank: 1,
    positionLabel: '1',
    player,
    summary: calculateRoundSummary(player.sips, orderedHoles),
  }));

  // Group by explicit teamId or teamName (chunked into pairs of at most 2)
  const explicitBuckets = new Map<string, { label: string; members: LeaderboardEntry[] }>();
  const unassigned: LeaderboardEntry[] = [];

  for (const entry of individualEntries) {
    const rawId = (entry.player.teamId || '').trim();
    const rawName = (entry.player.teamName || '').trim();
    const key = rawId || (rawName ? `name:${rawName.toLowerCase()}` : '');
    if (key) {
      const existing = explicitBuckets.get(key);
      if (existing) {
        existing.members.push(entry);
        if (!existing.label && rawName) existing.label = rawName;
      } else {
        explicitBuckets.set(key, {
          label: rawName || rawId,
          members: [entry],
        });
      }
    } else {
      unassigned.push(entry);
    }
  }

  const rawTeams: Array<{
    teamId: string;
    teamName: string;
    isAutoPaired: boolean;
    members: LeaderboardEntry[];
  }> = [];

  for (const [key, bucket] of explicitBuckets.entries()) {
    for (let i = 0; i < bucket.members.length; i += 2) {
      const pair = bucket.members.slice(i, i + 2);
      const firstNames = pair
        .map((m) => m.player.displayName.split(' ')[0] || m.player.displayName)
        .join(' & ');
      const suffix = i > 0 ? ` (${Math.floor(i / 2) + 1})` : '';
      rawTeams.push({
        teamId: i === 0 ? key : `${key}-${i / 2 + 1}`,
        teamName: bucket.label ? `${bucket.label}${suffix}` : `Lag ${firstNames}`,
        isAutoPaired: false,
        members: pair,
      });
    }
  }

  // Deterministically sort unassigned players by displayName + uid before pairing 2 & 2
  unassigned.sort((a, b) => {
    const cmp = a.player.displayName.localeCompare(b.player.displayName, 'sv');
    return cmp !== 0 ? cmp : a.player.uid.localeCompare(b.player.uid);
  });

  for (let i = 0; i < unassigned.length; i += 2) {
    const pair = unassigned.slice(i, i + 2);
    const autoNum = rawTeams.length + 1;
    const firstNames = pair
      .map((m) => m.player.displayName.split(' ')[0] || m.player.displayName)
      .join(' & ');
    rawTeams.push({
      teamId: `auto-team-${autoNum}`,
      teamName: `Lag ${autoNum}: ${firstNames}`,
      isAutoPaired: true,
      members: pair,
    });
  }

  const computedTeams = rawTeams.map((team) => {
    const holeSips: number[] = [];
    const holeEffectivePars: number[] = [];
    let frontFiveSips = 0;
    let backFourSips = 0;
    let thruHoles = 0;

    for (let idx = 0; idx < 9; idx++) {
      const baseHolePar = orderedHoles[idx]?.par ?? 4;
      let combinedHoleSips = 0;
      let playedCount = 0;

      for (const m of team.members) {
        const s = m.player.sips[idx] ?? 0;
        if (s > 0) {
          combinedHoleSips += s;
          playedCount += 1;
        }
      }

      holeSips.push(combinedHoleSips);
      const effectivePar =
        playedCount > 0 ? baseHolePar * playedCount : baseHolePar * team.members.length;
      holeEffectivePars.push(effectivePar);

      if (combinedHoleSips > 0) {
        thruHoles += 1;
        if (idx < 5) {
          frontFiveSips += combinedHoleSips;
        } else {
          backFourSips += combinedHoleSips;
        }
      }
    }

    // Team score is the exact sum of the 2 members' individual scores
    const totalSips = team.members.reduce((sum, m) => sum + m.summary.totalSips, 0);
    const totalToPar =
      thruHoles === 0 ? 0 : team.members.reduce((sum, m) => sum + m.summary.totalToPar, 0);
    const toParFormatted =
      thruHoles === 0
        ? 'E'
        : totalToPar === 0
          ? 'E'
          : totalToPar > 0
            ? `+${totalToPar}`
            : `${totalToPar}`;

    return {
      ...team,
      holeSips,
      holeEffectivePars,
      frontFiveSips,
      backFourSips,
      totalSips,
      totalToPar,
      toParFormatted,
      thruHoles,
    };
  });

  computedTeams.sort((a, b) => {
    const aStarted = a.thruHoles > 0 ? 1 : 0;
    const bStarted = b.thruHoles > 0 ? 1 : 0;
    if (aStarted !== bStarted) return bStarted - aStarted;

    if (a.totalToPar !== b.totalToPar) return a.totalToPar - b.totalToPar;
    if (a.thruHoles !== b.thruHoles) return b.thruHoles - a.thruHoles;
    if (a.totalSips !== b.totalSips) return a.totalSips - b.totalSips;
    return a.teamName.localeCompare(b.teamName, 'sv');
  });

  const scoreCounts = new Map<string, number>();
  for (const item of computedTeams) {
    const key = item.thruHoles > 0 ? `started:${item.totalToPar}` : 'unstarted';
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }

  let currentRank = 1;
  return computedTeams.map((item, idx) => {
    if (idx > 0) {
      const prev = computedTeams[idx - 1];
      const sameGroup =
        (item.thruHoles > 0 && prev.thruHoles > 0 && item.totalToPar === prev.totalToPar) ||
        (item.thruHoles === 0 && prev.thruHoles === 0);
      if (!sameGroup) {
        currentRank = idx + 1;
      }
    }

    const key = item.thruHoles > 0 ? `started:${item.totalToPar}` : 'unstarted';
    const isTied = (scoreCounts.get(key) ?? 0) > 1 && item.thruHoles > 0;
    const positionLabel =
      item.thruHoles === 0 ? '—' : isTied ? `T${currentRank}` : `${currentRank}`;

    return {
      rank: currentRank,
      positionLabel,
      ...item,
    };
  });
}

/**
 * Merges all registered PGA Tour profiles (/profiles), active round participants
 * (/courses/{courseId}/participants), and the current user's profile so every player
 * is always visible in a stable order and clicking between profiles never drops anyone.
 */
export function mergeTourProfiles(
  allProfiles: ReusablePlayerProfile[],
  courseParticipants: PlayerTourProfile[],
  myProfile: ReusablePlayerProfile | null,
  activeCourseId: string,
  currentUid?: string
): PlayerTourProfile[] {
  const byUid = new Map<string, PlayerTourProfile>();

  // 1. Seed from course participants (preserves hole-by-hole sips for the active round)
  for (const part of courseParticipants) {
    if (!part.uid) continue;
    byUid.set(part.uid, {
      ...part,
      sips:
        Array.isArray(part.sips) && part.sips.length === 9
          ? [...part.sips]
          : [0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  }

  // 2. Merge all global /profiles documents (adds players who haven't joined the round yet,
  // and overlays latest profile bio/metadata onto existing round participants)
  for (const prof of allProfiles) {
    if (!prof.uid) continue;
    const existing = byUid.get(prof.uid);
    if (existing) {
      byUid.set(prof.uid, {
        ...existing,
        displayName: prof.displayName || existing.displayName,
        nickname: prof.nickname || existing.nickname,
        country: prof.country || existing.country,
        homePub: prof.homePub || existing.homePub,
        signatureDrink: prof.signatureDrink || existing.signatureDrink,
        favoriteClub: prof.favoriteClub || existing.favoriteClub,
        handicap: prof.handicap || existing.handicap,
        bio: prof.bio || existing.bio,
        avatarSeed: prof.avatarSeed || existing.avatarSeed,
      });
    } else {
      byUid.set(prof.uid, {
        ...prof,
        courseId: activeCourseId || 'none',
        sips: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalSips: 0,
        totalToPar: 0,
        thruHoles: 0,
      });
    }
  }

  // 3. Ensure current user's myProfile is always present with freshest fields
  if (myProfile && myProfile.uid) {
    const existing = byUid.get(myProfile.uid);
    if (existing) {
      byUid.set(myProfile.uid, {
        ...existing,
        displayName: myProfile.displayName || existing.displayName,
        nickname: myProfile.nickname || existing.nickname,
        country: myProfile.country || existing.country,
        homePub: myProfile.homePub || existing.homePub,
        signatureDrink: myProfile.signatureDrink || existing.signatureDrink,
        favoriteClub: myProfile.favoriteClub || existing.favoriteClub,
        handicap: myProfile.handicap || existing.handicap,
        bio: myProfile.bio || existing.bio,
        avatarSeed: myProfile.avatarSeed || existing.avatarSeed,
      });
    } else {
      byUid.set(myProfile.uid, {
        ...myProfile,
        courseId: activeCourseId || 'none',
        sips: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalSips: 0,
        totalToPar: 0,
        thruHoles: 0,
      });
    }
  }

  const merged = Array.from(byUid.values());

  merged.sort((a, b) => {
    if (currentUid) {
      if (a.uid === currentUid && b.uid !== currentUid) return -1;
      if (b.uid === currentUid && a.uid !== currentUid) return 1;
    }
    const nameCmp = a.displayName.localeCompare(b.displayName, 'sv');
    if (nameCmp !== 0) return nameCmp;
    return a.uid.localeCompare(b.uid);
  });

  return merged;
}

export interface PlayerRoundHistoryItem {
  courseId: string;
  title: string;
  city: string;
  eventDate: string;
  thruHoles: number;
  totalSips: number;
  totalCoursePar: number;
  totalToPar: number;
  toParFormatted: string;
}

export interface PlayerCareerStats {
  uid: string;
  roundsPlayed: number;
  totalHolesPlayed: number;
  totalCareerSips: number;
  totalCareerToPar: number;
  averageToPar: number | null;
  computedHandicap: string;
  careerAcesAndAlbatrosses: number;
  careerEagles: number;
  careerBirdies: number;
  careerPars: number;
  careerSipPrecisionPct: number;
  bestRound: PlayerRoundHistoryItem | null;
  roundHistory: PlayerRoundHistoryItem[];
}

/**
 * Calculates a player's career statistics and automatic Handicap (HCP) as the
 * average score relative to par across all rounds where the player has played at least 1 hole.
 */
export function calculatePlayerCareerStats(
  uid: string,
  courses: PubCourse[],
  participantsByCourse: Record<string, PlayerTourProfile[]>,
  holesByCourse: Record<string, PubHole[]>
): PlayerCareerStats {
  let roundsPlayed = 0;
  let totalHolesPlayed = 0;
  let totalCareerSips = 0;
  let totalCareerToPar = 0;
  let careerAcesAndAlbatrosses = 0;
  let careerEagles = 0;
  let careerBirdies = 0;
  let careerPars = 0;
  let totalParOrBetterHoles = 0;
  let bestRound: PlayerRoundHistoryItem | null = null;
  const roundHistory: PlayerRoundHistoryItem[] = [];

  for (const course of courses) {
    const courseParts = participantsByCourse[course.courseId] || [];
    const participant = courseParts.find((p) => p.uid === uid);
    if (!participant) continue;

    const courseHoles =
      holesByCourse[course.courseId] ||
      createBlankHolesForCourse(course.courseId, course.ownerId);
    const summary = calculateRoundSummary(participant.sips, courseHoles);

    const historyItem: PlayerRoundHistoryItem = {
      courseId: course.courseId,
      title: course.title,
      city: course.city,
      eventDate: course.eventDate,
      thruHoles: summary.thruHoles,
      totalSips: summary.totalSips,
      totalCoursePar: summary.totalCoursePar,
      totalToPar: summary.totalToPar,
      toParFormatted: summary.toParFormatted,
    };

    if (summary.thruHoles > 0) {
      roundHistory.push(historyItem);
      roundsPlayed += 1;
      totalHolesPlayed += summary.thruHoles;
      totalCareerSips += summary.totalSips;
      totalCareerToPar += summary.totalToPar;
      careerAcesAndAlbatrosses += summary.acesAndAlbatrosses;
      careerEagles += summary.eagles;
      careerBirdies += summary.birdies;
      careerPars += summary.pars;

      const orderedHoles = [...courseHoles].sort((a, b) => a.holeNumber - b.holeNumber);
      for (let i = 0; i < 9; i++) {
        const sips = participant.sips[i] ?? 0;
        const par = orderedHoles[i]?.par ?? 4;
        if (sips > 0 && sips <= par) {
          totalParOrBetterHoles += 1;
        }
      }

      if (!bestRound || summary.totalToPar < bestRound.totalToPar) {
        bestRound = historyItem;
      }
    }
  }

  const averageToPar =
    roundsPlayed > 0 ? Math.round((totalCareerToPar / roundsPlayed) * 10) / 10 : null;

  let computedHandicap = '0.0';
  if (averageToPar !== null) {
    if (averageToPar === 0) {
      computedHandicap = '0.0';
    } else if (averageToPar > 0) {
      computedHandicap = `+${averageToPar.toFixed(1)}`;
    } else {
      computedHandicap = `${averageToPar.toFixed(1)}`;
    }
  }

  const careerSipPrecisionPct =
    totalHolesPlayed > 0 ? Math.round((totalParOrBetterHoles / totalHolesPlayed) * 100) : 0;

  return {
    uid,
    roundsPlayed,
    totalHolesPlayed,
    totalCareerSips,
    totalCareerToPar,
    averageToPar,
    computedHandicap,
    careerAcesAndAlbatrosses,
    careerEagles,
    careerBirdies,
    careerPars,
    careerSipPrecisionPct,
    bestRound,
    roundHistory,
  };
}

export function validateCourseCreationInput(input: {
  title: string;
  subtitle: string;
  city: string;
  eventDate: string;
}): { valid: boolean; error?: string } {
  if (!input.title || input.title.trim().length < 2 || input.title.trim().length > 80) {
    return { valid: false, error: 'Rundans namn måste vara mellan 2 och 80 tecken.' };
  }
  if (!input.subtitle || input.subtitle.trim().length < 2 || input.subtitle.trim().length > 140) {
    return { valid: false, error: 'Beskrivning/undertitel måste vara mellan 2 och 140 tecken.' };
  }
  if (!input.city || input.city.trim().length < 2 || input.city.trim().length > 60) {
    return { valid: false, error: 'Stad måste vara mellan 2 och 60 tecken.' };
  }
  if (!input.eventDate || input.eventDate.trim().length < 2 || input.eventDate.trim().length > 40) {
    return { valid: false, error: 'Datum måste anges (2–40 tecken).' };
  }
  return { valid: true };
}

export function validateHoleInput(input: Partial<PubHole>): { valid: boolean; error?: string } {
  if (!input.pubName || input.pubName.trim().length < 2 || input.pubName.trim().length > 80) {
    return { valid: false, error: 'Pubens namn måste vara mellan 2 och 80 tecken.' };
  }
  if (!input.pubAddress || input.pubAddress.trim().length < 2 || input.pubAddress.trim().length > 120) {
    return { valid: false, error: 'Adress/läge måste vara mellan 2 och 120 tecken.' };
  }
  if (!input.drinkName || input.drinkName.trim().length < 2 || input.drinkName.trim().length > 80) {
    return { valid: false, error: 'Dryckens namn måste vara mellan 2 och 80 tecken.' };
  }
  if (!input.drinkType || !VALID_DRINK_TYPES.includes(input.drinkType)) {
    return { valid: false, error: 'Välj en giltig dryckeskategori.' };
  }
  if (
    typeof input.par !== 'number' ||
    !Number.isInteger(input.par) ||
    input.par < 1 ||
    input.par > 6
  ) {
    return { valid: false, error: 'Par måste vara ett heltal mellan 1 och 6 klunkar.' };
  }
  if (
    typeof input.volumeCl !== 'number' ||
    !Number.isInteger(input.volumeCl) ||
    input.volumeCl < 2 ||
    input.volumeCl > 100
  ) {
    return { valid: false, error: 'Volym måste vara mellan 2 och 100 cl.' };
  }
  if (
    typeof input.lengthMeters !== 'number' ||
    !Number.isInteger(input.lengthMeters) ||
    input.lengthMeters < 50 ||
    input.lengthMeters > 650
  ) {
    return { valid: false, error: 'Hålets längd måste vara mellan 50 och 650 meter.' };
  }
  if (!input.shape || !VALID_SHAPES.includes(input.shape)) {
    return { valid: false, error: 'Välj en giltig fairway-form.' };
  }
  if (!input.hazardTitle || input.hazardTitle.trim().length < 2 || input.hazardTitle.trim().length > 80) {
    return { valid: false, error: 'Hindrets namn måste vara mellan 2 och 80 tecken.' };
  }
  if (!input.hazardRule || input.hazardRule.trim().length < 2 || input.hazardRule.trim().length > 180) {
    return { valid: false, error: 'Hindrets regel måste vara mellan 2 och 180 tecken.' };
  }
  if (!input.caddieTip || input.caddieTip.trim().length < 2 || input.caddieTip.trim().length > 200) {
    return { valid: false, error: 'Caddiens tips måste vara mellan 2 och 200 tecken.' };
  }
  return { valid: true };
}

export function validatePlayerProfileInput(input: {
  displayName: string;
  nickname: string;
  country: string;
  homePub: string;
  signatureDrink: string;
  favoriteClub: string;
  handicap?: string;
  bio: string;
}): { valid: boolean; error?: string } {
  if (!input.displayName || input.displayName.trim().length < 2 || input.displayName.trim().length > 60) {
    return { valid: false, error: 'Spelarnamn måste vara mellan 2 och 60 tecken.' };
  }
  if (!input.nickname || input.nickname.trim().length < 1 || input.nickname.trim().length > 50) {
    return { valid: false, error: 'Smeknamn på touren måste vara mellan 1 och 50 tecken.' };
  }
  if (!input.country || input.country.trim().length < 2 || input.country.trim().length > 50) {
    return { valid: false, error: 'Stad/Land måste vara mellan 2 och 50 tecken.' };
  }
  if (!input.homePub || input.homePub.trim().length < 2 || input.homePub.trim().length > 80) {
    return { valid: false, error: 'Hemmapub måste vara mellan 2 och 80 tecken.' };
  }
  if (
    !input.signatureDrink ||
    input.signatureDrink.trim().length < 2 ||
    input.signatureDrink.trim().length > 80
  ) {
    return { valid: false, error: 'Signaturdryck måste vara mellan 2 och 80 tecken.' };
  }
  if (
    !input.favoriteClub ||
    input.favoriteClub.trim().length < 2 ||
    input.favoriteClub.trim().length > 80
  ) {
    return { valid: false, error: 'Favoritklubba i bagen måste vara mellan 2 och 80 tecken.' };
  }
  if (!input.bio || input.bio.trim().length < 2 || input.bio.trim().length > 320) {
    return { valid: false, error: 'Spelarbiografi måste vara mellan 2 och 320 tecken.' };
  }
  return { valid: true };
}

export type JacketTheme = 'emerald' | 'gold' | 'navy' | 'burgundy' | 'slate';
export type HatStyle = 'flatcap' | 'visor' | 'cap' | 'bucket' | 'beanie' | 'none';
export type PantsStyle = 'plaid' | 'chino' | 'navy' | 'loud' | 'corduroy';
export type SkinTone = 'light' | 'warm' | 'medium' | 'deep';
export type FaceAccessory = 'clean' | 'mustache' | 'beard' | 'sunglasses' | 'cigar';
export type GearItem = 'driver' | 'putter' | 'flag' | 'umbrella' | 'golden' | 'jug';

export interface AvatarConfig {
  jacket: JacketTheme;
  hat: HatStyle;
  pants: PantsStyle;
  skin: SkinTone;
  accessory: FaceAccessory;
  gear: GearItem;
}

/** Stats needed to decide which gear a player has unlocked (subset of PlayerCareerStats). */
export type GearUnlockStats = Pick<
  PlayerCareerStats,
  'roundsPlayed' | 'careerBirdies' | 'careerEagles' | 'careerAcesAndAlbatrosses'
>;

export interface GearDefinition {
  id: GearItem;
  label: string;
  requirement: string;
  /** Returns [current, goal] so the UI can show progress. */
  progress: (stats: GearUnlockStats) => [number, number];
}

const birdiesOrBetter = (s: GearUnlockStats) =>
  s.careerBirdies + s.careerEagles + s.careerAcesAndAlbatrosses;

export const GEAR_CATALOG: GearDefinition[] = [
  { id: 'driver', label: 'Driver', requirement: 'Startutrustning', progress: () => [1, 1] },
  { id: 'putter', label: 'Putter', requirement: 'Spela din första runda', progress: (s) => [s.roundsPlayed, 1] },
  { id: 'flag', label: 'Flaggstång', requirement: 'Gör din första birdie', progress: (s) => [birdiesOrBetter(s), 1] },
  { id: 'umbrella', label: 'Novemberparaply', requirement: 'Spela 3 rundor', progress: (s) => [s.roundsPlayed, 3] },
  { id: 'golden', label: 'Guldklubba', requirement: '10 birdies eller bättre totalt', progress: (s) => [birdiesOrBetter(s), 10] },
  {
    id: 'jug',
    label: 'Claret Jug',
    requirement: 'Gör en eagle (eller bättre)',
    progress: (s) => [s.careerEagles + s.careerAcesAndAlbatrosses, 1],
  },
];

export function isGearUnlocked(gear: GearItem, stats?: GearUnlockStats | null): boolean {
  const def = GEAR_CATALOG.find((g) => g.id === gear);
  if (!def) return false;
  if (gear === 'driver') return true;
  if (!stats) return false;
  const [current, goal] = def.progress(stats);
  return current >= goal;
}

const JACKET_TO_CODE: Record<JacketTheme, string> = {
  emerald: 'em',
  gold: 'go',
  navy: 'nv',
  burgundy: 'bg',
  slate: 'sl',
};
const CODE_TO_JACKET: Record<string, JacketTheme> = {
  em: 'emerald',
  emerald: 'emerald',
  go: 'gold',
  gold: 'gold',
  nv: 'navy',
  navy: 'navy',
  bg: 'burgundy',
  burgundy: 'burgundy',
  sl: 'slate',
  slate: 'slate',
};

const HAT_TO_CODE: Record<HatStyle, string> = {
  flatcap: 'fc',
  visor: 'vs',
  cap: 'cp',
  bucket: 'bk',
  beanie: 'bn',
  none: 'no',
};
const CODE_TO_HAT: Record<string, HatStyle> = {
  fc: 'flatcap',
  flatcap: 'flatcap',
  vs: 'visor',
  visor: 'visor',
  cp: 'cap',
  cap: 'cap',
  bk: 'bucket',
  bucket: 'bucket',
  bn: 'beanie',
  beanie: 'beanie',
  no: 'none',
  none: 'none',
};

const PANTS_TO_CODE: Record<PantsStyle, string> = {
  plaid: 'pl',
  chino: 'ch',
  navy: 'nv',
  loud: 'ld',
  corduroy: 'cd',
};
const CODE_TO_PANTS: Record<string, PantsStyle> = {
  pl: 'plaid',
  plaid: 'plaid',
  ch: 'chino',
  chino: 'chino',
  nv: 'navy',
  navy: 'navy',
  ld: 'loud',
  loud: 'loud',
  cd: 'corduroy',
  corduroy: 'corduroy',
};

const SKIN_TO_CODE: Record<SkinTone, string> = {
  light: 'lt',
  warm: 'wm',
  medium: 'md',
  deep: 'dp',
};
const CODE_TO_SKIN: Record<string, SkinTone> = {
  lt: 'light',
  light: 'light',
  wm: 'warm',
  warm: 'warm',
  md: 'medium',
  medium: 'medium',
  dp: 'deep',
  deep: 'deep',
};

const ACC_TO_CODE: Record<FaceAccessory, string> = {
  clean: 'cl',
  mustache: 'ms',
  beard: 'bd',
  sunglasses: 'sg',
  cigar: 'cg',
};
const GEAR_TO_CODE: Record<GearItem, string> = {
  driver: 'dr',
  putter: 'pt',
  flag: 'fl',
  umbrella: 'um',
  golden: 'gd',
  jug: 'jg',
};
const CODE_TO_GEAR: Record<string, GearItem> = Object.fromEntries(
  Object.entries(GEAR_TO_CODE).flatMap(([gear, code]) => [
    [code, gear as GearItem],
    [gear, gear as GearItem],
  ])
);

const CODE_TO_ACC: Record<string, FaceAccessory> = {
  cl: 'clean',
  clean: 'clean',
  ms: 'mustache',
  mustache: 'mustache',
  bd: 'beard',
  beard: 'beard',
  sg: 'sunglasses',
  sunglasses: 'sunglasses',
  cg: 'cigar',
  cigar: 'cigar',
};

export function parseAvatarSeed(seed?: string): AvatarConfig {
  const raw = (seed || 'emerald').trim().toLowerCase();
  const parts = raw.split(/[-|:]/).filter(Boolean);

  if (parts.length >= 5) {
    return {
      jacket: CODE_TO_JACKET[parts[0]] || 'emerald',
      hat: CODE_TO_HAT[parts[1]] || 'flatcap',
      pants: CODE_TO_PANTS[parts[2]] || 'plaid',
      skin: CODE_TO_SKIN[parts[3]] || 'warm',
      accessory: CODE_TO_ACC[parts[4]] || 'clean',
      gear: CODE_TO_GEAR[parts[5]] || 'driver',
    };
  }

  return {
    jacket: CODE_TO_JACKET[parts[0]] || 'emerald',
    hat: 'flatcap',
    pants: 'plaid',
    skin: 'warm',
    accessory: 'clean',
    gear: 'driver',
  };
}

export function serializeAvatarConfig(config: AvatarConfig): string {
  const j = JACKET_TO_CODE[config.jacket] || 'em';
  const h = HAT_TO_CODE[config.hat] || 'fc';
  const p = PANTS_TO_CODE[config.pants] || 'pl';
  const s = SKIN_TO_CODE[config.skin] || 'wm';
  const a = ACC_TO_CODE[config.accessory] || 'cl';
  const g = GEAR_TO_CODE[config.gear] || 'dr';
  // Driver is the default: keep 5-part seeds so older seeds stay identical.
  return g === 'dr' ? `${j}-${h}-${p}-${s}-${a}` : `${j}-${h}-${p}-${s}-${a}-${g}`;
}

export type AvatarAnimationPose =
  | 'idle'
  | 'victory'
  | 'celebrate'
  | 'steady'
  | 'sweat'
  | 'cry'
  | 'disaster';

export interface ScoreCelebrationClip {
  id: string;
  playerUid: string;
  playerName: string;
  playerNickname: string;
  avatarSeed: string;
  holeNumber: number;
  pubName: string;
  drinkName: string;
  sips: number;
  par: number;
  evalResult: GolfScoreEvaluation;
  pose: AvatarAnimationPose;
  tvChannelLabel: string;
  bannerTag: string;
  headline: string;
  commentary: string;
  bowlingTicker: string;
  themeColor: 'gold' | 'emerald' | 'slate' | 'amber' | 'crimson';
}

export function buildScoreCelebrationClip(params: {
  playerUid: string;
  playerName: string;
  playerNickname: string;
  avatarSeed: string;
  holeNumber: number;
  pubName: string;
  drinkName: string;
  sips: number;
  par: number;
}): ScoreCelebrationClip {
  const evalResult = evaluateGolfHoleScore(params.sips, params.par);
  const id = `${params.playerUid}-h${params.holeNumber}-s${params.sips}-${Date.now()}`;

  if (evalResult.key === 'hole-in-one') {
    return {
      id,
      ...params,
      evalResult,
      pose: 'victory',
      tvChannelLabel: 'PUBGOLF LINKS LIVE · STRIKE CAM',
      bannerTag: 'HOLE-IN-ONE · HELA GLASET I ETT SVEP!',
      headline: `SVEP-LEGEND!! ${params.playerName.toUpperCase()} SÄNKER HÅL ${params.holeNumber}!`,
      commentary: `Otroliga scener inne på ${params.pubName}! ${params.playerName} (“${params.playerNickname}”) tömmer sin ${params.drinkName} i ett enda magiskt svep!`,
      bowlingTicker: '★★★ PERFEKT STRIKE VID BARDISKEN · 1 SLAG ★★★',
      themeColor: 'gold',
    };
  }

  if (evalResult.key === 'albatross') {
    return {
      id,
      ...params,
      evalResult,
      pose: 'victory',
      tvChannelLabel: 'PUBGOLF LINKS LIVE · ALBATROSS ALERT',
      bannerTag: `ALBATROSS (${evalResult.diffFormatted}) · SÄLLSYNT MÄSTERSLAG`,
      headline: `ALBATROSS FÖR ${params.playerName.toUpperCase()}!`,
      commentary: `Tre klunkar under par på ${params.pubName}! Konkurrenterna tappar hakan när ${params.playerName} krossar ${params.drinkName} på bara ${params.sips} klunkar!`,
      bowlingTicker: '⚡ OVERKLIGT TEMPO · TRE UNDER PAR ⚡',
      themeColor: 'gold',
    };
  }

  if (evalResult.key === 'eagle') {
    return {
      id,
      ...params,
      evalResult,
      pose: 'victory',
      tvChannelLabel: 'PUBGOLF LINKS LIVE · EAGLE VISION',
      bannerTag: `EAGLE (${evalResult.diffFormatted}) · TVÅ KLUNKAR UNDER PAR`,
      headline: `MÄKTIG EAGLE AV ${params.playerName.toUpperCase()}!`,
      commentary: `Vilket utslag på ${params.pubName}! ${params.playerName} sätter sin ${params.drinkName} på ${params.sips} klunkar (Par ${params.par}) och tar kommandot!`,
      bowlingTicker: '🦅 EAGLE CAM · KRAFTFULLT SPEL FRÅN TEE TILL BOTTEN 🦅',
      themeColor: 'gold',
    };
  }

  if (evalResult.key === 'birdie') {
    return {
      id,
      ...params,
      evalResult,
      pose: 'celebrate',
      tvChannelLabel: 'PUBGOLF LINKS LIVE · BIRDIE SPÄRR',
      bannerTag: `BIRDIE (${evalResult.diffFormatted}) · EN KLUNK UNDER PAR`,
      headline: `SNYGG BIRDIE, ${params.playerName.toUpperCase()}!`,
      commentary: `Kirurgisk klunkprecision på ${params.pubName}! En klunk under par på ${params.drinkName} — läroboksexempel i pubgolf!`,
      bowlingTicker: '✨ SPÄRR & BIRDIE · KLÄTTRAR PÅ LEADERBOARDEN ✨',
      themeColor: 'emerald',
    };
  }

  if (evalResult.key === 'par') {
    return {
      id,
      ...params,
      evalResult,
      pose: 'steady',
      tvChannelLabel: 'PUBGOLF LINKS LIVE · TOUR STANDARD',
      bannerTag: `PAR (E) · EXAKT PÅ BANANS PAR (${params.par} KLUNKAR)`,
      headline: `STABILT TOUR-PAR FÖR ${params.playerName.toUpperCase()}`,
      commentary: `Lugnt och metodiskt på ${params.pubName}. ${params.playerName} levererar exakt ${params.par} klunkar utan att spilla en droppe.`,
      bowlingTicker: '⛳ STABIL LEVERANS · INGA MISSTAG PÅ GREEN ⛳',
      themeColor: 'slate',
    };
  }

  if (evalResult.key === 'bogey') {
    return {
      id,
      ...params,
      evalResult,
      pose: 'sweat',
      tvChannelLabel: 'PUBGOLF LINKS LIVE · RUFF-RADAR',
      bannerTag: `BOGEY (+1) · SMÅKLUNKANDE I SEMIRUFFEN`,
      headline: `DARR PÅ MANSCHETTEN, ${params.playerName.toUpperCase()}?`,
      commentary: `Var din ${params.drinkName} för kall eller glaset för tungt på ${params.pubName}? En extra fegisklunk över par (${params.sips} slag)...`,
      bowlingTicker: '⚠️ VARNING FÖR SMÅKLUNKANDE · +1 ÖVER PAR ⚠️',
      themeColor: 'amber',
    };
  }

  if (evalResult.key === 'double-bogey') {
    return {
      id,
      ...params,
      evalResult,
      pose: 'cry',
      tvChannelLabel: 'PUBGOLF LINKS LIVE · BUNKER-TV',
      bannerTag: `DUBBELBOGEY (+2) · FAST I SANDBUNKERN`,
      headline: `BUNKERKOLLAPS FÖR ${params.playerName.toUpperCase()}!`,
      commentary: `Två klunkar över par på ${params.pubName}! Dricker ${params.playerName} sin ${params.drinkName} med tesked?! Publiken buar i baren!`,
      bowlingTicker: '🚨 DUBBELBOGEY · HÄMTA SPADEN I BUNKERN 🚨',
      themeColor: 'crimson',
    };
  }

  return {
    id,
    ...params,
    evalResult,
    pose: 'disaster',
    tvChannelLabel: 'PUBGOLF LINKS LIVE · GUTTERBALL HAVERI',
    bannerTag: `${evalResult.svLabel.toUpperCase()} (${evalResult.diffFormatted}) · TOTALT VATTENHINDER`,
    headline: `TOTALT RÄNNSLAG AV ${params.playerName.toUpperCase()}!!`,
    commentary: `Ring bärgningsbilen till ${params.pubName}! ${params.playerName} behövde hela ${params.sips} klunkar på ett Par ${params.par}-hål! Caddien har officiellt sagt upp sig!`,
    bowlingTicker: '💀 BOWLING-RÄNNA & VATTENHINDER · BYT TILL SUGRÖR 💀',
    themeColor: 'crimson',
  };
}

export interface PubRouteLegSpec {
  legIndex: number;
  fromHoleNumber: number;
  toHoleNumber: number;
  fromPubName: string;
  toPubName: string;
  fromAddress: string;
  toAddress: string;
  originQuery: string;
  destinationQuery: string;
  googleMapsDirectionsUrl: string;
}

/**
 * Checks whether a pub hole has a real pub name or street address entered (beyond the blank template defaults).
 */
export function isHoleAddressConfigured(
  hole: Pick<PubHole, 'holeNumber' | 'pubName' | 'pubAddress'>
): boolean {
  const rawAddress = (hole.pubAddress || '').trim();
  const rawName = (hole.pubName || '').trim();
  const defaultName = `Hål ${hole.holeNumber} (Ange pub)`.toLowerCase();
  const hasRealAddress =
    rawAddress.length >= 2 &&
    rawAddress.toLowerCase() !== 'ange gatuadress' &&
    rawAddress.toLowerCase() !== 'ange adress';
  const hasRealName =
    rawName.length >= 2 &&
    rawName.toLowerCase() !== defaultName &&
    !rawName.toLowerCase().includes('(ange pub)');

  return hasRealAddress || hasRealName;
}

/**
 * Builds a clean search query string for Google Places / Routes given a hole and the course city.
 */
export function buildHoleSearchQuery(
  hole: Pick<PubHole, 'holeNumber' | 'pubName' | 'pubAddress'>,
  city: string
): string {
  const rawAddress = (hole.pubAddress || '').trim();
  const rawName = (hole.pubName || '').trim();
  const cleanCity = (city || '').trim();
  const defaultName = `Hål ${hole.holeNumber} (Ange pub)`.toLowerCase();

  const hasRealAddress =
    rawAddress.length >= 2 &&
    rawAddress.toLowerCase() !== 'ange gatuadress' &&
    rawAddress.toLowerCase() !== 'ange adress';
  const hasRealName =
    rawName.length >= 2 &&
    rawName.toLowerCase() !== defaultName &&
    !rawName.toLowerCase().includes('(ange pub)');

  const parts: string[] = [];
  if (hasRealName) {
    parts.push(rawName);
  }
  if (hasRealAddress && rawAddress.toLowerCase() !== rawName.toLowerCase()) {
    parts.push(rawAddress);
  }
  if (
    cleanCity &&
    !parts.some((p) => p.toLowerCase().includes(cleanCity.toLowerCase()))
  ) {
    parts.push(cleanCity);
  }

  return parts.join(', ');
}

/**
 * Builds the ordered walking route legs between all configured pubs in a round.
 */
export function buildPubGolfRouteLegs(holes: PubHole[], city: string): PubRouteLegSpec[] {
  const ordered = [...holes]
    .sort((a, b) => a.holeNumber - b.holeNumber)
    .filter((h) => isHoleAddressConfigured(h));

  const legs: PubRouteLegSpec[] = [];
  for (let i = 0; i < ordered.length - 1; i++) {
    const from = ordered[i];
    const to = ordered[i + 1];
    const originQuery = buildHoleSearchQuery(from, city);
    const destinationQuery = buildHoleSearchQuery(to, city);
    const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      originQuery
    )}&destination=${encodeURIComponent(destinationQuery)}&travelmode=walking`;

    legs.push({
      legIndex: i,
      fromHoleNumber: from.holeNumber,
      toHoleNumber: to.holeNumber,
      fromPubName: from.pubName,
      toPubName: to.pubName,
      fromAddress: from.pubAddress,
      toAddress: to.pubAddress,
      originQuery,
      destinationQuery,
      googleMapsDirectionsUrl,
    });
  }
  return legs;
}

export function formatRouteDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return '—';
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(Math.round(distanceMeters / 100) / 10).toFixed(1)} km`;
}

export function formatRouteDuration(durationMillis: number): string {
  if (!Number.isFinite(durationMillis) || durationMillis <= 0) return '—';
  const mins = Math.max(1, Math.round(durationMillis / 60000));
  if (mins < 60) {
    return `${mins} min`;
  }
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}


