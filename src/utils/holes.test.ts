import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePlayerCareerStats,
  calculateRoundSummary,
  courseHoleCount,
  courseHolesInPlay,
  createBlankHolesForCourse,
  holeToOverride,
  holesFromOverrides,
  isPlaceholderText,
  moveHole,
  type PlayerTourProfile,
  type PubCourse,
  type PubHole,
} from './golfRules';
import { parseRound, parseRoundParticipant, roundParticipantPayload, roundPayload, sanitizeOverride } from '../lib/tourData';
import { draftToOverride, holeToDraft } from '../components/HoleListEditor';

const holes = (n: number, par = 3): PubHole[] =>
  createBlankHolesForCourse('c1', 'u1', n).map((h) => ({ ...h, par, pubName: `Bar ${h.holeNumber}` }));

const player = (uid: string, sips: number[]): PlayerTourProfile => ({
  uid, appId: 'december-links', displayName: uid, nickname: uid, country: 'x', homePub: 'x', signatureDrink: 'x',
  favoriteClub: 'x', handicap: '54.0', bio: 'x', avatarSeed: 'emerald', courseId: 'r1', sips,
  totalSips: 0, totalToPar: 0, thruHoles: 0,
});

test('banor kan ha 1–18 hål', () => {
  assert.equal(createBlankHolesForCourse('c', 'u', 5).length, 5);
  assert.equal(createBlankHolesForCourse('c', 'u', 30).length, 18);
  assert.equal(createBlankHolesForCourse('c', 'u').length, 9);
  assert.equal(courseHoleCount(undefined), 9);
  assert.equal(courseHoleCount({ holeCount: 12 }), 12);
  assert.equal(courseHoleCount({ holeCount: 99 }), 18);
});

test('summering räknar alla hål på banan, inte bara 9', () => {
  const s12 = calculateRoundSummary(new Array(12).fill(3), holes(12));
  assert.equal(s12.thruHoles, 12);
  assert.equal(s12.totalCoursePar, 36);
  assert.equal(s12.totalToPar, 0);
  const s5 = calculateRoundSummary([2, 2, 2, 2, 2, 0, 0, 0, 0], holes(5));
  assert.equal(s5.thruHoles, 5);
  assert.equal(s5.totalToPar, -5);
});

test('HCP och vinst funkar på kortare banor (omräknat till 9 hål)', () => {
  const h = holes(6);
  const course: PubCourse = {
    courseId: 'r1', appId: 'december-links', inviteCode: 'PG-AAAA', title: 'Kort', subtitle: 'x', city: 'Söder',
    eventDate: '2026-11-27', ownerId: 'u1', ownerName: 'F',
  };
  const a = player('a', [2, 2, 2, 2, 2, 2]); // -6 på 6 hål
  const b = player('b', [3, 3, 3, 3, 3, 3]);
  const stats = calculatePlayerCareerStats('a', [course], { r1: [a, b] }, { r1: h });
  assert.equal(stats.completedRounds, 1);
  assert.equal(stats.wins, 1);
  // -6 på 6 hål = -9 på 9 hål = -18 på 18 → plushandicap 18
  assert.equal(stats.computedHandicap, '+18.0');
});

test('byta plats och vända ordning på hål', () => {
  assert.deepEqual(moveHole(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveHole(['a', 'b', 'c'], 2, 1), ['a', 'c', 'b']);
  assert.deepEqual(moveHole(['a', 'b'], 0, -1), ['a', 'b']);
  const rev = holesFromOverrides([...holes(3)].reverse().map(holeToOverride), 'c1', 'u1');
  assert.deepEqual(rev.map((x) => x.holeNumber), [1, 2, 3]);
  assert.deepEqual(rev.map((x) => x.pubName), ['Bar 3', 'Bar 2', 'Bar 1']);
});

test('banans hål kapas/fylls till antalet hål', () => {
  const loaded = holes(9);
  assert.equal(courseHolesInPlay('c1', 'u1', loaded, 6).length, 6);
  const filled = courseHolesInPlay('c1', 'u1', loaded.slice(0, 3), 5);
  assert.equal(filled.length, 5);
  assert.equal(filled[0].pubName, 'Bar 1');
  assert.ok(isPlaceholderText(filled[4].pubName));
});

test('platshållartexter och gamla vatten-tipset döljs', () => {
  assert.ok(isPlaceholderText('Hål 12 (Ange pub)'));
  assert.ok(isPlaceholderText('Lycka till – och drick vatten mellan hålen!'));
  assert.ok(!isPlaceholderText('Mästers'));
});

test('deltagare: alltid sipsHole1–9, fler fält för längre banor', () => {
  const p9 = roundParticipantPayload(player('a', [1, 2, 3]), 'PG-AAAA', holes(9));
  assert.equal(p9.sipsHole9, 0);
  assert.equal('sipsHole10' in p9, false);
  const p12 = roundParticipantPayload(player('a', new Array(12).fill(2)), 'PG-AAAA', holes(12));
  assert.equal(p12.sipsHole12, 2);
  assert.equal(p12.thruHoles, 12);
  const p4 = roundParticipantPayload(player('a', [2, 2, 2, 2]), 'PG-AAAA', holes(4));
  assert.equal(p4.sipsHole9, 0);
  assert.equal(p4.thruHoles, 4);
  const back = parseRoundParticipant({ ...p12, uid: 'a' }, 'PG-AAAA');
  assert.equal(back.sips.length, 12);
  assert.equal(parseRoundParticipant({ ...p9, uid: 'a' }, 'PG-AAAA').sips.length, 9);
});

test('runda: egna hål och status avslutad sparas och läses', () => {
  const custom = holes(3).map(holeToOverride);
  const payload = roundPayload({
    roundId: 'PG-AAAA', appId: 'december-links', courseId: 'c1', courseTitle: 'Bana', city: 'Söder',
    eventDate: '2026-11-27', ownerId: 'u1', ownerName: 'F', gameMode: 'single', memberIds: ['u1'],
    locked: true, status: 'finished', customHoles: custom,
  });
  const parsed = parseRound(payload);
  assert.equal(parsed.status, 'finished');
  assert.equal(parsed.customHoles?.length, 3);
  assert.equal(parsed.customHoles?.[2].pubName, 'Bar 3');
  const noCustom = roundPayload({ ...parsed, customHoles: undefined });
  assert.equal('customHoles' in noCustom, false);
});

test('utkast ↔ hål klarar databasens gränser', () => {
  const draft = holeToDraft(createBlankHolesForCourse('c', 'u', 1)[0]);
  assert.equal(draft.pubName, '');
  const o = sanitizeOverride(draftToOverride({ ...draft, par: 9, volumeCl: 500 }, 4));
  assert.equal(o.pubName, 'Hål 5');
  assert.equal(o.par, 6);
  assert.equal(o.volumeCl, 100);
  assert.ok(o.hazardTitle.length >= 2 && o.caddieTip.length >= 2);
});
