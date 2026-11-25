import React, { useState } from 'react';
import {
  UserCheck,
  Edit3,
  Award,
  MapPin,
  Beer,
  Check,
  X,
  UserPlus,
  LayoutGrid,
  User,
  TrendingUp,
  Trophy,
  Calendar,
} from 'lucide-react';
import {
  validatePlayerProfileInput,
  type PlayerCareerStats,
  type PlayerTourProfile,
} from '../utils/golfRules';
import { GolferAvatar, AvatarCustomizer } from './GolferAvatar';

interface PgaPlayersViewProps {
  players: PlayerTourProfile[];
  careerStatsByUid: Record<string, PlayerCareerStats>;
  activePlayer: PlayerTourProfile | null;
  selectedPlayerUid: string;
  onSelectPlayerUid: (uid: string) => void;
  onSelectCourseFromHistory?: (courseId: string) => void;
  onSaveMyProfile: (updated: {
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
}

function getDefaultCareerStats(uid: string): PlayerCareerStats {
  return {
    uid,
    roundsPlayed: 0,
    completedRounds: 0,
    totalHolesPlayed: 0,
    totalCareerSips: 0,
    totalCareerToPar: 0,
    averageToPar: null,
    computedHandicap: '54.0',
    handicapIndex: 54,
    careerAcesAndAlbatrosses: 0,
    careerEagles: 0,
    careerEaglesOrBetter: 0,
    careerHoleInOnes: 0,
    wins: 0,
    careerBirdies: 0,
    careerPars: 0,
    careerSipPrecisionPct: 0,
    bestRound: null,
    roundHistory: [],
  };
}

export const PgaPlayersView: React.FC<PgaPlayersViewProps> = ({
  players,
  careerStatsByUid,
  activePlayer,
  selectedPlayerUid,
  onSelectPlayerUid,
  onSelectCourseFromHistory,
  onSaveMyProfile,
}) => {
  const rosterPlayers: PlayerTourProfile[] = React.useMemo(() => {
    if (!activePlayer) return players;
    const exists = players.some((p) => p.uid === activePlayer.uid);
    return exists ? players : [activePlayer, ...players];
  }, [players, activePlayer]);

  const inspectedPlayer =
    rosterPlayers.find((p) => p.uid === selectedPlayerUid) ||
    activePlayer ||
    rosterPlayers[0] ||
    null;

  const myCareer = activePlayer
    ? careerStatsByUid[activePlayer.uid] || getDefaultCareerStats(activePlayer.uid)
    : getDefaultCareerStats('me');

  const [showAllDossiersInRow, setShowAllDossiersInRow] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(activePlayer?.displayName || '');
  const [nickname, setNickname] = useState(activePlayer?.nickname || '');
  const [country, setCountry] = useState(activePlayer?.country || '');
  const [homePub, setHomePub] = useState(activePlayer?.homePub || '');
  const [signatureDrink, setSignatureDrink] = useState(activePlayer?.signatureDrink || '');
  const [favoriteClub, setFavoriteClub] = useState(activePlayer?.favoriteClub || '');
  const [bio, setBio] = useState(activePlayer?.bio || '');
  const [avatarSeed, setAvatarSeed] = useState(activePlayer?.avatarSeed || 'emerald');
  const [formError, setFormError] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const openEditMyProfile = () => {
    setDisplayName(activePlayer?.displayName || '');
    setNickname(activePlayer?.nickname || '');
    setCountry(activePlayer?.country || '');
    setHomePub(activePlayer?.homePub || '');
    setSignatureDrink(activePlayer?.signatureDrink || '');
    setFavoriteClub(activePlayer?.favoriteClub || '');
    setBio(activePlayer?.bio || '');
    setAvatarSeed(activePlayer?.avatarSeed || 'emerald');
    setFormError(null);
    setIsEditingProfile(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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
      setFormError(check.error || 'Kontrollera profilfälten.');
      return;
    }

    await onSaveMyProfile({
      displayName: displayName.trim(),
      nickname: nickname.trim(),
      country: country.trim(),
      homePub: homePub.trim(),
      signatureDrink: signatureDrink.trim(),
      favoriteClub: favoriteClub.trim(),
      handicap: myCareer.computedHandicap || '0.0',
      bio: bio.trim(),
      avatarSeed,
    });

    if (activePlayer) {
      onSelectPlayerUid(activePlayer.uid);
    }
    setIsEditingProfile(false);
    setSaveBanner('Din PGA Tour-spelarprofil är sparad!');
  };

  const renderPlayerDossierCard = (player: PlayerTourProfile) => {
    const career = careerStatsByUid[player.uid] || getDefaultCareerStats(player.uid);
    const isMe = activePlayer && player.uid === activePlayer.uid;

    return (
      <div
        key={player.uid}
        data-testid="pga-player-dossier"
        className="overflow-hidden rounded-2xl border border-[#112218]/15 bg-white shadow-xs"
      >
        <div className="bg-[#112218] p-6 text-[#F6F4EE] sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <GolferAvatar
                avatarSeed={player.avatarSeed} wins={player.wins}
                displayName={player.displayName}
                size="lg"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#D4AF37]">
                  <span>PGA PUB TOUR CARD</span>
                  <span aria-hidden="true">·</span>
                  <span>{player.country}</span>
                  <span aria-hidden="true">·</span>
                  <span>HANDICAP {career.computedHandicap}</span>
                  {isMe && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-[#4ADE80]">DIN PROFIL</span>
                    </>
                  )}
                </div>
                <h3 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                  {player.displayName}
                </h3>
                <p className="text-sm text-white/75">
                  Smeknamn på touren:{' '}
                  <strong className="text-white">“{player.nickname}”</strong>
                </p>
              </div>
            </div>

            {isMe && (
              <button
                type="button"
                onClick={openEditMyProfile}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 whitespace-nowrap shrink-0"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Ändra mitt spelarkort
              </button>
            )}
          </div>

          <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-relaxed text-white/85">
            {player.bio}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-[#112218]/10 bg-[#F6F4EE] p-6 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#112218]/65">
              <MapPin className="h-3.5 w-3.5 text-[#166534]" />
              HEMMAPUB / KLUBB
            </div>
            <div className="mt-1 font-semibold text-[#112218]">{player.homePub}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#112218]/65">
              <Beer className="h-3.5 w-3.5 text-[#B8860B]" />
              SIGNATURDRYCK
            </div>
            <div className="mt-1 font-semibold text-[#112218]">{player.signatureDrink}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#112218]/65">
              <Award className="h-3.5 w-3.5 text-[#166534]" />
              FAVORITKLUBBA I BAGEN
            </div>
            <div className="mt-1 font-semibold text-[#112218]">{player.favoriteClub}</div>
          </div>
        </div>

        {/* Career Handicap & Cross-Round Tour Statistics (Not tied to a single round) */}
        <div className="p-6">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
            <h4 className="font-display text-lg font-bold text-[#112218]">
              Karriärstatistik & Officiellt Tour-Handicap
            </h4>
            <span className="text-xs text-[#112218]/60">
              Baserat på spelarens samtliga rundor på touren
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-[#112218]/10 bg-[#F6F4EE]/60 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-[#112218]/65">
                <TrendingUp className="h-3.5 w-3.5 text-[#166534]" />
                HANDICAP (SNITT)
              </div>
              <div className="mt-1 flex items-baseline gap-2 font-mono-tabular">
                <span className="text-2xl font-bold text-[#166534]">
                  {career.computedHandicap}
                </span>
                <span className="text-[11px] font-medium text-[#112218]/60">
                  {career.roundsPlayed > 0
                    ? `(${career.roundsPlayed} ${career.roundsPlayed === 1 ? 'runda' : 'rundor'})`
                    : '(Debutant)'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#112218]/10 bg-[#F6F4EE]/60 p-3.5">
              <div className="text-xs text-[#112218]/65">SPELADE RUNDOR & HÅL</div>
              <div className="mt-1 flex items-baseline gap-2 font-mono-tabular">
                <span className="text-2xl font-bold text-[#112218]">{career.roundsPlayed}</span>
                <span className="text-xs font-medium text-[#112218]/65">
                  ({career.totalHolesPlayed} hål)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#112218]/10 bg-[#F6F4EE]/60 p-3.5">
              <div className="text-xs text-[#112218]/65">BIRDIES / EAGLES / ACE</div>
              <div className="mt-1 flex items-baseline gap-2 font-mono-tabular">
                <span className="text-2xl font-bold text-[#B8860B]">
                  {career.careerBirdies +
                    career.careerEagles +
                    career.careerAcesAndAlbatrosses}
                </span>
                <span className="text-xs font-medium text-[#112218]/65">
                  ({career.careerSipPrecisionPct}% ≤ par)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#112218]/10 bg-[#F6F4EE]/60 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-[#112218]/65">
                <Trophy className="h-3.5 w-3.5 text-[#B8860B]" />
                BÄSTA RUNDA
              </div>
              <div className="mt-1 flex items-baseline gap-2 font-mono-tabular">
                <span className="text-2xl font-bold text-[#112218]">
                  {career.bestRound ? career.bestRound.toParFormatted : '—'}
                </span>
                {career.bestRound && (
                  <span className="truncate text-xs font-sans font-medium text-[#112218]/65">
                    {career.bestRound.title}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Round History List (shows all rounds contributing to this player's Handicap) */}
          <div className="mt-6">
            <div className="text-xs font-bold tracking-wide text-[#112218]/70">
              RUNDHISTORIK ({career.roundHistory.length}{' '}
              {career.roundHistory.length === 1 ? 'SPELAD RUNDA' : 'SPELADE RUNDOR'})
            </div>

            {career.roundHistory.length === 0 ? (
              <div className="mt-2.5 rounded-xl border border-dashed border-[#112218]/15 bg-[#F6F4EE]/40 px-4 py-4 text-xs text-[#112218]/70">
                Inga spelade rundor registrerade ännu. Spelarens handicap är{' '}
                <strong className="font-mono-tabular text-[#112218]">0.0</strong> och uppdateras
                automatiskt som ett genomsnitt av resultat till par så fort hål spelas i en runda.
              </div>
            ) : (
              <div className="mt-2.5 divide-y divide-[#112218]/10 overflow-hidden rounded-xl border border-[#112218]/15 bg-[#F6F4EE]/30">
                {career.roundHistory.map((item) => (
                  <div
                    key={item.courseId}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#112218]">{item.title}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#112218]/65">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {item.city} · {item.eventDate} · {item.thruHoles} hål spelade
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono-tabular">
                        <span
                          className={`text-sm font-bold ${
                            item.totalToPar < 0
                              ? 'text-[#166534]'
                              : item.totalToPar > 0
                                ? 'text-[#991B1B]'
                                : 'text-[#112218]'
                          }`}
                        >
                          {item.toParFormatted}
                        </span>
                        <span className="ml-1.5 text-[11px] text-[#112218]/60">
                          ({item.totalSips} slag)
                        </span>
                      </div>

                      {onSelectCourseFromHistory && (
                        <button
                          type="button"
                          onClick={() => onSelectCourseFromHistory(item.courseId)}
                          className="rounded-lg border border-[#112218]/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#112218] hover:bg-[#112218] hover:text-[#F6F4EE]"
                        >
                          Visa runda
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#112218]/15 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#112218]/65">
            <span>OFFICIAL PLAYER BIOGRAPHIES</span>
            <span aria-hidden="true">·</span>
            <span>PUBGOLF LINKS PGA TOUR</span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold text-[#112218] sm:text-3xl">
            Spelarprofiler på Touren
          </h2>
          <p className="mt-1 text-sm text-[#112218]/75">
            Läs om tourens spelare, deras hemmapub, favoritklubba och automatiskt beräknade handicap
            över alla rundor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {rosterPlayers.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAllDossiersInRow((prev) => !prev)}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#112218]/20 bg-[#F6F4EE] px-4 py-2 text-xs font-semibold text-[#112218] transition-colors hover:bg-[#112218]/10 whitespace-nowrap shrink-0"
            >
              {showAllDossiersInRow ? (
                <>
                  <User className="h-4 w-4 text-[#166534]" />
                  Visa valt spelarkort
                </>
              ) : (
                <>
                  <LayoutGrid className="h-4 w-4 text-[#166534]" />
                  Visa alla kort bredvid varandra ({rosterPlayers.length})
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={openEditMyProfile}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#112218] px-4 py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#163826] whitespace-nowrap shrink-0"
          >
            <Edit3 className="h-4 w-4 text-[#D4AF37]" />
            {activePlayer ? 'Redigera min PGA-profil' : 'Skapa min PGA-profil'}
          </button>
        </div>
      </div>

      {saveBanner && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-[#166534]/30 bg-[#166534]/10 px-4 py-3 text-sm font-medium text-[#14532D]"
        >
          <span>{saveBanner}</span>
          <button
            type="button"
            onClick={() => setSaveBanner(null)}
            className="text-xs underline"
          >
            Stäng
          </button>
        </div>
      )}

      {!inspectedPlayer ? (
        <div
          data-testid="empty-players-state"
          className="rounded-2xl border border-dashed border-[#112218]/20 bg-white p-10 text-center"
        >
          <h3 className="font-display text-2xl font-bold text-[#112218]">
            Inga spelarprofiler registrerade ännu
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#112218]/70">
            Skapa din egen PGA Tour-profil för att presentera din hemmapub, signaturdryck och
            favoritklubba inför rundan.
          </p>
          <button
            type="button"
            onClick={openEditMyProfile}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#112218] px-5 py-2.5 text-xs font-semibold text-[#F6F4EE] hover:bg-[#163826]"
          >
            <UserPlus className="h-4 w-4 text-[#D4AF37]" />
            Skapa min PGA Tour-profil nu
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Horizontal Row of All Player Profiles (ligger på rad!) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold tracking-wide text-[#112218]/75">
                STARTFÄLT — SPELARE PÅ TOUREN ({rosterPlayers.length} PROFILER)
              </span>
              <span className="text-xs text-[#112218]/60">
                Handicap (HCP) beräknas automatiskt som snittet av spelade rundor
              </span>
            </div>

            <div
              data-testid="pga-players-row"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {rosterPlayers.map((p) => {
                const pCareer = careerStatsByUid[p.uid] || getDefaultCareerStats(p.uid);
                const isSelected = !showAllDossiersInRow && p.uid === inspectedPlayer.uid;
                const isMe = activePlayer && p.uid === activePlayer.uid;

                return (
                  <button
                    key={p.uid}
                    type="button"
                    onClick={() => {
                      setShowAllDossiersInRow(false);
                      onSelectPlayerUid(p.uid);
                    }}
                    className={`flex w-full flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-[#112218] bg-[#112218] text-[#F6F4EE] ring-2 ring-[#D4AF37]/80 shadow-md'
                        : 'border-[#112218]/15 bg-white text-[#112218] hover:border-[#112218]/40 hover:bg-[#F6F4EE]/60 shadow-xs'
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <GolferAvatar
                          avatarSeed={p.avatarSeed} wins={p.wins}
                          displayName={p.displayName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-semibold">{p.displayName}</span>
                            {isMe && (
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isSelected
                                    ? 'bg-[#D4AF37] text-[#112218]'
                                    : 'bg-[#112218]/10 text-[#112218]'
                                }`}
                              >
                                DU
                              </span>
                            )}
                          </div>
                          <div
                            className={`truncate text-xs ${
                              isSelected ? 'text-[#F6F4EE]/75' : 'text-[#112218]/65'
                            }`}
                          >
                            “{p.nickname}”
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right font-mono-tabular">
                        <div
                          className={`text-sm font-bold ${
                            isSelected ? 'text-[#4ADE80]' : 'text-[#166534]'
                          }`}
                        >
                          HCP {pCareer.computedHandicap}
                        </div>
                        <div
                          className={`text-[11px] font-sans ${
                            isSelected ? 'text-[#F6F4EE]/60' : 'text-[#112218]/55'
                          }`}
                        >
                          {pCareer.roundsPlayed}{' '}
                          {pCareer.roundsPlayed === 1 ? 'runda' : 'rundor'}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] ${
                        isSelected
                          ? 'border-white/15 text-[#F6F4EE]/75'
                          : 'border-[#112218]/10 text-[#112218]/65'
                      }`}
                    >
                      <span className="truncate">
                        {p.homePub} · {p.signatureDrink}
                      </span>
                      <span
                        className={`ml-2 shrink-0 font-semibold ${
                          isSelected ? 'text-[#D4AF37]' : 'text-[#166534]'
                        }`}
                      >
                        {isSelected ? 'Visas nu' : 'Visa kort →'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full PGA Tour Dossier View: Either Selected Player OR All Players Side-by-Side in a Row */}
          {showAllDossiersInRow ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {rosterPlayers.map((player) => renderPlayerDossierCard(player))}
            </div>
          ) : (
            renderPlayerDossierCard(inspectedPlayer)
          )}
        </div>
      )}

      {/* Modal: Create / Edit My PGA Tour Profile */}
      {isEditingProfile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pga-profile-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#112218]/15 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#112218]/10 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#166534]" />
                <h3
                  id="pga-profile-modal-title"
                  className="font-display text-xl font-bold text-[#112218]"
                >
                  Skapa / Redigera Din PGA Tour-Profil
                </h3>
              </div>
              <button
                type="button"
                aria-label="Stäng profilmodal"
                onClick={() => setIsEditingProfile(false)}
                className="rounded-lg p-1.5 text-[#112218]/60 hover:bg-[#F6F4EE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#991B1B]/30 bg-[#991B1B]/10 px-4 py-2.5 text-xs font-semibold text-[#991B1B]"
                >
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-display-name"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Spelarnamn på touren
                  </label>
                  <input
                    id="profile-display-name"
                    type="text"
                    placeholder="t.ex. Adam Larsson"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-nickname"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Smeknamn (t.ex. The Pint Whisperer)
                  </label>
                  <input
                    id="profile-nickname"
                    type="text"
                    placeholder="t.ex. December Capitano"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-home-pub"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Hemmapub / Moderklubb
                  </label>
                  <input
                    id="profile-home-pub"
                    type="text"
                    placeholder="t.ex. The Tudor Arms"
                    value={homePub}
                    onChange={(e) => setHomePub(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-signature-drink"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Signaturdryck
                  </label>
                  <input
                    id="profile-signature-drink"
                    type="text"
                    placeholder="t.ex. Guinness Draught"
                    value={signatureDrink}
                    onChange={(e) => setSignatureDrink(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-favorite-club"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Favoritklubba i bagen
                  </label>
                  <input
                    id="profile-favorite-club"
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
                  <div className="mt-1 flex min-h-[38px] items-center justify-between rounded-lg border border-[#166534]/25 bg-[#166534]/5 px-3 py-2 text-xs text-[#112218]">
                    <span className="font-mono-tabular font-bold text-[#166534]">
                      HCP {myCareer.computedHandicap}
                    </span>
                    <span className="text-[11px] text-[#112218]/65">
                      Snitt över dina rundor
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="profile-country"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Stad / Land
                  </label>
                  <input
                    id="profile-country"
                    type="text"
                    placeholder="t.ex. Stockholm, SWE"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>
              </div>

              <AvatarCustomizer
                value={avatarSeed}
                onChange={setAvatarSeed}
                displayName={displayName || activePlayer?.displayName || 'Din Golfare'}
                unlockStats={activePlayer ? careerStatsByUid[activePlayer.uid] : null}
              />

              <div>
                <label htmlFor="profile-bio" className="block text-xs font-semibold text-[#112218]">
                  Spelarbiografi & Spelstil (2–320 tecken)
                </label>
                <textarea
                  id="profile-bio"
                  rows={3}
                  placeholder="Beskriv din spelstil och styrkor under pubgolfrundan..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#112218]/10 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="rounded-xl border border-[#112218]/20 px-4 py-2 text-xs font-semibold text-[#112218]"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#112218] px-5 py-2 text-xs font-semibold text-[#F6F4EE] hover:bg-[#163826]"
                >
                  <Check className="h-4 w-4 text-[#D4AF37]" />
                  Spara PGA-Profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
