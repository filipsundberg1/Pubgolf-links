/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  ClipboardList,
  Compass,
  Trophy,
  Users,
  LogIn,
  LogOut,
  Flag,
  PlusCircle,
  ShieldCheck,
  Award,
} from 'lucide-react';
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
  APP_ID,
  buildScoreCelebrationClip,
  calculatePlayerCareerStats,
  calculateRoundSummary,
  createBlankHolesForCourse,
  generateInviteCode,
  mergeTourProfiles,
  type PlayerCareerStats,
  type PlayerTourProfile,
  type PubCourse,
  type PubGolfGameMode,
  type PubHole,
  type ReusablePlayerProfile,
  type ScoreCelebrationClip,
} from './utils/golfRules';
import { HERO_CLUBHOUSE_IMG, TROPHY_CLARET_IMG } from './data/defaultTourData';
import { RoundsLobbyView, type InitialHoleDraft } from './components/RoundsLobbyView';
import { ScorecardView } from './components/ScorecardView';
import { CourseGuideView } from './components/CourseGuideView';
import { LeaderboardView } from './components/LeaderboardView';
import { PgaPlayersView } from './components/PgaPlayersView';
import { GolferAvatar } from './components/GolferAvatar';
import { BowlingScoreAnimationOverlay } from './components/BowlingScoreAnimationOverlay';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AppHeader } from './components/shell/AppHeader';
import { HomeView } from './components/views/HomeView';
import { CreateRoundView, type CreateRoundInput } from './components/views/CreateRoundView';
import { PlayView } from './components/views/PlayView';
import { RoundView } from './components/views/RoundView';
import { MyProfileView, withProfileDefaults } from './components/views/MyProfileView';
import { AboutView } from './components/views/AboutView';

type ActiveTab = 'lobby' | 'scorecard' | 'guide' | 'leaderboard' | 'players';
type View = 'home' | 'create' | 'play' | 'round' | 'profile' | 'players' | 'about';

