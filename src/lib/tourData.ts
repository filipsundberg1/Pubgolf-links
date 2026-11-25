/**
 * Läser/skriver Firestore-dokument för banor, hål, rundor och deltagare.
 * Håller App.tsx fri från fältmappning.
 */
import { serverTimestamp, type DocumentData } from 'firebase/firestore';
import {
  APP_ID,
  DEFAULT_HOLE_COUNT,
  MAX_HOLES,
  MAX_PENALTIES,
  PENALTY_TYPES,
  type PenaltyEvent,
  VALID_DRINK_TYPES,
  calculateRoundSummary,
  courseHoleCount,
  type DrinkCategory,
  type FairwayShape,
  type RoundHoleOverride,
  type PlayerTourProfile,
  type PubCourse,
  type PubHole,
  type PubRound,
  type ReusablePlayerProfile,
} from '../utils/golfRules';

export const EMPTY_SIPS = new Array(DEFAULT_HOLE_COUNT).fill(0) as number[];
export const emptySips = (count: number) => new Array(Math.max(1, Math.min(MAX_HOLES, count))).fill(0) as number[];

export function parseProfile(d: DocumentData): ReusablePlayerProfile {
  return {
    uid: String(d.uid),
    appId: String(d.appId || APP_ID),
    displayName: String(d.displayName),
    nickname: String(d.nickname),
    country: String(d.country),
    homePub: String(d.homePub),
    signatureDrink: String(d.signatureDrink),
    favoriteClub: String(d.favoriteClub),
    handicap: String(d.handicap),
    bio: String(d.bio),
    avatarSeed: String(d.avatarSeed || 'emerald'),
    playerCode: d.playerCode ? String(d.playerCode) : undefined,
    wins: typeof d.wins === 'number' ? d.wins : undefined,
    lastActiveMs: d.updatedAt?.toMillis ? d.updatedAt.toMillis() : undefined,
  };
}

export function profilePayload(p: ReusablePlayerProfile): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    uid: p.uid,
    appId: APP_ID,
    displayName: p.displayName.slice(0, 60),
    nickname: p.nickname.slice(0, 50),
    country: p.country.slice(0, 50),
    homePub: p.homePub.slice(0, 80),
    signatureDrink: p.signatureDrink.slice(0, 80),
    favoriteClub: p.favoriteClub.slice(0, 80),
    handicap: (p.handicap || '0.0').slice(0, 20),
    bio: p.bio.slice(0, 320),
    avatarSeed: p.avatarSeed.slice(0, 32),
    updatedAt: serverTimestamp(),
  };
  if (p.playerCode) payload.playerCode = p.playerCode;
  if (typeof p.wins === 'number') payload.wins = Math.max(0, Math.min(9999, Math.floor(p.wins)));
  return payload;
}

export function parseCourse(d: DocumentData): PubCourse {
  return {
    courseId: String(d.courseId),
    appId: String(d.appId || APP_ID),
    inviteCode: String(d.inviteCode),
    title: String(d.title),
    subtitle: String(d.subtitle),
    city: String(d.city),
    eventDate: String(d.eventDate),
    ownerId: String(d.ownerId),
    ownerName: String(d.ownerName),
    gameMode: d.gameMode === 'brutal' ? 'brutal' : 'single',
    isPublic: d.isPublic === true,
    holeCount: courseHoleCount({ holeCount: typeof d.holeCount === 'number' ? d.holeCount : undefined }),
  };
}

export function coursePayload(c: PubCourse): Record<string, unknown> {
  return {
    courseId: c.courseId,
    appId: APP_ID,
    inviteCode: c.inviteCode,
    title: c.title.slice(0, 80),
    subtitle: c.subtitle.slice(0, 140),
    city: c.city.slice(0, 60),
    eventDate: c.eventDate.slice(0, 40),
    ownerId: c.ownerId,
    ownerName: c.ownerName.slice(0, 80),
    gameMode: c.gameMode === 'brutal' ? 'brutal' : 'single',
    isPublic: !!c.isPublic,
    // 9 hål = standard och skrivs inte, så vanliga banor funkar även med äldre regler
    ...(courseHoleCount(c) !== DEFAULT_HOLE_COUNT ? { holeCount: courseHoleCount(c) } : {}),
    updatedAt: serverTimestamp(),
  };
}

