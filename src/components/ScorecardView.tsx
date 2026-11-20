import React from 'react';
import confetti from 'canvas-confetti';
import {
  Minus,
  Plus,
  RotateCcw,
  Trophy,
  Compass,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Tv,
  Users,
  User,
} from 'lucide-react';
import {
  buildBrutalBallLeaderboard,
  calculateRoundSummary,
  evaluateGolfHoleScore,
  type PlayerTourProfile,
  type PubCourse,
  type PubHole,
} from '../utils/golfRules';
import { GolfScoreSymbol } from './GolfScoreSymbol';
import { HoleVisualMap } from './HoleVisualMap';
import { GolferAvatar } from './GolferAvatar';
import { PubRouteMap } from './PubRouteMap';

interface ScorecardViewProps {
  course: PubCourse;
  holes: PubHole[];
  activePlayer: PlayerTourProfile;
  allPlayers?: PlayerTourProfile[];
  selectedHoleNum: number;
  onSelectHole: (holeNumber: number) => void;
  onUpdateHoleSips: (holeNumber: number, newSips: number) => void;
  onReplayHoleAnimation?: (holeNumber: number, sips: number) => void;
  onOpenCourseGuide: (holeNumber: number) => void;
  onOpenLeaderboard: () => void;
}

const SHAPE_LABELS: Record<PubHole['shape'], string> = {
  straight: 'Rak Fairway',
  'dogleg-left': 'Dogleg Vänster',
  'dogleg-right': 'Dogleg Höger',
  'island-green': 'Ö-Green',
  'double-dogleg': 'Dubbel Dogleg',
};