export default function App() {
  // Clean up any legacy unauthenticated localStorage keys
  useEffect(() => {
    try {
      localStorage.removeItem('december_links_course_v1');
      localStorage.removeItem('december_links_holes_v1');
      localStorage.removeItem('december_links_players_v1');
      localStorage.removeItem('pubgolf_my_profile_v2');
      localStorage.removeItem('pubgolf_courses_v2');
      localStorage.removeItem('pubgolf_holes_by_course_v2');
      localStorage.removeItem('pubgolf_participants_by_course_v2');
      localStorage.removeItem('pubgolf_active_course_id_v2');
    } catch {
      // ignore storage errors
    }
  }, []);

  const initialJoinParam = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get('join') || params.get('code') || '').trim().toUpperCase();
    } catch {
      return '';
    }
  })();

  const [activeTab, setActiveTab] = useState<ActiveTab>('lobby');
  const [view, setViewState] = useState<View>(initialJoinParam ? 'play' : 'home');
  const setView = (next: View) => {
    setViewState(next);
    window.scrollTo({ top: 0 });
  };
  const [selectedHoleNum, setSelectedHoleNum] = useState<number>(1);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Authenticated state (populated strictly when firebaseUser is signed in)
  const [myProfile, setMyProfile] = useState<ReusablePlayerProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<ReusablePlayerProfile[]>([]);
  const [courses, setCourses] = useState<PubCourse[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [holesByCourse, setHolesByCourse] = useState<Record<string, PubHole[]>>({});
  const [participantsByCourse, setParticipantsByCourse] = useState<
    Record<string, PlayerTourProfile[]>
  >({});
  const [selectedPlayerUid, setSelectedPlayerUid] = useState<string>('');
  const [activeCelebrationClip, setActiveCelebrationClip] =
    useState<ScoreCelebrationClip | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Firestore listener errors are shown as a banner instead of crashing.
  useEffect(() => {
    const onSyncError = () =>
      setSyncError('Kunde inte hämta senaste datan. Kontrollera uppkopplingen och ladda om sidan.');
    window.addEventListener('firestore-sync-error', onSyncError);
    return () => window.removeEventListener('firestore-sync-error', onSyncError);
  }, []);

  // Finish a redirect-based sign-in (fallback when popups are blocked).
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error('Redirect sign-in failed', err);
      setAuthNotice('Google-inloggningen kunde inte slutföras. Försök igen.');
    });
  }, []);

  // Listen for Google Maps Platform quota exceeded event (Section 8 Case A)
  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Track previous hole sips per course & player so any new score registered by ANY player
  // in the active round triggers the bowling-alley celebration/roast clip for everyone!
  const prevSipsByCourseRef = useRef<Record<string, Record<string, number[]>>>({});
  const activeCourseIdRef = useRef<string | null>(null);
  const holesByCourseRef = useRef<Record<string, PubHole[]>>({});

  useEffect(() => {
    activeCourseIdRef.current = activeCourseId;
  }, [activeCourseId]);

  useEffect(() => {
    holesByCourseRef.current = holesByCourse;
  }, [holesByCourse]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        setSelectedPlayerUid(user.uid);
      } else {
        // Strictly clear all user/round data when logged out
        setMyProfile(null);
        setAllProfiles([]);
        setCourses([]);
        setActiveCourseId(null);
        setHolesByCourse({});
        setParticipantsByCourse({});
        setSelectedPlayerUid('');
        setActiveTab('lobby');
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to user's profile, all tour profiles, and courses in Firestore ONLY when authenticated
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const myProfileRef = doc(db, 'profiles', firebaseUser.uid);
    const unsubProfile = onSnapshot(
      myProfileRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setMyProfile({
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
          });
        } else {
          setMyProfile(null);
          // Första inloggningen: skapa en spelarprofil med namnet från Google
          if (!snap.metadata.fromCache) {
            const googleName = (firebaseUser.displayName || '').trim();
            void setDoc(myProfileRef, {
              uid: firebaseUser.uid,
              appId: APP_ID,
              displayName: (googleName.length >= 2 ? googleName : 'Spelare').slice(0, 60),
              nickname: 'Rookie',
              country: 'Stockholm',
              homePub: 'Klubbhuset',
              signatureDrink: 'Lager',
              favoriteClub: 'Driver',
              handicap: '0.0',
              bio: 'Ny på touren.',
              avatarSeed: 'emerald',
              updatedAt: serverTimestamp(),
            }).catch((err) => console.error('Kunde inte skapa profil', err));
          }
        }
      },
      (err) => {
        if (err && !String(err.message).includes('Missing or insufficient permissions')) {
          reportFirestoreError(err, OperationType.GET, `profiles/${firebaseUser.uid}`);
        }
      }
    );

    const allProfilesQuery = query(collection(db, 'profiles'), where('appId', '==', APP_ID));
    const unsubAllProfiles = onSnapshot(
      allProfilesQuery,
      (snap) => {
        const loadedProfiles: ReusablePlayerProfile[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          loadedProfiles.push({
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
          });
        });
        setAllProfiles(loadedProfiles);
      },
      (err) => {
        if (err && !String(err.message).includes('Missing or insufficient permissions')) {
          reportFirestoreError(err, OperationType.LIST, 'profiles');
        }
      }
    );

    const coursesQuery = query(collection(db, 'courses'), where('appId', '==', APP_ID));
    const unsubCourses = onSnapshot(
      coursesQuery,
      (snap) => {
        const loadedCourses: PubCourse[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          loadedCourses.push({
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
          });
        });
        setCourses(loadedCourses);
        setActiveCourseId((prev) => {
          if (prev && loadedCourses.some((c) => c.courseId === prev)) return prev;
          return null;
        });
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, 'courses');
      }
    );

    return () => {
      unsubProfile();
      unsubAllProfiles();
      unsubCourses();
    };
  }, [authReady, firebaseUser]);

  const courseIdsKey = courses
    .map((c) => c.courseId)
    .sort()
    .join(',');

  // Subscribe to holes and participants across all courses when signed in so career stats
  // and automatic Handicap work across all rounds
  useEffect(() => {
    if (!authReady || !firebaseUser || !courseIdsKey) return;

    const courseIds = courseIdsKey.split(',').filter(Boolean);
    const unsubscribers: Array<() => void> = [];

    for (const cId of courseIds) {
      const holesQuery = query(
        collection(db, 'courses', cId, 'holes'),
        where('courseId', '==', cId)
      );
      const unsubHoles = onSnapshot(
        holesQuery,
        (snap) => {
          if (!snap.empty) {
            const loadedHoles: PubHole[] = [];
            snap.forEach((docSnap) => {
              const d = docSnap.data();
              loadedHoles.push({
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
              });
            });
            loadedHoles.sort((a, b) => a.holeNumber - b.holeNumber);
            setHolesByCourse((prev) => ({
              ...prev,
              [cId]: loadedHoles,
            }));
          }
        },
        (err) => {
          if (err && !String(err.message).includes('Missing or insufficient permissions')) {
            reportFirestoreError(err, OperationType.LIST, `courses/${cId}/holes`);
          }
        }
      );
      unsubscribers.push(unsubHoles);

      const partsQuery = query(
        collection(db, 'courses', cId, 'participants'),
        where('courseId', '==', cId)
      );
      const unsubParts = onSnapshot(
        partsQuery,
        (snap) => {
          const loadedParts: PlayerTourProfile[] = [];
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            loadedParts.push({
              uid: String(d.uid),
              appId: APP_ID,
              courseId: String(d.courseId),
              displayName: String(d.displayName),
              nickname: String(d.nickname),
              country: String(d.country),
              homePub: String(d.homePub),
              signatureDrink: String(d.signatureDrink),
              favoriteClub: String(d.favoriteClub),
              handicap: String(d.handicap),
              bio: String(d.bio),
              avatarSeed: String(d.avatarSeed || 'emerald'),
              sips: [
                Number(d.sipsHole1 || 0),
                Number(d.sipsHole2 || 0),
                Number(d.sipsHole3 || 0),
                Number(d.sipsHole4 || 0),
                Number(d.sipsHole5 || 0),
                Number(d.sipsHole6 || 0),
                Number(d.sipsHole7 || 0),
                Number(d.sipsHole8 || 0),
                Number(d.sipsHole9 || 0),
              ],
              totalSips: Number(d.totalSips || 0),
              totalToPar: Number(d.totalToPar || 0),
              thruHoles: Number(d.thruHoles || 0),
              teamId: d.teamId ? String(d.teamId) : undefined,
              teamName: d.teamName ? String(d.teamName) : undefined,
            });
          });

          // Detect newly registered hole scores from participants in the round
          const prevCourseMap = prevSipsByCourseRef.current[cId];
          const nextCourseMap: Record<string, number[]> = {};

          if (!prevCourseMap) {
            for (const part of loadedParts) {
              nextCourseMap[part.uid] = [...part.sips];
            }
            prevSipsByCourseRef.current[cId] = nextCourseMap;
          } else {
            for (const part of loadedParts) {
              const oldSips = prevCourseMap[part.uid] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
              nextCourseMap[part.uid] = [...part.sips];

              if (cId === activeCourseIdRef.current) {
                for (let idx = 0; idx < 9; idx++) {
                  const newVal = part.sips[idx] ?? 0;
                  const oldVal = oldSips[idx] ?? 0;
                  if (newVal > 0 && newVal !== oldVal) {
                    const courseHoles =
                      holesByCourseRef.current[cId] ||
                      createBlankHolesForCourse(cId, part.uid);
                    const holeObj =
                      courseHoles.find((h) => h.holeNumber === idx + 1) || {
                        holeNumber: idx + 1,
                        pubName: `Hål ${idx + 1}`,
                        drinkName: part.signatureDrink || 'Tävlingsdryck',
                        par: 4,
                      };
                    const clip = buildScoreCelebrationClip({
                      playerUid: part.uid,
                      playerName: part.displayName,
                      playerNickname: part.nickname,
                      avatarSeed: part.avatarSeed,
                      holeNumber: idx + 1,
                      pubName: holeObj.pubName,
                      drinkName: holeObj.drinkName,
                      sips: newVal,
                      par: holeObj.par,
                    });
                    setActiveCelebrationClip(clip);
                  }
                }
              }
            }
            prevSipsByCourseRef.current[cId] = nextCourseMap;
          }

          setParticipantsByCourse((prev) => ({
            ...prev,
            [cId]: loadedParts,
          }));
        },
        (err) => {
          if (err && !String(err.message).includes('Missing or insufficient permissions')) {
            reportFirestoreError(err, OperationType.LIST, `courses/${cId}/participants`);
          }
        }
      );
      unsubscribers.push(unsubParts);
    }

    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [authReady, firebaseUser, courseIdsKey]);

  const handleGoogleSignIn = async () => {
    setAuthNotice(null);
    if (isInAppBrowser()) {
      // Google blocks OAuth inside Messenger/Facebook/Instagram webviews.
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

  // 1. Loading state while Firebase Auth initializes
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F4EE] px-4 text-[#112218]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#112218] border-t-transparent" />
          <p className="mt-3 font-display text-base font-semibold text-[#112218]">
            Kontrollerar inloggning till Pubgolf Links...
          </p>
        </div>
      </div>
    );
  }

  // 2. STRICT AUTH WALL (Inloggningsvägg): Nothing can be created or viewed until signed in with Google
  if (!firebaseUser) {
    return (
      <div data-testid="auth-wall-screen" className="relative flex min-h-screen flex-col overflow-hidden bg-[#112218] text-[#F6F4EE]">
        <img src={HERO_CLUBHOUSE_IMG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#112218]/40 via-[#112218]/80 to-[#112218]" />
        <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-end px-6 pb-14 pt-24 sm:justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#D4AF37] text-2xl">⛳</div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Pubgolf Tour</p>
          <h1 className="mt-2 font-display text-5xl font-bold leading-[1.05]">Pubgolf Links</h1>
          <p className="mt-3 text-base text-[#F6F4EE]/70">
            Skapa rundor, bjud in gänget och följ scoren hål för hål.
          </p>

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

  // 3. Authenticated Application (firebaseUser is guaranteed non-null below)
  const currentUid = firebaseUser.uid;

  const activeCourse: PubCourse | null =
    courses.find((c) => c.courseId === activeCourseId) || courses[0] || null;

  const activeHoles: PubHole[] = activeCourse
    ? holesByCourse[activeCourse.courseId] ||
      createBlankHolesForCourse(activeCourse.courseId, activeCourse.ownerId)
    : [];

  const rawCourseParticipants: PlayerTourProfile[] = activeCourse
    ? participantsByCourse[activeCourse.courseId] || []
    : [];

  // Flatten participants from all courses so any player who joined any round is included
  const allCourseParticipantsFlat: PlayerTourProfile[] = (
    Object.values(participantsByCourse) as PlayerTourProfile[][]
  ).flat();

  const mergedTourPlayersBase: PlayerTourProfile[] = mergeTourProfiles(
    allProfiles,
    allCourseParticipantsFlat,
    myProfile,
    activeCourse?.courseId || 'none',
    currentUid
  );

  // Calculate automatic round-average Handicap and career stats across ALL courses for every player
  const careerStatsByUid: Record<string, PlayerCareerStats> = {};
  for (const player of mergedTourPlayersBase) {
    careerStatsByUid[player.uid] = calculatePlayerCareerStats(
      player.uid,
      courses,
      participantsByCourse,
      holesByCourse
    );
  }
  if (!careerStatsByUid[currentUid]) {
    careerStatsByUid[currentUid] = calculatePlayerCareerStats(
      currentUid,
      courses,
      participantsByCourse,
      holesByCourse
    );
  }

  const allTourPlayers: PlayerTourProfile[] = mergedTourPlayersBase.map((p) => ({
    ...p,
    handicap: careerStatsByUid[p.uid]?.computedHandicap || '0.0',
  }));

  const activeParticipants: PlayerTourProfile[] = mergeTourProfiles(
    allProfiles,
    rawCourseParticipants,
    myProfile,
    activeCourse?.courseId || 'none',
    currentUid
  ).map((p) => ({
    ...p,
    handicap: careerStatsByUid[p.uid]?.computedHandicap || '0.0',
  }));

  const myComputedHandicap = careerStatsByUid[currentUid]?.computedHandicap || '0.0';
  const myRoundsPlayed = careerStatsByUid[currentUid]?.roundsPlayed || 0;

  const activePlayerInRound: PlayerTourProfile | null =
    activeParticipants.find((p) => p.uid === currentUid) ||
    (myProfile
      ? {
          ...myProfile,
          handicap: myComputedHandicap,
          courseId: activeCourse?.courseId || 'none',
          sips: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          totalSips: 0,
          totalToPar: 0,
          thruHoles: 0,
        }
      : null);

  const persistParticipantToFirestore = async (
    courseId: string,
    participant: PlayerTourProfile,
    courseHoles: PubHole[]
  ) => {
    if (participant.uid !== firebaseUser.uid) return;
    const summary = calculateRoundSummary(participant.sips, courseHoles);
    const partRef = doc(db, 'courses', courseId, 'participants', firebaseUser.uid);

    try {
      const payload: Record<string, unknown> = {
        uid: participant.uid,
        courseId,
        displayName: participant.displayName.slice(0, 60),
        nickname: participant.nickname.slice(0, 50),
        country: participant.country.slice(0, 50),
        homePub: participant.homePub.slice(0, 80),
        signatureDrink: participant.signatureDrink.slice(0, 80),
        favoriteClub: participant.favoriteClub.slice(0, 80),
        handicap: (participant.handicap || '0.0').slice(0, 20),
        bio: participant.bio.slice(0, 320),
        avatarSeed: participant.avatarSeed.slice(0, 32),
        sipsHole1: participant.sips[0] ?? 0,
        sipsHole2: participant.sips[1] ?? 0,
        sipsHole3: participant.sips[2] ?? 0,
        sipsHole4: participant.sips[3] ?? 0,
        sipsHole5: participant.sips[4] ?? 0,
        sipsHole6: participant.sips[5] ?? 0,
        sipsHole7: participant.sips[6] ?? 0,
        sipsHole8: participant.sips[7] ?? 0,
        sipsHole9: participant.sips[8] ?? 0,
        totalSips: summary.totalSips,
        totalToPar: summary.totalToPar,
        thruHoles: summary.thruHoles,
        updatedAt: serverTimestamp(),
      };
      if (participant.teamId) {
        payload.teamId = participant.teamId.slice(0, 64);
      }
      if (participant.teamName) {
        payload.teamName = participant.teamName.slice(0, 60);
      }
      await setDoc(partRef, payload);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `courses/${courseId}/participants/${participant.uid}`
      );
    }
  };

  const handleSaveMyProfile = async (profileFields: {
    displayName: string;
    nickname: string;
    country: string;
    homePub: string;
    signatureDrink: string;
    favoriteClub: string;
    handicap: string;
    bio: string;
    avatarSeed: string;
  }) => {
    const uid = firebaseUser.uid;
    const autoHandicap = careerStatsByUid[uid]?.computedHandicap || '0.0';
    const nextProfile: ReusablePlayerProfile = {
      uid,
      appId: APP_ID,
      ...profileFields,
      handicap: autoHandicap,
    };

    setMyProfile(nextProfile);
    setAllProfiles((prev) => {
      const exists = prev.some((p) => p.uid === uid);
      return exists ? prev.map((p) => (p.uid === uid ? nextProfile : p)) : [nextProfile, ...prev];
    });
    setSelectedPlayerUid(uid);

    try {
      const profileRef = doc(db, 'profiles', uid);
      await setDoc(profileRef, {
        uid,
        appId: APP_ID,
        displayName: nextProfile.displayName.slice(0, 60),
        nickname: nextProfile.nickname.slice(0, 50),
        country: nextProfile.country.slice(0, 50),
        homePub: nextProfile.homePub.slice(0, 80),
        signatureDrink: nextProfile.signatureDrink.slice(0, 80),
        favoriteClub: nextProfile.favoriteClub.slice(0, 80),
        handicap: autoHandicap.slice(0, 20),
        bio: nextProfile.bio.slice(0, 320),
        avatarSeed: nextProfile.avatarSeed.slice(0, 32),
        updatedAt: serverTimestamp(),
      });

      if (activeCourse) {
        const existingSips = activePlayerInRound?.sips || [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const summary = calculateRoundSummary(existingSips, activeHoles);
        await persistParticipantToFirestore(
          activeCourse.courseId,
          {
            ...nextProfile,
            courseId: activeCourse.courseId,
            sips: existingSips,
            totalSips: summary.totalSips,
            totalToPar: summary.totalToPar,
            thruHoles: summary.thruHoles,
          },
          activeHoles
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `profiles/${uid}`);
    }
  };

  const handleCreateCourse = async (input: CreateRoundInput): Promise<PubCourse> => {
    const uid = firebaseUser.uid;
    const ownerName = myProfile?.displayName || firebaseUser.displayName || 'Banarkitekt';
    const courseId = `round-${Date.now()}`;
    const inviteCode = generateInviteCode();
    const gameMode: PubGolfGameMode = input.gameMode === 'brutal' ? 'brutal' : 'single';

    const newCourse: PubCourse = {
      courseId,
      appId: APP_ID,
      inviteCode,
      title: input.title,
      subtitle: input.subtitle,
      city: input.city,
      eventDate: input.eventDate,
      ownerId: uid,
      ownerName,
      gameMode,
      isPublic: input.isPublic,
    };

    const text = (v: string, fallback: string, max: number) =>
      v.trim().length >= 2 ? v.trim().slice(0, max) : fallback;
    const blankHoles = createBlankHolesForCourse(courseId, uid).map((hole) => {
      const draft = input.holes.find((d) => d.holeNumber === hole.holeNumber);
      if (!draft) return hole;
      const hasRule = draft.hazardTitle.trim().length >= 2 || draft.hazardRule.trim().length >= 2;
      return {
        ...hole,
        pubName: text(draft.pubName, `Hål ${hole.holeNumber}`, 80),
        pubAddress: text(draft.pubAddress, hole.pubAddress, 120),
        drinkType: draft.drinkType,
        drinkName: text(draft.drinkName, hole.drinkName, 80),
        volumeCl: Math.max(2, Math.min(100, Math.round(draft.volumeCl) || 40)),
        par: Math.max(1, Math.min(5, Math.round(draft.par) || 3)),
        hazardTitle: hasRule ? text(draft.hazardTitle, 'Hålets regel', 80) : hole.hazardTitle,
        hazardRule: hasRule ? text(draft.hazardRule, draft.hazardTitle.trim() || 'Se rubriken.', 180) : hole.hazardRule,
        caddieTip: 'Lycka till – och drick vatten mellan hålen!',
      };
    });
    const initialParticipant: PlayerTourProfile = {
      ...(myProfile || {
        uid,
        appId: APP_ID,
        displayName: ownerName,
        nickname: 'Capitano',
        country: input.city,
        homePub: 'Första Tee',
        signatureDrink: 'Lager',
        favoriteClub: 'Driver',
        handicap: myComputedHandicap,
        bio: 'Banarkitekt för rundan.',
        avatarSeed: 'emerald',
      }),
      handicap: myComputedHandicap,
      uid,
      courseId,
      sips: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      totalSips: 0,
      totalToPar: 0,
      thruHoles: 0,
    };

    setCourses((prev) => [newCourse, ...prev]);
    setHolesByCourse((prev) => ({ ...prev, [courseId]: blankHoles }));
    setParticipantsByCourse((prev) => ({ ...prev, [courseId]: [initialParticipant] }));
    setActiveCourseId(courseId);
    setSelectedHoleNum(1);

    try {
      const courseRef = doc(db, 'courses', courseId);
      await setDoc(courseRef, {
        courseId,
        appId: APP_ID,
        inviteCode,
        title: newCourse.title.slice(0, 80),
        subtitle: newCourse.subtitle.slice(0, 140),
        city: newCourse.city.slice(0, 60),
        eventDate: newCourse.eventDate.slice(0, 40),
        ownerId: uid,
        ownerName: newCourse.ownerName.slice(0, 80),
        gameMode,
        isPublic: input.isPublic,
        updatedAt: serverTimestamp(),
      });

      for (const h of blankHoles) {
        const hRef = doc(db, 'courses', courseId, 'holes', `hole-${h.holeNumber}`);
        await setDoc(hRef, {
          ...h,
          ownerId: uid,
          updatedAt: serverTimestamp(),
        });
      }

      await persistParticipantToFirestore(courseId, initialParticipant, blankHoles);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `courses/${courseId}`);
    }

    return newCourse;
  };

  const handleJoinByCode = async (
    codeOrId: string
  ): Promise<{ ok: boolean; message: string; courseId?: string }> => {
    const normalized = codeOrId.trim().toUpperCase();
    let matchedCourse =
      courses.find(
        (c) => c.inviteCode.toUpperCase() === normalized || c.courseId.toUpperCase() === normalized
      ) || null;

    if (!matchedCourse) {
      try {
        const q = query(
          collection(db, 'courses'),
          where('appId', '==', APP_ID),
          where('inviteCode', '==', normalized)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0].data();
          matchedCourse = {
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
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'courses');
      }
    }

    if (!matchedCourse) {
      return {
        ok: false,
        message: `Hittade ingen runda med inbjudningskod "${normalized}". Kontrollera koden med banarkitekten.`,
      };
    }

    const uid = firebaseUser.uid;
    const cId = matchedCourse.courseId;
    const cHoles =
      holesByCourse[cId] || createBlankHolesForCourse(cId, matchedCourse.ownerId);

    const existingList = participantsByCourse[cId] || [];
    const alreadyIn = existingList.find((p) => p.uid === uid);

    const participantRecord: PlayerTourProfile = alreadyIn || {
      ...(myProfile || {
        uid,
        appId: APP_ID,
        displayName: firebaseUser.displayName || 'Spelare',
        nickname: 'Tour Pro',
        country: matchedCourse.city,
        homePub: 'Klubbhuset',
        signatureDrink: 'Lager',
        favoriteClub: 'Driver',
        handicap: myComputedHandicap,
        bio: 'Ansluten till rundan.',
        avatarSeed: 'emerald',
      }),
      handicap: myComputedHandicap,
      uid,
      courseId: cId,
      sips: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      totalSips: 0,
      totalToPar: 0,
      thruHoles: 0,
    };

    setActiveCourseId(cId);
    await persistParticipantToFirestore(cId, participantRecord, cHoles);

    return {
      ok: true,
      courseId: cId,
      message: `Du är nu ansluten till "${matchedCourse.title}"!`,
    };
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      setCourses((prev) => prev.filter((c) => c.courseId !== courseId));
      if (activeCourseId === courseId) {
        const remaining = courses.filter((c) => c.courseId !== courseId);
        setActiveCourseId(remaining[0]?.courseId || null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}`);
    }
  };

  const triggerHoleCelebrationClip = (
    player: PlayerTourProfile,
    holeNumber: number,
    sipsCount: number
  ) => {
    if (sipsCount <= 0) return;
    const holeObj =
      activeHoles.find((h) => h.holeNumber === holeNumber) || {
        holeNumber,
        pubName: `Hål ${holeNumber}`,
        drinkName: player.signatureDrink || 'Tävlingsdryck',
        par: 4,
      };
    const clip = buildScoreCelebrationClip({
      playerUid: player.uid,
      playerName: player.displayName,
      playerNickname: player.nickname,
      avatarSeed: player.avatarSeed,
      holeNumber,
      pubName: holeObj.pubName,
      drinkName: holeObj.drinkName,
      sips: sipsCount,
      par: holeObj.par,
    });
    setActiveCelebrationClip(clip);
  };

  const handleUpdateHoleSips = (holeNumber: number, newSips: number) => {
    if (!activeCourse || !activePlayerInRound) return;
    const cId = activeCourse.courseId;

    const nextSips = [...activePlayerInRound.sips];
    nextSips[holeNumber - 1] = newSips;
    const summary = calculateRoundSummary(nextSips, activeHoles);

    // Record in prevSipsByCourseRef immediately so the local user gets instant animation without duplicate firing when Firestore echoes back
    if (!prevSipsByCourseRef.current[cId]) {
      prevSipsByCourseRef.current[cId] = {};
    }
    prevSipsByCourseRef.current[cId][activePlayerInRound.uid] = [...nextSips];

    if (newSips > 0) {
      triggerHoleCelebrationClip(activePlayerInRound, holeNumber, newSips);
    }

    const draftPlayer: PlayerTourProfile = {
      ...activePlayerInRound,
      sips: nextSips,
      totalSips: summary.totalSips,
      totalToPar: summary.totalToPar,
      thruHoles: summary.thruHoles,
    };

    const nextPartsByCourse: Record<string, PlayerTourProfile[]> = {
      ...participantsByCourse,
      [cId]: (participantsByCourse[cId] || []).some((p) => p.uid === draftPlayer.uid)
        ? (participantsByCourse[cId] || []).map((p) =>
            p.uid === draftPlayer.uid ? draftPlayer : p
          )
        : [...(participantsByCourse[cId] || []), draftPlayer],
    };

    const nextCareer = calculatePlayerCareerStats(
      draftPlayer.uid,
      courses,
      nextPartsByCourse,
      holesByCourse
    );

    const updatedPlayer: PlayerTourProfile = {
      ...draftPlayer,
      handicap: nextCareer.computedHandicap,
    };

    setParticipantsByCourse(nextPartsByCourse);
    void persistParticipantToFirestore(cId, updatedPlayer, activeHoles);
  };

  const handleSaveHoleConfig = async (updatedHole: PubHole) => {
    if (!activeCourse || activeCourse.ownerId !== firebaseUser.uid) return;
    const cId = activeCourse.courseId;

    setHolesByCourse((prev) => {
      const currentList =
        prev[cId] || createBlankHolesForCourse(cId, activeCourse.ownerId);
      return {
        ...prev,
        [cId]: currentList.map((h) =>
          h.holeNumber === updatedHole.holeNumber ? updatedHole : h
        ),
      };
    });

    try {
      const holeRef = doc(
        db,
        'courses',
        cId,
        'holes',
        `hole-${updatedHole.holeNumber}`
      );
      await setDoc(holeRef, {
        holeNumber: updatedHole.holeNumber,
        courseId: cId,
        ownerId: firebaseUser.uid,
        pubName: updatedHole.pubName.slice(0, 80),
        pubAddress: updatedHole.pubAddress.slice(0, 120),
        drinkName: updatedHole.drinkName.slice(0, 80),
        drinkType: updatedHole.drinkType,
        volumeCl: updatedHole.volumeCl,
        par: updatedHole.par,
        lengthMeters: updatedHole.lengthMeters,
        shape: updatedHole.shape,
        hazardTitle: updatedHole.hazardTitle.slice(0, 80),
        hazardRule: updatedHole.hazardRule.slice(0, 180),
        caddieTip: updatedHole.caddieTip.slice(0, 200),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `courses/${cId}/holes/hole-${updatedHole.holeNumber}`
      );
    }
  };

  const handleSaveCourseMeta = async (updatedCourse: PubCourse) => {
    if (updatedCourse.ownerId !== firebaseUser.uid) return;
    const gameMode: PubGolfGameMode = updatedCourse.gameMode === 'brutal' ? 'brutal' : 'single';
    const normalizedCourse: PubCourse = {
      ...updatedCourse,
      gameMode,
    };

    setCourses((prev) =>
      prev.map((c) => (c.courseId === normalizedCourse.courseId ? normalizedCourse : c))
    );

    try {
      const courseRef = doc(db, 'courses', normalizedCourse.courseId);
      await setDoc(courseRef, {
        courseId: normalizedCourse.courseId,
        appId: APP_ID,
        inviteCode: normalizedCourse.inviteCode,
        title: normalizedCourse.title.slice(0, 80),
        subtitle: normalizedCourse.subtitle.slice(0, 140),
        city: normalizedCourse.city.slice(0, 60),
        eventDate: normalizedCourse.eventDate.slice(0, 40),
        ownerId: firebaseUser.uid,
        ownerName: normalizedCourse.ownerName.slice(0, 80),
        gameMode,
        isPublic: !!normalizedCourse.isPublic,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `courses/${normalizedCourse.courseId}`
      );
    }
  };

  const handleAssignBrutalBallTeam = async (
    playerUids: string[],
    teamId: string,
    teamName: string
  ) => {
    if (!activeCourse) return;
    const cId = activeCourse.courseId;
    const isCourseOwner = activeCourse.ownerId === firebaseUser.uid;

    // Update local state immediately
    setParticipantsByCourse((prev) => {
      const list = prev[cId] || [];
      return {
        ...prev,
        [cId]: list.map((p) =>
          playerUids.includes(p.uid)
            ? { ...p, teamId: teamId.slice(0, 64), teamName: teamName.slice(0, 60) }
            : p
        ),
      };
    });

    // Persist to Firestore (course owner can update any participant in the round; regular player can update their own participant doc)
    for (const targetUid of playerUids) {
      if (!isCourseOwner && targetUid !== firebaseUser.uid) continue;
      const targetPlayer = activeParticipants.find((p) => p.uid === targetUid);
      if (!targetPlayer) continue;
      const summary = calculateRoundSummary(targetPlayer.sips, activeHoles);
      const partRef = doc(db, 'courses', cId, 'participants', targetUid);
      try {
        await setDoc(partRef, {
          uid: targetUid,
          courseId: cId,
          displayName: targetPlayer.displayName.slice(0, 60),
          nickname: targetPlayer.nickname.slice(0, 50),
          country: targetPlayer.country.slice(0, 50),
          homePub: targetPlayer.homePub.slice(0, 80),
          signatureDrink: targetPlayer.signatureDrink.slice(0, 80),
          favoriteClub: targetPlayer.favoriteClub.slice(0, 80),
          handicap: (targetPlayer.handicap || '0.0').slice(0, 20),
          bio: targetPlayer.bio.slice(0, 320),
          avatarSeed: targetPlayer.avatarSeed.slice(0, 32),
          sipsHole1: targetPlayer.sips[0] ?? 0,
          sipsHole2: targetPlayer.sips[1] ?? 0,
          sipsHole3: targetPlayer.sips[2] ?? 0,
          sipsHole4: targetPlayer.sips[3] ?? 0,
          sipsHole5: targetPlayer.sips[4] ?? 0,
          sipsHole6: targetPlayer.sips[5] ?? 0,
          sipsHole7: targetPlayer.sips[6] ?? 0,
          sipsHole8: targetPlayer.sips[7] ?? 0,
          sipsHole9: targetPlayer.sips[8] ?? 0,
          totalSips: summary.totalSips,
          totalToPar: summary.totalToPar,
          thruHoles: summary.thruHoles,
          teamId: teamId.slice(0, 64),
          teamName: teamName.slice(0, 60),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.WRITE,
          `courses/${cId}/participants/${targetUid}`
        );
      }
    }
  };

  const renderRoundSwitcherBar = () => {
    if (courses.length <= 1 || !activeCourse) return null;
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#112218]/15 bg-white px-5 py-3 shadow-xs">
        <div className="text-xs font-bold text-[#112218]/70">
          VÄLJ AKTIV RUNDA ({courses.length} RUNDOR):
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {courses.map((c) => {
            const isActive = c.courseId === activeCourse.courseId;
            return (
              <button
                key={c.courseId}
                type="button"
                onClick={() => {
                  setActiveCourseId(c.courseId);
                  setSelectedHoleNum(1);
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#112218] text-[#F6F4EE]'
                    : 'border border-[#112218]/15 bg-[#F6F4EE] text-[#112218] hover:bg-[#112218]/10'
                }`}
              >
                {c.title} ({c.eventDate})
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderNoActiveRoundPrompt = (featureTitle: string) => (
    <div
      data-testid="no-active-round-prompt"
      className="rounded-2xl border border-[#112218]/15 bg-white p-10 text-center shadow-xs"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#112218] text-[#D4AF37]">
        <Flag className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-[#112218]">
        Ingen aktiv pubgolfrunda vald för {featureTitle}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#112218]/70">
        Skapa en ny pubgolfrunda eller anslut till en väns runda med inbjudningskod i lobbyn för att
        aktivera scorekortet, banguiden och leaderboarden.
      </p>
      <button
        type="button"
        onClick={() => setActiveTab('lobby')}
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#112218] px-5 py-2.5 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#163826]"
      >
        <PlusCircle className="h-4 w-4 text-[#D4AF37]" />
        Gå till Rundor & Inbjudan
      </button>
    </div>
  );

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

  const isMember = (cId: string) => (participantsByCourse[cId] || []).some((p) => p.uid === currentUid);
  const sortByDate = (a: PubCourse, b: PubCourse) => b.eventDate.localeCompare(a.eventDate);
  const myRounds = courses.filter((c) => isMember(c.courseId) || c.ownerId === currentUid).sort(sortByDate);
  const publicRounds = courses
    .filter((c) => c.isPublic && !isMember(c.courseId) && c.ownerId !== currentUid)
    .sort(sortByDate);
  const playerCountByCourse: Record<string, number> = {};
  for (const c of courses) playerCountByCourse[c.courseId] = (participantsByCourse[c.courseId] || []).length;

  const openRound = (cId: string) => {
    setActiveCourseId(cId);
    const me = (participantsByCourse[cId] || []).find((p) => p.uid === currentUid);
    const firstOpen = me ? me.sips.findIndex((s) => !s) : 0;
    setSelectedHoleNum(firstOpen >= 0 ? firstOpen + 1 : 1);
    setView('round');
  };

  const createAndOpen = async (input: CreateRoundInput) => {
    const created = await handleCreateCourse(input);
    setActiveCourseId(created.courseId);
    setSelectedHoleNum(1);
    setView('round');
  };

  const firstName = (myProfileFields.displayName || 'golfare').split(' ')[0];

  return (
    <APIProvider
      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
      language="sv"
      region="SE"
    >
      <div className="min-h-screen bg-[#F6F4EE] text-[#112218]">
        {syncError && (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 text-center text-xs text-red-900 shadow-sm md:text-sm">
            <span>{syncError}</span>
            <button type="button" onClick={() => setSyncError(null)} className="rounded-full px-2 font-semibold hover:bg-red-100" aria-label="Stäng">
              ✕
            </button>
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
          onGoHome={() => setView('home')}
          onOpenMyProfile={() => setView('profile')}
          onOpenPlayers={() => {
            setSelectedPlayerUid(currentUid);
            setView('players');
          }}
          onOpenAbout={() => setView('about')}
          onSignOut={handleGoogleSignOut}
        />

        <BowlingScoreAnimationOverlay
          clip={activeCelebrationClip}
          onDismiss={() => setActiveCelebrationClip(null)}
        />

        <main id="top" className={`mx-auto px-4 pt-5 pb-10 ${view === 'players' ? 'max-w-6xl' : 'max-w-3xl'}`}>
          {view === 'home' && (
            <HomeView
              firstName={firstName}
              myOpenRounds={myRounds}
              onCreate={() => setView('create')}
              onPlay={() => setView('play')}
              onOpenRound={openRound}
            />
          )}

          {view === 'create' && (
            <CreateRoundView
              defaultCity={myProfile?.country && myProfile.country !== 'Sverige' ? myProfile.country : 'Stockholm'}
              onBack={() => setView('home')}
              onCreate={createAndOpen}
            />
          )}

          {view === 'play' && (
            <PlayView
              myRounds={myRounds}
              publicRounds={publicRounds}
              playerCountByCourse={playerCountByCourse}
              currentUid={currentUid}
              initialCode={initialJoinParam}
              onBack={() => setView('home')}
              onOpenRound={openRound}
              onJoin={handleJoinByCode}
            />
          )}

          {view === 'round' &&
            (activeCourse && activePlayerInRound ? (
              <RoundView
                course={activeCourse}
                holes={activeHoles}
                me={activePlayerInRound}
                players={activeParticipants}
                isOwner={activeCourse.ownerId === currentUid}
                selectedHoleNum={selectedHoleNum}
                onSelectHole={setSelectedHoleNum}
                onBack={() => setView('play')}
                onUpdateHoleSips={handleUpdateHoleSips}
                onSaveHoleConfig={handleSaveHoleConfig}
                onSaveCourseMeta={handleSaveCourseMeta}
                onAssignTeam={handleAssignBrutalBallTeam}
                onInspectPlayer={(uid) => {
                  setSelectedPlayerUid(uid);
                  setView('players');
                }}
              />
            ) : (
              <div className="rounded-3xl border border-[#112218]/10 bg-white p-8 text-center shadow-xs">
                <p className="text-sm text-[#112218]/70">Rundan laddas eller finns inte längre.</p>
                <button type="button" onClick={() => setView('play')} className="mt-4 rounded-full bg-[#112218] px-5 py-2 text-sm font-semibold text-[#F6F4EE]">
                  Till Spela
                </button>
              </div>
            ))}

          {view === 'profile' && (
            <MyProfileView
              profile={myProfileFields}
              stats={careerStatsByUid[currentUid]}
              onBack={() => setView('home')}
              onSave={handleSaveMyProfile}
              onOpenRound={openRound}
            />
          )}

          {view === 'players' && (
            <div className="space-y-4">
              <button type="button" onClick={() => setView('home')} className="text-sm font-semibold text-[#166534]">
                ← Tillbaka
              </button>
              <PgaPlayersView
                players={allTourPlayers}
                careerStatsByUid={careerStatsByUid}
                activePlayer={activePlayerInRound}
                selectedPlayerUid={selectedPlayerUid}
                onSelectPlayerUid={(uid) => setSelectedPlayerUid(uid)}
                onSelectCourseFromHistory={(cId) => openRound(cId)}
                onSaveMyProfile={handleSaveMyProfile}
              />
            </div>
          )}

          {view === 'about' && <AboutView onBack={() => setView('home')} />}
        </main>
      </div>
    </APIProvider>
  );
}