export function parseHole(d: DocumentData): PubHole {
  return {
    holeNumber: Number(d.holeNumber),
    courseId: String(d.courseId),
    ownerId: String(d.ownerId),
    pubName: String(d.pubName),
    pubAddress: String(d.pubAddress),
    drinkName: String(d.drinkName),
    drinkType: d.drinkType,
    volumeCl: Number(d.volumeCl),
    par: Number(d.par),
    lengthMeters: Number(d.lengthMeters),
    shape: d.shape,
    hazardTitle: String(d.hazardTitle),
    hazardRule: String(d.hazardRule),
    caddieTip: String(d.caddieTip),
  };
}

export function holePayload(h: PubHole, courseId: string, ownerId: string): Record<string, unknown> {
  return {
    holeNumber: h.holeNumber,
    courseId,
    ownerId,
    pubName: h.pubName.slice(0, 80),
    pubAddress: h.pubAddress.slice(0, 120),
    drinkName: h.drinkName.slice(0, 80),
    drinkType: h.drinkType,
    volumeCl: h.volumeCl,
    par: h.par,
    lengthMeters: h.lengthMeters,
    shape: h.shape,
    hazardTitle: h.hazardTitle.slice(0, 80),
    hazardRule: h.hazardRule.slice(0, 180),
    caddieTip: h.caddieTip.slice(0, 200),
    updatedAt: serverTimestamp(),
  };
}

export function parseRound(d: DocumentData): PubRound {
  return {
    roundId: String(d.roundId),
    appId: String(d.appId || APP_ID),
    courseId: String(d.courseId),
    courseTitle: String(d.courseTitle),
    city: String(d.city),
    eventDate: String(d.eventDate),
    ownerId: String(d.ownerId),
    ownerName: String(d.ownerName),
    gameMode: d.gameMode === 'brutal' ? 'brutal' : 'single',
    memberIds: Array.isArray(d.memberIds) ? d.memberIds.map(String) : [],
    locked: d.locked === true,
    status: d.status === 'deleted' ? 'deleted' : d.status === 'finished' ? 'finished' : 'active',
    customHoles: Array.isArray(d.customHoles) && d.customHoles.length > 0 ? d.customHoles.map(parseOverride) : undefined,
  };
}

const SHAPES: FairwayShape[] = ['straight', 'dogleg-left', 'dogleg-right', 'island-green', 'double-dogleg'];
const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const str = (v: unknown, fallback: string, max: number) => {
  const t = String(v ?? '').trim();
  return (t.length >= 2 ? t : fallback).slice(0, max);
};

function parseOverride(d: DocumentData): RoundHoleOverride {
  return sanitizeOverride(d as Partial<RoundHoleOverride>);
}

/** Rensar ett lokalt rundhål så det klarar databasens gränser. */
export function sanitizeOverride(d: Partial<RoundHoleOverride>): RoundHoleOverride {
  const drinkType = (VALID_DRINK_TYPES as string[]).includes(String(d.drinkType)) ? (d.drinkType as DrinkCategory) : 'lager';
  return {
    pubName: str(d.pubName, 'Pub', 80),
    pubAddress: str(d.pubAddress, 'Ange gatuadress', 120),
    drinkName: str(d.drinkName, 'Valfri dryck', 80),
    drinkType,
    volumeCl: clampInt(d.volumeCl, 2, 100, 40),
    par: clampInt(d.par, 1, 6, 3),
    hazardTitle: str(d.hazardTitle, 'Lokalt pubhinder', 80),
    hazardRule: str(d.hazardRule, 'Ange lokal regel eller pliktslag för detta hål.', 180),
    caddieTip: str(d.caddieTip, 'Inga ursäkter.', 200),
    lengthMeters: clampInt(d.lengthMeters, 50, 650, 350),
    shape: SHAPES.includes(d.shape as FairwayShape) ? (d.shape as FairwayShape) : 'straight',
  };
}

export function roundPayload(r: PubRound): Record<string, unknown> {
  return {
    roundId: r.roundId,
    appId: APP_ID,
    courseId: r.courseId,
    courseTitle: r.courseTitle.slice(0, 80),
    city: r.city.slice(0, 60),
    eventDate: r.eventDate.slice(0, 40),
    ownerId: r.ownerId,
    ownerName: r.ownerName.slice(0, 80),
    gameMode: r.gameMode,
    memberIds: r.memberIds,
    locked: r.locked,
    status: r.status,
    ...(r.customHoles && r.customHoles.length > 0
      ? { customHoles: r.customHoles.slice(0, MAX_HOLES).map(sanitizeOverride) }
      : {}),
    updatedAt: serverTimestamp(),
  };
}