export const ScorecardView: React.FC<ScorecardViewProps> = ({
  course,
  holes,
  activePlayer,
  allPlayers = [],
  selectedHoleNum,
  onSelectHole,
  onUpdateHoleSips,
  onReplayHoleAnimation,
  onOpenCourseGuide,
  onOpenLeaderboard,
}) => {
  const orderedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  const myBrutalTeam =
    course.gameMode === 'brutal'
      ? buildBrutalBallLeaderboard(
          allPlayers.length > 0 ? allPlayers : [activePlayer],
          orderedHoles
        ).find((t) => t.members.some((m) => m.player.uid === activePlayer.uid)) || null
      : null;
  const currentHole =
    orderedHoles.find((h) => h.holeNumber === selectedHoleNum) || orderedHoles[0];
  const currentSips = activePlayer.sips[currentHole.holeNumber - 1] ?? 0;

  // Draft sips allows stepping with -/+ before committing the score & firing the bowling animation clip
  const [draftSips, setDraftSips] = React.useState<number>(
    currentSips > 0 ? currentSips : currentHole.par
  );

  React.useEffect(() => {
    setDraftSips(currentSips > 0 ? currentSips : currentHole.par);
  }, [currentHole.holeNumber, currentSips, currentHole.par]);

  const activeEvalSips = currentSips > 0 ? currentSips : draftSips;
  const currentEval = evaluateGolfHoleScore(activeEvalSips, currentHole.par);
  const summary = calculateRoundSummary(activePlayer.sips, orderedHoles);

  const handleSetSips = (holeNumber: number, targetSips: number, par: number) => {
    const clamped = Math.max(0, Math.min(25, targetSips));
    setDraftSips(clamped > 0 ? clamped : par);
    onUpdateHoleSips(holeNumber, clamped);

    if (clamped > 0 && clamped <= par - 1) {
      try {
        void confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Ignore confetti errors in headless browsers
      }
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Scorecard Summary Header */}
      <div className="rounded-2xl border border-[#112218]/15 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-[#112218]/10 pb-4 sm:pb-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3.5 min-w-0">
            <GolferAvatar
              avatarSeed={activePlayer.avatarSeed}
              displayName={activePlayer.displayName}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-[#112218]/65">
                <span>SCOREKORT</span>
                <span aria-hidden="true">·</span>
                <span>{course.eventDate}</span>
                <span aria-hidden="true">·</span>
                <span>{course.city}</span>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="scorecard-gamemode-badge"
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono-tabular text-[10px] font-bold ${
                    course.gameMode === 'brutal'
                      ? 'bg-[#D4AF37]/25 text-[#112218] border border-[#D4AF37]/50'
                      : 'bg-[#166534]/10 text-[#166534]'
                  }`}
                >
                  {course.gameMode === 'brutal' ? (
                    <>
                      <Users className="h-3 w-3" />
                      BRUTAL BALL (2 & 2)
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      SINGLE BALL
                    </>
                  )}
                </span>
              </div>
              <h2 className="mt-0.5 font-display text-xl font-bold tracking-tight text-[#112218] sm:text-3xl truncate">
                {activePlayer.displayName}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-[#112218]/70 truncate">
                “{activePlayer.nickname}” · {activePlayer.homePub}
              </p>
            </div>
          </div>

          {/* Key Round Metrics */}
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-[#F6F4EE]/70 p-3 sm:bg-transparent sm:p-0 sm:gap-6">
            <div className="border-r border-[#112218]/10 pr-3 sm:pr-4 text-center sm:text-left">
              <div className="text-[10px] sm:text-xs text-[#112218]/60">TILL PAR</div>
              <div
                data-testid="scorecard-total-to-par"
                className={`mt-0.5 font-mono-tabular text-xl font-bold sm:text-3xl ${
                  summary.totalToPar < 0
                    ? 'text-[#166534]'
                    : summary.totalToPar > 0
                      ? 'text-[#991B1B]'
                      : 'text-[#112218]'
                }`}
              >
                {summary.toParFormatted}
              </div>
            </div>
            <div className="border-r border-[#112218]/10 pr-3 sm:pr-4 text-center sm:text-left">
              <div className="text-[10px] sm:text-xs text-[#112218]/60">KLUNKAR</div>
              <div
                data-testid="scorecard-total-sips"
                className="mt-0.5 font-mono-tabular text-xl font-bold text-[#112218] sm:text-3xl"
              >
                {summary.totalSips}
              </div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-[10px] sm:text-xs text-[#112218]/60">SPELADE HÅL</div>
              <div
                data-testid="scorecard-thru-holes"
                className="mt-0.5 font-mono-tabular text-xl font-bold text-[#112218] sm:text-3xl"
              >
                {summary.thruHoles}/9
              </div>
            </div>
          </div>
        </div>

        {/* Brutal Ball 2-Player Team Summary Strip */}
        {myBrutalTeam && (
          <div
            data-testid="scorecard-brutal-team-banner"
            className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-[#D4AF37]/40 bg-[#112218] p-3.5 text-[#F6F4EE] sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 shrink-0">
                {myBrutalTeam.members.map((m) => (
                  <div key={m.player.uid} className="rounded-full ring-2 ring-[#112218]">
                    <GolferAvatar
                      avatarSeed={m.player.avatarSeed}
                      displayName={m.player.displayName}
                      size="xs"
                    />
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-[#D4AF37]">
                  DITT BRUTAL BALL-LAG (2 & 2 IHOPLAGT) · PLATS {myBrutalTeam.positionLabel}
                </div>
                <div className="font-display text-sm sm:text-base font-bold text-white">
                  {myBrutalTeam.teamName}:{' '}
                  <span className="font-sans text-xs font-normal text-white/80">
                    {myBrutalTeam.members
                      .map((m) => `${m.player.displayName} (${m.summary.toParFormatted})`)
                      .join(' + ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-2 sm:border-t-0 sm:pt-0 font-mono-tabular">
              <div>
                <div className="text-[9px] text-white/60">LAGSCORE TILL PAR</div>
                <div className="text-base sm:text-lg font-extrabold text-[#4ADE80]">
                  {myBrutalTeam.toParFormatted}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-white/60">LAGSLAG TOTALT</div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {myBrutalTeam.totalSips} slag
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="rounded-lg bg-[#D4AF37] px-3 py-1.5 font-sans text-xs font-bold text-[#112218] hover:bg-[#E5C158] cursor-pointer"
              >
                Lag-tabell
              </button>
            </div>
          </div>
        )}

        {/* MOBILE 9-HOLE SCORECARD GRID (Zero horizontal scroll! Split into Front 5 + UT and Back 4 + IN + TOT) */}
        <div className="mt-4 space-y-2.5 md:hidden" data-testid="mobile-scorecard-grid">
          {/* Row 1: Holes 1..5 + UT */}
          <div className="grid grid-cols-6 gap-1.5">
            {orderedHoles.slice(0, 5).map((h) => {
              const s = activePlayer.sips[h.holeNumber - 1] ?? 0;
              const isSelected = selectedHoleNum === h.holeNumber;
              return (
                <button
                  key={h.holeNumber}
                  type="button"
                  onClick={() => onSelectHole(h.holeNumber)}
                  className={`flex flex-col items-center justify-between rounded-xl border p-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-[#112218] bg-[#112218]/5 ring-2 ring-[#112218]'
                      : 'border-[#112218]/15 bg-[#F6F4EE]/50'
                  }`}
                >
                  <span
                    className={`font-mono-tabular text-[11px] font-bold ${
                      isSelected ? 'text-[#166534]' : 'text-[#112218]'
                    }`}
                  >
                    H{h.holeNumber}
                  </span>
                  <span className="text-[9px] text-[#112218]/60 font-mono-tabular">
                    Par {h.par}
                  </span>
                  <div className="my-1">
                    <GolfScoreSymbol sips={s} par={h.par} size="xs" />
                  </div>
                </button>
              );
            })}
            <div className="flex flex-col items-center justify-between rounded-xl border border-[#112218]/15 bg-[#112218]/5 p-2 text-center">
              <span className="font-mono-tabular text-[10px] font-bold text-[#112218]">UT</span>
              <span className="text-[9px] text-[#112218]/60 font-mono-tabular">
                P{summary.frontFivePar}
              </span>
              <span className="my-1 flex h-6 items-center justify-center font-mono-tabular text-xs font-bold text-[#112218]">
                {summary.frontFiveSips || '—'}
              </span>
            </div>
          </div>

          {/* Row 2: Holes 6..9 + IN + TOT */}
          <div className="grid grid-cols-6 gap-1.5">
            {orderedHoles.slice(5, 9).map((h) => {
              const s = activePlayer.sips[h.holeNumber - 1] ?? 0;
              const isSelected = selectedHoleNum === h.holeNumber;
              return (
                <button
                  key={h.holeNumber}
                  type="button"
                  onClick={() => onSelectHole(h.holeNumber)}
                  className={`flex flex-col items-center justify-between rounded-xl border p-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-[#112218] bg-[#112218]/5 ring-2 ring-[#112218]'
                      : 'border-[#112218]/15 bg-[#F6F4EE]/50'
                  }`}
                >
                  <span
                    className={`font-mono-tabular text-[11px] font-bold ${
                      isSelected ? 'text-[#166534]' : 'text-[#112218]'
                    }`}
                  >
                    H{h.holeNumber}
                  </span>
                  <span className="text-[9px] text-[#112218]/60 font-mono-tabular">
                    Par {h.par}
                  </span>
                  <div className="my-1">
                    <GolfScoreSymbol sips={s} par={h.par} size="xs" />
                  </div>
                </button>
              );
            })}
            <div className="flex flex-col items-center justify-between rounded-xl border border-[#112218]/15 bg-[#112218]/5 p-2 text-center">
              <span className="font-mono-tabular text-[10px] font-bold text-[#112218]">IN</span>
              <span className="text-[9px] text-[#112218]/60 font-mono-tabular">
                P{summary.backFourPar}
              </span>
              <span className="my-1 flex h-6 items-center justify-center font-mono-tabular text-xs font-bold text-[#112218]">
                {summary.backFourSips || '—'}
              </span>
            </div>
            <div className="flex flex-col items-center justify-between rounded-xl bg-[#112218] p-2 text-center text-[#F6F4EE]">
              <span className="font-mono-tabular text-[10px] font-bold text-[#D4AF37]">TOT</span>
              <span className="text-[9px] text-[#F6F4EE]/70 font-mono-tabular">
                P{summary.totalCoursePar}
              </span>
              <span className="my-1 flex h-6 items-center justify-center font-mono-tabular text-xs font-bold text-white">
                {summary.totalSips || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* DESKTOP Traditional 9-Hole Golf Scorecard Table (md and up) */}
        <div className="hidden md:block mt-5 overflow-x-auto">
          <table
            aria-label="Golfscorekort 9 hål"
            className="w-full border-collapse text-left text-sm"
          >
            <thead>
              <tr className="border-b border-[#112218]/15 bg-[#F6F4EE] text-xs font-semibold text-[#112218]">
                <th className="py-2.5 pl-3 pr-2">HÅL</th>
                {orderedHoles.slice(0, 5).map((h) => (
                  <th key={h.holeNumber} className="px-2 py-2.5 text-center font-mono-tabular">
                    <button
                      type="button"
                      onClick={() => onSelectHole(h.holeNumber)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-bold transition-colors ${
                        selectedHoleNum === h.holeNumber
                          ? 'bg-[#112218] text-[#F6F4EE]'
                          : 'hover:bg-[#112218]/10'
                      }`}
                    >
                      {h.holeNumber}
                    </button>
                  </th>
                ))}
                <th className="bg-[#112218]/5 px-2.5 py-2.5 text-center font-mono-tabular">UT</th>
                {orderedHoles.slice(5, 9).map((h) => (
                  <th key={h.holeNumber} className="px-2 py-2.5 text-center font-mono-tabular">
                    <button
                      type="button"
                      onClick={() => onSelectHole(h.holeNumber)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-bold transition-colors ${
                        selectedHoleNum === h.holeNumber
                          ? 'bg-[#112218] text-[#F6F4EE]'
                          : 'hover:bg-[#112218]/10'
                      }`}
                    >
                      {h.holeNumber}
                    </button>
                  </th>
                ))}
                <th className="bg-[#112218]/5 px-2.5 py-2.5 text-center font-mono-tabular">IN</th>
                <th className="bg-[#112218] px-3 py-2.5 text-center font-mono-tabular text-[#F6F4EE]">
                  TOT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#112218]/10">
              {/* Row 1: Pub / Dryck */}
              <tr className="text-xs text-[#112218]/70">
                <td className="py-2 pl-3 pr-2 font-medium text-[#112218]">Dryck (cl)</td>
                {orderedHoles.slice(0, 5).map((h) => (
                  <td key={h.holeNumber} className="px-1.5 py-2 text-center font-mono-tabular">
                    {h.volumeCl}cl
                  </td>
                ))}
                <td className="bg-[#112218]/5 px-2 py-2 text-center font-mono-tabular">—</td>
                {orderedHoles.slice(5, 9).map((h) => (
                  <td key={h.holeNumber} className="px-1.5 py-2 text-center font-mono-tabular">
                    {h.volumeCl}cl
                  </td>
                ))}
                <td className="bg-[#112218]/5 px-2 py-2 text-center font-mono-tabular">—</td>
                <td className="bg-[#112218]/10 px-2.5 py-2 text-center font-mono-tabular font-semibold text-[#112218]">
                  {orderedHoles.reduce((acc, h) => acc + h.volumeCl, 0)}cl
                </td>
              </tr>

              {/* Row 2: Par */}
              <tr className="text-xs font-medium text-[#112218]/80">
                <td className="py-2.5 pl-3 pr-2 font-semibold text-[#112218]">PAR (Klunkar)</td>
                {orderedHoles.slice(0, 5).map((h) => (
                  <td key={h.holeNumber} className="px-2 py-2.5 text-center font-mono-tabular">
                    {h.par}
                  </td>
                ))}
                <td className="bg-[#112218]/5 px-2.5 py-2.5 text-center font-mono-tabular font-bold">
                  {summary.frontFivePar}
                </td>
                {orderedHoles.slice(5, 9).map((h) => (
                  <td key={h.holeNumber} className="px-2 py-2.5 text-center font-mono-tabular">
                    {h.par}
                  </td>
                ))}
                <td className="bg-[#112218]/5 px-2.5 py-2.5 text-center font-mono-tabular font-bold">
                  {summary.backFourPar}
                </td>
                <td className="bg-[#112218]/10 px-3 py-2.5 text-center font-mono-tabular font-bold text-[#112218]">
                  {summary.totalCoursePar}
                </td>
              </tr>

              {/* Row 3: Player Score with Geometric Golf Symbols */}
              <tr className="bg-white">
                <td className="py-3 pl-3 pr-2 font-semibold text-[#112218]">
                  <div className="flex items-center gap-2">
                    <GolferAvatar
                      avatarSeed={activePlayer.avatarSeed}
                      displayName={activePlayer.displayName}
                      size="xs"
                    />
                    <span>Dina Slag</span>
                  </div>
                </td>
                {orderedHoles.slice(0, 5).map((h) => {
                  const s = activePlayer.sips[h.holeNumber - 1] ?? 0;
                  return (
                    <td key={h.holeNumber} className="px-1.5 py-2.5 text-center">
                      <button
                        type="button"
                        aria-label={`Välj hål ${h.holeNumber}, nuvarande slag ${s || 'ej spelat'}`}
                        onClick={() => onSelectHole(h.holeNumber)}
                        className={`rounded-lg p-0.5 transition-transform hover:scale-105 ${
                          selectedHoleNum === h.holeNumber ? 'ring-2 ring-[#112218]' : ''
                        }`}
                      >
                        <GolfScoreSymbol sips={s} par={h.par} size="sm" />
                      </button>
                    </td>
                  );
                })}
                <td className="bg-[#112218]/5 px-2.5 py-3 text-center font-mono-tabular font-bold text-[#112218]">
                  {summary.frontFiveSips || '—'}
                </td>
                {orderedHoles.slice(5, 9).map((h) => {
                  const s = activePlayer.sips[h.holeNumber - 1] ?? 0;
                  return (
                    <td key={h.holeNumber} className="px-1.5 py-2.5 text-center">
                      <button
                        type="button"
                        aria-label={`Välj hål ${h.holeNumber}, nuvarande slag ${s || 'ej spelat'}`}
                        onClick={() => onSelectHole(h.holeNumber)}
                        className={`rounded-lg p-0.5 transition-transform hover:scale-105 ${
                          selectedHoleNum === h.holeNumber ? 'ring-2 ring-[#112218]' : ''
                        }`}
                      >
                        <GolfScoreSymbol sips={s} par={h.par} size="sm" />
                      </button>
                    </td>
                  );
                })}
                <td className="bg-[#112218]/5 px-2.5 py-3 text-center font-mono-tabular font-bold text-[#112218]">
                  {summary.backFourSips || '—'}
                </td>
                <td className="bg-[#112218] px-3 py-3 text-center font-mono-tabular font-bold text-[#F6F4EE]">
                  {summary.totalSips || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Scorecard Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#112218]/10 pt-4 text-xs text-[#112218]/70">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-[#B8860B] bg-[#B8860B]/20" />
              Albatross / Hole-in-One (-3 / 1 klunk)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-[#166534] bg-[#166534]/15" />
              Eagle (-2)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-full border border-[#166534]" />
              Birdie (-1)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 border border-[#9A3412]" />
              Bogey (+1)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 border-2 border-[#991B1B] bg-[#991B1B]/10" />
              Dubbelbogey+ (+2)
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="inline-flex items-center gap-1.5 font-semibold text-[#112218] underline-offset-4 hover:underline"
          >
            <Trophy className="h-3.5 w-3.5 text-[#B8860B]" />
            Se live-leaderboard
          </button>
        </div>
      </div>

      {/* Interactive Hole Scorer + Visual Fairway Split */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Active Pub Hole Scoring Station */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#112218]/15 bg-white p-6 shadow-xs lg:col-span-7">
          <div>
            {/* Hole Navigation Strip */}
            <div className="flex items-center justify-between border-b border-[#112218]/10 pb-4">
              <button
                type="button"
                onClick={() =>
                  onSelectHole(currentHole.holeNumber > 1 ? currentHole.holeNumber - 1 : 9)
                }
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#112218]/15 px-3 py-1.5 text-xs font-semibold text-[#112218] transition-colors hover:bg-[#F6F4EE]"
              >
                <ChevronLeft className="h-4 w-4" />
                Föregående hål
              </button>

              <div className="text-center">
                <span className="font-mono-tabular text-xs font-bold text-[#166534]">
                  HÅL {currentHole.holeNumber} AV 9
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  onSelectHole(currentHole.holeNumber < 9 ? currentHole.holeNumber + 1 : 1)
                }
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#112218]/15 px-3 py-1.5 text-xs font-semibold text-[#112218] transition-colors hover:bg-[#F6F4EE]"
              >
                Nästa hål
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Current Pub & Drink Details */}
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#112218]/65">
                <span>{currentHole.pubAddress}</span>
                <span aria-hidden="true">·</span>
                <span>{SHAPE_LABELS[currentHole.shape]}</span>
                <span aria-hidden="true">·</span>
                <span>{currentHole.lengthMeters} meter</span>
              </div>
              <h3 className="mt-1 font-display text-2xl font-bold text-[#112218]">
                Hål {currentHole.holeNumber}: {currentHole.pubName}
              </h3>

              {/* Drink & Par Banner */}
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[#112218]/10 bg-[#F6F4EE] p-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-[#112218]/60">TÄVLINGSDRYCK</div>
                  <div className="mt-0.5 font-semibold text-[#112218]">{currentHole.drinkName}</div>
                </div>
                <div>
                  <div className="text-xs text-[#112218]/60">VOLYM & KATEGORI</div>
                  <div className="mt-0.5 font-mono-tabular font-semibold text-[#112218]">
                    {currentHole.volumeCl} cl · {currentHole.drinkType}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#112218]/60">HÅLETS PAR</div>
                  <div className="mt-0.5 font-mono-tabular text-lg font-bold text-[#166534]">
                    Par {currentHole.par} ({currentHole.par} klunkar)
                  </div>
                </div>
              </div>
            </div>

            {/* Stroke / Klunk Stepper Console */}
            <div className="mt-6 rounded-2xl border border-[#112218]/15 bg-[#F6F4EE]/60 p-5">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div>
                  <div className="text-xs font-semibold text-[#112218]/70">
                    REGISTRERA ANTAL KLUNKAR / SVEP PÅ HÅL {currentHole.holeNumber}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      data-testid="active-hole-eval-label"
                      className="font-display text-xl font-bold text-[#112218]"
                    >
                      {currentEval.svLabel}
                    </span>
                    <span className="font-mono-tabular text-sm font-semibold text-[#166534]">
                      ({currentEval.diffFormatted})
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#112218]/70">{currentEval.description}</p>
                </div>

                {/* Big tactile - / + buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Minska antal klunkar"
                    disabled={draftSips <= 1}
                    onClick={() => setDraftSips((prev) => Math.max(1, prev - 1))}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#112218]/20 bg-white text-[#112218] transition-colors hover:bg-[#112218] hover:text-white disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <div
                    data-testid="active-hole-sips-value"
                    className="flex h-14 min-w-[68px] flex-col items-center justify-center rounded-xl border border-[#112218]/20 bg-white px-3 font-mono-tabular"
                  >
                    <span className="text-2xl font-bold text-[#112218]">
                      {currentSips > 0 && draftSips === currentSips ? currentSips : draftSips}
                    </span>
                    <span className="text-[10px] text-[#112218]/60">
                      {currentSips > 0 && draftSips === currentSips ? 'REGISTRERAT' : 'VALDA SLAG'}
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label="Öka antal klunkar"
                    onClick={() => setDraftSips((prev) => Math.min(25, prev + 1))}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#112218] text-[#F6F4EE] transition-colors hover:bg-[#163826] cursor-pointer"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Primary Register Score CTA */}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  data-testid="register-hole-score-btn"
                  onClick={() => {
                    if (currentSips === draftSips && currentSips > 0 && onReplayHoleAnimation) {
                      onReplayHoleAnimation(currentHole.holeNumber, draftSips);
                    } else {
                      handleSetSips(currentHole.holeNumber, draftSips, currentHole.par);
                    }
                  }}
                  className="inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#166534] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#14532D] cursor-pointer whitespace-nowrap"
                >
                  <Tv className="h-4 w-4 text-[#D4AF37]" />
                  {currentSips > 0 && currentSips === draftSips
                    ? `Spela upp igen (${draftSips} slag)`
                    : `Registrera ${draftSips} Slag på Hål ${currentHole.holeNumber}`}
                </button>
              </div>

              {/* Quick Golf Term Preset Buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#112218]/10 pt-4">
                <button
                  type="button"
                  onClick={() => handleSetSips(currentHole.holeNumber, 1, currentHole.par)}
                  className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    currentSips === 1
                      ? 'border-[#B8860B] bg-[#B8860B] text-white'
                      : 'border-[#112218]/15 bg-white text-[#112218] hover:bg-[#112218]/5'
                  }`}
                >
                  1 Slag · Hole-in-One (Svep)
                </button>

                {currentHole.par >= 4 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSetSips(currentHole.holeNumber, currentHole.par - 2, currentHole.par)
                    }
                    className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      currentSips === currentHole.par - 2
                        ? 'border-[#166534] bg-[#166534] text-white'
                        : 'border-[#112218]/15 bg-white text-[#112218] hover:bg-[#112218]/5'
                    }`}
                  >
                    {currentHole.par - 2} Slag · Eagle
                  </button>
                )}

                {currentHole.par >= 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSetSips(currentHole.holeNumber, currentHole.par - 1, currentHole.par)
                    }
                    className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      currentSips === currentHole.par - 1
                        ? 'border-[#166534] bg-[#166534] text-white'
                        : 'border-[#112218]/15 bg-white text-[#112218] hover:bg-[#112218]/5'
                    }`}
                  >
                    {currentHole.par - 1} Slag · Birdie
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleSetSips(currentHole.holeNumber, currentHole.par, currentHole.par)
                  }
                  className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    currentSips === currentHole.par
                      ? 'border-[#112218] bg-[#112218] text-white'
                      : 'border-[#112218]/15 bg-white text-[#112218] hover:bg-[#112218]/5'
                  }`}
                >
                  {currentHole.par} Slag · Par
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSetSips(currentHole.holeNumber, currentHole.par + 1, currentHole.par)
                  }
                  className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    currentSips === currentHole.par + 1
                      ? 'border-[#9A3412] bg-[#9A3412] text-white'
                      : 'border-[#112218]/15 bg-white text-[#112218] hover:bg-[#112218]/5'
                  }`}
                >
                  {currentHole.par + 1} Slag · Bogey
                </button>

                {currentSips > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetSips(currentHole.holeNumber, 0, currentHole.par)}
                    className="ml-auto inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-[#112218]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#112218]/70 hover:text-[#991B1B] whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Nollställ hål
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Hazard Rule & Caddie Footer inside Scorer */}
          <div className="mt-5 flex flex-col justify-between gap-3 border-t border-[#112218]/10 pt-4 text-xs sm:flex-row sm:items-center">
            <div className="text-[#112218]/75">
              <strong className="font-semibold text-[#112218]">
                Lokalt hinder ({currentHole.hazardTitle}):
              </strong>{' '}
              {currentHole.hazardRule}
            </div>
            <button
              type="button"
              onClick={() => onOpenCourseGuide(currentHole.holeNumber)}
              className="inline-flex items-center gap-1.5 font-semibold text-[#166534] hover:underline whitespace-nowrap shrink-0"
            >
              <Compass className="h-4 w-4" />
              Öppna full banguide
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Visual Golf Hole Yardage Map */}
        <div className="flex flex-col justify-between lg:col-span-5">
          <HoleVisualMap hole={currentHole} playerSips={currentSips} />
          <div className="mt-3 flex items-center justify-between rounded-xl border border-[#112218]/10 bg-white px-4 py-3 text-xs text-[#112218]/80">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#166534]" />
              Scorekortet uppdaterar leaderboarden direkt
            </span>
            <span className="font-mono-tabular font-semibold text-[#112218]">
              Snitt: {summary.thruHoles > 0 ? (summary.totalSips / summary.thruHoles).toFixed(1) : '—'} klunk/hål
            </span>
          </div>
        </div>
      </div>

      {/* Live Google Maps Walking Route Between Pubs during the round */}
      <PubRouteMap
        course={course}
        holes={orderedHoles}
        selectedHoleNum={currentHole.holeNumber}
        onSelectHole={onSelectHole}
        compact
      />
    </div>
  );
};
