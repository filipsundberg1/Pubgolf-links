import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateGolfHoleScore,
  calculateRoundSummary,
  buildLeaderboard,
  mergeTourProfiles,
  calculatePlayerCareerStats,
  validateHoleInput,
  validatePlayerProfileInput,
  validateCourseCreationInput,
  createBlankHolesForCourse,
  generateInviteCode,
  parseAvatarSeed,
  serializeAvatarConfig,
  isGearUnlocked,
  GEAR_CATALOG,
  generatePlayerCode,
  generateRoundCode,
  normalizePlayerCode,
  roundAsCourse,
  ROUND_CODE_PATTERN,
  PLAYER_CODE_PATTERN,
  buildScoreCelebrationClip,
  type PubCourse,
  type PubHole,
  type PlayerTourProfile,
  type ReusablePlayerProfile,
} from './golfRules';

const mockHoles: PubHole[] = Array.from({ length: 9 }, (_, idx) => ({
  holeNumber: idx + 1,
  courseId: 'round-1',
  ownerId: 'owner-1',
  pubName: `Pub ${idx + 1}`,
  pubAddress: `Storgatan ${idx + 1}`,
  drinkName: 'Guinness Draught',
  drinkType: 'stout',
  volumeCl: 40,
  par: idx === 8 ? 1 : idx % 2 === 0 ? 4 : 5,
  lengthMeters: 380,
  shape: 'dogleg-right',
  hazardTitle: 'Bunker vid garderoben',
  hazardRule: '+1 klunk vid spill',
  caddieTip: 'Håll blicken på pinnen',
}));

test('evaluateGolfHoleScore returns accurate golf terminology', () => {
  assert.equal(evaluateGolfHoleScore(0, 4).key, 'unplayed');
  assert.equal(evaluateGolfHoleScore(1, 4).key, 'hole-in-one');
  assert.equal(evaluateGolfHoleScore(2, 5).key, 'albatross');
  assert.equal(evaluateGolfHoleScore(2, 5).diffFormatted, '-3');
  assert.equal(evaluateGolfHoleScore(2, 4).key, 'eagle');
  assert.equal(evaluateGolfHoleScore(3, 4).key, 'birdie');
  assert.equal(evaluateGolfHoleScore(4, 4).key, 'par');
  assert.equal(evaluateGolfHoleScore(4, 4).diffFormatted, 'E');
  assert.equal(evaluateGolfHoleScore(5, 4).key, 'bogey');
  assert.equal(evaluateGolfHoleScore(6, 4).key, 'double-bogey');
  assert.equal(evaluateGolfHoleScore(7, 4).key, 'triple-bogey-plus');
});

test('createBlankHolesForCourse and generateInviteCode produce valid structures', () => {
  const code = generateInviteCode(12345);
  assert.match(code, /^PG-[A-Z0-9]{4}$/);

  const holes = createBlankHolesForCourse('course-abc', 'user-1');
  assert.equal(holes.length, 9);
  assert.equal(holes[0].holeNumber, 1);
  assert.equal(holes[8].holeNumber, 9);
  assert.equal(validateHoleInput(holes[0]).valid, true);
});

test('calculateRoundSummary computes front 5, back 4, total sips, and relative to par', () => {
  const sips = [3, 2, 5, 0, 0, 0, 0, 0, 0];
  const summary = calculateRoundSummary(sips, mockHoles);

  assert.equal(summary.thruHoles, 3);
  assert.equal(summary.totalSips, 10);
  assert.equal(summary.totalParPlayed, 13);
  assert.equal(summary.totalToPar, -3);
  assert.equal(summary.toParFormatted, '-3');
  assert.equal(summary.birdies, 1);
  assert.equal(summary.acesAndAlbatrosses, 1);
  assert.equal(summary.bogeys, 1);
});