/** Läser klunkar per hål. Alltid minst 9 fält (äldre format), upp till MAX_HOLES. */
const readSips = (d: DocumentData): number[] => {
  let last = DEFAULT_HOLE_COUNT;
  for (let n = DEFAULT_HOLE_COUNT + 1; n <= MAX_HOLES; n++) if (`sipsHole${n}` in d) last = n;
  return Array.from({ length: last }, (_, i) => Number(d[`sipsHole${i + 1}`] || 0));
};

/** Plikt/bonus-listan på en deltagare. Okända typer och hål hoppas över. */
export function parsePenalties(v: unknown): PenaltyEvent[] {
  if (!Array.isArray(v)) return [];
  const out: PenaltyEvent[] = [];
  for (const item of v.slice(0, MAX_PENALTIES)) {
    const hole = Math.round(Number((item as { hole?: unknown })?.hole));
    const type = String((item as { type?: unknown })?.type) as PenaltyEvent['type'];
    if (hole >= 1 && hole <= MAX_HOLES && type in PENALTY_TYPES) out.push({ hole, type });
  }
  return out;
}

/** Deltagare i en runda. Profilfält som inte sparas på rundan fylls i från profilen senare. */
export function parseRoundParticipant(d: DocumentData, roundId: string): PlayerTourProfile {
  return {
    uid: String(d.uid),
    appId: APP_ID,
    courseId: roundId,
    displayName: String(d.displayName || 'Spelare'),
    nickname: String(d.nickname || ''),
    country: '',
    homePub: '',
    signatureDrink: '',
    favoriteClub: '',
    handicap: String(d.handicap || '0.0'),
    bio: '',
    avatarSeed: String(d.avatarSeed || 'emerald'),
    playerCode: d.playerCode ? String(d.playerCode) : undefined,
    sips: readSips(d),
    totalSips: Number(d.totalSips || 0),
    totalToPar: Number(d.totalToPar || 0),
    thruHoles: Number(d.thruHoles || 0),
    teamId: d.teamId ? String(d.teamId) : undefined,
    teamName: d.teamName ? String(d.teamName) : undefined,
    countsForHcp: d.countsForHcp !== false,
    keptResult: d.keptResult === true,
    penalties: parsePenalties(d.penalties),
  };
}

/** Legacy: deltagare som låg direkt under banan (före uppdelningen bana/runda). */
export function parseLegacyParticipant(d: DocumentData): PlayerTourProfile {
  return {
    ...parseRoundParticipant(d, String(d.courseId)),
    nickname: String(d.nickname || ''),
  };
}

export function roundParticipantPayload(
  p: PlayerTourProfile,
  roundId: string,
  holes: PubHole[]
): Record<string, unknown> {
  // Spara ett fält per hål på banan, men alltid minst sipsHole1–9 (krävs av reglerna)
  const fieldCount = Math.max(DEFAULT_HOLE_COUNT, Math.min(MAX_HOLES, holes.length || DEFAULT_HOLE_COUNT));
  const sips = Array.from({ length: fieldCount }, (_, i) => p.sips[i] ?? 0);
  const penalties = parsePenalties(p.penalties);
  const summary = calculateRoundSummary(sips.slice(0, holes.length || DEFAULT_HOLE_COUNT), holes, penalties);
  const payload: Record<string, unknown> = {
    uid: p.uid,
    roundId,
    displayName: (p.displayName || 'Spelare').slice(0, 60),
    nickname: (p.nickname || '').slice(0, 50),
    avatarSeed: (p.avatarSeed || 'emerald').slice(0, 32),
    handicap: (p.handicap || '0.0').slice(0, 20),
    totalSips: summary.totalSips,
    totalToPar: summary.totalToPar,
    thruHoles: summary.thruHoles,
    countsForHcp: p.countsForHcp !== false,
    keptResult: p.keptResult === true,
    updatedAt: serverTimestamp(),
  };
  sips.forEach((s, i) => {
    payload[`sipsHole${i + 1}`] = Math.max(0, Math.min(25, Math.round(s) || 0));
  });
  // Skrivs bara när det finns plikt/bonus, så att rundor utan plikt funkar även med äldre regler
  if (penalties.length > 0) payload.penalties = penalties.map((e) => ({ hole: e.hole, type: e.type }));
  if (p.playerCode) payload.playerCode = p.playerCode.slice(0, 12);
  if (p.teamId) payload.teamId = p.teamId.slice(0, 64);
  if (p.teamName) payload.teamName = p.teamName.slice(0, 60);
  return payload;
}
