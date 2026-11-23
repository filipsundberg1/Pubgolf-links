/**
 * Läser/skriver Firestore-dokument för banor, hål, rundor och deltagare.
 * Håller App.tsx fri från fältmappning.
 */
import { serverTimestamp, type DocumentData } from 'firebase/firestore';
import {
  APP_ID,
  calculateRoundSummary,
  type PlayerTourProfile,
  type PubCourse,
  type PubHole,
  type PubRound,
  type ReusablePlayerProfile,
} from '../utils/golfRules';

export const EMPTY_SIPS = [0, 0, 0, 0, 0, 0, 0, 0, 0];

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
    status: d.status === 'deleted' ? 'deleted' : 'active',
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
    updatedAt: serverTimestamp(),
  };
}

const readSips = (d: DocumentData): number[] =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => Number(d[`sipsHole${n}`] || 0));

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
  const sips = p.sips.length === 9 ? p.sips : EMPTY_SIPS;
  const summary = calculateRoundSummary(sips, holes);
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
  if (p.playerCode) payload.playerCode = p.playerCode.slice(0, 12);
  if (p.teamId) payload.teamId = p.teamId.slice(0, 64);
  if (p.teamName) payload.teamName = p.teamName.slice(0, 60);
  return payload;
}