test('buildLeaderboard ranks players by score to par and marks ties with T prefix', () => {
  const players: PlayerTourProfile[] = [
    {
      uid: 'p1',
      appId: 'december-links',
      courseId: 'round-1',
      displayName: 'Spelare Ett',
      nickname: 'Ettan',
      country: 'Stockholm',
      homePub: 'Pub A',
      signatureDrink: 'Lager',
      favoriteClub: 'Driver',
      handicap: '+1.0',
      bio: 'Stabil.',
      avatarSeed: 'emerald',
      sips: [4, 5, 0, 0, 0, 0, 0, 0, 0],
      totalSips: 9,
      totalToPar: 0,
      thruHoles: 2,
    },
    {
      uid: 'p2',
      appId: 'december-links',
      courseId: 'round-1',
      displayName: 'Spelare Två',
      nickname: 'Tvåan',
      country: 'Göteborg',
      homePub: 'Pub B',
      signatureDrink: 'IPA',
      favoriteClub: '3-Wood',
      handicap: '+2.0',
      bio: 'Aggressiv.',
      avatarSeed: 'gold',
      sips: [3, 4, 0, 0, 0, 0, 0, 0, 0],
      totalSips: 7,
      totalToPar: -2,
      thruHoles: 2,
    },
    {
      uid: 'p3',
      appId: 'december-links',
      courseId: 'round-1',
      displayName: 'Spelare Tre',
      nickname: 'Trean',
      country: 'Malmö',
      homePub: 'Pub C',
      signatureDrink: 'Stout',
      favoriteClub: 'Spoon',
      handicap: '+1.5',
      bio: 'Lugn.',
      avatarSeed: 'navy',
      sips: [4, 5, 0, 0, 0, 0, 0, 0, 0],
      totalSips: 9,
      totalToPar: 0,
      thruHoles: 2,
    },
  ];

  const board = buildLeaderboard(players, mockHoles);
  assert.equal(board[0].player.uid, 'p2');
  assert.equal(board[0].positionLabel, '1');
  assert.equal(board[1].positionLabel, 'T2');
  assert.equal(board[2].positionLabel, 'T2');
});

test('mergeTourProfiles combines course participants and global profiles without losing any player', () => {
  const filipParticipant: PlayerTourProfile = {
    uid: 'uid-filip',
    appId: 'december-links',
    courseId: 'round-1',
    displayName: 'Filip',
    nickname: 'The Skanstull Slugger',
    country: 'Stockholm',
    homePub: 'Tudor Arms',
    signatureDrink: 'Guinness',
    favoriteClub: 'Driver',
    handicap: '+1.5',
    bio: 'Stabil spelare.',
    avatarSeed: 'gold',
    sips: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    totalSips: 3,
    totalToPar: -1,
    thruHoles: 1,
  };

  const adamProfile: ReusablePlayerProfile = {
    uid: 'uid-adam',
    appId: 'december-links',
    displayName: 'Adam Larsson',
    nickname: 'Lakanga',
    country: 'Furulund',
    homePub: 'Milas Pizzeria',
    signatureDrink: 'Malaga Victoria',
    favoriteClub: 'Högertassen',
    handicap: '+1.5',
    bio: 'Öl.',
    avatarSeed: 'emerald',
  };

  const merged = mergeTourProfiles(
    [adamProfile],
    [filipParticipant],
    adamProfile,
    'round-1',
    'uid-adam'
  );

  assert.equal(merged.length, 2);
  assert.equal(merged[0].uid, 'uid-adam');
  assert.equal(merged[0].displayName, 'Adam Larsson');
  assert.equal(merged[1].uid, 'uid-filip');
  assert.equal(merged[1].displayName, 'Filip');
  assert.equal(merged[1].sips[0], 3);
});

test('validators reject invalid course, hole, and profile inputs', () => {
  assert.equal(validateHoleInput({ pubName: 'A', par: 9 }).valid, false);
  assert.equal(validateHoleInput(mockHoles[0]).valid, true);
  assert.equal(
    validateCourseCreationInput({ title: '', subtitle: ' Kort ', city: 'Sthlm', eventDate: '12 dec' })
      .valid,
    false
  );
  assert.equal(
    validateCourseCreationInput({
      title: 'Pubgolfrunda 1',
      subtitle: '9 hål i december',
      city: 'Stockholm',
      eventDate: '12 dec 2026',
    }).valid,
    true
  );
  assert.equal(
    validatePlayerProfileInput({
      displayName: '',
      nickname: 'Ace',
      country: 'Sverige',
      homePub: 'Pub',
      signatureDrink: 'Stout',
      favoriteClub: 'Putter',
      bio: 'Kort bio',
    }).valid,
    false
  );
});

