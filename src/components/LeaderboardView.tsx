import React, { useEffect, useState } from 'react';
import { Trophy, ArrowUpRight, Flag, Users, User, Check, Edit3 } from 'lucide-react';
import {
  buildBrutalBallLeaderboard,
  buildLeaderboard,
  type PlayerTourProfile,
  type PubCourse,
  type PubGolfGameMode,
  type PubHole,
} from '../utils/golfRules';
import { TROPHY_CLARET_IMG } from '../data/defaultTourData';
import { GolfScoreSymbol } from './GolfScoreSymbol';
import { GolferAvatar } from './GolferAvatar';

interface LeaderboardViewProps {
  course: PubCourse;
  holes: PubHole[];
  players: PlayerTourProfile[];
  activePlayerUid: string;
  isCourseOwner?: boolean;
  onUpdateCourseGameMode?: (gameMode: PubGolfGameMode) => Promise<void>;
  onAssignTeam?: (
    playerUids: string[],
    teamId: string,
    teamName: string
  ) => Promise<void>;
  onInspectPlayerProfile: (uid: string) => void;
  onGoToScorecard: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  course,
  holes,
  players,
  activePlayerUid,
  isCourseOwner = false,
  onUpdateCourseGameMode,
  onAssignTeam,
  onInspectPlayerProfile,
  onGoToScorecard,
}) => {
  const isBrutalBall = course.gameMode === 'brutal';
  const orderedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  const singleLeaderboard = buildLeaderboard(players, orderedHoles);
  const brutalLeaderboard = buildBrutalBallLeaderboard(players, orderedHoles);

  const singleLeader = singleLeaderboard[0];
  const brutalLeader = brutalLeaderboard[0];

  // In Lagspel, the 2-player Team Leaderboard is the MAIN leaderboard, with an option to inspect individual scores
  const [boardTab, setBoardTab] = useState<'teams' | 'individual'>(
    isBrutalBall ? 'teams' : 'individual'
  );

  useEffect(() => {
    setBoardTab(isBrutalBall ? 'teams' : 'individual');
  }, [isBrutalBall, course.courseId]);

  // 2-Player Team Pairing UI state
  const [showTeamBuilder, setShowTeamBuilder] = useState(false);
  const [playerAUid, setPlayerAUid] = useState<string>(activePlayerUid);
  const [playerBUid, setPlayerBUid] = useState<string>('');
  const [customTeamName, setCustomTeamName] = useState<string>('');
  const [teamSaveStatus, setTeamSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!players.some((p) => p.uid === playerAUid)) {
      setPlayerAUid(activePlayerUid || players[0]?.uid || '');
    }
    const defaultPartner = players.find((p) => p.uid !== (playerAUid || activePlayerUid));
    if (!playerBUid && defaultPartner) {
      setPlayerBUid(defaultPartner.uid);
    }
  }, [players, activePlayerUid, playerAUid, playerBUid]);

  const handleSavePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAssignTeam || !playerAUid) return;
    const pA = players.find((p) => p.uid === playerAUid);
    const pB = playerBUid ? players.find((p) => p.uid === playerBUid && p.uid !== playerAUid) : undefined;

    const uids = pB ? [pA!.uid, pB.uid] : [pA!.uid];
    const sortedUids = [...uids].sort();
    const generatedTeamId = `team-${sortedUids.join('-')}`.slice(0, 60);
    const defaultLabel = pB
      ? `${pA!.displayName.split(' ')[0]} & ${pB.displayName.split(' ')[0]}`
      : `Lag ${pA!.displayName.split(' ')[0]}`;
    const finalTeamName = (customTeamName.trim() || defaultLabel).slice(0, 60);

    await onAssignTeam(uids, generatedTeamId, finalTeamName);
    setCustomTeamName('');
    setTeamSaveStatus(`Laget "${finalTeamName}" har sparats i Lagspel-tabellen!`);
    setTimeout(() => setTeamSaveStatus(null), 3500);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Broadcast Leaderboard Banner */}
      <div className="overflow-hidden rounded-2xl border border-[#112218]/15 bg-[#112218] text-[#F6F4EE] shadow-xs">
        <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
          <div className="flex flex-col justify-between p-4 sm:p-8 lg:col-span-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-[#F6F4EE]/70">
                <span>LIVE TOURNAMENT LEADERBOARD</span>
                <span aria-hidden="true">·</span>
                <span>{course.title}</span>
                <span aria-hidden="true">·</span>
                <span>{course.eventDate}</span>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="leaderboard-gamemode-pill"
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono-tabular text-[11px] font-bold ${
                    isBrutalBall
                      ? 'bg-[#D4AF37] text-[#112218]'
                      : 'border border-white/25 bg-white/10 text-white'
                  }`}
                >
                  {isBrutalBall ? (
                    <>
                      <Users className="h-3 w-3" />
                      BRUTAL BALL · LAG 2 & 2
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      SLAGSPEL · INDIVIDUELLT
                    </>
                  )}
                </span>
              </div>

              <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#F6F4EE] sm:text-4xl">
                {isBrutalBall
                  ? 'Lagspel Mästerskapstabell — Pubgolf Links'
                  : 'Mästerskapstabell — Pubgolf Links'}
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-[#F6F4EE]/80">
                {isBrutalBall
                  ? `I Lagspel spelar ni i lag om 2 och 2 där lagets score är bådas singelscore ihoplagt. Lägst sammanlagt resultat i förhållande till par tar hem Claret Jug-trofén.`
                  : `Uppdateras direkt efter varje registrerat pubhål. Lägst resultat i förhållande till banans par (Par ${orderedHoles.reduce(
                      (acc, h) => acc + h.par,
                      0
                    )}) tar hem Claret Jug-trofén.`}
              </p>

              {/* Course Owner Quick Switch for Game Mode on Existing Courses */}
              {isCourseOwner && onUpdateCourseGameMode && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs">
                  <span className="font-semibold text-[#D4AF37]">
                    Banarkitekt — Byt spelform för denna bana:
                  </span>
                  <button
                    type="button"
                    data-testid="leaderboard-switch-single-btn"
                    onClick={() => onUpdateCourseGameMode('single')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
                      !isBrutalBall
                        ? 'bg-[#D4AF37] text-[#112218]'
                        : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Slagspel
                  </button>
                  <button
                    type="button"
                    data-testid="leaderboard-switch-brutal-btn"
                    onClick={() => onUpdateCourseGameMode('brutal')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
                      isBrutalBall
                        ? 'bg-[#D4AF37] text-[#112218]'
                        : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Lagspel (lag om 2)
                  </button>
                </div>
              )}
            </div>

            {/* Leader Callout Box: Shows Leading 2-Player Team in Lagspel, or Leading Single Player in Slagspel */}
            {isBrutalBall && brutalLeader ? (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-[#D4AF37]/30 bg-white/5 p-3.5 sm:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex -space-x-2 shrink-0">
                    {brutalLeader.members.map((m) => (
                      <div key={m.player.uid} className="rounded-full ring-2 ring-[#112218]">
                        <GolferAvatar
                          avatarSeed={m.player.avatarSeed} wins={m.player.wins}
                          displayName={m.player.displayName}
                          size="sm"
                          pose="celebrate"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs font-bold tracking-wider text-[#D4AF37]">
                      LEDANDE BRUTAL BALL-LAG JUST NU
                    </div>
                    <div className="mt-0.5 font-display text-lg sm:text-xl font-bold text-white truncate">
                      {brutalLeader.teamName}
                    </div>
                    <div className="mt-0.5 text-xs text-white/75 truncate">
                      {brutalLeader.members
                        .map((m) => `${m.player.displayName} (${m.summary.toParFormatted})`)
                        .join(' + ')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-2.5 sm:border-t-0 sm:pt-0 sm:flex sm:items-center sm:gap-6 font-mono-tabular text-center sm:text-left">
                  <div>
                    <div className="text-[10px] text-white/60">LAG PAR</div>
                    <div className="text-xl sm:text-2xl font-bold text-[#4ADE80]">
                      {brutalLeader.toParFormatted}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/60">LAGSLAG</div>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {brutalLeader.totalSips}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/60">THRU</div>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {brutalLeader.thruHoles}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              singleLeader && (
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-white/15 bg-white/5 p-3.5 sm:p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <GolferAvatar
                      avatarSeed={singleLeader.player.avatarSeed} wins={singleLeader.player.wins}
                      displayName={singleLeader.player.displayName}
                      size="md"
                      pose="celebrate"
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-xs font-bold tracking-wider text-[#D4AF37]">
                        LEDARBOLL JUST NU
                      </div>
                      <div className="mt-0.5 font-display text-lg sm:text-xl font-bold text-white truncate">
                        {singleLeader.player.displayName}{' '}
                        <span className="font-sans text-xs font-normal text-white/70">
                          (“{singleLeader.player.nickname}”)
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-white/70 truncate">
                        {singleLeader.player.homePub} · {singleLeader.player.signatureDrink}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-2.5 sm:border-t-0 sm:pt-0 sm:flex sm:items-center sm:gap-6 font-mono-tabular text-center sm:text-left">
                    <div>
                      <div className="text-[10px] text-white/60">TILL PAR</div>
                      <div className="text-xl sm:text-2xl font-bold text-[#4ADE80]">
                        {singleLeader.summary.toParFormatted}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/60">KLUNKAR</div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {singleLeader.summary.totalSips}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/60">THRU</div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {singleLeader.summary.thruHoles}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="hidden lg:flex relative items-center justify-center bg-[#0B1E14] p-6 lg:col-span-4">
            <img
              src={TROPHY_CLARET_IMG}
              alt="Pubgolf Links Claret Jug Trophy"
              referrerPolicy="no-referrer"
              className="h-48 w-48 rounded-2xl object-cover shadow-lg ring-1 ring-white/15 sm:h-56 sm:w-56"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Masters-style Scoreboard Section */}
      <div className="rounded-2xl border border-[#112218]/15 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-[#112218]/10 pb-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#112218]">
              {isBrutalBall
                ? boardTab === 'teams'
                  ? 'Huvudtabell: Lagspel Lag-Leaderboard (2 & 2)'
                  : 'Individuell Leaderboard — Singelscore i rundan'
                : 'Ställning & Hål-för-hål Resultat (Slagspel)'}
            </h3>
            <p className="text-xs text-[#112218]/65">
              {isBrutalBall
                ? 'Lagets totalscore är era två singelscorer ihoplagda. Växla flik nedan för att se individuella resultat.'
                : 'Tryck på en spelare för att öppna deras PGA Tour-profil.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isBrutalBall && onAssignTeam && (
              <button
                type="button"
                data-testid="toggle-team-builder-btn"
                onClick={() => setShowTeamBuilder((prev) => !prev)}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-[#112218]/20 bg-[#F6F4EE] px-3.5 py-2 text-xs font-semibold text-[#112218] transition-colors hover:bg-[#112218]/10 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-[#166534]" />
                {showTeamBuilder ? 'Stäng lagindelning' : 'Para ihop 2 & 2-lag'}
              </button>
            )}

            <button
              type="button"
              onClick={onGoToScorecard}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#112218] px-4 py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#163826] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Flag className="h-4 w-4 text-[#D4AF37]" />
              Tillbaka till rundan
            </button>
          </div>
        </div>

        {/* Lagspel Leaderboard Switcher: Main Team Leaderboard vs Individual Single Leaderboard */}
        {isBrutalBall && (
          <div
            data-testid="brutal-ball-leaderboard-tabs"
            className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-[#112218]/15 bg-[#F6F4EE] p-1.5 sm:grid-cols-2"
          >
            <button
              type="button"
              data-testid="leaderboard-tab-teams"
              onClick={() => setBoardTab('teams')}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                boardTab === 'teams'
                  ? 'bg-[#112218] text-[#F6F4EE] shadow-xs'
                  : 'text-[#112218]/75 hover:text-[#112218]'
              }`}
            >
              <Users className="h-4 w-4 text-[#D4AF37]" />
              Huvudtabell: Lag (2 & 2 Ihoplagt)
            </button>
            <button
              type="button"
              data-testid="leaderboard-tab-individual"
              onClick={() => setBoardTab('individual')}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                boardTab === 'individual'
                  ? 'bg-[#112218] text-[#F6F4EE] shadow-xs'
                  : 'text-[#112218]/75 hover:text-[#112218]'
              }`}
            >
              <User className="h-4 w-4 text-[#166534]" />
              Individuell Leaderboard (Singelscore)
            </button>
          </div>
        )}

        {/* Optional 2-Player Team Pairing Panel in Lagspel */}
        {isBrutalBall && showTeamBuilder && onAssignTeam && (
          <form
            onSubmit={handleSavePair}
            data-testid="brutal-ball-team-builder"
            className="mt-4 rounded-xl border border-[#166534]/30 bg-[#F6F4EE]/70 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#166534]">
                LAGINDELNING FÖR BRUTAL BALL (2 & 2)
              </div>
              <span className="text-[11px] text-[#112218]/65">
                {isCourseOwner
                  ? 'Som banarkitekt kan du para ihop vilka två spelare som helst.'
                  : 'Välj din lagkamrat och ert lagnamn.'}
              </span>
            </div>

            {teamSaveStatus && (
              <div className="mt-2 rounded-lg border border-[#166534]/30 bg-[#166534]/10 px-3 py-2 text-xs font-semibold text-[#14532D]">
                {teamSaveStatus}
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-[#112218]/80">
                  Spelare 1
                </label>
                <select
                  value={playerAUid}
                  disabled={!isCourseOwner}
                  onChange={(e) => setPlayerAUid(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-white px-2.5 py-2 text-xs font-semibold text-[#112218]"
                >
                  {players.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {p.displayName} (“{p.nickname}”)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-[#112218]/80">
                  Spelare 2 (Lagkamrat)
                </label>
                <select
                  value={playerBUid}
                  onChange={(e) => setPlayerBUid(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-white px-2.5 py-2 text-xs font-semibold text-[#112218]"
                >
                  <option value="">— Ingen partner (Singel i laget) —</option>
                  {players
                    .filter((p) => p.uid !== playerAUid)
                    .map((p) => (
                      <option key={p.uid} value={p.uid}>
                        {p.displayName} (“{p.nickname}”)
                      </option>
                    ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-[#112218]/80">
                  Lagnamn (valfritt)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="t.ex. Team Guinness"
                    value={customTeamName}
                    onChange={(e) => setCustomTeamName(e.target.value)}
                    className="w-full rounded-lg border border-[#112218]/20 bg-white px-2.5 py-1.5 text-xs text-[#112218]"
                  />
                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#166534] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#14532D] cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Spara lag
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* =====================================================================
            VIEW 1: BRUTAL BALL 2-PLAYER TEAM LEADERBOARD (MAIN BOARD IN BRUTAL)
           ===================================================================== */}
        {isBrutalBall && boardTab === 'teams' ? (
          <>
            {/* MOBILE BRUTAL BALL TEAM CARDS */}
            <div className="mt-4 space-y-3 md:hidden" data-testid="mobile-brutal-team-list">
              {brutalLeaderboard.map((team) => {
                const includesMe = team.members.some((m) => m.player.uid === activePlayerUid);
                return (
                  <div
                    key={team.teamId}
                    className={`rounded-xl border p-3.5 transition ${
                      includesMe
                        ? 'border-[#166534]/40 bg-[#166534]/5'
                        : 'border-[#112218]/15 bg-[#F6F4EE]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 min-w-[32px] px-1.5 items-center justify-center rounded-lg bg-[#112218] font-mono-tabular text-xs font-bold text-[#F6F4EE] shrink-0">
                          {team.rank === 1 && team.thruHoles > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[#D4AF37]">
                              <Trophy className="h-3 w-3" />
                              {team.positionLabel}
                            </span>
                          ) : (
                            team.positionLabel
                          )}
                        </div>

                        <div className="flex -space-x-2 shrink-0">
                          {team.members.map((m) => (
                            <div key={m.player.uid} className="rounded-full ring-2 ring-white">
                              <GolferAvatar
                                avatarSeed={m.player.avatarSeed} wins={m.player.wins}
                                displayName={m.player.displayName}
                                size="xs"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-[#112218] truncate">
                            {team.teamName}
                          </div>
                          <div className="text-[11px] text-[#112218]/70 truncate">
                            {team.members
                              .map(
                                (m) =>
                                  `${m.player.displayName.split(' ')[0]} (${m.summary.toParFormatted})`
                              )
                              .join(' + ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 font-mono-tabular text-right">
                        <div>
                          <div className="text-[9px] font-sans font-semibold text-[#112218]/55">
                            LAG PAR
                          </div>
                          <div
                            className={`text-base font-extrabold ${
                              team.totalToPar < 0
                                ? 'text-[#166534]'
                                : team.totalToPar > 0
                                  ? 'text-[#991B1B]'
                                  : 'text-[#112218]'
                            }`}
                          >
                            {team.toParFormatted}
                          </div>
                        </div>

                        <div className="border-l border-[#112218]/10 pl-2.5">
                          <div className="text-[9px] font-sans font-semibold text-[#112218]/55">
                            HÅL
                          </div>
                          <div className="text-xs font-bold text-[#112218]">
                            {team.thruHoles === 9
                              ? 'F'
                              : team.thruHoles === 0
                                ? '—'
                                : `${team.thruHoles}/9`}
                          </div>
                        </div>

                        <div className="border-l border-[#112218]/10 pl-2.5">
                          <div className="text-[9px] font-sans font-semibold text-[#112218]/55">
                            SLAG
                          </div>
                          <div className="text-xs font-bold text-[#112218]">
                            {team.totalSips || '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Individual breakdown pills inside team card */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {team.members.map((m) => (
                        <button
                          key={m.player.uid}
                          type="button"
                          onClick={() => onInspectPlayerProfile(m.player.uid)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#112218]/12 bg-white px-2.5 py-1 text-[11px] font-medium text-[#112218] hover:bg-[#F6F4EE]"
                        >
                          <span>{m.player.displayName}</span>
                          <span className="font-mono-tabular font-bold text-[#166534]">
                            {m.summary.toParFormatted} ({m.summary.totalSips || 0} slag)
                          </span>
                          <ArrowUpRight className="h-3 w-3 text-[#112218]/40" />
                        </button>
                      ))}
                    </div>

                    {/* 9-Hole Combined Team Sips Mini-Grid */}
                    <div className="mt-2.5 grid grid-cols-9 gap-1 rounded-lg border border-[#112218]/10 bg-white p-1.5 text-center">
                      {orderedHoles.map((h, idx) => {
                        const combinedSips = team.holeSips[idx] ?? 0;
                        const combinedPar = team.holeEffectivePars[idx] || h.par * team.members.length;
                        return (
                          <div key={h.holeNumber} className="flex flex-col items-center">
                            <span className="font-mono-tabular text-[9px] font-semibold text-[#112218]/55">
                              H{h.holeNumber}
                            </span>
                            <div className="mt-0.5">
                              <GolfScoreSymbol sips={combinedSips} par={combinedPar} size="xs" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP BRUTAL BALL TEAM TABLE */}
            <div className="hidden md:block mt-4 overflow-x-auto">
              <table
                aria-label="Lagspel Lag-Leaderboard"
                data-testid="desktop-brutal-team-table"
                className="w-full border-collapse text-left text-sm"
              >
                <thead>
                  <tr className="border-b border-[#112218]/15 bg-[#F6F4EE] text-xs font-semibold text-[#112218]">
                    <th className="py-3 pl-3 pr-2 font-mono-tabular">POS</th>
                    <th className="px-3 py-3">BRUTAL BALL-LAG (2 & 2)</th>
                    <th className="px-3 py-3 text-center font-mono-tabular">LAG PAR</th>
                    <th className="px-3 py-3 text-center font-mono-tabular">THRU</th>
                    {orderedHoles.map((h) => (
                      <th
                        key={h.holeNumber}
                        className="px-1.5 py-3 text-center font-mono-tabular text-[11px]"
                        title={`Hål ${h.holeNumber}: ${h.pubName} (Lag-Par ${h.par * 2})`}
                      >
                        <div>H{h.holeNumber}</div>
                        <div className="font-normal text-[#112218]/55">2×P{h.par}</div>
                      </th>
                    ))}
                    <th className="bg-[#112218] px-3 py-3 text-center font-mono-tabular text-[#F6F4EE]">
                      LAGSLAG
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#112218]/10">
                  {brutalLeaderboard.map((team) => {
                    const includesMe = team.members.some((m) => m.player.uid === activePlayerUid);
                    return (
                      <tr
                        key={team.teamId}
                        data-testid={`brutal-team-row-${team.teamId}`}
                        className={`transition-colors ${
                          includesMe
                            ? 'bg-[#166534]/8 hover:bg-[#166534]/12'
                            : 'hover:bg-[#F6F4EE]/70'
                        }`}
                      >
                        <td className="py-3.5 pl-3 pr-2 font-mono-tabular font-bold text-[#112218]">
                          <div className="inline-flex items-center gap-1.5">
                            {team.rank === 1 && team.thruHoles > 0 && (
                              <Trophy className="h-4 w-4 text-[#B8860B]" />
                            )}
                            <span>{team.positionLabel}</span>
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2 shrink-0">
                              {team.members.map((m) => (
                                <div key={m.player.uid} className="rounded-full ring-2 ring-white">
                                  <GolferAvatar
                                    avatarSeed={m.player.avatarSeed} wins={m.player.wins}
                                    displayName={m.player.displayName}
                                    size="sm"
                                  />
                                </div>
                              ))}
                            </div>
                            <div>
                              <div className="font-semibold text-[#112218]">{team.teamName}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#112218]/70">
                                {team.members.map((m, i) => (
                                  <React.Fragment key={m.player.uid}>
                                    {i > 0 && <span>+</span>}
                                    <button
                                      type="button"
                                      onClick={() => onInspectPlayerProfile(m.player.uid)}
                                      className="inline-flex items-center gap-1 font-medium text-[#112218] hover:text-[#166534] hover:underline cursor-pointer"
                                    >
                                      <span>{m.player.displayName}</span>
                                      <span className="font-mono-tabular font-bold">
                                        ({m.summary.toParFormatted} · {m.summary.totalSips || 0} slag)
                                      </span>
                                    </button>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono-tabular text-base font-bold">
                          <span
                            className={
                              team.totalToPar < 0
                                ? 'text-[#166534]'
                                : team.totalToPar > 0
                                  ? 'text-[#991B1B]'
                                  : 'text-[#112218]'
                            }
                          >
                            {team.toParFormatted}
                          </span>
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono-tabular text-xs font-semibold text-[#112218]/80">
                          {team.thruHoles === 9
                            ? 'F'
                            : team.thruHoles === 0
                              ? '—'
                              : team.thruHoles}
                        </td>

                        {orderedHoles.map((h, idx) => {
                          const combinedSips = team.holeSips[idx] ?? 0;
                          const combinedPar = team.holeEffectivePars[idx] || h.par * team.members.length;
                          return (
                            <td key={h.holeNumber} className="px-1 py-2.5 text-center">
                              <GolfScoreSymbol sips={combinedSips} par={combinedPar} size="sm" />
                            </td>
                          );
                        })}

                        <td className="bg-[#112218]/5 px-3 py-3.5 text-center font-mono-tabular font-bold text-[#112218]">
                          {team.totalSips || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* =====================================================================
             VIEW 2: INDIVIDUAL SINGLE SCORE LEADERBOARD
             ===================================================================== */
          <>
            {/* MOBILE LEADERBOARD (Zero Horizontal Scroll! Fits 100% on phone screens) */}
            <div className="mt-4 space-y-3 md:hidden" data-testid="mobile-leaderboard-list">
              {singleLeaderboard.map((entry) => {
                const isCurrentUser = entry.player.uid === activePlayerUid;
                return (
                  <div
                    key={entry.player.uid}
                    onClick={() => onInspectPlayerProfile(entry.player.uid)}
                    className={`rounded-xl border p-3.5 transition cursor-pointer ${
                      isCurrentUser
                        ? 'border-[#166534]/40 bg-[#166534]/5'
                        : 'border-[#112218]/15 bg-[#F6F4EE]/40 active:bg-[#F6F4EE]'
                    }`}
                  >
                    {/* Top Row: Rank + Avatar + Name + Score to Par / Thru / Total */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 min-w-[32px] px-1.5 items-center justify-center rounded-lg bg-[#112218] font-mono-tabular text-xs font-bold text-[#F6F4EE] shrink-0">
                          {entry.rank === 1 && entry.summary.thruHoles > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[#D4AF37]">
                              <Trophy className="h-3 w-3" />
                              {entry.positionLabel}
                            </span>
                          ) : (
                            entry.positionLabel
                          )}
                        </div>

                        <GolferAvatar
                          avatarSeed={entry.player.avatarSeed} wins={entry.player.wins}
                          displayName={entry.player.displayName}
                          size="xs"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-sm text-[#112218] truncate">
                              {entry.player.displayName}
                            </span>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#112218]/40" />
                          </div>
                          <div className="text-[11px] text-[#112218]/65 truncate">
                            “{entry.player.nickname}” · HCP {entry.player.handicap}
                          </div>
                        </div>
                      </div>

                      {/* Right Side Metrics: TILL PAR | THRU | SLAG */}
                      <div className="flex items-center gap-3 shrink-0 font-mono-tabular text-right">
                        <div>
                          <div className="text-[9px] font-sans font-semibold text-[#112218]/55">
                            PAR
                          </div>
                          <div
                            className={`text-base font-extrabold ${
                              entry.summary.totalToPar < 0
                                ? 'text-[#166534]'
                                : entry.summary.totalToPar > 0
                                  ? 'text-[#991B1B]'
                                  : 'text-[#112218]'
                            }`}
                          >
                            {entry.summary.toParFormatted}
                          </div>
                        </div>

                        <div className="border-l border-[#112218]/10 pl-2.5">
                          <div className="text-[9px] font-sans font-semibold text-[#112218]/55">
                            HÅL
                          </div>
                          <div className="text-xs font-bold text-[#112218]">
                            {entry.summary.thruHoles === 9
                              ? 'F'
                              : entry.summary.thruHoles === 0
                                ? '—'
                                : `${entry.summary.thruHoles}/9`}
                          </div>
                        </div>

                        <div className="border-l border-[#112218]/10 pl-2.5">
                          <div className="text-[9px] font-sans font-semibold text-[#112218]/55">
                            SLAG
                          </div>
                          <div className="text-xs font-bold text-[#112218]">
                            {entry.summary.totalSips || '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compact 9-Hole Mini-Grid (Fits all 9 holes across the phone width with zero scroll!) */}
                    <div className="mt-3 grid grid-cols-9 gap-1 rounded-lg border border-[#112218]/10 bg-white p-1.5 text-center">
                      {orderedHoles.map((h) => {
                        const s = entry.player.sips[h.holeNumber - 1] ?? 0;
                        return (
                          <div key={h.holeNumber} className="flex flex-col items-center">
                            <span className="font-mono-tabular text-[9px] font-semibold text-[#112218]/55">
                              H{h.holeNumber}
                            </span>
                            <div className="mt-0.5">
                              <GolfScoreSymbol sips={s} par={h.par} size="xs" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE (md and up) */}
            <div className="hidden md:block mt-4 overflow-x-auto">
              <table
                aria-label="Live Leaderboard"
                className="w-full border-collapse text-left text-sm"
              >
                <thead>
                  <tr className="border-b border-[#112218]/15 bg-[#F6F4EE] text-xs font-semibold text-[#112218]">
                    <th className="py-3 pl-3 pr-2 font-mono-tabular">POS</th>
                    <th className="px-3 py-3">SPELARE (PGA TOUR)</th>
                    <th className="px-3 py-3 text-center font-mono-tabular">TILL PAR</th>
                    <th className="px-3 py-3 text-center font-mono-tabular">THRU</th>
                    {orderedHoles.map((h) => (
                      <th
                        key={h.holeNumber}
                        className="px-1.5 py-3 text-center font-mono-tabular text-[11px]"
                        title={`Hål ${h.holeNumber}: ${h.pubName} (Par ${h.par})`}
                      >
                        <div>H{h.holeNumber}</div>
                        <div className="font-normal text-[#112218]/55">P{h.par}</div>
                      </th>
                    ))}
                    <th className="bg-[#112218] px-3 py-3 text-center font-mono-tabular text-[#F6F4EE]">
                      SLAG
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#112218]/10">
                  {singleLeaderboard.map((entry) => {
                    const isCurrentUser = entry.player.uid === activePlayerUid;
                    return (
                      <tr
                        key={entry.player.uid}
                        data-testid={`leaderboard-row-${entry.player.uid}`}
                        onClick={() => onInspectPlayerProfile(entry.player.uid)}
                        className={`cursor-pointer transition-colors ${
                          isCurrentUser
                            ? 'bg-[#166534]/8 hover:bg-[#166534]/12'
                            : 'hover:bg-[#F6F4EE]/70'
                        }`}
                      >
                        <td className="py-3.5 pl-3 pr-2 font-mono-tabular font-bold text-[#112218]">
                          <div className="inline-flex items-center gap-1.5">
                            {entry.rank === 1 && entry.summary.thruHoles > 0 && (
                              <Trophy className="h-4 w-4 text-[#B8860B]" />
                            )}
                            <span>{entry.positionLabel}</span>
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <GolferAvatar
                              avatarSeed={entry.player.avatarSeed} wins={entry.player.wins}
                              displayName={entry.player.displayName}
                              size="sm"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[#112218]">
                                  {entry.player.displayName}
                                </span>
                                <ArrowUpRight className="h-3.5 w-3.5 text-[#112218]/40" />
                              </div>
                              <div className="text-xs text-[#112218]/65">
                                “{entry.player.nickname}” · HCP {entry.player.handicap} ·{' '}
                                {entry.player.homePub}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono-tabular text-base font-bold">
                          <span
                            className={
                              entry.summary.totalToPar < 0
                                ? 'text-[#166534]'
                                : entry.summary.totalToPar > 0
                                  ? 'text-[#991B1B]'
                                  : 'text-[#112218]'
                            }
                          >
                            {entry.summary.toParFormatted}
                          </span>
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono-tabular text-xs font-semibold text-[#112218]/80">
                          {entry.summary.thruHoles === 9
                            ? 'F'
                            : entry.summary.thruHoles === 0
                              ? '—'
                              : entry.summary.thruHoles}
                        </td>

                        {orderedHoles.map((h) => {
                          const s = entry.player.sips[h.holeNumber - 1] ?? 0;
                          return (
                            <td key={h.holeNumber} className="px-1 py-2.5 text-center">
                              <GolfScoreSymbol sips={s} par={h.par} size="sm" />
                            </td>
                          );
                        })}

                        <td className="bg-[#112218]/5 px-3 py-3.5 text-center font-mono-tabular font-bold text-[#112218]">
                          {entry.summary.totalSips || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
