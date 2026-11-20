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

type ActiveTab = 'lobby' | 'scorecard' | 'guide' | 'leaderboard' | 'players';

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
          });
        });
        setCourses(loadedCourses);
        setActiveCourseId((prev) => {
          if (prev && loadedCourses.some((c) => c.courseId === prev)) return prev;
          return loadedCourses[0]?.courseId || null;
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
      <div
        data-testid="auth-wall-screen"
        className="flex min-h-screen flex-col justify-between bg-[#F6F4EE] text-[#112218]"
      >
        {/* Minimal Top Header */}
        <header className="flex items-center justify-between gap-8 border-b border-[#112218]/15 bg-[#F6F4EE]/95 px-6 py-4">
          <span className="font-display text-xl font-bold tracking-tight text-[#112218] whitespace-nowrap shrink-0">
            Pubgolf Links
          </span>
          <span className="hidden sm:inline text-xs font-medium text-[#112218]/65">
            Officiellt Scorekort, Banguide & PGA Tour-profiler
          </span>
          <button
            type="button"
            disabled={isSigningIn}
            onClick={handleGoogleSignIn}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#112218] px-4 py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#163826] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <LogIn className="h-3.5 w-3.5 text-[#D4AF37]" />
            Logga in med Google
          </button>
        </header>

        {/* Centered Clubhouse Login Gate */}
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full overflow-hidden rounded-3xl border border-[#112218]/15 bg-[#112218] text-[#F6F4EE] shadow-xl">
            <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
              {/* Left 7 Cols: Auth Wall Callout & Google Sign-In CTA */}
              <div className="flex flex-col justify-between p-8 sm:p-12 lg:col-span-7">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#D4AF37]">
                    <ShieldCheck className="h-4 w-4" />
                    <span>ENDAST FÖR INLOGGADE SPELARE</span>
                    <span aria-hidden="true">·</span>
                    <span>PGA PUBGOLF TOUR</span>
                  </div>

                  <h1
                    className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl"
                    style={{ textWrap: 'balance' }}
                  >
                    Välkommen till Klubbhuset — Logga in för att Spela
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#F6F4EE]/80 sm:text-base">
                    För att skapa din PGA Tour-spelarprofil, arrangera en pubgolfrunda, bjuda in
                    vänner eller se scorekort, banguide och andras spelarprofiler behöver du logga in
                    med ditt Google-konto.
                  </p>

                  {initialJoinParam && (
                    <div className="mt-5 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 p-4 text-xs text-white">
                      <span className="font-bold text-[#D4AF37]">Inbjudan upptäckt:</span> Du har
                      öppnat en inbjudan till runda{' '}
                      <strong className="font-mono-tabular">{initialJoinParam}</strong>. Logga in med
                      Google nedan för att gå med direkt!
                    </div>
                  )}

                  {authNotice && (
                    <div
                      role="alert"
                      className="mt-5 rounded-xl border border-[#FCA5A5]/40 bg-[#991B1B]/40 px-4 py-3 text-xs font-medium text-white"
                    >
                      {authNotice}
                    </div>
                  )}

                  {/* Features locked behind login */}
                  <div className="mt-8 grid grid-cols-1 gap-3 border-t border-white/10 pt-6 text-xs text-[#F6F4EE]/80 sm:grid-cols-2">
                    <div className="flex items-start gap-2.5">
                      <Award className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                      <span>
                        <strong className="block text-white">Personligt PGA Tour-kort</strong>
                        Skapa din profil och läs om övriga startfältet.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Compass className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                      <span>
                        <strong className="block text-white">Visuell Banguide & Banarkitekt</strong>
                        Designa egna 9-hålsrundor med pub, dryck och par.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                      <span>
                        <strong className="block text-white">Digitalt Golf-Scorekort</strong>
                        Registrera klunkar för Birdie, Eagle, Par & Albatross.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                      <span>
                        <strong className="block text-white">Delbara Rundor & Live-Tabell</strong>
                        Bjud in vänner med kod och tävla i realtid.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-2">
                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={handleGoogleSignIn}
                    className="inline-flex min-h-[50px] w-full items-center justify-center gap-3 rounded-xl bg-[#D4AF37] px-6 py-3.5 text-sm font-bold text-[#112218] shadow-lg transition-all hover:bg-[#E5C158] sm:w-auto"
                  >
                    <LogIn className="h-5 w-5" />
                    {isSigningIn ? 'Öppnar Google-inloggning...' : 'Logga in med Google för att börja'}
                  </button>
                </div>
              </div>

              {/* Right 5 Cols: Clubhouse Photography & Claret Jug */}
              <div className="relative min-h-[280px] bg-[#0B1E14] lg:col-span-5">
                <img
                  src={HERO_CLUBHOUSE_IMG}
                  alt="Pubgolf Links Clubhouse"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover opacity-85"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#112218] via-[#112218]/30 to-transparent lg:bg-gradient-to-r" />
                <div className="absolute bottom-6 left-6 right-6 flex items-center gap-4 rounded-2xl border border-white/15 bg-[#112218]/90 p-4 backdrop-blur-md">
                  <img
                    src={TROPHY_CLARET_IMG}
                    alt="Claret Jug Trophy"
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[#D4AF37]/40"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="text-xs">
                    <div className="font-mono-tabular font-bold text-[#D4AF37]">
                      PUBGOLF LINKS TOUR
                    </div>
                    <div className="mt-0.5 text-white/85">
                      Privat tävlingsplattform. Logga in för att se rundor, profiler och scorekort.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="mx-auto w-full max-w-7xl border-t border-[#112218]/10 px-6 py-6 text-center text-xs text-[#112218]/60">
          Pubgolf Links Championship · Inloggning krävs för åtkomst till profiler, banor och scorekort
        </footer>
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

  const handleCreateCourse = async (input: {
    title: string;
    subtitle: string;
    city: string;
    eventDate: string;
    gameMode: PubGolfGameMode;
    initialHoles?: InitialHoleDraft[];
  }): Promise<PubCourse> => {
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
    };

    const blankHoles = createBlankHolesForCourse(courseId, uid).map((hole) => {
      const draft = input.initialHoles?.find((d) => d.holeNumber === hole.holeNumber);
      if (!draft) return hole;
      const customPubName = draft.pubName.trim();
      const customPubAddress = draft.pubAddress.trim();
      const customDrinkName = draft.drinkName.trim();
      const customPar =
        Number.isInteger(draft.par) && draft.par >= 1 && draft.par <= 10 ? draft.par : hole.par;
      return {
        ...hole,
        pubName:
          customPubName.length >= 2 ? customPubName.slice(0, 80) : hole.pubName,
        pubAddress:
          customPubAddress.length >= 2 ? customPubAddress.slice(0, 120) : hole.pubAddress,
        drinkName:
          customDrinkName.length >= 2 ? customDrinkName.slice(0, 80) : hole.drinkName,
        par: customPar,
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
  ): Promise<{ ok: boolean; message: string }> => {
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
      message: `Du är nu ansluten till "${matchedCourse.title}"! Öppna Scorekortet eller Banguiden för att börja.`,
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

  return (
    <APIProvider
      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
      language="sv"
      region="SE"
    >
      <div className="min-h-screen bg-[#F6F4EE] pb-24 text-[#112218] md:pb-12">
        {syncError && (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 text-center text-xs text-red-900 shadow-sm md:text-sm">
            <span>{syncError}</span>
            <button
              type="button"
              onClick={() => setSyncError(null)}
              className="rounded-full px-2 font-semibold hover:bg-red-100"
              aria-label="Stäng"
            >
              ✕
            </button>
          </div>
        )}
        {gmpQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Strict 3-Zone Top Bar Contract */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 sm:gap-8 border-b border-[#112218]/15 bg-[#F6F4EE]/95 px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('lobby');
          }}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#112218] whitespace-nowrap shrink-0"
        >
          Pubgolf Links
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Huvudmeny"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#112218]/75"
        >
          <button
            type="button"
            onClick={() => setActiveTab('lobby')}
            className={`transition-colors hover:text-[#112218] whitespace-nowrap shrink-0 ${
              activeTab === 'lobby'
                ? 'font-semibold text-[#112218] underline decoration-[#166534] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Rundor & Inbjudan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scorecard')}
            className={`transition-colors hover:text-[#112218] whitespace-nowrap shrink-0 ${
              activeTab === 'scorecard'
                ? 'font-semibold text-[#112218] underline decoration-[#166534] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Scorekort
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`transition-colors hover:text-[#112218] whitespace-nowrap shrink-0 ${
              activeTab === 'guide'
                ? 'font-semibold text-[#112218] underline decoration-[#166534] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Banguide
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`transition-colors hover:text-[#112218] whitespace-nowrap shrink-0 ${
              activeTab === 'leaderboard'
                ? 'font-semibold text-[#112218] underline decoration-[#166534] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('players')}
            className={`transition-colors hover:text-[#112218] whitespace-nowrap shrink-0 ${
              activeTab === 'players'
                ? 'font-semibold text-[#112218] underline decoration-[#166534] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            PGA Profiler
          </button>
        </nav>

        {/* Zone 3: Player Avatar + Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {activePlayerInRound && (
            <button
              type="button"
              onClick={() => {
                setSelectedPlayerUid(currentUid);
                setActiveTab('players');
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#112218]/15 bg-white p-1 sm:pl-1 sm:pr-3 sm:py-1 text-xs font-semibold text-[#112218] hover:bg-[#112218]/5 transition cursor-pointer"
              title="Visa mitt PGA-spelarkort"
            >
              <GolferAvatar
                avatarSeed={activePlayerInRound.avatarSeed}
                displayName={activePlayerInRound.displayName}
                size="xs"
              />
              <span className="hidden sm:inline max-w-[120px] truncate">
                {activePlayerInRound.displayName}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleGoogleSignOut}
            className="inline-flex min-h-[38px] sm:min-h-[40px] items-center gap-1.5 sm:gap-2 rounded-lg bg-[#112218] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#163826] whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Logga ut</span>
          </button>
        </div>
      </header>

      {/* Bowling-Alley Style Live Score Celebration / Roast Overlay */}
      <BowlingScoreAnimationOverlay
        clip={activeCelebrationClip}
        onDismiss={() => setActiveCelebrationClip(null)}
      />

      {/* Main Content Container */}
      <main id="top" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {activeTab === 'lobby' && (
          <RoundsLobbyView
            isGoogleSignedIn={true}
            onGoogleSignIn={handleGoogleSignIn}
            myProfile={myProfile}
            myComputedHandicap={myComputedHandicap}
            myRoundsPlayed={myRoundsPlayed}
            onSaveMyProfile={handleSaveMyProfile}
            courses={courses}
            activeCourse={activeCourse}
            onSelectCourse={(cId) => setActiveCourseId(cId)}
            onCreateCourse={handleCreateCourse}
            onJoinByCode={handleJoinByCode}
            onDeleteCourse={handleDeleteCourse}
            onGoToScorecard={() => setActiveTab('scorecard')}
            onGoToGuide={() => setActiveTab('guide')}
            initialJoinCode={initialJoinParam}
          />
        )}

        {activeTab === 'scorecard' && (
          <>
            {renderRoundSwitcherBar()}
            {activeCourse && activePlayerInRound ? (
              <ScorecardView
                course={activeCourse}
                holes={activeHoles}
                activePlayer={activePlayerInRound}
                allPlayers={activeParticipants}
                selectedHoleNum={selectedHoleNum}
                onSelectHole={(num) => setSelectedHoleNum(num)}
                onUpdateHoleSips={handleUpdateHoleSips}
                onReplayHoleAnimation={(holeNum, sipsVal) =>
                  triggerHoleCelebrationClip(activePlayerInRound, holeNum, sipsVal)
                }
                onOpenCourseGuide={(num) => {
                  setSelectedHoleNum(num);
                  setActiveTab('guide');
                }}
                onOpenLeaderboard={() => setActiveTab('leaderboard')}
              />
            ) : (
              renderNoActiveRoundPrompt('Scorekortet')
            )}
          </>
        )}

        {activeTab === 'guide' && (
          <>
            {renderRoundSwitcherBar()}
            {activeCourse && activePlayerInRound ? (
              <CourseGuideView
                course={activeCourse}
                holes={activeHoles}
                activePlayer={activePlayerInRound}
                selectedHoleNum={selectedHoleNum}
                onSelectHole={(num) => setSelectedHoleNum(num)}
                onSaveHoleConfig={handleSaveHoleConfig}
                onSaveCourseMeta={handleSaveCourseMeta}
                onGoToScorecardHole={(num) => {
                  setSelectedHoleNum(num);
                  setActiveTab('scorecard');
                }}
              />
            ) : (
              renderNoActiveRoundPrompt('Banguiden')
            )}
          </>
        )}

        {activeTab === 'leaderboard' && (
          <>
            {renderRoundSwitcherBar()}
            {activeCourse ? (
              <LeaderboardView
                course={activeCourse}
                holes={activeHoles}
                players={activeParticipants}
                activePlayerUid={currentUid}
                isCourseOwner={activeCourse.ownerId === currentUid}
                onUpdateCourseGameMode={(newMode) =>
                  handleSaveCourseMeta({ ...activeCourse, gameMode: newMode })
                }
                onAssignTeam={handleAssignBrutalBallTeam}
                onInspectPlayerProfile={(uid) => {
                  setSelectedPlayerUid(uid);
                  setActiveTab('players');
                }}
                onGoToScorecard={() => setActiveTab('scorecard')}
              />
            ) : (
              renderNoActiveRoundPrompt('Leaderboarden')
            )}
          </>
        )}

        {activeTab === 'players' && (
          <PgaPlayersView
            players={allTourPlayers}
            careerStatsByUid={careerStatsByUid}
            activePlayer={activePlayerInRound}
            selectedPlayerUid={selectedPlayerUid}
            onSelectPlayerUid={(uid) => setSelectedPlayerUid(uid)}
            onSelectCourseFromHistory={(cId) => {
              setActiveCourseId(cId);
              setActiveTab('leaderboard');
            }}
            onSaveMyProfile={handleSaveMyProfile}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="mx-auto mt-16 max-w-7xl border-t border-[#112218]/10 px-6 py-8 text-xs text-[#112218]/60">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <span>Pubgolf Links Championship · Officiellt Digitalt Scorekort & Banguide</span>
          <span>Skapa egna rundor · Bjud in med kod · Varje klunk räknas som ett slag</span>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobilmeny"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 items-center border-t border-[#112218]/15 bg-[#F6F4EE]/95 px-1 backdrop-blur-md md:hidden"
      >
        <button
          type="button"
          onClick={() => setActiveTab('lobby')}
          className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg py-1 ${
            activeTab === 'lobby' ? 'font-bold text-[#166534]' : 'text-[#112218]/65'
          }`}
        >
          <Flag className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] tracking-tight">Rundor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scorecard')}
          className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg py-1 ${
            activeTab === 'scorecard' ? 'font-bold text-[#166534]' : 'text-[#112218]/65'
          }`}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] tracking-tight">Scorekort</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg py-1 ${
            activeTab === 'guide' ? 'font-bold text-[#166534]' : 'text-[#112218]/65'
          }`}
        >
          <Compass className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] tracking-tight">Banguide</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg py-1 ${
            activeTab === 'leaderboard' ? 'font-bold text-[#166534]' : 'text-[#112218]/65'
          }`}
        >
          <Trophy className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] tracking-tight">Tabell</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('players')}
          className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg py-1 ${
            activeTab === 'players' ? 'font-bold text-[#166534]' : 'text-[#112218]/65'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] tracking-tight">Spelare</span>
        </button>
      </nav>
    </div>
    </APIProvider>
  );
}