test('calculatePlayerCareerStats computes automatic handicap as average across played rounds', () => {
  const courses: PubCourse[] = [
    {
      courseId: 'round-1',
      appId: 'december-links',
      inviteCode: 'PG-1111',
      title: 'Södermalm Open',
      subtitle: 'Runda 1',
      city: 'Stockholm',
      eventDate: '5 dec',
      ownerId: 'u1',
      ownerName: 'Adam',
    },
    {
      courseId: 'round-2',
      appId: 'december-links',
      inviteCode: 'PG-2222',
      title: 'Uppsala Masters',
      subtitle: 'Runda 2',
      city: 'Uppsala',
      eventDate: '12 dec',
      ownerId: 'u1',
      ownerName: 'Adam',
    },
  ];

  const holesByCourse: Record<string, PubHole[]> = {
    'round-1': mockHoles, // hole 1 par 4, hole 2 par 5
    'round-2': mockHoles,
  };

  // Unplayed player gets 0.0 handicap and 0 rounds played
  const emptyStats = calculatePlayerCareerStats('u-new', courses, {}, holesByCourse);
  assert.equal(emptyStats.roundsPlayed, 0);
  assert.equal(emptyStats.computedHandicap, '0.0');
  assert.equal(emptyStats.averageToPar, null);

  // Player u1: Round 1 is -3 (sips [3, 3, ...]), Round 2 is +1 (sips [5, 5, ...]) -> Average is (-3 + +1)/2 = -1.0
  const participantsByCourse: Record<string, PlayerTourProfile[]> = {
    'round-1': [
      {
        uid: 'u1',
        appId: 'december-links',
        courseId: 'round-1',
        displayName: 'Adam Larsson',
        nickname: 'Lakanga',
        country: 'Furulund',
        homePub: 'Milas Pizzeria',
        signatureDrink: 'Malaga Victoria',
        favoriteClub: 'Högertassen',
        handicap: '0.0',
        bio: 'Öl.',
        avatarSeed: 'emerald',
        sips: [3, 3, 0, 0, 0, 0, 0, 0, 0], // par 4 + par 5 = 9, sips = 6 -> -3
        totalSips: 6,
        totalToPar: -3,
        thruHoles: 2,
      },
    ],
    'round-2': [
      {
        uid: 'u1',
        appId: 'december-links',
        courseId: 'round-2',
        displayName: 'Adam Larsson',
        nickname: 'Lakanga',
        country: 'Furulund',
        homePub: 'Milas Pizzeria',
        signatureDrink: 'Malaga Victoria',
        favoriteClub: 'Högertassen',
        handicap: '0.0',
        bio: 'Öl.',
        avatarSeed: 'emerald',
        sips: [5, 5, 0, 0, 0, 0, 0, 0, 0], // par 4 + par 5 = 9, sips = 10 -> +1
        totalSips: 10,
        totalToPar: 1,
        thruHoles: 2,
      },
    ],
  };

  const stats = calculatePlayerCareerStats('u1', courses, participantsByCourse, holesByCourse);
  assert.equal(stats.roundsPlayed, 2);
  assert.equal(stats.totalHolesPlayed, 4);
  assert.equal(stats.averageToPar, -1);
  assert.equal(stats.computedHandicap, '-1.0');
  assert.equal(stats.bestRound?.title, 'Södermalm Open');
  assert.equal(stats.bestRound?.toParFormatted, '-3');
});

