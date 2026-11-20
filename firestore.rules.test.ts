import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateHoleInput,
  validatePlayerProfileInput,
  APP_ID,
} from './src/utils/golfRules';

const rulesSource = fs.readFileSync('./firestore.rules', 'utf-8');

interface AuthContext {
  uid: string;
  email_verified: boolean;
}

const SERVER_TIME = 'REQUEST_TIME_TOKEN';

function simulateCourseCreate(
  auth: AuthContext | null,
  courseId: string,
  data: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || auth.email_verified !== true) return 'PERMISSION_DENIED';
  if (!/^[a-zA-Z0-9_\-]+$/.test(courseId) || courseId.length < 1 || courseId.length > 128) {
    return 'PERMISSION_DENIED';
  }
  const requiredKeys = [
    'courseId',
    'appId',
    'inviteCode',
    'title',
    'subtitle',
    'city',
    'eventDate',
    'ownerId',
    'ownerName',
    'updatedAt',
  ];
  const keys = Object.keys(data);
  if (keys.length !== requiredKeys.length || !requiredKeys.every((k) => keys.includes(k))) {
    return 'PERMISSION_DENIED';
  }
  if (data.courseId !== courseId) return 'PERMISSION_DENIED';
  if (data.appId !== APP_ID) return 'PERMISSION_DENIED';
  if (
    typeof data.inviteCode !== 'string' ||
    !/^[A-Z0-9\-]+$/.test(data.inviteCode) ||
    data.inviteCode.length < 4 ||
    data.inviteCode.length > 16
  ) {
    return 'PERMISSION_DENIED';
  }
  if (data.ownerId !== auth.uid) return 'PERMISSION_DENIED';
  if (data.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';
  if (typeof data.title !== 'string' || data.title.length < 2 || data.title.length > 80) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOW';
}

function simulateParticipantWrite(
  auth: AuthContext | null,
  courseId: string,
  playerId: string,
  data: Record<string, unknown>,
  existingOwnerUid?: string
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || auth.email_verified !== true) return 'PERMISSION_DENIED';
  if (!/^[a-zA-Z0-9_\-]+$/.test(courseId) || !/^[a-zA-Z0-9_\-]+$/.test(playerId)) {
    return 'PERMISSION_DENIED';
  }
  if (existingOwnerUid && existingOwnerUid !== auth.uid) return 'PERMISSION_DENIED';
  if (data.uid !== auth.uid || data.uid !== playerId) return 'PERMISSION_DENIED';
  if (data.courseId !== courseId) return 'PERMISSION_DENIED';
  if (data.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';

  const allowedKeys = [
    'uid',
    'courseId',
    'displayName',
    'nickname',
    'country',
    'homePub',
    'signatureDrink',
    'favoriteClub',
    'handicap',
    'bio',
    'avatarSeed',
    'sipsHole1',
    'sipsHole2',
    'sipsHole3',
    'sipsHole4',
    'sipsHole5',
    'sipsHole6',
    'sipsHole7',
    'sipsHole8',
    'sipsHole9',
    'totalSips',
    'totalToPar',
    'thruHoles',
    'updatedAt',
  ];
  const keys = Object.keys(data);
  if (keys.length !== allowedKeys.length || !allowedKeys.every((k) => keys.includes(k))) {
    return 'PERMISSION_DENIED';
  }
  if (typeof data.bio !== 'string' || data.bio.length < 2 || data.bio.length > 320) {
    return 'PERMISSION_DENIED';
  }
  for (let i = 1; i <= 9; i++) {
    const val = data[`sipsHole${i}`];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 25) {
      return 'PERMISSION_DENIED';
    }
  }
  return 'ALLOW';
}

