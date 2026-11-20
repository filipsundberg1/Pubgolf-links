import React, { useState } from 'react';
import {
  PlusCircle,
  UserPlus,
  Copy,
  Check,
  Compass,
  ClipboardList,
  Trash2,
  LogIn,
  Award,
  Share2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Trophy,
  ShieldCheck,
  Users,
  User,
} from 'lucide-react';
import {
  validateCourseCreationInput,
  validatePlayerProfileInput,
  type PubCourse,
  type PubGolfGameMode,
  type ReusablePlayerProfile,
} from '../utils/golfRules';
import { HERO_CLUBHOUSE_IMG, TROPHY_CLARET_IMG } from '../data/defaultTourData';
import { GolferAvatar, AvatarCustomizer } from './GolferAvatar';
import { PubPlaceAutocomplete } from './PubPlaceAutocomplete';

export interface InitialHoleDraft {
  holeNumber: number;
  pubName: string;
  pubAddress: string;
  drinkName: string;
  par: number;
}

interface RoundsLobbyViewProps {
  isGoogleSignedIn: boolean;
  onGoogleSignIn: () => Promise<void>;
  myProfile: ReusablePlayerProfile | null;
  myComputedHandicap?: string;
  myRoundsPlayed?: number;
  onSaveMyProfile: (profileInput: {
    displayName: string;
    nickname: string;
    country: string;
    homePub: string;
    signatureDrink: string;
    favoriteClub: string;
    handicap: string;
    bio: string;
    avatarSeed: string;
  }) => Promise<void>;
  courses: PubCourse[];
  activeCourse: PubCourse | null;
  onSelectCourse: (courseId: string) => void;
  onCreateCourse: (input: {
    title: string;
    subtitle: string;
    city: string;
    eventDate: string;
    gameMode: PubGolfGameMode;
    initialHoles?: InitialHoleDraft[];
  }) => Promise<PubCourse>;
  onJoinByCode: (codeOrId: string) => Promise<{ ok: boolean; message: string }>;
  onDeleteCourse: (courseId: string) => Promise<void>;
  onGoToScorecard: () => void;
  onGoToGuide: () => void;
  initialJoinCode?: string;
}

const createEmptyInitialHoles = (): InitialHoleDraft[] =>
  Array.from({ length: 9 }, (_, idx) => ({
    holeNumber: idx + 1,
    pubName: '',
    pubAddress: '',
    drinkName: '',
    par: 4,
  }));