test('parseAvatarSeed and serializeAvatarConfig support legacy themes and full 5-part custom golfer avatars', () => {
  // Legacy single-word seed
  const legacy = parseAvatarSeed('gold');
  assert.equal(legacy.jacket, 'gold');
  assert.equal(legacy.hat, 'flatcap');
  assert.equal(legacy.pants, 'plaid');
  assert.equal(legacy.skin, 'warm');
  assert.equal(legacy.accessory, 'clean');

  // Full custom avatar round-trip
  const custom = {
    jacket: 'burgundy' as const,
    hat: 'bucket' as const,
    pants: 'loud' as const,
    skin: 'deep' as const,
    accessory: 'sunglasses' as const,
    gear: 'driver' as const,
  };
  const serialized = serializeAvatarConfig(custom);
  assert.equal(serialized, 'bg-bk-ld-dp-sg');
  assert.equal(serialized.length <= 32, true);

  const parsed = parseAvatarSeed(serialized);
  assert.deepEqual(parsed, custom);
});

test('avatar gear round-trips in the seed and unlocks from career stats', () => {
  const withJug = serializeAvatarConfig({ ...parseAvatarSeed('bg-bk-ld-dp-sg'), gear: 'jug' });
  assert.equal(withJug, 'bg-bk-ld-dp-sg-jg');
  assert.equal(parseAvatarSeed(withJug).gear, 'jug');
  assert.equal(parseAvatarSeed('bg-bk-ld-dp-sg').gear, 'driver');
  assert.equal(parseAvatarSeed('bg-bk-ld-dp-sg-zz').gear, 'driver');

  const rookie = { roundsPlayed: 0, careerBirdies: 0, careerEagles: 0, careerAcesAndAlbatrosses: 0 };
  assert.equal(isGearUnlocked('driver', null), true);
  assert.equal(isGearUnlocked('putter', rookie), false);
  assert.equal(isGearUnlocked('putter', null), false);

  const regular = { roundsPlayed: 3, careerBirdies: 9, careerEagles: 1, careerAcesAndAlbatrosses: 0 };
  assert.equal(isGearUnlocked('putter', regular), true);
  assert.equal(isGearUnlocked('umbrella', regular), true);
  assert.equal(isGearUnlocked('flag', regular), true);
  assert.equal(isGearUnlocked('golden', regular), true);
  assert.equal(isGearUnlocked('jug', regular), true);
  assert.equal(isGearUnlocked('golden', { ...regular, careerBirdies: 8 }), false);
  assert.equal(GEAR_CATALOG.length, 6);
});

test('buildScoreCelebrationClip generates celebratory bowling clips for Birdie/Ace and roasting clips for Bogey+', () => {
  const birdieClip = buildScoreCelebrationClip({
    playerUid: 'u1',
    playerName: 'Adam Larsson',
    playerNickname: 'Lakanga',
    avatarSeed: 'em-fc-pl-wm-ms',
    holeNumber: 3,
    pubName: 'Tudor Arms',
    drinkName: 'Guinness',
    sips: 3,
    par: 4,
  });
  assert.equal(birdieClip.evalResult.key, 'birdie');
  assert.equal(birdieClip.pose, 'celebrate');
  assert.equal(birdieClip.themeColor, 'emerald');
  assert.match(birdieClip.headline, /SNYGG BIRDIE/i);

  const bogeyClip = buildScoreCelebrationClip({
    playerUid: 'u1',
    playerName: 'Adam Larsson',
    playerNickname: 'Lakanga',
    avatarSeed: 'em-fc-pl-wm-ms',
    holeNumber: 4,
    pubName: 'O’Neills',
    drinkName: 'Carlsberg',
    sips: 5,
    par: 4,
  });
  assert.equal(bogeyClip.evalResult.key, 'bogey');
  assert.equal(bogeyClip.pose, 'sweat');
  assert.equal(bogeyClip.themeColor, 'amber');
  assert.match(bogeyClip.commentary, /fegisklunk/i);

  const disasterClip = buildScoreCelebrationClip({
    playerUid: 'u2',
    playerName: 'Filip',
    playerNickname: 'Slugger',
    avatarSeed: 'go-cp-nv-lt-bd',
    holeNumber: 5,
    pubName: 'Bara 2.Noll',
    drinkName: 'Stor stark',
    sips: 7,
    par: 4,
  });
  assert.equal(disasterClip.evalResult.key, 'triple-bogey-plus');
  assert.equal(disasterClip.pose, 'disaster');
  assert.equal(disasterClip.themeColor, 'crimson');
  assert.match(disasterClip.headline, /RÄNNSLAG/i);
});

