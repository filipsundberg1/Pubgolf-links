/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { LogIn } from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  reportFirestoreError,
  isInAppBrowser,
  OperationType,
} from './lib/firebase';
import {
  ADMIN_UIDS,
  APP_ID,
  MAX_HOLES,
  MAX_PENALTIES,
  PENALTY_TYPES,
  type PenaltyEvent,
  type PenaltyType,
  ROUND_CODE_PATTERN,
  buildLeaderboard,
  buildScoreCelebrationClip,
  courseHoleCount,
  courseHolesInPlay,
  holeToOverride,
  holesFromOverrides,
  calculatePlayerCareerStats,
  calculateRoundSummary,
  createBlankHolesForCourse,
  generateInviteCode,
  generatePlayerCode,
  generateRoundCode,
  isGearUnlocked,
  mergeTourProfiles,
  parseAvatarSeed,
  serializeAvatarConfig,
  STARTING_HANDICAP,
  formatHandicap,
  formatEventDate,
  normalizePlayerCode,
  roundAsCourse,
  type FollowEdge,
  type PlayerCareerStats,
  type PlayerTourProfile,
  type PubCourse,
  type PubGolfGameMode,
  type PubHole,
  type PubRound,
  type ReusablePlayerProfile,
  type ScoreCelebrationClip,
} from './utils/golfRules';
import {
  coursePayload,
  emptySips,
  sanitizeOverride,
  holePayload,
  parseCourse,
  parseHole,
  parseLegacyParticipant,
  parseProfile,
  parseRound,
  parseRoundParticipant,
  profilePayload,
  roundParticipantPayload,
  roundPayload,
} from './lib/tourData';
import { HERO_CLUBHOUSE_IMG } from './data/defaultTourData';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AppHeader } from './components/shell/AppHeader';
import { BrandMark } from './components/shell/BrandMark';
import { HomeView } from './components/views/HomeView';
import { CreateCourseView, type CreateCourseInput } from './components/views/CreateCourseView';
import { StartRoundView, type StartRoundInput } from './components/views/StartRoundView';
import { PlayView } from './components/views/PlayView';
import { RoundView } from './components/views/RoundView';
import { RoundManageSheet } from './components/views/RoundManageSheet';
import { MyProfileView, withProfileDefaults, type ProfileHistoryEntry } from './components/views/MyProfileView';
import { AboutView } from './components/views/AboutView';
import { FriendsView } from './components/views/FriendsView';
import { AdminView } from './components/views/AdminView';
import { ExploreView, type Relation } from './components/views/ExploreView';
import { PlayerProfileView } from './components/views/PlayerProfileView';
import { CoursePreviewView } from './components/views/CoursePreviewView';
import { MiniRoundBar } from './components/MiniRoundBar';
import { draftToOverride, holeToDraft, type HoleDraft } from './components/HoleListEditor';

// Laddas först när de behövs
const BowlingScoreAnimationOverlay = lazy(() =>
  import('./components/BowlingScoreAnimationOverlay').then((m) => ({ default: m.BowlingScoreAnimationOverlay }))
);

type View =
  | 'home'
  | 'create'
  | 'start'
  | 'play'
  | 'round'
  | 'profile'
  | 'players'
  | 'player'
  | 'course'
  | 'editCourse'
  | 'about'
  | 'friends'
  | 'admin';

/** Vyn sparas i adressen (#/runda/PG-XXXX) så att man stannar kvar vid omladdning. */
type Route = { view: View; id?: string };
const ROUTE_SLUGS: Record<View, string> = {
  home: '',
  create: 'skapa',
  start: 'starta',
  play: 'spela',
  round: 'runda',
  profile: 'profil',
  players: 'utforska',
  player: 'spelare',
  course: 'bana',
  editCourse: 'redigera',
  about: 'om',
  friends: 'vanner',
  admin: 'admin',
};
const VIEWS_WITH_ID: View[] = ['round', 'start', 'player', 'course', 'editCourse'];
const parseHash = (): Route => {
  try {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const [slug, ...rest] = raw.split('/');
    const view = (Object.keys(ROUTE_SLUGS) as View[]).find((v) => ROUTE_SLUGS[v] === slug) || 'home';
    const id = decodeURIComponent(rest.join('/'));
    if (VIEWS_WITH_ID.includes(view) && !id) return { view: view === 'round' ? 'play' : 'home' };
    return { view, id: id || undefined };
  } catch {
    return { view: 'home' };
  }
};
const hashFor = (r: Route) => {
  const slug = ROUTE_SLUGS[r.view];
  if (!slug) return '#/';
  return r.id && VIEWS_WITH_ID.includes(r.view) ? `#/${slug}/${encodeURIComponent(r.id)}` : `#/${slug}`;
};

const LIVE_ROUND_KEY = 'pg-live-round';
const PENDING_ADD_KEY = 'pg-pending-add';
const readLiveRound = () => {
  try {
    return localStorage.getItem(LIVE_ROUND_KEY);
  } catch {
    return null;
  }
};

type ProfileFieldsInput = {
  displayName: string;
  nickname: string;
  country: string;
  homePub: string;
  signatureDrink: string;
  favoriteClub: string;
  handicap: string;
  bio: string;
  avatarSeed: string;
};

const roundRef = (roundId: string) => doc(db, 'rounds', roundId);
const participantRef = (roundId: string, uid: string) => doc(db, 'rounds', roundId, 'participants', uid);
const isPermissionError = (err: unknown) => String((err as Error)?.message || '').includes('Missing or insufficient permissions');