export const RoundsLobbyView: React.FC<RoundsLobbyViewProps> = ({
  isGoogleSignedIn,
  onGoogleSignIn,
  myProfile,
  myComputedHandicap = '0.0',
  myRoundsPlayed = 0,
  onSaveMyProfile,
  courses,
  activeCourse,
  onSelectCourse,
  onCreateCourse,
  onJoinByCode,
  onDeleteCourse,
  onGoToScorecard,
  onGoToGuide,
  initialJoinCode = '',
}) => {
  // Profile setup state
  const [displayName, setDisplayName] = useState(myProfile?.displayName || '');
  const [nickname, setNickname] = useState(myProfile?.nickname || '');
  const [country, setCountry] = useState(myProfile?.country || '');
  const [homePub, setHomePub] = useState(myProfile?.homePub || '');
  const [signatureDrink, setSignatureDrink] = useState(myProfile?.signatureDrink || '');
  const [favoriteClub, setFavoriteClub] = useState(myProfile?.favoriteClub || '');
  const [bio, setBio] = useState(myProfile?.bio || '');
  const [avatarSeed, setAvatarSeed] = useState(myProfile?.avatarSeed || 'emerald');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (myProfile) {
      setDisplayName(myProfile.displayName || '');
      setNickname(myProfile.nickname || '');
      setCountry(myProfile.country || '');
      setHomePub(myProfile.homePub || '');
      setSignatureDrink(myProfile.signatureDrink || '');
      setFavoriteClub(myProfile.favoriteClub || '');
      setBio(myProfile.bio || '');
      setAvatarSeed(myProfile.avatarSeed || 'emerald');
    }
  }, [myProfile]);

  // Create Round state
  const [roundTitle, setRoundTitle] = useState('');
  const [roundSubtitle, setRoundSubtitle] = useState('');
  const [roundCity, setRoundCity] = useState('');
  const [roundDate, setRoundDate] = useState('');
  const [roundGameMode, setRoundGameMode] = useState<PubGolfGameMode>('single');
  const [showInitialPubsSetup, setShowInitialPubsSetup] = useState(false);
  const [initialHoles, setInitialHoles] = useState<InitialHoleDraft[]>(createEmptyInitialHoles);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Round by code state
  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode);
  const [joinStatus, setJoinStatus] = useState<{ ok: boolean; message: string } | null>(null);

  // Copy feedback
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const handleProfileFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSavedMsg(null);

    const check = validatePlayerProfileInput({
      displayName,
      nickname,
      country,
      homePub,
      signatureDrink,
      favoriteClub,
      bio,
    });

    if (!check.valid) {
      setProfileError(check.error || 'Fyll i samtliga fält för din spelarprofil.');
      return;
    }

    await onSaveMyProfile({
      displayName: displayName.trim(),
      nickname: nickname.trim(),
      country: country.trim(),
      homePub: homePub.trim(),
      signatureDrink: signatureDrink.trim(),
      favoriteClub: favoriteClub.trim(),
      handicap: myComputedHandicap || '0.0',
      bio: bio.trim(),
      avatarSeed,
    });
    setProfileSavedMsg('Din PGA Tour-profil har sparats! Nu kan du skapa eller gå med i en runda.');
  };

  const handleCreateRoundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!myProfile) {
      setCreateError('Skapa din PGA Tour-spelarprofil först (i steget ovan) innan du skapar en runda.');
      return;
    }

    const check = validateCourseCreationInput({
      title: roundTitle,
      subtitle: roundSubtitle,
      city: roundCity,
      eventDate: roundDate,
    });

    if (!check.valid) {
      setCreateError(check.error || 'Kontrollera fälten för rundan.');
      return;
    }

    await onCreateCourse({
      title: roundTitle.trim(),
      subtitle: roundSubtitle.trim(),
      city: roundCity.trim(),
      eventDate: roundDate.trim(),
      gameMode: roundGameMode,
      initialHoles,
    });

    setRoundTitle('');
    setRoundSubtitle('');
    setRoundCity('');
    setRoundDate('');
    setRoundGameMode('single');
    setInitialHoles(createEmptyInitialHoles());
    setShowInitialPubsSetup(false);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinStatus(null);

    if (!myProfile) {
      setJoinStatus({
        ok: false,
        message: 'Skapa din PGA Tour-spelarprofil först innan du går med i en runda.',
      });
      return;
    }

    if (!joinCodeInput.trim()) {
      setJoinStatus({
        ok: false,
        message: 'Ange en giltig inbjudningskod (t.ex. PG-4829).',
      });
      return;
    }

    const result = await onJoinByCode(joinCodeInput.trim().toUpperCase());
    setJoinStatus(result);
  };

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedType('code');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const copyInviteLink = async (course: PubCourse) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('join', course.inviteCode);
      await navigator.clipboard.writeText(url.toString());
      setCopiedType('link');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome / Clubhouse Hero — matching the rich Clubhouse design */}
      <section className="overflow-hidden rounded-3xl border border-[#112218]/15 bg-[#112218] text-[#F6F4EE] shadow-xl">
        <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
          {/* Left 7 Cols: Clubhouse Callout, 2x2 Feature Grid & Primary CTAs */}
          <div className="flex flex-col justify-between p-8 sm:p-12 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#D4AF37]">
                <ShieldCheck className="h-4 w-4" />
                <span>KLUBBHUS & TÄVLINGSLOBBY</span>
                <span aria-hidden="true">·</span>
                <span>PGA PUBGOLF TOUR</span>
              </div>
              <h1
                className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl"
                style={{ textWrap: 'balance' }}
              >
                Pubgolf Links — Skapa Din Pubgolfbana & Bjud In Startfältet
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#F6F4EE]/80 sm:text-base">
                Skapa ditt personliga PGA Tour-kort, lägg upp kvällens pubgolfrunda med Google
                Maps-rutt mellan pubarna och dela inbjudningskoden med dina vänner så uppdateras
                scorekort och leaderboard i realtid.
              </p>

              {/* 2x2 Tour Feature Highlights matching the Clubhouse aesthetic */}
              <div className="mt-8 grid grid-cols-1 gap-3 border-t border-white/10 pt-6 text-xs text-[#F6F4EE]/80 sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <Award className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                  <span>
                    <strong className="block text-white">Personligt PGA Tour-kort</strong>
                    Skräddarsy din golfavatar och följ ditt automatiska handicap.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Compass className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                  <span>
                    <strong className="block text-white">Visuell Banguide & Ruttkarta</strong>
                    Designa 9 hål med pub, dryck, par och promenadväg på Google Maps.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                  <span>
                    <strong className="block text-white">Digitalt Golf-Scorekort</strong>
                    Registrera klunkar för Birdie, Eagle, Par & Albatross med live-animation.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                  <span>
                    <strong className="block text-white">Delbara Rundor & Live-Tabell</strong>
                    Bjud in vänner med kod och tävla om The Claret Pint i realtid.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 pt-2">
              {!isGoogleSignedIn && (
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-[#D4AF37] px-5 py-3 text-xs sm:text-sm font-bold text-[#112218] shadow-lg transition-colors hover:bg-[#E5C158] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  Logga in med Google-konto
                </button>
              )}
              {activeCourse && (
                <>
                  <button
                    type="button"
                    onClick={onGoToGuide}
                    className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-[#D4AF37] px-5 py-3 text-xs sm:text-sm font-bold text-[#112218] shadow-lg transition-colors hover:bg-[#E5C158] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Compass className="h-4 w-4" />
                    {myProfile?.uid === activeCourse.ownerId
                      ? `Bygg hålen i Banguiden (${activeCourse.title})`
                      : `Öppna Banguiden (${activeCourse.title})`}
                  </button>
                  <button
                    type="button"
                    onClick={onGoToScorecard}
                    className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-white/20 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Till Scorekortet
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right 5 Cols: Clubhouse Photography & Floating Claret Jug Card */}
          <div className="relative min-h-[280px] bg-[#0B1E14] lg:col-span-5">
            <img
              src={HERO_CLUBHOUSE_IMG}
              alt="Pubgolf Links Clubhouse"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-85"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#112218] via-[#112218]/30 to-transparent lg:bg-gradient-to-r" />
            <div className="absolute bottom-6 left-6 right-6 flex items-center gap-4 rounded-2xl border border-white/15 bg-[#112218]/90 p-4 backdrop-blur-md">
              <img
                src={TROPHY_CLARET_IMG}
                alt="Claret Jug Trophy"
                referrerPolicy="no-referrer"
                className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[#D4AF37]/40"
              />
              <div className="text-xs">
                <div className="font-mono-tabular font-bold text-[#D4AF37]">
                  PUBGOLF LINKS TOUR
                </div>
                <div className="mt-0.5 text-white/85">
                  {activeCourse
                    ? `Aktiv runda: ${activeCourse.title} (${activeCourse.city}) · Kod ${activeCourse.inviteCode}`
                    : 'Officiell tävlingslobby för dina pubgolfrundor, banguider och scorekort.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Round Invite Box (shown whenever a round is active) */}
      {activeCourse && (
        <section
          data-testid="active-round-invite-banner"
          className="rounded-2xl border border-[#166534]/30 bg-white p-6 shadow-xs"
        >
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#166534]">
                <Share2 className="h-4 w-4" />
                <span>AKTIV RUNDA · BJUD IN VÄNNER</span>
                <span
                  data-testid="active-round-gamemode-badge"
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono-tabular text-[11px] font-bold ${
                    activeCourse.gameMode === 'brutal'
                      ? 'bg-[#D4AF37]/25 text-[#112218] border border-[#D4AF37]/50'
                      : 'bg-[#166534]/10 text-[#166534]'
                  }`}
                >
                  {activeCourse.gameMode === 'brutal'
                    ? 'BRUTAL BALL · LAG 2 & 2'
                    : 'SINGLE BALL · INDIVIDUELL'}
                </span>
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#112218]">
                {activeCourse.title}
              </h2>
              <p className="mt-0.5 text-sm text-[#112218]/70">
                {activeCourse.subtitle} · {activeCourse.city} · {activeCourse.eventDate} · Skapad av{' '}
                {activeCourse.ownerName}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-[#112218]/15 bg-[#F6F4EE] px-4 py-2.5">
                <div className="text-[10px] font-semibold text-[#112218]/60">INBJUDNINGSKOD</div>
                <div
                  data-testid="active-round-invite-code"
                  className="font-mono-tabular text-lg font-bold tracking-wider text-[#112218]"
                >
                  {activeCourse.inviteCode}
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyInviteCode(activeCourse.inviteCode)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#112218]/20 bg-white px-4 py-2 text-xs font-semibold text-[#112218] transition-colors hover:bg-[#F6F4EE]"
              >
                {copiedType === 'code' ? (
                  <>
                    <Check className="h-4 w-4 text-[#166534]" />
                    Kod kopierad!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Kopiera kod
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => copyInviteLink(activeCourse)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#112218] px-4 py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#163826]"
              >
                {copiedType === 'link' ? (
                  <>
                    <Check className="h-4 w-4 text-[#4ADE80]" />
                    Inbjudningslänk kopierad!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 text-[#D4AF37]" />
                    Kopiera inbjudningslänk
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Step 1: Create / Update Your Permanent PGA Tour Profile */}
      <section className="rounded-2xl border border-[#112218]/15 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-[#112218]/10 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <GolferAvatar
              avatarSeed={avatarSeed}
              displayName={displayName || myProfile?.displayName || 'Spelare'}
              size="md"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#166534]">
                <Award className="h-4 w-4" />
                STEG 1 · DIN PGA TOUR-SPELARPROFIL & AVATAR
              </div>
              <h2 className="mt-1 font-display text-xl font-bold text-[#112218]">
                {myProfile
                  ? `Inloggad som ${myProfile.displayName} (“${myProfile.nickname}”)`
                  : 'Skapa din PGA Tour-spelarprofil & Avatar'}
              </h2>
              <p className="text-xs text-[#112218]/65">
                Din profil och din skräddarsydda golfavatar följer med dig till alla rundor och visas i
                storbildsanimationerna när du registrerar dina slag.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileFormSubmit} className="mt-5 space-y-4">
          {profileError && (
            <div
              role="alert"
              className="rounded-xl border border-[#991B1B]/30 bg-[#991B1B]/10 px-4 py-2.5 text-xs font-semibold text-[#991B1B]"
            >
              {profileError}
            </div>
          )}

          {profileSavedMsg && (
            <div
              role="status"
              className="rounded-xl border border-[#166534]/30 bg-[#166534]/10 px-4 py-2.5 text-xs font-semibold text-[#14532D]"
            >
              {profileSavedMsg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="lobby-display-name"
                className="block text-xs font-semibold text-[#112218]"
              >
                Ditt namn
              </label>
              <input
                id="lobby-display-name"
                type="text"
                placeholder="t.ex. Adam Larsson"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
              />
            </div>

            <div>
              <label
                htmlFor="lobby-nickname"
                className="block text-xs font-semibold text-[#112218]"
              >
                Smeknamn på touren
              </label>
              <input
                id="lobby-nickname"
                type="text"
                placeholder="t.ex. The Links King"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
              />
            </div>

            <div>
              <label
                htmlFor="lobby-home-pub"
                className="block text-xs font-semibold text-[#112218]"
              >
                Hemmapub / Moderklubb
              </label>
              <input
                id="lobby-home-pub"
                type="text"
                placeholder="t.ex. The Tudor Arms"
                value={homePub}
                onChange={(e) => setHomePub(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
              />
            </div>

            <div>
              <label
                htmlFor="lobby-signature-drink"
                className="block text-xs font-semibold text-[#112218]"
              >
                Signaturdryck
              </label>
              <input
                id="lobby-signature-drink"
                type="text"
                placeholder="t.ex. Guinness Draught"
                value={signatureDrink}
                onChange={(e) => setSignatureDrink(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
              />
            </div>

            <div>
              <label
                htmlFor="lobby-favorite-club"
                className="block text-xs font-semibold text-[#112218]"
              >
                Favoritklubba i bagen
              </label>
              <input
                id="lobby-favorite-club"
                type="text"
                placeholder="t.ex. Pint-Driver 9.5°"
                value={favoriteClub}
                onChange={(e) => setFavoriteClub(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#112218]">
                Pubgolf-Handicap (Automatiskt)
              </span>
              <div
                data-testid="lobby-auto-handicap"
                className="mt-1 flex min-h-[38px] items-center justify-between rounded-lg border border-[#166534]/25 bg-[#166534]/5 px-3 py-2 text-xs text-[#112218]"
              >
                <span className="font-mono-tabular font-bold text-[#166534]">
                  HCP {myComputedHandicap}
                </span>
                <span className="text-[11px] text-[#112218]/65">
                  {myRoundsPlayed > 0
                    ? `Snitt (${myRoundsPlayed} ${myRoundsPlayed === 1 ? 'runda' : 'rundor'})`
                    : 'Snitt av dina rundor'}
                </span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="lobby-country" className="block text-xs font-semibold text-[#112218]">
                Stad / Land
              </label>
              <input
                id="lobby-country"
                type="text"
                placeholder="t.ex. Stockholm, SWE"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
              />
            </div>
          </div>

          {/* Full Golfer Avatar Builder (Klubbjacka, Keps, Byxor, Utseende & Hudton) */}
          <AvatarCustomizer
            value={avatarSeed}
            onChange={setAvatarSeed}
            displayName={displayName || myProfile?.displayName || 'Din Golfare'}
          />

          <div>
            <label htmlFor="lobby-bio" className="block text-xs font-semibold text-[#112218]">
              Spelarbiografi & Spelstil (visas på ditt PGA Tour-kort)
            </label>
            <textarea
              id="lobby-bio"
              rows={2}
              placeholder="Beskriv dina styrkor från bardisken, favoritstrategi på Par 5-hål eller tidigare meriter..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#112218] px-5 py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#163826]"
            >
              <Check className="h-4 w-4 text-[#D4AF37]" />
              {myProfile ? 'Uppdatera min PGA-profil' : 'Spara min PGA-profil'}
            </button>
          </div>
        </form>
      </section>

      {/* Step 2: Create New Round OR Join Existing Round via Invite Code */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Create New Round */}
        <section className="flex flex-col justify-between rounded-2xl border border-[#112218]/15 bg-white p-6 shadow-xs lg:col-span-7">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#166534]">
              <PlusCircle className="h-4 w-4" />
              STEG 2A · SKAPA NY PUBGOLFRUNDA
            </div>
            <h3 className="mt-1 font-display text-xl font-bold text-[#112218]">
              Arrangera en ny runda & få en inbjudningskod
            </h3>
            <p className="mt-0.5 text-xs text-[#112218]/65">
              När du skapar rundan får du 9 tomma hål som du själv namnger med pub, dryck och par i
              Banguiden.
            </p>

            <form onSubmit={handleCreateRoundSubmit} className="mt-5 space-y-4">
              {createError && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#991B1B]/30 bg-[#991B1B]/10 px-4 py-2.5 text-xs font-semibold text-[#991B1B]"
                >
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="create-round-title"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Rundans / Tävlingens namn
                  </label>
                  <input
                    id="create-round-title"
                    type="text"
                    placeholder="t.ex. December Pubgolf 2026"
                    value={roundTitle}
                    onChange={(e) => setRoundTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-round-subtitle"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Undertitel / Tema
                  </label>
                  <input
                    id="create-round-subtitle"
                    type="text"
                    placeholder="t.ex. 9 Hål · Södermalm Tour"
                    value={roundSubtitle}
                    onChange={(e) => setRoundSubtitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-round-city"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Stad / Stadsdel
                  </label>
                  <input
                    id="create-round-city"
                    type="text"
                    placeholder="t.ex. Stockholm"
                    value={roundCity}
                    onChange={(e) => setRoundCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-round-date"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Datum för kvällen
                  </label>
                  <input
                    id="create-round-date"
                    type="text"
                    placeholder="t.ex. 12 December 2026"
                    value={roundDate}
                    onChange={(e) => setRoundDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>
              </div>

              {/* Game Mode Selector: Single Ball vs Brutal Ball */}
              <div>
                <span className="block text-xs font-semibold text-[#112218]">
                  Välj Spelform för rundan
                </span>
                <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    data-testid="create-round-gamemode-single"
                    onClick={() => setRoundGameMode('single')}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      roundGameMode === 'single'
                        ? 'border-[#166534] bg-[#166534]/8 ring-2 ring-[#166534]'
                        : 'border-[#112218]/15 bg-[#F6F4EE]/40 hover:bg-[#F6F4EE]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-display text-sm font-bold text-[#112218]">
                      <User className="h-4 w-4 text-[#166534]" />
                      Single Ball (Individuellt)
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-[#112218]/70">
                      Klassisk pubgolf där varje spelare tävlar individuellt om lägst antal klunkar till par.
                    </p>
                  </button>

                  <button
                    type="button"
                    data-testid="create-round-gamemode-brutal"
                    onClick={() => setRoundGameMode('brutal')}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      roundGameMode === 'brutal'
                        ? 'border-[#166534] bg-[#166534]/8 ring-2 ring-[#166534]'
                        : 'border-[#112218]/15 bg-[#F6F4EE]/40 hover:bg-[#F6F4EE]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-display text-sm font-bold text-[#112218]">
                      <Users className="h-4 w-4 text-[#B8860B]" />
                      Brutal Ball (Lag om 2 & 2)
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-[#112218]/70">
                      Ni spelar i lag om 2 & 2 där lagets score är bådas singelscore ihoplagt. Main leaderboard för lag + singeltabell.
                    </p>
                  </button>
                </div>
              </div>

              {/* Optional 9-Hole Pub & Address Setup right when creating the round */}
              <div className="rounded-xl border border-[#112218]/15 bg-[#F6F4EE]/60 p-3.5">
                <button
                  type="button"
                  data-testid="toggle-initial-pubs-btn"
                  onClick={() => setShowInitialPubsSetup((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 text-left text-xs font-bold text-[#112218] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#166534]" />
                    Lägg in pubar & adresser för Hål 1–9 direkt (aktiverar Google Maps-rutten)
                  </span>
                  {showInitialPubsSetup ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-[#112218]/60" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#112218]/60" />
                  )}
                </button>
                <p className="mt-1 text-[11px] text-[#112218]/65">
                  Valfritt vid skapande — du kan även söka och redigera pubarnas adresser när som helst i Banguiden.
                </p>

                {showInitialPubsSetup && (
                  <div className="mt-3 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                    {initialHoles.map((holeDraft, idx) => (
                      <div
                        key={holeDraft.holeNumber}
                        className="rounded-xl border border-[#112218]/12 bg-white p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold text-[#112218]">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#112218] text-[10px] font-bold text-[#D4AF37]">
                              {holeDraft.holeNumber}
                            </span>
                            Hål {holeDraft.holeNumber}
                          </span>
                          <PubPlaceAutocomplete
                            compact
                            cityContext={roundCity || 'Sverige'}
                            placeholder={`Sök pub på Google Maps för Hål ${holeDraft.holeNumber}...`}
                            onSelectPlace={({ pubName, pubAddress }) => {
                              setInitialHoles((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, pubName, pubAddress } : item
                                )
                              );
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              placeholder={`Pubnamn Hål ${holeDraft.holeNumber}`}
                              value={holeDraft.pubName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInitialHoles((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, pubName: val } : item
                                  )
                                );
                              }}
                              className="w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/40 px-2.5 py-1.5 text-xs text-[#112218]"
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              placeholder="Gatuadress (t.ex. Götgatan 44, Stockholm)"
                              value={holeDraft.pubAddress}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInitialHoles((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, pubAddress: val } : item
                                  )
                                );
                              }}
                              className="w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/40 px-2.5 py-1.5 text-xs text-[#112218]"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <select
                              aria-label={`Par Hål ${holeDraft.holeNumber}`}
                              value={holeDraft.par}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setInitialHoles((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, par: val } : item
                                  )
                                );
                              }}
                              className="w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/40 px-2 py-1.5 text-xs font-semibold text-[#112218]"
                            >
                              <option value={3}>Par 3</option>
                              <option value={4}>Par 4</option>
                              <option value={5}>Par 5</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#112218] px-5 py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#163826]"
                >
                  <PlusCircle className="h-4 w-4 text-[#D4AF37]" />
                  Skapa ny Pubgolfrunda
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right 5 Cols: Join Existing Round with Invite Code */}
        <section className="flex flex-col justify-between rounded-2xl border border-[#112218]/15 bg-white p-6 shadow-xs lg:col-span-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#166534]">
              <UserPlus className="h-4 w-4" />
              STEG 2B · ANSLUT MED INBJUDNINGSKOD
            </div>
            <h3 className="mt-1 font-display text-xl font-bold text-[#112218]">
              Har en kompis skapat kvällens bana?
            </h3>
            <p className="mt-0.5 text-xs text-[#112218]/65">
              Skriv in rundans inbjudningskod (t.ex. PG-4829) för att gå med i startfältet och få
              ditt scorekort.
            </p>

            <form onSubmit={handleJoinSubmit} className="mt-5 space-y-4">
              {joinStatus && (
                <div
                  role={joinStatus.ok ? 'status' : 'alert'}
                  className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
                    joinStatus.ok
                      ? 'border-[#166534]/30 bg-[#166534]/10 text-[#14532D]'
                      : 'border-[#991B1B]/30 bg-[#991B1B]/10 text-[#991B1B]'
                  }`}
                >
                  {joinStatus.message}
                </div>
              )}

              <div>
                <label
                  htmlFor="join-invite-code"
                  className="block text-xs font-semibold text-[#112218]"
                >
                  Inbjudningskod
                </label>
                <input
                  id="join-invite-code"
                  type="text"
                  placeholder="PG-XXXX"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2.5 font-mono-tabular text-base font-bold uppercase tracking-wider text-[#112218]"
                />
              </div>

              <button
                type="submit"
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#166534] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#14532D]"
              >
                <UserPlus className="h-4 w-4" />
                Gå med i rundan
              </button>
            </form>
          </div>

          <div className="mt-6 rounded-xl border border-[#112218]/10 bg-[#F6F4EE] p-3.5 text-xs text-[#112218]/75">
            Tips: Du kan även dela rundans direktlänk (med <span className="font-mono-tabular">?join=KOD</span>) så fylls koden i automatiskt för dina vänner!
          </div>
        </section>
      </div>

      {/* Saved / Joined Rounds Directory */}
      <section className="rounded-2xl border border-[#112218]/15 bg-white p-6 shadow-xs">
        <h3 className="font-display text-xl font-bold text-[#112218]">
          Dina Pubgolfrundor ({courses.length})
        </h3>
        <p className="mt-0.5 text-xs text-[#112218]/65">
          Välj vilken runda du vill öppna, eller skapa en ny inför nästa pubgolfkväll.
        </p>

        {courses.length === 0 ? (
          <div
            data-testid="empty-courses-state"
            className="mt-5 rounded-xl border border-dashed border-[#112218]/20 bg-[#F6F4EE]/50 p-8 text-center"
          >
            <p className="font-display text-lg font-semibold text-[#112218]">
              Inga pubgolfrundor har skapats ännu
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-[#112218]/65">
              Börja med att spara din PGA Tour-spelarprofil ovan och skapa sedan din första
              pubgolfrunda eller anslut med en väns inbjudningskod.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {courses.map((c) => {
              const isSelected = activeCourse?.courseId === c.courseId;
              const isOwner = myProfile?.uid === c.ownerId;

              return (
                <div
                  key={c.courseId}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                    isSelected
                      ? 'border-[#112218] bg-[#F6F4EE] shadow-xs'
                      : 'border-[#112218]/15 bg-white hover:bg-[#F6F4EE]/50'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular font-bold text-[#166534]">
                          KOD: {c.inviteCode}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono-tabular text-[10px] font-bold ${
                            c.gameMode === 'brutal'
                              ? 'bg-[#D4AF37]/25 text-[#112218] border border-[#D4AF37]/40'
                              : 'bg-[#112218]/8 text-[#112218]/80'
                          }`}
                        >
                          {c.gameMode === 'brutal' ? 'BRUTAL BALL (2&2)' : 'SINGLE BALL'}
                        </span>
                      </div>
                      <span className="text-[#112218]/60">
                        {c.city} · {c.eventDate}
                      </span>
                    </div>
                    <h4 className="mt-1.5 font-display text-xl font-bold text-[#112218]">
                      {c.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-[#112218]/70">
                      {c.subtitle} · Banarkitekt: {c.ownerName}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#112218]/10 pt-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCourse(c.courseId);
                          onGoToScorecard();
                        }}
                        className="rounded-lg bg-[#112218] px-3.5 py-2 text-xs font-semibold text-[#F6F4EE] hover:bg-[#163826]"
                      >
                        {isSelected ? 'Öppna Scorekort' : 'Välj & Spela Runda'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectCourse(c.courseId);
                          onGoToGuide();
                        }}
                        className="rounded-lg border border-[#112218]/20 bg-white px-3 py-2 text-xs font-semibold text-[#112218] hover:bg-[#F6F4EE]"
                      >
                        Banguide
                      </button>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        aria-label={`Ta bort runda ${c.title}`}
                        onClick={() => onDeleteCourse(c.courseId)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#991B1B] hover:bg-[#991B1B]/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Ta bort
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