test('isHoleAddressConfigured, buildHoleSearchQuery, and buildPubGolfRouteLegs handle blank and configured pub addresses', async () => {
  const {
    isHoleAddressConfigured,
    buildHoleSearchQuery,
    buildPubGolfRouteLegs,
    formatRouteDistance,
    formatRouteDuration,
  } = await import('./golfRules');

  const blankHoles = createBlankHolesForCourse('round-x', 'owner-1');
  assert.equal(isHoleAddressConfigured(blankHoles[0]), false);

  const configuredHoles = blankHoles.map((h, i) =>
    i < 3
      ? {
          ...h,
          pubName: `Pub Stopp ${i + 1}`,
          pubAddress: `Götgatan ${10 + i}`,
        }
      : h
  );

  assert.equal(isHoleAddressConfigured(configuredHoles[0]), true);
  assert.equal(
    buildHoleSearchQuery(configuredHoles[0], 'Stockholm'),
    'Pub Stopp 1, Götgatan 10, Stockholm'
  );

  const legs = buildPubGolfRouteLegs(configuredHoles, 'Stockholm');
  assert.equal(legs.length, 2);
  assert.equal(legs[0].fromHoleNumber, 1);
  assert.equal(legs[0].toHoleNumber, 2);
  assert.equal(legs[1].fromHoleNumber, 2);
  assert.equal(legs[1].toHoleNumber, 3);
  assert.match(legs[0].googleMapsDirectionsUrl, /travelmode=walking/);

  assert.equal(formatRouteDistance(420), '420 m');
  assert.equal(formatRouteDistance(1450), '1.5 km');
  assert.equal(formatRouteDuration(360000), '6 min');
});