export default function App() {
  const [initialJoinParam] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get('join') || params.get('code') || '').trim().toUpperCase();
    } catch {
      return '';
    }
  });
  const [initialRoute] = useState<Route>(() => (initialJoinParam ? { view: 'play' } : parseHash()));
  const idFor = (v: View) => (initialRoute.view === v ? initialRoute.id || null : null);

  const [view, setViewState] = useState<View>(initialRoute.view);
  const [selectedHoleNum, setSelectedHoleNum] = useState<number>(1);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const [myProfile, setMyProfile] = useState<ReusablePlayerProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<ReusablePlayerProfile[]>([]);
  const [courses, setCourses] = useState<PubCourse[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const [holesByCourse, setHolesByCourse] = useState<Record<string, PubHole[]>>({});
  const [rounds, setRounds] = useState<PubRound[]>([]);
  const [roundsLoaded, setRoundsLoaded] = useState(false);
  const [participantsByRound, setParticipantsByRound] = useState<Record<string, PlayerTourProfile[]>>({});
  const [activeRoundId, setActiveRoundId] = useState<string | null>(idFor('round'));
  const [startCourseId, setStartCourseId] = useState<string | null>(idFor('start'));
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(idFor('course'));
  const [editCourseId, setEditCourseId] = useState<string | null>(idFor('editCourse'));
  const [selectedPlayerUid, setSelectedPlayerUid] = useState<string>(idFor('player') || '');
  const [profileTab, setProfileTab] = useState<'rounds' | 'courses'>('rounds');
  // Rundan man spelar just nu – visas som en rad längst ner när den är nedfälld
  const [liveRoundId, setLiveRoundIdState] = useState<string | null>(readLiveRound);
  const setLiveRoundId = (id: string | null) => {
    setLiveRoundIdState(id);
    try {
      if (id) localStorage.setItem(LIVE_ROUND_KEY, id);
      else localStorage.removeItem(LIVE_ROUND_KEY);
    } catch {
      /* privat läge – bara i minnet */
    }
  };

  // Senaste vyn utanför rundan – dit man kommer när rundan fälls ner
  const lastOutsideRoundRef = useRef<Route>(initialRoute.view === 'round' ? { view: 'home' } : initialRoute);
  const applyRoute = (r: Route) => {
    if (r.view !== 'round' && r.view !== 'start') lastOutsideRoundRef.current = r;
    setViewState(r.view);
    if (!r.id) return;
    if (r.view === 'round') setActiveRoundId(r.id);
    if (r.view === 'start') setStartCourseId(r.id);
    if (r.view === 'course') setPreviewCourseId(r.id);
    if (r.view === 'editCourse') setEditCourseId(r.id);
    if (r.view === 'player') setSelectedPlayerUid(r.id);
  };
  /** Byt vy och spara den i adressen (bakåtknappen fungerar). */
  const navigate = (next: View, id?: string, replace = false) => {
    applyRoute({ view: next, id });
    const hash = hashFor({ view: next, id });
    try {
      if (window.location.hash !== hash || window.location.search) {
        const url = `${window.location.pathname}${hash}`;
        if (replace) window.history.replaceState(null, '', url);
        else window.history.pushState(null, '', url);
      }
    } catch {
      /* ignorera */
    }
    window.scrollTo({ top: 0 });
  };
  const setView = (next: View) => navigate(next);

  // Bakåt/framåt i webbläsaren
  useEffect(() => {
    const onPop = () => applyRoute(parseHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // "Lägg till mig"-länk (?add=FS1234). Sparas i sessionStorage så den överlever inloggningen.
  const [pendingAdd, setPendingAddState] = useState<string>(() => {
    try {
      const fromUrl = normalizePlayerCode(new URLSearchParams(window.location.search).get('add') || '');
      if (fromUrl) {
        sessionStorage.setItem(PENDING_ADD_KEY, fromUrl);
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
        return fromUrl;
      }
      return sessionStorage.getItem(PENDING_ADD_KEY) || '';
    } catch {
      return '';
    }
  });
  const setPendingAdd = (code: string) => {
    setPendingAddState(code);
    try {
      if (code) sessionStorage.setItem(PENDING_ADD_KEY, code);
      else sessionStorage.removeItem(PENDING_ADD_KEY);
    } catch {
      /* ignorera */
    }
  };
  const [invitedByUid, setInvitedByUid] = useState<string>('');

  // Ta bort ?join= ur adressen så att en omladdning inte hoppar tillbaka till Spela
  useEffect(() => {
    if (!initialJoinParam) return;
    try {
      window.history.replaceState(null, '', `${window.location.pathname}#/spela`);
    } catch {
      /* ignorera */
    }
  }, [initialJoinParam]);
  const [activeCelebrationClip, setActiveCelebrationClip] = useState<ScoreCelebrationClip | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletedPromptBusy, setDeletedPromptBusy] = useState(false);
  const [followsOut, setFollowsOut] = useState<FollowEdge[]>([]);
  const [followsIn, setFollowsIn] = useState<FollowEdge[]>([]);
  const [bannedUids, setBannedUids] = useState<Set<string>>(new Set());
  const [adminRounds, setAdminRounds] = useState<PubRound[] | null>(null);
  const [invitedRounds, setInvitedRounds] = useState<PubRound[]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);

  useEffect(() => {
    const onSyncError = () =>
      setSyncError('Kunde inte hämta senaste datan. Kontrollera uppkopplingen och ladda om sidan.');
    window.addEventListener('firestore-sync-error', onSyncError);
    return () => window.removeEventListener('firestore-sync-error', onSyncError);
  }, []);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error('Redirect sign-in failed', err);
      setAuthNotice('Google-inloggningen kunde inte slutföras. Försök igen.');
    });
  }, []);

  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Senast kända klunkar per runda/spelare – nya scorer från vem som helst i den aktiva rundan
  // triggar bowlingfirandet för alla.
  const prevSipsByRoundRef = useRef<Record<string, Record<string, number[]>>>({});
  const activeRoundIdRef = useRef<string | null>(null);
  const holesForRoundRef = useRef<(roundId: string) => PubHole[]>(() => []);

  useEffect(() => {
    activeRoundIdRef.current = activeRoundId;
  }, [activeRoundId]);

  // Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        setSelectedPlayerUid((prev) => prev || user.uid);
      } else {
        setMyProfile(null);
        setAllProfiles([]);
        setCourses([]);
        setCoursesLoaded(false);
        setHolesByCourse({});
        setRounds([]);
        setRoundsLoaded(false);
        setParticipantsByRound({});
        setActiveRoundId(null);
        setSelectedPlayerUid('');
      }
    });
    return () => unsub();
  }, []);

  // Profiler, banor och mina rundor
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const myProfileRef = doc(db, 'profiles', firebaseUser.uid);
    const unsubProfile = onSnapshot(
      myProfileRef,
      (snap) => {
        if (snap.exists()) {
          setMyProfile(parseProfile(snap.data({ serverTimestamps: 'estimate' })));
        } else {
          setMyProfile(null);
          // Första inloggningen: skapa en spelarprofil med namnet från Google
          if (!snap.metadata.fromCache) {
            const googleName = (firebaseUser.displayName || '').trim();
            const displayName = (googleName.length >= 2 ? googleName : 'Spelare').slice(0, 60);
            void setDoc(
              myProfileRef,
              profilePayload({
                uid: firebaseUser.uid,
                appId: APP_ID,
                displayName,
                nickname: 'Rookie',
                country: 'Stockholm',
                homePub: 'Klubbhuset',
                signatureDrink: 'Lager',
                favoriteClub: 'Driver',
                handicap: formatHandicap(STARTING_HANDICAP),
                bio: 'Ny på touren.',
                avatarSeed: 'emerald',
                playerCode: generatePlayerCode(displayName),
              })
            ).catch((err) => console.error('Kunde inte skapa profil', err));
          }
        }
      },
      (err) => {
        if (!isPermissionError(err)) reportFirestoreError(err, OperationType.GET, `profiles/${firebaseUser.uid}`);
      }
    );

    const unsubAllProfiles = onSnapshot(
      query(collection(db, 'profiles'), where('appId', '==', APP_ID)),
      (snap) => setAllProfiles(snap.docs.map((d) => parseProfile(d.data({ serverTimestamps: 'estimate' })))),
      (err) => {
        if (!isPermissionError(err)) reportFirestoreError(err, OperationType.LIST, 'profiles');
      }
    );

    const unsubCourses = onSnapshot(
      query(collection(db, 'courses'), where('appId', '==', APP_ID)),
      (snap) => {
        setCourses(snap.docs.map((d) => parseCourse(d.data())));
        // Räkna banorna som laddade först när svaret kommer från servern (inte en tom cache)
        if (!snap.metadata.fromCache) setCoursesLoaded(true);
      },
      (err) => reportFirestoreError(err, OperationType.LIST, 'courses')
    );

    const unsubRounds = onSnapshot(
      query(collection(db, 'rounds'), where('memberIds', 'array-contains', firebaseUser.uid)),
      (snap) => {
        setRounds(snap.docs.map((d) => parseRound(d.data())));
        setRoundsLoaded(true);
      },
      (err) => reportFirestoreError(err, OperationType.LIST, 'rounds')
    );

    // Rundor jag är inbjuden till (måste tacka ja innan jag blir med)
    const unsubInvites = onSnapshot(
      query(collection(db, 'rounds'), where('invitedIds', 'array-contains', firebaseUser.uid)),
      (snap) => setInvitedRounds(snap.docs.map((d) => parseRound(d.data())).filter((r) => r.status !== 'deleted')),
      (err) => {
        if (!isPermissionError(err)) reportFirestoreError(err, OperationType.LIST, 'rounds (inbjudningar)');
      }
    );

    const parseFollow = (d: Record<string, unknown>): FollowEdge => ({
      followerId: String(d.followerId),
      targetId: String(d.targetId),
      dismissed: d.dismissed === true,
    });
    const unsubFollowsOut = onSnapshot(
      query(collection(db, 'follows'), where('followerId', '==', firebaseUser.uid)),
      (snap) => setFollowsOut(snap.docs.map((d) => parseFollow(d.data()))),
      (err) => {
        if (!isPermissionError(err)) reportFirestoreError(err, OperationType.LIST, 'follows');
      }
    );
    const unsubFollowsIn = onSnapshot(
      query(collection(db, 'follows'), where('targetId', '==', firebaseUser.uid)),
      (snap) => setFollowsIn(snap.docs.map((d) => parseFollow(d.data()))),
      (err) => {
        if (!isPermissionError(err)) reportFirestoreError(err, OperationType.LIST, 'follows');
      }
    );
    const unsubBans = onSnapshot(
      collection(db, 'bans'),
      (snap) => setBannedUids(new Set(snap.docs.map((d) => d.id))),
      () => setBannedUids(new Set())
    );

    return () => {
      unsubProfile();
      unsubAllProfiles();
      unsubCourses();
      unsubRounds();
      unsubInvites();
      unsubFollowsOut();
      unsubFollowsIn();
      unsubBans();
    };
  }, [authReady, firebaseUser]);

  // Admin: alla rundor, bara när admin-sidan är öppen
  const isAdmin = !!firebaseUser && ADMIN_UIDS.includes(firebaseUser.uid);
  useEffect(() => {
    if (!isAdmin || view !== 'admin') return;
    setAdminRounds(null);
    return onSnapshot(
      collection(db, 'rounds'),
      (snap) => setAdminRounds(snap.docs.map((d) => parseRound(d.data()))),
      (err) => reportFirestoreError(err, OperationType.LIST, 'rounds (admin)')
    );
  }, [isAdmin, view]);

  // Hål för alla banor (banguiden är läsbar för alla inloggade)
  const courseIdsKey = courses.map((c) => c.courseId).sort().join(',');
  useEffect(() => {
    if (!authReady || !firebaseUser || !courseIdsKey) return;
    const unsubs = courseIdsKey.split(',').map((cId) =>
      onSnapshot(
        query(collection(db, 'courses', cId, 'holes'), where('courseId', '==', cId)),
        (snap) => {
          if (snap.empty && snap.metadata.fromCache) return;
          const holes = snap.docs.map((d) => parseHole(d.data())).sort((a, b) => a.holeNumber - b.holeNumber);
          setHolesByCourse((prev) => ({ ...prev, [cId]: holes }));
        },
        (err) => {
          if (!isPermissionError(err)) reportFirestoreError(err, OperationType.LIST, `courses/${cId}/holes`);
        }
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [authReady, firebaseUser, courseIdsKey]);

  // Deltagare i mina rundor
  const roundIdsKey = rounds.map((r) => r.roundId).sort().join(',');
  useEffect(() => {
    if (!authReady || !firebaseUser || !roundIdsKey) return;
    const unsubs = roundIdsKey.split(',').map((rId) =>
      onSnapshot(
        collection(db, 'rounds', rId, 'participants'),
        (snap) => {
          const loaded = snap.docs.map((d) => parseRoundParticipant(d.data(), rId));

          // Upptäck nya scorer i den aktiva rundan
          const prevMap = prevSipsByRoundRef.current[rId];
          const nextMap: Record<string, number[]> = {};
          for (const part of loaded) {
            nextMap[part.uid] = [...part.sips];
            if (!prevMap || rId !== activeRoundIdRef.current) continue;
            const oldSips = prevMap[part.uid] || [];
            for (let idx = 0; idx < part.sips.length; idx++) {
              const newVal = part.sips[idx] ?? 0;
              if (newVal > 0 && newVal !== (oldSips[idx] ?? 0)) {
                const hole = holesForRoundRef.current(rId).find((h) => h.holeNumber === idx + 1);
                setActiveCelebrationClip(
                  buildScoreCelebrationClip({
                    playerUid: part.uid,
                    playerName: part.displayName,
                    playerNickname: part.nickname,
                    avatarSeed: part.avatarSeed,
                    holeNumber: idx + 1,
                    pubName: hole?.pubName || `Hål ${idx + 1}`,
                    drinkName: hole?.drinkName || 'Tävlingsdryck',
                    sips: newVal,
                    par: hole?.par || 4,
                  })
                );
              }
            }
          }
          prevSipsByRoundRef.current[rId] = nextMap;
          setParticipantsByRound((prev) => ({ ...prev, [rId]: loaded }));
        },
        (err) => {
          if (!isPermissionError(err)) reportFirestoreError(err, OperationType.LIST, `rounds/${rId}/participants`);
        }
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [authReady, firebaseUser, roundIdsKey]);

  // ---- Härledd data (beräknas även före inloggning så att hooks nedan körs i samma ordning) ----
  const currentUid = firebaseUser?.uid || '';
  const courseById = new Map(courses.map((c) => [c.courseId, c]));
  const holesForCourse = (courseId: string, ownerId: string) =>
    courseHolesInPlay(courseId, ownerId, holesByCourse[courseId], courseHoleCount(courseById.get(courseId)));
  const holesForRound = (roundId: string): PubHole[] => {
    const r = rounds.find((x) => x.roundId === roundId);
    if (!r) return [];
    const ownerId = courseById.get(r.courseId)?.ownerId || r.ownerId;
    // Rundans egna hål (ändrad ordning/lokala ändringar) går före banans
    if (r.customHoles && r.customHoles.length > 0) return holesFromOverrides(r.customHoles, r.courseId, ownerId);
    return holesForCourse(r.courseId, ownerId);
  };
  holesForRoundRef.current = holesForRound;

  const roundCourses: PubCourse[] = rounds.map((r) => roundAsCourse(r, courseById.get(r.courseId)));
  const holesByRoundId: Record<string, PubHole[]> = {};
  for (const r of rounds) holesByRoundId[r.roundId] = holesForRound(r.roundId);

  // Rundor man valt att inte räkna i HCP tas bort ur statistiken
  const statsParticipantsByRound: Record<string, PlayerTourProfile[]> = {};
  for (const [rId, parts] of Object.entries(participantsByRound)) {
    statsParticipantsByRound[rId] = parts.filter((p) => p.countsForHcp !== false);
  }

  const profileByUid = new Map(allProfiles.map((p) => [p.uid, p]));
  if (myProfile) profileByUid.set(myProfile.uid, myProfile);

  const statsUids = new Set<string>([currentUid, ...profileByUid.keys()]);
  for (const parts of Object.values(participantsByRound)) parts.forEach((p) => statsUids.add(p.uid));
  const careerStatsByUid: Record<string, PlayerCareerStats> = {};
  for (const uid of statsUids) {
    if (!uid) continue;
    const stats = calculatePlayerCareerStats(uid, roundCourses, statsParticipantsByRound, holesByRoundId, participantsByRound);
    // Andra spelares rundor syns bara om man spelat med dem – använd då deras sparade HCP/vinster
    const prof = profileByUid.get(uid);
    if (uid !== currentUid && prof) {
      const storedWins = prof.wins || 0;
      careerStatsByUid[uid] = {
        ...stats,
        ...(stats.completedRounds === 0 && prof.handicap ? { computedHandicap: prof.handicap } : {}),
        wins: Math.max(stats.wins, storedWins),
      };
    } else {
      careerStatsByUid[uid] = stats;
    }
  }
  const myStats = careerStatsByUid[currentUid];
  const myComputedHandicap = myStats?.computedHandicap || formatHandicap(STARTING_HANDICAP);

  const allDataLoaded =
    coursesLoaded &&
    roundsLoaded &&
    rounds.every(
      (r) =>
        participantsByRound[r.roundId] &&
        (r.customHoles || holesByCourse[r.courseId] || (coursesLoaded && !courseById.has(r.courseId)))
    );

  // Efter omladdning direkt in i en runda: välj första ospelade hålet när datan finns
  const holeInitRef = useRef<string | null>(null);
  useEffect(() => {
    if (view !== 'round' || !activeRoundId || holeInitRef.current === activeRoundId) return;
    const mine = (participantsByRound[activeRoundId] || []).find((p) => p.uid === firebaseUser?.uid);
    if (!mine) return;
    holeInitRef.current = activeRoundId;
    const count = holesForRound(activeRoundId).length || mine.sips.length;
    const firstOpen = Array.from({ length: count }, (_, i) => mine.sips[i] || 0).findIndex((x) => !x);
    setSelectedHoleNum(firstOpen >= 0 ? firstOpen + 1 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeRoundId, participantsByRound, firebaseUser]);

  // Öppna profilen från en "Lägg till mig"-länk när spelarna har laddats
  const profilesLoaded = allProfiles.length > 0;
  useEffect(() => {
    if (!pendingAdd || !firebaseUser || !profilesLoaded) return;
    const target = allProfiles.find((p) => p.playerCode === pendingAdd);
    setPendingAdd('');
    if (!target) {
      setNotice(`Hittade ingen spelare med ID ${pendingAdd}.`);
      setTimeout(() => setNotice(null), 3500);
      return;
    }
    if (target.uid === firebaseUser.uid) {
      setNotice('Det där är din egen länk – skicka den till kompisarna!');
      setTimeout(() => setNotice(null), 3500);
      return;
    }
    setInvitedByUid(target.uid);
    navigate('player', target.uid, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAdd, firebaseUser, profilesLoaded, allProfiles]);

  // Ge äldre profiler ett spelar-ID
  useEffect(() => {
    if (!myProfile || myProfile.playerCode) return;
    const taken = new Set(allProfiles.map((p) => p.playerCode).filter(Boolean));
    let code = generatePlayerCode(myProfile.displayName);
    for (let i = 0; i < 20 && taken.has(code); i++) code = generatePlayerCode(myProfile.displayName);
    void setDoc(doc(db, 'profiles', myProfile.uid), profilePayload({ ...myProfile, playerCode: code })).catch((err) =>
      console.error('Kunde inte spara spelar-ID', err)
    );
  }, [myProfile, allProfiles]);

  // Håll profilens HCP, vinster och guldbollens siffra i synk så att andra ser rätt
  const myWins = myStats?.wins || 0;
  const myHoleInOnes = myStats?.careerHoleInOnes || 0;
  useEffect(() => {
    if (!myProfile || !myProfile.playerCode || !allDataLoaded) return;
    const avatar = parseAvatarSeed(myProfile.avatarSeed);
    const ballOutOfDate = avatar.gear === 'ball' && avatar.ballCount !== myHoleInOnes && isGearUnlocked('ball', myStats);
    const avatarSeed = ballOutOfDate ? serializeAvatarConfig({ ...avatar, ballCount: myHoleInOnes }) : myProfile.avatarSeed;
    // Skriv även om profilen inte rörts på ett dygn, så admin ser "senast aktiv"
    const stale = !myProfile.lastActiveMs || Date.now() - myProfile.lastActiveMs > 24 * 3600 * 1000;
    if (myProfile.handicap === myComputedHandicap && (myProfile.wins || 0) === myWins && !ballOutOfDate && !stale) return;
    void setDoc(
      doc(db, 'profiles', myProfile.uid),
      profilePayload({ ...myProfile, handicap: myComputedHandicap, wins: myWins, avatarSeed })
    ).catch((err) => console.error('Kunde inte uppdatera profilen', err));
  }, [myProfile, myComputedHandicap, myWins, myHoleInOnes, allDataLoaded]);

  // Flytta över gamla rundor (deltagare direkt under banan) till egna rundor. Körs av banans ägare.
  // Varje bana provas en gång per besök – även banor som dyker upp senare i listan.
  const migrationTriedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!firebaseUser || !coursesLoaded || !myProfile) return;
    const mine = courses.filter(
      (c) =>
        c.ownerId === firebaseUser.uid &&
        ROUND_CODE_PATTERN.test(c.inviteCode) &&
        !migrationTriedRef.current.has(c.courseId)
    );
    if (mine.length === 0) return;
    mine.forEach((c) => migrationTriedRef.current.add(c.courseId));
    void (async () => {
      for (const course of mine) {
        try {
          const legacy = await getDocs(
            query(collection(db, 'courses', course.courseId, 'participants'), where('courseId', '==', course.courseId))
          );
          if (legacy.empty) continue;
          const existing = await getDoc(roundRef(course.inviteCode));
          if (existing.exists()) continue;
          const parts = legacy.docs.map((d) => parseLegacyParticipant(d.data()));
          const holesSnap = await getDocs(
            query(collection(db, 'courses', course.courseId, 'holes'), where('courseId', '==', course.courseId))
          );
          const holes = holesSnap.empty
            ? createBlankHolesForCourse(course.courseId, course.ownerId)
            : holesSnap.docs.map((d) => parseHole(d.data())).sort((a, b) => a.holeNumber - b.holeNumber);
          const memberIds = Array.from(new Set([firebaseUser.uid, ...parts.map((p) => p.uid)])).slice(0, 40);
          const batch = writeBatch(db);
          batch.set(
            roundRef(course.inviteCode),
            roundPayload({
              roundId: course.inviteCode,
              appId: APP_ID,
              courseId: course.courseId,
              courseTitle: course.title,
              city: course.city,
              eventDate: course.eventDate,
              ownerId: firebaseUser.uid,
              ownerName: course.ownerName,
              gameMode: course.gameMode === 'brutal' ? 'brutal' : 'single',
              memberIds,
              locked: false,
              status: 'active',
            })
          );
          for (const p of parts.filter((x) => memberIds.includes(x.uid))) {
            batch.set(participantRef(course.inviteCode, p.uid), roundParticipantPayload(p, course.inviteCode, holes));
          }
          await batch.commit();
          console.info('Flyttade över gammal runda', course.courseId, '->', course.inviteCode);
        } catch (err) {
          console.error('Kunde inte flytta över gammal runda', course.courseId, err);
        }
      }
    })();
  }, [firebaseUser, coursesLoaded, courses, myProfile]);

  const handleGoogleSignIn = async () => {
    setAuthNotice(null);
    if (isInAppBrowser()) {
      setAuthNotice(
        'Google-inloggning fungerar inte i Messenger/Facebook-webbläsaren. Tryck på ⋯ uppe till höger och välj "Öppna i Safari/Chrome" (eller kopiera länken) och logga in där.'
      );
      return;
    }
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      const msg = err instanceof Error ? err.message : String(err);
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          /* fall through to notice */
        }
      }
      if (!msg.includes('popup-closed-by-user')) {
        setAuthNotice(
          'Kunde inte slutföra Google-inloggningen. Kontrollera att popup-fönster är tillåtna i din webbläsare och försök igen.'
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setAuthNotice(null);
    await signOut(auth);
  };

  if (!authReady) {
    return (
      <div className="pg-fairway flex min-h-screen items-center justify-center px-4 text-[#112218]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#112218] border-t-transparent" />
          <p className="mt-3 font-display text-base font-semibold text-[#112218]">
            Kontrollerar inloggning till Pubgolf Links...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div data-testid="auth-wall-screen" className="relative flex min-h-screen flex-col overflow-hidden bg-[#112218] text-[#F6F4EE]">
        <img src={HERO_CLUBHOUSE_IMG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#112218]/40 via-[#112218]/80 to-[#112218]" />
        <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-end px-6 pb-14 pt-24 sm:justify-center">
          <BrandMark size={64} className="rounded-2xl ring-2 ring-[#D4AF37]/70" />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Pubgolf Tour</p>
          <h1 className="mt-2 font-display text-5xl font-bold leading-[1.05]">Pubgolf Links</h1>
          <p className="mt-3 text-base text-[#F6F4EE]/70">
            Bygg banor, starta rundor med gänget och följ scoren hål för hål.
          </p>

          {pendingAdd && !authNotice && (
            <div className="mt-6 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#F6F4EE]">
              En kompis vill spela pubgolf med dig. Logga in så kan du lägga till hen direkt.
            </div>
          )}

          {authNotice && (
            <div className="mt-6 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#F6F4EE]">
              {authNotice}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#F6F4EE] py-4 text-base font-bold text-[#112218] shadow-xl transition hover:bg-white disabled:opacity-60"
          >
            <LogIn className="h-5 w-5 text-[#166534]" />
            {isSigningIn ? 'Öppnar Google…' : 'Logga in med Google'}
          </button>
          <p className="mt-3 text-center text-xs text-[#F6F4EE]/55">
            Första gången? Då skapas ditt konto automatiskt.
          </p>
        </main>
      </div>
    );
  }

  // ---- Inloggad ----
  const uid = firebaseUser.uid;

  /** Deltagare med senaste profilinfo och uträknat HCP. */
  const withProfile = (p: PlayerTourProfile): PlayerTourProfile => {
    const prof = profileByUid.get(p.uid);
    return {
      ...p,
      displayName: prof?.displayName || p.displayName,
      nickname: prof?.nickname || p.nickname,
      country: prof?.country || p.country,
      homePub: prof?.homePub || p.homePub,
      signatureDrink: prof?.signatureDrink || p.signatureDrink,
      favoriteClub: prof?.favoriteClub || p.favoriteClub,
      bio: prof?.bio || p.bio,
      avatarSeed: prof?.avatarSeed || p.avatarSeed,
      playerCode: prof?.playerCode || p.playerCode,
      handicap: careerStatsByUid[p.uid]?.computedHandicap || p.handicap,
      wins: careerStatsByUid[p.uid]?.wins || prof?.wins || 0,
    };
  };

  const activeRound = rounds.find((r) => r.roundId === activeRoundId) || null;
  const activeCourseDoc = activeRound ? courseById.get(activeRound.courseId) || null : null;
  const activeRoundCourse = activeRound ? roundAsCourse(activeRound, activeCourseDoc) : null;
  const activeHoles = activeRound ? holesByRoundId[activeRound.roundId] || [] : [];
  const activeParticipants = activeRound
    ? (participantsByRound[activeRound.roundId] || []).map(withProfile)
    : [];
  const me = activeParticipants.find((p) => p.uid === uid) || null;

  const myProfileFields = withProfileDefaults({
    displayName: myProfile?.displayName || firebaseUser.displayName || 'Spelare',
    nickname: myProfile?.nickname || '',
    country: myProfile?.country || '',
    homePub: myProfile?.homePub || '',
    signatureDrink: myProfile?.signatureDrink || '',
    favoriteClub: myProfile?.favoriteClub || '',
    handicap: myComputedHandicap,
    bio: myProfile?.bio || '',
    avatarSeed: myProfile?.avatarSeed || 'emerald',
  });

  /** Min profil som deltagarpost i en ny runda. */
  const newParticipantFor = (
    profile: ReusablePlayerProfile | null,
    playerUid: string,
    roundId: string,
    holeCount = 9
  ): PlayerTourProfile => ({
    ...(profile || {
      uid: playerUid,
      appId: APP_ID,
      displayName: myProfileFields.displayName,
      nickname: myProfileFields.nickname,
      country: '',
      homePub: '',
      signatureDrink: '',
      favoriteClub: '',
      handicap: formatHandicap(STARTING_HANDICAP),
      bio: '',
      avatarSeed: myProfileFields.avatarSeed,
    }),
    uid: playerUid,
    handicap: careerStatsByUid[playerUid]?.computedHandicap || profile?.handicap || formatHandicap(STARTING_HANDICAP),
    courseId: roundId,
    sips: emptySips(holeCount),
    totalSips: 0,
    totalToPar: 0,
    thruHoles: 0,
    countsForHcp: true,
    keptResult: false,
  });

  const titleForRound = (r: PubRound) => courseById.get(r.courseId)?.title || r.courseTitle;
  const byDateDesc = (a: PubRound, b: PubRound) => b.eventDate.localeCompare(a.eventDate);
  const myActiveRounds = rounds.filter((r) => r.status === 'active').sort(byDateDesc);
  const myFinishedRounds = rounds.filter((r) => r.status === 'finished').sort(byDateDesc);
  const myCourses = courses.filter((c) => c.ownerId === uid).sort((a, b) => a.title.localeCompare(b.title, 'sv'));
  // Alla banor man kan spela: alla öppna banor (även egna) + mina privata
  const playableCourses = courses
    .filter((c) => c.isPublic || c.ownerId === uid)
    .sort((a, b) => a.title.localeCompare(b.title, 'sv'));
  const holeCountFor = (c: PubCourse) => courseHoleCount(c);

  const myHistory: ProfileHistoryEntry[] = rounds
    .map((r) => {
      const mine = (participantsByRound[r.roundId] || []).find((p) => p.uid === uid);
      if (!mine) return null;
      const summary = calculateRoundSummary(mine.sips, holesByRoundId[r.roundId] || [], mine.penalties);
      if (summary.thruHoles === 0) return null;
      return {
        courseId: r.roundId,
        title: titleForRound(r),
        city: r.city,
        eventDate: r.eventDate,
        thruHoles: summary.thruHoles,
        totalSips: summary.totalSips,
        totalCoursePar: summary.totalCoursePar,
        totalToPar: summary.totalToPar,
        toParFormatted: summary.toParFormatted,
        countsForHcp: mine.countsForHcp !== false,
        deleted: r.status === 'deleted',
      };
    })
    .filter((x): x is ProfileHistoryEntry => x !== null)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  // Rundor som ägaren raderat där jag inte har valt om resultatet ska sparas
  const pendingDeletedRound = rounds.find((r) => {
    if (r.status !== 'deleted') return false;
    const mine = (participantsByRound[r.roundId] || []).find((p) => p.uid === uid);
    return !!participantsByRound[r.roundId] && !mine?.keptResult;
  });

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3500);
  };

  const fail = (error: unknown, op: OperationType, path: string): never => handleFirestoreError(error, op, path);

  // ---- Profil ----
  const handleSaveMyProfile = async (fields: ProfileFieldsInput) => {
    const nextProfile: ReusablePlayerProfile = {
      uid,
      appId: APP_ID,
      ...fields,
      handicap: myComputedHandicap,
      playerCode: myProfile?.playerCode,
      wins: myWins,
    };
    setMyProfile(nextProfile);
    try {
      await setDoc(doc(db, 'profiles', uid), profilePayload(nextProfile));
      // Uppdatera namn/avatar i pågående rundor
      for (const r of myActiveRounds) {
        if (!(participantsByRound[r.roundId] || []).some((p) => p.uid === uid)) continue;
        await updateDoc(participantRef(r.roundId, uid), {
          displayName: nextProfile.displayName.slice(0, 60),
          nickname: nextProfile.nickname.slice(0, 50),
          avatarSeed: nextProfile.avatarSeed.slice(0, 32),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      fail(error, OperationType.WRITE, `profiles/${uid}`);
    }
  };

  // ---- Banor ----
  const holesFromDrafts = (drafts: HoleDraft[], courseId: string): PubHole[] =>
    drafts.slice(0, MAX_HOLES).map((d, i) => ({ ...draftToOverride(d, i), holeNumber: i + 1, courseId, ownerId: uid }));

  const writeCourseHoles = async (courseId: string, holes: PubHole[]) => {
    const batch = writeBatch(db);
    for (const h of holes) batch.set(doc(db, 'courses', courseId, 'holes', `hole-${h.holeNumber}`), holePayload(h, courseId, uid));
    await batch.commit();
  };

  const handleCreateCourse = async (input: CreateCourseInput): Promise<string> => {
    const ownerName = myProfile?.displayName || firebaseUser.displayName || 'Banarkitekt';
    const courseId = `course-${Date.now()}`;
    const holes = holesFromDrafts(input.holes, courseId);
    const course: PubCourse = {
      courseId,
      appId: APP_ID,
      inviteCode: generateInviteCode(),
      title: input.title,
      subtitle: input.subtitle,
      city: input.city,
      eventDate: new Date().toISOString().slice(0, 10),
      ownerId: uid,
      ownerName,
      gameMode: 'single',
      isPublic: input.isPublic,
      holeCount: holes.length,
    };
    try {
      await setDoc(doc(db, 'courses', courseId), coursePayload(course));
      await writeCourseHoles(courseId, holes);
    } catch (error) {
      fail(error, OperationType.CREATE, `courses/${courseId}`);
    }
    setCourses((prev) => (prev.some((c) => c.courseId === courseId) ? prev : [course, ...prev]));
    setHolesByCourse((prev) => ({ ...prev, [courseId]: holes }));
    return courseId;
  };

  /** Spara en befintlig bana (bara den som skapat banan). */
  const handleSaveCourse = async (courseId: string, input: CreateCourseInput) => {
    const existing = courseById.get(courseId);
    if (!existing || existing.ownerId !== uid) throw new Error('Bara den som skapat banan kan ändra den.');
    const holes = holesFromDrafts(input.holes, courseId);
    const updated: PubCourse = {
      ...existing,
      title: input.title,
      subtitle: input.subtitle,
      city: input.city,
      isPublic: input.isPublic,
      holeCount: holes.length,
    };
    const previousCount = Math.max(courseHoleCount(existing), (holesByCourse[courseId] || []).length);
    try {
      await setDoc(doc(db, 'courses', courseId), coursePayload(updated));
      await writeCourseHoles(courseId, holes);
    } catch (error) {
      fail(error, OperationType.WRITE, `courses/${courseId}`);
    }
    // Hål som inte längre används tas bort (banans antal hål styr ändå vad som spelas)
    for (let n = holes.length + 1; n <= previousCount; n++) {
      deleteDoc(doc(db, 'courses', courseId, 'holes', `hole-${n}`)).catch(() => undefined);
    }
    setCourses((prev) => prev.map((c) => (c.courseId === courseId ? updated : c)));
    setHolesByCourse((prev) => ({ ...prev, [courseId]: holes }));
  };

  const handleDeleteCourse = async (courseId: string) => {
    const existing = courseById.get(courseId);
    if (!existing || existing.ownerId !== uid) return;
    const count = Math.max(MAX_HOLES, (holesByCourse[courseId] || []).length);
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        deleteDoc(doc(db, 'courses', courseId, 'holes', `hole-${i + 1}`)).catch(() => undefined)
      )
    );
    try {
      await deleteDoc(doc(db, 'courses', courseId));
    } catch (error) {
      fail(error, OperationType.DELETE, `courses/${courseId}`);
    }
    setCourses((prev) => prev.filter((c) => c.courseId !== courseId));
  };

  const handleSaveCourseMeta = async (updated: PubCourse) => {
    if (updated.ownerId !== uid) return;
    setCourses((prev) => prev.map((c) => (c.courseId === updated.courseId ? updated : c)));
    try {
      await setDoc(doc(db, 'courses', updated.courseId), coursePayload(updated));
    } catch (error) {
      fail(error, OperationType.WRITE, `courses/${updated.courseId}`);
    }
  };

  // ---- Rundor ----
  const handleStartRound = async (courseId: string, input: StartRoundInput): Promise<string> => {
    const course = courseById.get(courseId);
    if (!course) throw new Error('Banan hittades inte.');
    let roundId = generateRoundCode();
    for (let i = 0; i < 5; i++) {
      const taken = await getDoc(roundRef(roundId));
      if (!taken.exists()) break;
      roundId = generateRoundCode();
    }
    const round: PubRound = {
      roundId,
      appId: APP_ID,
      courseId,
      courseTitle: course.title,
      city: course.city,
      eventDate: input.eventDate,
      ownerId: uid,
      ownerName: myProfileFields.displayName,
      gameMode: input.gameMode,
      memberIds: [uid],
      locked: false,
      status: 'active',
    };
    const courseHoles = holesForCourse(courseId, course.ownerId);
    // Baklänges = rundans egna hål i omvänd ordning. Banan ändras inte.
    if (input.reverse && courseHoles.length > 1) round.customHoles = [...courseHoles].reverse().map(holeToOverride);
    const holes = round.customHoles ? holesFromOverrides(round.customHoles, courseId, course.ownerId) : courseHoles;
    try {
      const batch = writeBatch(db);
      batch.set(roundRef(roundId), roundPayload(round));
      batch.set(
        participantRef(roundId, uid),
        roundParticipantPayload(newParticipantFor(myProfile, uid, roundId, holes.length), roundId, holes)
      );
      await batch.commit();
    } catch (error) {
      fail(error, OperationType.CREATE, `rounds/${roundId}`);
    }
    return roundId;
  };

  const handleJoinByCode = async (raw: string): Promise<{ ok: boolean; message: string; roundId?: string }> => {
    const code = raw.trim().toUpperCase().replace(/\s/g, '');
    const withPrefix = code.startsWith('PG-') ? code : code.startsWith('PG') ? `PG-${code.slice(2)}` : `PG-${code}`;
    if (!ROUND_CODE_PATTERN.test(withPrefix)) {
      return { ok: false, message: 'Koden ser inte rätt ut. Den ska se ut som PG-XXXXXX.' };
    }
    if (rounds.some((r) => r.roundId === withPrefix)) {
      return { ok: true, message: 'Du är redan med.', roundId: withPrefix };
    }
    let round: PubRound;
    try {
      const snap = await getDoc(roundRef(withPrefix));
      if (!snap.exists()) {
        return { ok: false, message: `Hittade ingen runda med koden ${withPrefix}. Kolla koden med den som startade rundan.` };
      }
      round = parseRound(snap.data());
    } catch {
      return { ok: false, message: 'Kunde inte hämta rundan just nu. Försök igen.' };
    }
    if (round.status === 'deleted') return { ok: false, message: 'Rundan är raderad av ägaren.' };
    if (round.locked) return { ok: false, message: 'Rundan är låst – be ägaren låsa upp den eller lägga till dig.' };
    const joinOwner = courseById.get(round.courseId)?.ownerId || round.ownerId;
    const holes = round.customHoles
      ? holesFromOverrides(round.customHoles, round.courseId, joinOwner)
      : holesForCourse(round.courseId, joinOwner);
    try {
      const batch = writeBatch(db);
      batch.update(roundRef(round.roundId), { memberIds: arrayUnion(uid), updatedAt: serverTimestamp() });
      batch.set(
        participantRef(round.roundId, uid),
        roundParticipantPayload(newParticipantFor(myProfile, uid, round.roundId, holes.length), round.roundId, holes)
      );
      await batch.commit();
    } catch (error) {
      console.error('Kunde inte gå med', error);
      return { ok: false, message: 'Kunde inte gå med i rundan. Den kan ha låsts precis – fråga ägaren.' };
    }
    // Visa rundan direkt, innan lyssnaren hunnit uppdatera
    setRounds((prev) =>
      prev.some((r) => r.roundId === round.roundId) ? prev : [...prev, { ...round, memberIds: [...round.memberIds, uid] }]
    );
    return { ok: true, message: `Du är med i ${round.courseTitle}!`, roundId: round.roundId };
  };

  const leaveRound = async (roundId: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(participantRef(roundId, uid));
      batch.update(roundRef(roundId), { memberIds: arrayRemove(uid), updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      fail(error, OperationType.WRITE, `rounds/${roundId}`);
    }
    setRounds((prev) => prev.filter((r) => r.roundId !== roundId));
    if (liveRoundId === roundId) setLiveRoundId(null);
    if (activeRoundId === roundId) {
      setActiveRoundId(null);
      navigate('play', undefined, true);
    }
  };

  const updateRound = async (roundId: string, patch: Record<string, unknown>) => {
    try {
      await updateDoc(roundRef(roundId), { ...patch, updatedAt: serverTimestamp() });
    } catch (error) {
      fail(error, OperationType.UPDATE, `rounds/${roundId}`);
    }
  };

  /** Ägaren bjuder in en spelare. Spelaren måste själv tacka ja innan hen blir med. */
  const handleAddPlayer = async (roundId: string, rawCode: string): Promise<{ ok: boolean; message: string }> => {
    const code = normalizePlayerCode(rawCode);
    let profile = allProfiles.find((p) => p.playerCode === code) || null;
    if (!profile) {
      const snap = await getDocs(
        query(collection(db, 'profiles'), where('appId', '==', APP_ID), where('playerCode', '==', code))
      );
      profile = snap.empty ? null : parseProfile(snap.docs[0].data());
    }
    if (!profile) return { ok: false, message: `Ingen spelare har ID ${code}.` };
    const round = rounds.find((r) => r.roundId === roundId);
    if (!round) return { ok: false, message: 'Rundan hittades inte.' };
    if (round.memberIds.includes(profile.uid)) return { ok: false, message: `${profile.displayName} är redan med.` };
    if ((round.invitedIds || []).includes(profile.uid)) {
      return { ok: false, message: `${profile.displayName} är redan inbjuden – väntar på svar.` };
    }
    try {
      await updateDoc(roundRef(roundId), { invitedIds: arrayUnion(profile.uid), updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Kunde inte bjuda in spelare', error);
      return { ok: false, message: 'Kunde inte skicka inbjudan. Försök igen.' };
    }
    setRounds((prev) =>
      prev.map((r) => (r.roundId === roundId ? { ...r, invitedIds: [...(r.invitedIds || []), profile!.uid] } : r))
    );
    return { ok: true, message: `Inbjudan skickad till ${profile.displayName} – hen måste tacka ja.` };
  };

  const handleCancelInvite = async (roundId: string, playerUid: string) => {
    await updateRound(roundId, { invitedIds: arrayRemove(playerUid) });
    setRounds((prev) =>
      prev.map((r) => (r.roundId === roundId ? { ...r, invitedIds: (r.invitedIds || []).filter((x) => x !== playerUid) } : r))
    );
  };

  const acceptInvite = async (round: PubRound) => {
    setInviteBusy(true);
    try {
      const inviteOwner = courseById.get(round.courseId)?.ownerId || round.ownerId;
      const holes = round.customHoles
        ? holesFromOverrides(round.customHoles, round.courseId, inviteOwner)
        : holesForCourse(round.courseId, inviteOwner);
      const batch = writeBatch(db);
      batch.update(roundRef(round.roundId), {
        memberIds: arrayUnion(uid),
        invitedIds: arrayRemove(uid),
        updatedAt: serverTimestamp(),
      });
      batch.set(
        participantRef(round.roundId, uid),
        roundParticipantPayload(newParticipantFor(myProfile, uid, round.roundId, holes.length), round.roundId, holes)
      );
      await batch.commit();
      setInvitedRounds((prev) => prev.filter((r) => r.roundId !== round.roundId));
      setRounds((prev) =>
        prev.some((r) => r.roundId === round.roundId)
          ? prev
          : [...prev, { ...round, memberIds: [...round.memberIds, uid], invitedIds: (round.invitedIds || []).filter((x) => x !== uid) }]
      );
      showNotice(`Du är med i ${round.courseTitle}!`);
      if (round.status === 'active') setLiveRoundId(round.roundId);
      navigate('round', round.roundId);
    } catch (error) {
      console.error('Kunde inte tacka ja', error);
      showNotice('Kunde inte gå med just nu. Försök igen.');
    } finally {
      setInviteBusy(false);
    }
  };

  const declineInvite = async (round: PubRound) => {
    setInviteBusy(true);
    try {
      await updateDoc(roundRef(round.roundId), { invitedIds: arrayRemove(uid), updatedAt: serverTimestamp() });
      setInvitedRounds((prev) => prev.filter((r) => r.roundId !== round.roundId));
    } catch (error) {
      console.error('Kunde inte tacka nej', error);
      showNotice('Något gick fel. Försök igen.');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRemovePlayer = async (roundId: string, playerUid: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(participantRef(roundId, playerUid));
      batch.update(roundRef(roundId), { memberIds: arrayRemove(playerUid), updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      fail(error, OperationType.WRITE, `rounds/${roundId}/participants/${playerUid}`);
    }
  };

  const handleDeleteForAll = async (roundId: string, keepMine: boolean) => {
    try {
      const batch = writeBatch(db);
      if (keepMine) {
        batch.update(roundRef(roundId), { status: 'deleted', locked: true, updatedAt: serverTimestamp() });
        batch.update(participantRef(roundId, uid), { keptResult: true, updatedAt: serverTimestamp() });
      } else {
        batch.update(roundRef(roundId), {
          status: 'deleted',
          locked: true,
          memberIds: arrayRemove(uid),
          updatedAt: serverTimestamp(),
        });
        batch.delete(participantRef(roundId, uid));
      }
      await batch.commit();
    } catch (error) {
      fail(error, OperationType.WRITE, `rounds/${roundId}`);
    }
    if (!keepMine) setRounds((prev) => prev.filter((r) => r.roundId !== roundId));
    if (liveRoundId === roundId) setLiveRoundId(null);
    setActiveRoundId(null);
    navigate('play', undefined, true);
    showNotice('Rundan är raderad för alla.');
  };

  /** Ägaren avslutar för alla; övriga stänger rundan för sig själva. Score kan rättas efteråt. */
  const handleFinishRound = async (roundId: string) => {
    const r = rounds.find((x) => x.roundId === roundId);
    if (r && r.ownerId === uid && r.status === 'active') {
      await updateRound(roundId, { status: 'finished', locked: true });
      setRounds((prev) => prev.map((x) => (x.roundId === roundId ? { ...x, status: 'finished', locked: true } : x)));
      showNotice('Rundan är avslutad. Bra kämpat!');
    } else {
      showNotice('Klart! Ditt resultat är sparat.');
    }
    if (liveRoundId === roundId) setLiveRoundId(null);
    navigate('play', undefined, true);
  };

  const handleReopenRound = async (roundId: string) => {
    await updateRound(roundId, { status: 'active', locked: false });
    setRounds((prev) => prev.map((x) => (x.roundId === roundId ? { ...x, status: 'active', locked: false } : x)));
    setLiveRoundId(roundId);
  };

  /** Rundans egna hål – ändrar aldrig banan. null = tillbaka till banans original. */
  const handleSaveRoundHoles = async (roundId: string, drafts: HoleDraft[] | null) => {
    const r = rounds.find((x) => x.roundId === roundId);
    if (!r || r.ownerId !== uid) return;
    const customHoles = drafts ? drafts.slice(0, MAX_HOLES).map((d, i) => sanitizeOverride(draftToOverride(d, i))) : undefined;
    await updateRound(roundId, { customHoles: customHoles || deleteField() });
    setRounds((prev) => prev.map((x) => (x.roundId === roundId ? { ...x, customHoles } : x)));
    showNotice(drafts ? 'Hålen är ändrade för den här rundan.' : 'Rundan följer banan igen.');
  };

  const handleSetCountsForHcp = async (roundId: string, counts: boolean) => {
    setParticipantsByRound((prev) => ({
      ...prev,
      [roundId]: (prev[roundId] || []).map((p) => (p.uid === uid ? { ...p, countsForHcp: counts } : p)),
    }));
    try {
      await updateDoc(participantRef(roundId, uid), { countsForHcp: counts, updatedAt: serverTimestamp() });
    } catch (error) {
      fail(error, OperationType.UPDATE, `rounds/${roundId}/participants/${uid}`);
    }
  };

  const resolveDeletedRound = async (roundId: string, keep: boolean) => {
    setDeletedPromptBusy(true);
    try {
      const hasMine = (participantsByRound[roundId] || []).some((p) => p.uid === uid);
      if (keep && hasMine) {
        await updateDoc(participantRef(roundId, uid), { keptResult: true, updatedAt: serverTimestamp() });
      } else if (hasMine) {
        await leaveRound(roundId);
      } else {
        await updateDoc(roundRef(roundId), { memberIds: arrayRemove(uid), updatedAt: serverTimestamp() });
        setRounds((prev) => prev.filter((r) => r.roundId !== roundId));
      }
    } catch (error) {
      console.error(error);
      showNotice('Något gick fel. Försök igen.');
    } finally {
      setDeletedPromptBusy(false);
    }
  };

  // ---- Score ----
  const handleUpdateHoleSips = (holeNumber: number, newSips: number) => {
    if (!activeRound || !me || activeRound.status === 'deleted') return;
    const rId = activeRound.roundId;
    const nextSips = Array.from({ length: Math.max(activeHoles.length, me.sips.length) }, (_, i) => me.sips[i] || 0);
    nextSips[holeNumber - 1] = newSips;
    const summary = calculateRoundSummary(nextSips, activeHoles, me.penalties);

    // Spara direkt lokalt så firandet inte visas två gånger när Firestore ekar tillbaka
    prevSipsByRoundRef.current[rId] = { ...(prevSipsByRoundRef.current[rId] || {}), [uid]: [...nextSips] };
    if (newSips > 0) {
      const hole = activeHoles.find((h) => h.holeNumber === holeNumber);
      setActiveCelebrationClip(
        buildScoreCelebrationClip({
          playerUid: me.uid,
          playerName: me.displayName,
          playerNickname: me.nickname,
          avatarSeed: me.avatarSeed,
          holeNumber,
          pubName: hole?.pubName || `Hål ${holeNumber}`,
          drinkName: hole?.drinkName || 'Tävlingsdryck',
          sips: newSips,
          par: hole?.par || 4,
        })
      );
    }

    const totals = { totalSips: summary.totalSips, totalToPar: summary.totalToPar, thruHoles: summary.thruHoles };
    const updated: PlayerTourProfile = { ...me, sips: nextSips, ...totals };
    setParticipantsByRound((prev) => ({
      ...prev,
      [rId]: (prev[rId] || []).map((p) => (p.uid === uid ? { ...p, sips: nextSips, ...totals } : p)),
    }));
    void setDoc(participantRef(rId, uid), roundParticipantPayload(updated, rId, activeHoles)).catch((error) =>
      reportFirestoreError(error, OperationType.WRITE, `rounds/${rId}/participants/${uid}`)
    );
  };

  // ---- Plikt och bonus ----
  const writeMyPenalties = (next: PenaltyEvent[]) => {
    if (!activeRound || !me || activeRound.status === 'deleted') return;
    const rId = activeRound.roundId;
    const summary = calculateRoundSummary(me.sips, activeHoles, next);
    const totals = { totalSips: summary.totalSips, totalToPar: summary.totalToPar, thruHoles: summary.thruHoles };
    const updated: PlayerTourProfile = { ...me, penalties: next, ...totals };
    setParticipantsByRound((prev) => ({
      ...prev,
      [rId]: (prev[rId] || []).map((p) => (p.uid === uid ? { ...p, penalties: next, ...totals } : p)),
    }));
    void setDoc(participantRef(rId, uid), roundParticipantPayload(updated, rId, activeHoles)).catch((error) =>
      reportFirestoreError(error, OperationType.WRITE, `rounds/${rId}/participants/${uid}`)
    );
  };
  const handleAddPenalty = (hole: number, type: PenaltyType) => {
    if (!me) return;
    const cur = me.penalties || [];
    if (cur.length >= MAX_PENALTIES) return;
    // Split the G går bara en gång per hål
    if (type === 'splitg' && cur.some((e) => e.hole === hole && e.type === 'splitg')) return;
    writeMyPenalties([...cur, { hole, type }]);
    const t = PENALTY_TYPES[type];
    showNotice(type === 'splitg' ? 'Split the G! −2 på totalen 🍺' : `${t.label}: +${t.strokes} slag`);
  };
  const handleRemovePenalty = (hole: number, type: PenaltyType) => {
    if (!me) return;
    const cur = me.penalties || [];
    const idx = cur.map((e, i) => (e.hole === hole && e.type === type ? i : -1)).filter((i) => i >= 0).pop();
    if (idx === undefined) return;
    writeMyPenalties(cur.filter((_, i) => i !== idx));
  };

  const handleAssignTeam = async (playerUids: string[], teamId: string, teamName: string) => {
    if (!activeRound) return;
    const rId = activeRound.roundId;
    const isRoundOwner = activeRound.ownerId === uid;
    setParticipantsByRound((prev) => ({
      ...prev,
      [rId]: (prev[rId] || []).map((p) =>
        playerUids.includes(p.uid) ? { ...p, teamId: teamId.slice(0, 64), teamName: teamName.slice(0, 60) } : p
      ),
    }));
    for (const target of playerUids) {
      if (!isRoundOwner && target !== uid) continue;
      try {
        await updateDoc(participantRef(rId, target), {
          teamId: teamId.slice(0, 64),
          teamName: teamName.slice(0, 60),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        fail(error, OperationType.UPDATE, `rounds/${rId}/participants/${target}`);
      }
    }
  };

  // ---- Vänner ----
  const followingIds = new Set(followsOut.map((f) => f.targetId));
  const followerIds = new Set(followsIn.map((f) => f.followerId));
  const profileList = (ids: Iterable<string>) =>
    Array.from(ids)
      .map((id) => profileByUid.get(id))
      .filter((p): p is ReusablePlayerProfile => !!p)
      .map((p) => ({ ...p, wins: careerStatsByUid[p.uid]?.wins || p.wins || 0 }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'sv'));
  const friends = profileList([...followingIds].filter((id) => followerIds.has(id)));
  const followingOnly = profileList([...followingIds].filter((id) => !followerIds.has(id)));
  const friendRequests = profileList(
    followsIn.filter((f) => !f.dismissed && !followingIds.has(f.followerId)).map((f) => f.followerId)
  );
  const byRecent = (a: ReusablePlayerProfile, b: ReusablePlayerProfile) => (b.lastActiveMs || 0) - (a.lastActiveMs || 0);
  // Alla andra spelare man inte lagt till – senast aktiva först
  const friendSuggestions = profileList(
    allProfiles.map((p) => p.uid).filter((id) => id !== uid && !followingIds.has(id) && !followerIds.has(id) && !bannedUids.has(id))
  ).sort(byRecent);
  const relationFor = (other: string): Relation => {
    if (other === uid) return 'me';
    if (followingIds.has(other)) return followerIds.has(other) ? 'friend' : 'following';
    return followerIds.has(other) ? 'follower' : 'none';
  };

  const followRef = (follower: string, target: string) => doc(db, 'follows', `${follower}_${target}`);
  const handleFollow = async (target: string) => {
    if (target === uid || followingIds.has(target)) return;
    try {
      await setDoc(followRef(uid, target), {
        followerId: uid,
        targetId: target,
        appId: APP_ID,
        dismissed: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      fail(error, OperationType.CREATE, `follows/${uid}_${target}`);
    }
  };
  const handleFollowByCode = async (raw: string): Promise<{ ok: boolean; message: string }> => {
    const code = normalizePlayerCode(raw);
    const target = allProfiles.find((p) => p.playerCode === code);
    if (!target) return { ok: false, message: `Ingen spelare har ID ${code}.` };
    if (target.uid === uid) return { ok: false, message: 'Det är ditt eget ID 🙂' };
    if (followingIds.has(target.uid)) return { ok: false, message: `Du har redan lagt till ${target.displayName}.` };
    try {
      await handleFollow(target.uid);
    } catch {
      return { ok: false, message: 'Kunde inte lägga till. Försök igen.' };
    }
    return {
      ok: true,
      message: followerIds.has(target.uid)
        ? `Du och ${target.displayName} är nu vänner!`
        : `Förfrågan skickad – du följer ${target.displayName} tills hen godkänner.`,
    };
  };
  const handleUnfollow = async (target: string) => {
    try {
      await deleteDoc(followRef(uid, target));
    } catch (error) {
      fail(error, OperationType.DELETE, `follows/${uid}_${target}`);
    }
  };
  const handleRemoveFriend = async (other: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(followRef(uid, other));
      batch.delete(followRef(other, uid));
      await batch.commit();
    } catch (error) {
      fail(error, OperationType.DELETE, `follows/${uid}_${other}`);
    }
  };
  const handleDismissRequest = async (from: string) => {
    try {
      await updateDoc(followRef(from, uid), { dismissed: true });
    } catch (error) {
      fail(error, OperationType.UPDATE, `follows/${from}_${uid}`);
    }
  };

  // ---- Admin ----
  const handleToggleBan = async (target: string, ban: boolean) => {
    if (!isAdmin) return;
    if (ban) {
      await setDoc(doc(db, 'bans', target), { uid: target, appId: APP_ID, bannedBy: uid, createdAt: serverTimestamp() });
    } else {
      await deleteDoc(doc(db, 'bans', target));
    }
  };
  const handleAdminDeleteProfile = async (target: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, 'profiles', target));
  };
  const handleAdminDeleteRound = async (roundId: string) => {
    if (!isAdmin) return;
    const parts = await getDocs(collection(db, 'rounds', roundId, 'participants'));
    const batch = writeBatch(db);
    parts.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(roundRef(roundId));
    await batch.commit();
  };
  const handleAdminDeleteCourse = async (courseId: string) => {
    if (!isAdmin) return;
    const holes = await getDocs(query(collection(db, 'courses', courseId, 'holes'), where('courseId', '==', courseId)));
    const legacy = await getDocs(query(collection(db, 'courses', courseId, 'participants'), where('courseId', '==', courseId)));
    const batch = writeBatch(db);
    holes.docs.forEach((d) => batch.delete(d.ref));
    legacy.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'courses', courseId));
    await batch.commit();
  };
  const amBanned = bannedUids.has(uid);

  const openRound = (roundId: string, replace = false) => {
    const mine = (participantsByRound[roundId] || []).find((p) => p.uid === uid);
    const count = holesForRound(roundId).length || 9;
    const firstOpen = mine ? Array.from({ length: count }, (_, i) => mine.sips[i] || 0).findIndex((x) => !x) : 0;
    setSelectedHoleNum(firstOpen >= 0 ? firstOpen + 1 : 1);
    holeInitRef.current = mine ? roundId : null;
    const r = rounds.find((x) => x.roundId === roundId);
    if (!r || r.status === 'active') setLiveRoundId(roundId);
    navigate('round', roundId, replace);
  };

  /** Fäll ner rundan: tillbaka till förra vyn, rundan ligger kvar som en rad längst ner. */
  const minimizeRound = () => {
    if (activeRoundId && activeRound?.status === 'active') setLiveRoundId(activeRoundId);
    const back = lastOutsideRoundRef.current;
    navigate(back.view, back.id);
  };

  const openStart = (courseId: string) => navigate('start', courseId);
  const openCourse = (courseId: string) => navigate('course', courseId);
  const openPlayer = (playerUid: string) => {
    if (playerUid === uid) {
      setProfileTab('rounds');
      navigate('profile');
    } else navigate('player', playerUid);
  };

  const startCourse = startCourseId ? courseById.get(startCourseId) || null : null;
  const previewCourse = previewCourseId ? courseById.get(previewCourseId) || null : null;
  const editCourse = editCourseId ? courseById.get(editCourseId) || null : null;
  const inspectedPlayer = selectedPlayerUid ? profileByUid.get(selectedPlayerUid) || null : null;

  // Nedfälld runda längst ner
  const liveRound = liveRoundId ? rounds.find((r) => r.roundId === liveRoundId && r.status === 'active') || null : null;
  const liveParts = liveRound ? (participantsByRound[liveRound.roundId] || []).map(withProfile) : [];
  const liveMe = liveParts.find((p) => p.uid === uid) || null;
  const showMiniBar = !!liveRound && !!liveMe && view !== 'round';
  const miniBar = (() => {
    if (!showMiniBar || !liveRound || !liveMe) return null;
    const holes = holesByRoundId[liveRound.roundId] || [];
    const board = buildLeaderboard(liveParts, holes);
    const mine = board.find((e) => e.player.uid === uid);
    const leader = board[0];
    const nextHole = Array.from({ length: holes.length }, (_, i) => liveMe.sips[i] || 0).findIndex((x) => !x);
    const leaderLine =
      liveParts.length < 2
        ? `${liveParts.length} spelare`
        : leader?.player.uid === uid
          ? 'Du leder!'
          : `Leder: ${leader?.player.displayName.split(' ')[0]} ${leader?.summary.toParFormatted}`;
    return {
      title: titleForRound(liveRound),
      holeLabel: nextHole >= 0 ? `Hål ${nextHole + 1}/${holes.length}` : 'Alla hål spelade',
      toPar: mine?.summary.toParFormatted || 'E',
      position: mine?.positionLabel || '–',
      leaderLine,
    };
  })();
  const firstName = (myProfileFields.displayName || 'golfare').split(' ')[0];
  const myPlayerCode = myProfile?.playerCode || '';
  const tourPlayers: PlayerTourProfile[] = mergeTourProfiles(allProfiles, [], myProfile, 'none', uid).map(withProfile);
  const myTourPlayer = tourPlayers.find((p) => p.uid === uid) || null;

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} language="sv" region="SE">
      <div className="pg-fairway min-h-screen text-[#112218]">
        {syncError && (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 text-center text-xs text-red-900 shadow-sm md:text-sm">
            <span>{syncError}</span>
            <button type="button" onClick={() => setSyncError(null)} className="rounded-full px-2 font-semibold hover:bg-red-100" aria-label="Stäng">
              ✕
            </button>
          </div>
        )}
        {amBanned && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-center text-xs font-semibold text-red-900">
            Ditt konto är avstängt av en admin. Du kan inte skapa banor eller gå med i rundor.
          </div>
        )}
        {gmpQuotaExceeded && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900">
            Kartans gratiskvot är slut för idag – kartan kan saknas en stund.
          </div>
        )}

        <AppHeader
          displayName={myProfileFields.displayName}
          avatarSeed={myProfileFields.avatarSeed}
          handicap={myComputedHandicap}
          wins={myWins}
          friendRequests={friendRequests.length}
          isAdmin={isAdmin}
          onOpenFriends={() => setView('friends')}
          onOpenAdmin={() => setView('admin')}
          onGoHome={() => setView('home')}
          onOpenMyProfile={() => {
            setProfileTab('rounds');
            setView('profile');
          }}
          onOpenMyCourses={() => {
            setProfileTab('courses');
            setView('profile');
          }}
          onOpenPlayers={() => setView('players')}
          onOpenAbout={() => setView('about')}
          onSignOut={handleGoogleSignOut}
        />

        {activeCelebrationClip && (
          <Suspense fallback={null}>
            <BowlingScoreAnimationOverlay clip={activeCelebrationClip} onDismiss={() => setActiveCelebrationClip(null)} />
          </Suspense>
        )}

        {notice && (
          <div className="fixed inset-x-0 top-16 z-40 mx-auto w-fit rounded-full bg-[#112218] px-4 py-2 text-sm font-semibold text-[#F6F4EE] shadow-lg">
            {notice}
          </div>
        )}

        {pendingDeletedRound && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700">Rundan är raderad</p>
              <h2 className="mt-1 font-display text-xl font-bold text-[#112218]">{titleForRound(pendingDeletedRound)}</h2>
              <p className="mt-2 text-sm text-[#112218]/70">
                {pendingDeletedRound.ownerName} har raderat rundan. Vill du spara ditt eget resultat i din historik?
              </p>
              <div className="mt-4 grid gap-2">
                <button type="button" disabled={deletedPromptBusy}
                  onClick={() => void resolveDeletedRound(pendingDeletedRound.roundId, true)}
                  className="rounded-2xl bg-[#112218] py-3 text-sm font-bold text-[#F6F4EE] disabled:opacity-60">
                  Spara mitt resultat
                </button>
                <button type="button" disabled={deletedPromptBusy}
                  onClick={() => void resolveDeletedRound(pendingDeletedRound.roundId, false)}
                  className="rounded-2xl border border-red-200 py-3 text-sm font-semibold text-red-700 disabled:opacity-60">
                  Radera mitt resultat
                </button>
              </div>
            </div>
          </div>
        )}

        {showMiniBar && <style>{':root{--pg-mini-bar:76px}'}</style>}
        {!pendingDeletedRound && invitedRounds.length > 0 && (() => {
          const inv = invitedRounds[0];
          const inviter = profileByUid.get(inv.ownerId);
          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Inbjudan till runda">
              <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="bg-[#112218] px-5 py-4 text-[#F6F4EE]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                    Inbjudan{invitedRounds.length > 1 ? ` (1 av ${invitedRounds.length})` : ''}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold">{titleForRound(inv)}</h2>
                  <p className="mt-1 text-sm text-[#F6F4EE]/70">
                    {inviter?.displayName || inv.ownerName} vill ha med dig · {formatEventDate(inv.eventDate)} · {inv.city}
                  </p>
                </div>
                <div className="space-y-2 p-5">
                  <p className="text-sm text-[#112218]/70">
                    {inv.memberIds.length} spelare är med. Tackar du ja hamnar du i rundan och på leaderboarden.
                  </p>
                  <button type="button" disabled={inviteBusy} onClick={() => void acceptInvite(inv)}
                    className="w-full rounded-2xl bg-[#166534] py-3 text-sm font-bold text-white disabled:opacity-60">
                    Gå med i rundan
                  </button>
                  <button type="button" disabled={inviteBusy} onClick={() => void declineInvite(inv)}
                    className="w-full rounded-2xl border border-[#112218]/15 py-3 text-sm font-semibold text-[#112218]/75 disabled:opacity-60">
                    Nej tack
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <main id="top" className={`mx-auto max-w-3xl px-4 pt-5 ${showMiniBar ? 'pb-28' : 'pb-10'}`}>
          {view === 'home' && (
            <HomeView
              firstName={firstName}
              myOpenRounds={myActiveRounds}
              titleForRound={titleForRound}
              onCreate={() => setView('create')}
              onPlay={() => setView('play')}
              onOpenRound={(id) => openRound(id)}
            />
          )}

          {view === 'create' && (
            <CreateCourseView
              defaultCity={myProfile?.country && myProfile.country !== 'Sverige' ? myProfile.country : 'Stockholm'}
              onBack={() => setView('home')}
              onCreate={async (input) => {
                const courseId = await handleCreateCourse(input);
                showNotice('Banan är skapad!');
                navigate('course', courseId, true);
              }}
            />
          )}

          {view === 'editCourse' &&
            (editCourse && editCourse.ownerId === uid ? (
              coursesLoaded && holesByCourse[editCourse.courseId] ? (
                <CreateCourseView
                  key={editCourse.courseId}
                  defaultCity={editCourse.city}
                  initial={{
                    title: editCourse.title,
                    subtitle: editCourse.subtitle,
                    city: editCourse.city,
                    isPublic: !!editCourse.isPublic,
                    holes: holesForCourse(editCourse.courseId, editCourse.ownerId).map(holeToDraft),
                  }}
                  onBack={() => openCourse(editCourse.courseId)}
                  onCreate={async (input) => {
                    await handleSaveCourse(editCourse.courseId, input);
                    showNotice('Banan är sparad.');
                    navigate('course', editCourse.courseId, true);
                  }}
                  onDelete={async () => {
                    await handleDeleteCourse(editCourse.courseId);
                    showNotice('Banan är borttagen.');
                    setProfileTab('courses');
                    navigate('profile', undefined, true);
                  }}
                />
              ) : (
                <p className="text-sm text-[#112218]/60">Banan laddas…</p>
              )
            ) : (
              <div className="rounded-3xl border border-[#112218]/10 bg-white p-8 text-center shadow-xs">
                <p className="text-sm text-[#112218]/70">
                  {coursesLoaded ? 'Bara den som skapat banan kan ändra den.' : 'Banan laddas…'}
                </p>
                <button type="button" onClick={() => setView('play')} className="mt-4 rounded-full bg-[#112218] px-5 py-2 text-sm font-semibold text-[#F6F4EE]">
                  Till Spela
                </button>
              </div>
            ))}

          {view === 'course' &&
            (previewCourse && (previewCourse.isPublic || previewCourse.ownerId === uid || isAdmin) ? (
              <CoursePreviewView
                key={previewCourse.courseId}
                course={previewCourse}
                holes={holesForCourse(previewCourse.courseId, previewCourse.ownerId)}
                isOwner={previewCourse.ownerId === uid}
                canStart={!amBanned && (previewCourse.isPublic === true || previewCourse.ownerId === uid)}
                onBack={() => (window.history.length > 1 ? window.history.back() : setView('play'))}
                onStart={() => openStart(previewCourse.courseId)}
                onEdit={() => navigate('editCourse', previewCourse.courseId)}
                onOpenOwner={() => openPlayer(previewCourse.ownerId)}
              />
            ) : (
              <div className="rounded-3xl border border-[#112218]/10 bg-white p-8 text-center shadow-xs">
                <p className="text-sm text-[#112218]/70">{coursesLoaded ? 'Banan finns inte eller är privat.' : 'Banan laddas…'}</p>
                <button type="button" onClick={() => setView('play')} className="mt-4 rounded-full bg-[#112218] px-5 py-2 text-sm font-semibold text-[#F6F4EE]">
                  Till Spela
                </button>
              </div>
            ))}

          {view === 'start' &&
            (startCourse ? (
              <StartRoundView
                course={startCourse}
                holes={holesForCourse(startCourse.courseId, startCourse.ownerId)}
                isCourseOwner={startCourse.ownerId === uid}
                onBack={() => (window.history.length > 1 ? window.history.back() : setView('play'))}
                onStart={async (input) => {
                  const roundId = await handleStartRound(startCourse.courseId, input);
                  setSelectedHoleNum(1);
                  holeInitRef.current = roundId;
                  setLiveRoundId(roundId);
                  navigate('round', roundId, true);
                }}
              />
            ) : (
              <p className="text-sm text-[#112218]/60">Banan laddas…</p>
            ))}

          {view === 'play' && (
            <PlayView
              myRounds={myActiveRounds}
              finishedRounds={myFinishedRounds}
              courses={playableCourses}
              currentUid={uid}
              titleForRound={titleForRound}
              holeCountFor={holeCountFor}
              initialCode={initialJoinParam}
              onBack={() => setView('home')}
              onOpenRound={(id) => openRound(id)}
              onStartCourse={openStart}
              onPreviewCourse={openCourse}
              onCreateCourse={() => setView('create')}
              onJoin={handleJoinByCode}
            />
          )}

          {view === 'round' &&
            (activeRound && activeRoundCourse && me ? (
              <RoundView
                course={activeRoundCourse}
                courseDoc={activeCourseDoc}
                holes={activeHoles}
                me={me}
                players={activeParticipants}
                isOwner={activeRound.ownerId === uid}
                status={activeRound.status}
                locked={activeRound.locked}
                hasCustomHoles={!!activeRound.customHoles?.length}
                selectedHoleNum={selectedHoleNum}
                onSelectHole={setSelectedHoleNum}
                onMinimize={minimizeRound}
                onUpdateHoleSips={handleUpdateHoleSips}
                onAddPenalty={handleAddPenalty}
                onRemovePenalty={handleRemovePenalty}
                onSaveCourseMeta={async (c) => {
                  // Spelform hör till rundan. Banan ändras aldrig från en runda.
                  if (activeRound.ownerId === uid && c.gameMode && c.gameMode !== activeRound.gameMode) {
                    await updateRound(activeRound.roundId, { gameMode: c.gameMode as PubGolfGameMode });
                  }
                }}
                onSaveRoundHoles={(drafts) => handleSaveRoundHoles(activeRound.roundId, drafts)}
                onAssignTeam={handleAssignTeam}
                onInspectPlayer={openPlayer}
                onFinish={() => handleFinishRound(activeRound.roundId)}
                onReopen={() => handleReopenRound(activeRound.roundId)}
                onLeave={() => leaveRound(activeRound.roundId)}
                manageSheet={
                  <RoundManageSheet
                    round={activeRound}
                    course={activeCourseDoc}
                    players={activeParticipants}
                    me={me}
                    myPlayerCode={myPlayerCode}
                    isRoundOwner={activeRound.ownerId === uid}
                    isCourseOwner={activeCourseDoc?.ownerId === uid}
                    onToggleLock={(locked) => updateRound(activeRound.roundId, { locked })}
                    onAddPlayer={(code) => handleAddPlayer(activeRound.roundId, code)}
                    invited={(activeRound.invitedIds || [])
                      .map((id) => profileByUid.get(id))
                      .filter((p): p is ReusablePlayerProfile => !!p)}
                    onCancelInvite={(playerUid) => handleCancelInvite(activeRound.roundId, playerUid)}
                    quickAdd={[...friends, ...followingOnly].filter(
                      (p) =>
                        !activeRound.memberIds.includes(p.uid) &&
                        !(activeRound.invitedIds || []).includes(p.uid) &&
                        !!p.playerCode
                    )}
                    morePlayers={allProfiles
                      .filter(
                        (p) =>
                          p.uid !== uid &&
                          !!p.playerCode &&
                          !activeRound.memberIds.includes(p.uid) &&
                          !(activeRound.invitedIds || []).includes(p.uid) &&
                          !followingIds.has(p.uid) &&
                          !bannedUids.has(p.uid)
                      )
                      .sort(byRecent)}
                    onRemovePlayer={(playerUid) => handleRemovePlayer(activeRound.roundId, playerUid)}
                    onToggleCoursePublic={async (isPublic) => {
                      if (activeCourseDoc) await handleSaveCourseMeta({ ...activeCourseDoc, isPublic });
                    }}
                    onSetCountsForHcp={(counts) => handleSetCountsForHcp(activeRound.roundId, counts)}
                    onLeave={() => leaveRound(activeRound.roundId)}
                    onDeleteForAll={(keepMine) => handleDeleteForAll(activeRound.roundId, keepMine)}
                  />
                }
              />
            ) : (
              <div className="rounded-3xl border border-[#112218]/10 bg-white p-8 text-center shadow-xs">
                {!roundsLoaded || (activeRound && !participantsByRound[activeRound.roundId]) ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-[#112218]/70">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#112218] border-t-transparent" /> Laddar rundan…
                  </div>
                ) : (
                  <p className="text-sm text-[#112218]/70">Rundan finns inte längre, eller så är du inte med i den.</p>
                )}
                <button type="button" onClick={() => setView('play')} className="mt-4 rounded-full bg-[#112218] px-5 py-2 text-sm font-semibold text-[#F6F4EE]">
                  Till Spela
                </button>
              </div>
            ))}

          {view === 'profile' && (
            <MyProfileView
              key={profileTab}
              profile={myProfileFields}
              playerCode={myPlayerCode}
              stats={careerStatsByUid[uid]}
              history={myHistory}
              onBack={() => setView('home')}
              onSave={handleSaveMyProfile}
              onOpenRound={(id) => openRound(id)}
              myCourses={myCourses}
              holeCountFor={holeCountFor}
              initialTab={profileTab}
              onOpenCourse={openCourse}
              onEditCourse={(id) => navigate('editCourse', id)}
              onStartCourse={openStart}
              onCreateCourse={() => setView('create')}
              shareUrl={myPlayerCode ? `${window.location.origin}/?add=${encodeURIComponent(myPlayerCode)}` : ''}
            />
          )}

          {view === 'players' && (
            <ExploreView
              players={allProfiles
                .filter((p) => !bannedUids.has(p.uid))
                .map((p) => ({ ...p, wins: careerStatsByUid[p.uid]?.wins || p.wins || 0 }))}
              relationFor={relationFor}
              handicapFor={(id) => careerStatsByUid[id]?.computedHandicap || profileByUid.get(id)?.handicap || '54.0'}
              courseCountFor={(id) => courses.filter((c) => c.ownerId === id && c.isPublic).length}
              onBack={() => setView('home')}
              onOpenPlayer={openPlayer}
              onFollow={handleFollow}
            />
          )}

          {view === 'player' &&
            (inspectedPlayer ? (
              <PlayerProfileView
                key={inspectedPlayer.uid}
                player={{ ...inspectedPlayer, wins: careerStatsByUid[inspectedPlayer.uid]?.wins || inspectedPlayer.wins || 0 }}
                stats={careerStatsByUid[inspectedPlayer.uid]}
                handicap={careerStatsByUid[inspectedPlayer.uid]?.computedHandicap || inspectedPlayer.handicap || '54.0'}
                relation={relationFor(inspectedPlayer.uid)}
                invited={invitedByUid === inspectedPlayer.uid}
                courses={courses
                  .filter((c) => c.ownerId === inspectedPlayer.uid && (c.isPublic || isAdmin))
                  .sort((a, b) => a.title.localeCompare(b.title, 'sv'))}
                holeCountFor={holeCountFor}
                onBack={() => (window.history.length > 1 ? window.history.back() : setView('players'))}
                onFollow={() => handleFollow(inspectedPlayer.uid)}
                onOpenCourse={openCourse}
              />
            ) : (
              <p className="text-sm text-[#112218]/60">Spelaren laddas…</p>
            ))}

          {view === 'about' && <AboutView onBack={() => setView('home')} />}

          {view === 'friends' && (
            <FriendsView
              myPlayerCode={myPlayerCode}
              friends={friends}
              following={followingOnly}
              requests={friendRequests}
              suggestions={friendSuggestions}
              handicapFor={(id) => careerStatsByUid[id]?.computedHandicap || profileByUid.get(id)?.handicap || '54.0'}
              onBack={() => setView('home')}
              onFollowByCode={handleFollowByCode}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onRemoveFriend={handleRemoveFriend}
              onDismissRequest={handleDismissRequest}
              onOpenPlayer={openPlayer}
            />
          )}

          {view === 'admin' && isAdmin && (
            <AdminView
              profiles={allProfiles.map((p) => ({ ...p, wins: careerStatsByUid[p.uid]?.wins || p.wins || 0 }))}
              courses={courses}
              rounds={adminRounds}
              bannedUids={bannedUids}
              adminUids={ADMIN_UIDS}
              currentUid={uid}
              handicapFor={(id) => careerStatsByUid[id]?.computedHandicap || profileByUid.get(id)?.handicap || '54.0'}
              onBack={() => setView('home')}
              onOpenPlayer={openPlayer}
              onToggleBan={handleToggleBan}
              onDeleteProfile={handleAdminDeleteProfile}
              onDeleteRound={handleAdminDeleteRound}
              onDeleteCourse={handleAdminDeleteCourse}
            />
          )}
        </main>

        {miniBar && liveRound && (
          <MiniRoundBar
            title={miniBar.title}
            holeLabel={miniBar.holeLabel}
            toPar={miniBar.toPar}
            position={miniBar.position}
            leaderLine={miniBar.leaderLine}
            onOpen={() => openRound(liveRound.roundId)}
          />
        )}
      </div>
    </APIProvider>
  );
}