test('firestore.rules contains all mandatory 8-Pillar structural gates for multi-round schema', () => {
  assert.ok(rulesSource.includes("rules_version = '2';"));
  assert.ok(rulesSource.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  assert.ok(rulesSource.includes('request.auth.token.email_verified == true'));
  assert.ok(rulesSource.includes('isValidProfile(incoming(), userId)'));
  assert.ok(rulesSource.includes('isValidCourse(incoming(), courseId)'));
  assert.ok(rulesSource.includes('isValidHole(incoming(), courseId)'));
  assert.ok(rulesSource.includes('isValidParticipant(incoming(), courseId, playerId)'));
  assert.ok(!rulesSource.includes('email is string'), 'No PII email field in public rules');
});

test('Dirty Dozen Payloads all return PERMISSION_DENIED', () => {
  const validParticipantPayload: Record<string, unknown> = {
    uid: 'user_A',
    courseId: 'course_1',
    displayName: 'Spelare A',
    nickname: 'Links',
    country: 'Stockholm',
    homePub: 'Puben',
    signatureDrink: 'Lager',
    favoriteClub: 'Driver',
    handicap: '+1.5',
    bio: 'Redo för rundan.',
    avatarSeed: 'emerald',
    sipsHole1: 3,
    sipsHole2: 0,
    sipsHole3: 0,
    sipsHole4: 0,
    sipsHole5: 0,
    sipsHole6: 0,
    sipsHole7: 0,
    sipsHole8: 0,
    sipsHole9: 0,
    totalSips: 3,
    totalToPar: -1,
    thruHoles: 1,
    updatedAt: SERVER_TIME,
  };

  // 1. Identity Spoofing on Course Create
  assert.equal(
    simulateCourseCreate(
      { uid: 'user_A', email_verified: true },
      'course_1',
      {
        courseId: 'course_1',
        appId: APP_ID,
        inviteCode: 'PG-1234',
        title: 'December Links',
        subtitle: 'Pubgolf 2026',
        city: 'Stockholm',
        eventDate: '2026-12-12',
        ownerId: 'user_B',
        ownerName: 'User B',
        updatedAt: SERVER_TIME,
      }
    ),
    'PERMISSION_DENIED'
  );

  // 2. Unverified Email Write
  assert.equal(
    simulateParticipantWrite(
      { uid: 'user_A', email_verified: false },
      'course_1',
      'user_A',
      validParticipantPayload
    ),
    'PERMISSION_DENIED'
  );

  // 3. Shadow Field / Ghost Property Injection
  assert.equal(
    simulateParticipantWrite(
      { uid: 'user_A', email_verified: true },
      'course_1',
      'user_A',
      { ...validParticipantPayload, isAdmin: true, email: 'leak@example.com' }
    ),
    'PERMISSION_DENIED'
  );

  // 4. Path Poisoning Attack
  assert.equal(
    simulateParticipantWrite(
      { uid: 'user_A', email_verified: true },
      'course_1',
      'bad$path!id*with*spaces',
      validParticipantPayload
    ),
    'PERMISSION_DENIED'
  );

  // 5. Cross-Player Score Tampering
  assert.equal(
    simulateParticipantWrite(
      { uid: 'user_A', email_verified: true },
      'course_1',
      'user_B',
      { ...validParticipantPayload, uid: 'user_B' },
      'user_B'
    ),
    'PERMISSION_DENIED'
  );

  // 6. Value Poisoning on Score Update
  assert.equal(
    simulateParticipantWrite(
      { uid: 'user_A', email_verified: true },
      'course_1',
      'user_A',
      { ...validParticipantPayload, sipsHole1: 999 }
    ),
    'PERMISSION_DENIED'
  );

  // 7. Invalid Hole Par Out-of-Bounds
  assert.equal(
    validateHoleInput({
      pubName: 'Bishops Arms',
      pubAddress: 'Vasagatan 7',
      drinkName: 'IPA',
      drinkType: 'ipa',
      volumeCl: 40,
      par: 99,
      lengthMeters: 350,
      shape: 'straight',
      hazardTitle: 'Trappan',
      hazardRule: '+1 slag',
      caddieTip: 'Lugnt tempo',
    }).valid,
    false
  );

  // 8. Immutable Owner Transfer attempt
  assert.equal(
    simulateParticipantWrite(
      { uid: 'user_A', email_verified: true },
      'course_1',
      'user_A',
      { ...validParticipantPayload, uid: 'user_C' },
      'user_A'
    ),
    'PERMISSION_DENIED'
  );

  // 9. Client Timestamp Forgery
  assert.equal(
    simulateParticipantWrite(
      { uid: 'user_A', email_verified: true },
      'course_1',
      'user_A',
      { ...validParticipantPayload, updatedAt: '2020-01-01T00:00:00Z' }
    ),
    'PERMISSION_DENIED'
  );

  // 10. Denial-of-Wallet Oversized Bio String
  assert.equal(
    simulateParticipantWrite(
      { uid: 'user_A', email_verified: true },
      'course_1',
      'user_A',
      { ...validParticipantPayload, bio: 'X'.repeat(2000) }
    ),
    'PERMISSION_DENIED'
  );

  // 11. Invalid Player Profile Empty Fields
  assert.equal(
    validatePlayerProfileInput({
      displayName: 'A',
      nickname: '',
      country: 'SE',
      homePub: 'Pub',
      signatureDrink: 'Ale',
      favoriteClub: 'Driver',
      handicap: '1',
      bio: 'Bio',
    }).valid,
    false
  );

  // 12. Invalid Invite Code on Course Creation
  assert.equal(
    simulateCourseCreate(
      { uid: 'user_A', email_verified: true },
      'course_1',
      {
        courseId: 'course_1',
        appId: APP_ID,
        inviteCode: 'bad code with spaces!',
        title: 'December Links',
        subtitle: 'Pubgolf 2026',
        city: 'Stockholm',
        eventDate: '2026-12-12',
        ownerId: 'user_A',
        ownerName: 'User A',
        updatedAt: SERVER_TIME,
      }
    ),
    'PERMISSION_DENIED'
  );
});