test('buildBrutalBallLeaderboard combines 2-player team scores and pairs unassigned players 2 & 2', async () => {
  const { buildBrutalBallLeaderboard } = await import('./golfRules');
  const holes = createBlankHolesForCourse('round-brutal', 'owner-1'); // All 9 holes Par 4

  const players = [
    {
      uid: 'u1',
      appId: 'december-links',
      courseId: 'round-brutal',
      displayName: 'Adam Larsson',
      nickname: 'Lakanga',
      country: 'Stockholm',
      homePub: 'Milas',
      signatureDrink: 'Lager',
      favoriteClub: 'Driver',
      handicap: '0.0',
      bio: 'Redo',
      avatarSeed: 'emerald',
      teamId: 'team-alpha',
      teamName: 'Bärs & Birdie',
      sips: [3, 4, 0, 0, 0, 0, 0, 0, 0], // -1 on H1, E on H2 => -1 total (7 sips)
      totalSips: 7,
      totalToPar: -1,
      thruHoles: 2,
    },
    {
      uid: 'u2',
      appId: 'december-links',
      courseId: 'round-brutal',
      displayName: 'Filip',
      nickname: 'Slugger',
      country: 'Stockholm',
      homePub: 'Bara 2.Noll',
      signatureDrink: 'Stor stark',
      favoriteClub: 'Wedge',
      handicap: '0.0',
      bio: 'Redo',
      avatarSeed: 'gold',
      teamId: 'team-alpha',
      teamName: 'Bärs & Birdie',
      sips: [3, 5, 0, 0, 0, 0, 0, 0, 0], // -1 on H1, +1 on H2 => 0 total (8 sips)
      totalSips: 8,
      totalToPar: 0,
      thruHoles: 2,
    },
    {
      uid: 'u3',
      appId: 'december-links',
      courseId: 'round-brutal',
      displayName: 'David Palmér',
      nickname: 'DP',
      country: 'Uppsala',
      homePub: 'ONeills',
      signatureDrink: 'Carlsberg',
      favoriteClub: 'Putter',
      handicap: '0.0',
      bio: 'Redo',
      avatarSeed: 'navy',
      sips: [5, 5, 0, 0, 0, 0, 0, 0, 0], // +2 total (10 sips)
      totalSips: 10,
      totalToPar: 2,
      thruHoles: 2,
    },
    {
      uid: 'u4',
      appId: 'december-links',
      courseId: 'round-brutal',
      displayName: 'Erik',
      nickname: 'Ekan',
      country: 'Stockholm',
      homePub: 'Tudor',
      signatureDrink: 'Guinness',
      favoriteClub: 'Järn 7',
      handicap: '0.0',
      bio: 'Redo',
      avatarSeed: 'burgundy',
      sips: [4, 4, 0, 0, 0, 0, 0, 0, 0], // 0 total (8 sips)
      totalSips: 8,
      totalToPar: 0,
      thruHoles: 2,
    },
  ];

  const teamRows = buildBrutalBallLeaderboard(players, holes);
  assert.equal(teamRows.length, 2);

  // Team 1: Bärs & Birdie (Adam -1 + Filip 0 = -1, totalSips = 7 + 8 = 15)
  assert.equal(teamRows[0].teamName, 'Bärs & Birdie');
  assert.equal(teamRows[0].isAutoPaired, false);
  assert.equal(teamRows[0].members.length, 2);
  assert.equal(teamRows[0].totalSips, 15);
  assert.equal(teamRows[0].totalToPar, -1);
  assert.equal(teamRows[0].toParFormatted, '-1');
  assert.equal(teamRows[0].holeSips[0], 6); // 3 + 3 on Hole 1 (Par 8 combined)
  assert.equal(teamRows[0].holeEffectivePars[0], 8);
  assert.equal(teamRows[0].holeSips[1], 9); // 4 + 5 on Hole 2 (Par 8 combined)

  // Team 2: Auto-paired David & Erik (+2 + 0 = +2, totalSips = 18)
  assert.equal(teamRows[1].isAutoPaired, true);
  assert.equal(teamRows[1].members.length, 2);
  assert.equal(teamRows[1].totalSips, 18);
  assert.equal(teamRows[1].totalToPar, 2);
  assert.equal(teamRows[1].toParFormatted, '+2');
});



test('player codes use initials + 4 digits and round codes match the rules pattern', () => {
  assert.equal(generatePlayerCode('Filip Sundberg', () => 0.4821), 'FS4821');
  assert.equal(generatePlayerCode('Åsa Öberg', () => 0.0007), 'AO0007');
  assert.equal(generatePlayerCode('Adam', () => 0.1234), 'AD1234');
  assert.equal(generatePlayerCode('', () => 0.5), 'PG5000');
  assert.equal(generatePlayerCode('Anna Maria von Ek', () => 0.99999), 'AE9999');
  for (let i = 0; i < 50; i++) {
    assert.ok(PLAYER_CODE_PATTERN.test(generatePlayerCode('Kalle Anka')));
    assert.ok(ROUND_CODE_PATTERN.test(generateRoundCode()));
  }
  assert.equal(normalizePlayerCode(' fs-4821 '), 'FS4821');
});

test('roundAsCourse uses the round code as id and the live course title', () => {
  const round = {
    roundId: 'PG-ABC234', appId: 'december-links', courseId: 'course-1', courseTitle: 'Gammal titel',
    city: 'Söder', eventDate: '2026-11-27', ownerId: 'u1', ownerName: 'Filip', gameMode: 'brutal' as const,
    memberIds: ['u1'], locked: false, status: 'active' as const,
  };
  const asCourse = roundAsCourse(round, null);
  assert.equal(asCourse.courseId, 'PG-ABC234');
  assert.equal(asCourse.inviteCode, 'PG-ABC234');
  assert.equal(asCourse.title, 'Gammal titel');
  assert.equal(asCourse.gameMode, 'brutal');
  const withCourse = roundAsCourse(round, { ...asCourse, courseId: 'course-1', title: 'December Links', isPublic: true });
  assert.equal(withCourse.title, 'December Links');
  assert.equal(withCourse.isPublic, true);
});
