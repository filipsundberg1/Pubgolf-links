import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Map as MapIcon,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  ShieldAlert,
  Trophy,
  Wine,
} from 'lucide-react';
import {
  DRINK_CATALOG,
  GAME_MODE_LABELS,
  buildLeaderboard,
  calculateRoundSummary,
  evaluateGolfHoleScore,
  formatEventDate,
  type PlayerTourProfile,
  type PubCourse,
  type PubGolfGameMode,
  type PubHole,
} from '../../utils/golfRules';
import { GolfScoreSymbol } from '../GolfScoreSymbol';
import { GolferAvatar } from '../GolferAvatar';
import { LeaderboardView } from '../LeaderboardView';
import { PubRouteMap } from '../PubRouteMap';
import { CourseGuideView } from '../CourseGuideView';
import { Sheet } from '../shell/Sheet';

interface RoundViewProps {
  course: PubCourse;
  holes: PubHole[];
  me: PlayerTourProfile;
  players: PlayerTourProfile[];
  isOwner: boolean;
  selectedHoleNum: number;
  onSelectHole: (n: number) => void;
  onBack: () => void;
  onUpdateHoleSips: (holeNumber: number, sips: number) => void;
  onSaveHoleConfig: (hole: PubHole) => Promise<void>;
  onSaveCourseMeta: (course: PubCourse) => Promise<void>;
  onAssignTeam: (uids: string[], teamId: string, teamName: string) => Promise<void>;
  onInspectPlayer: (uid: string) => void;
}

const isPlaceholder = (text: string) =>
  /Ange |Välj dryck i banguiden|Lokalt pubhinder|Klicka på Anpassa/.test(text);

export const RoundView: React.FC<RoundViewProps> = ({
  course,
  holes,
  me,
  players,
  isOwner,
  selectedHoleNum,
  onSelectHole,
  onBack,
  onUpdateHoleSips,
  onSaveHoleConfig,
  onSaveCourseMeta,
  onAssignTeam,
  onInspectPlayer,
}) => {
  const [sheet, setSheet] = useState<'leaderboard' | 'map' | 'edit' | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const hole = holes.find((h) => h.holeNumber === selectedHoleNum) || holes[0];
  const savedSips = hole ? me.sips[hole.holeNumber - 1] || 0 : 0;
  const [draftSips, setDraftSips] = useState<number>(savedSips || hole?.par || 1);

  // När man byter hål: visa sparad score, annars par som startvärde
  useEffect(() => {
    setDraftSips(savedSips || hole?.par || 1);
  }, [hole?.holeNumber, savedSips, hole?.par]);

  const summary = useMemo(() => calculateRoundSummary(me.sips, holes), [me.sips, holes]);
  const board = useMemo(() => buildLeaderboard(players, holes), [players, holes]);
  const myRank = board.find((e) => e.player.uid === me.uid);

  if (!hole) {
    return <p className="text-sm text-[#112218]/60">Banan laddas…</p>;
  }

  const evalDraft = evaluateGolfHoleScore(draftSips, hole.par);
  const drinkLabel = DRINK_CATALOG[hole.drinkType]?.label || hole.drinkType;
  const hasRule = !isPlaceholder(hole.hazardTitle) || !isPlaceholder(hole.hazardRule);
  const isDirty = draftSips !== savedSips;

  const share = async () => {
    const url = `${window.location.origin}/?join=${encodeURIComponent(course.inviteCode)}`;
    const text = `Häng med på pubgolf: ${course.title} (${formatEventDate(course.eventDate)}). Kod: ${course.inviteCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareNote('Inbjudan kopierad!');
    } catch {
      setShareNote(`Kod: ${course.inviteCode}`);
    }
    setTimeout(() => setShareNote(null), 2500);
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Rundhuvud */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-[#166534]">
            <ArrowLeft className="h-4 w-4" /> Rundor
          </button>
          <h1 className="truncate font-display text-2xl font-bold text-[#112218]">{course.title}</h1>
          <p className="text-xs text-[#112218]/60">
            {formatEventDate(course.eventDate)} · {course.city} · {GAME_MODE_LABELS[course.gameMode || 'single'].title} · {players.length} spelare
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button type="button" onClick={share}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#112218] px-3 py-1.5 text-xs font-semibold text-[#F6F4EE]">
            <Share2 className="h-3.5 w-3.5 text-[#D4AF37]" /> Bjud in
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#112218]/60">
            {course.isPublic ? (<><Globe2 className="h-3 w-3" /> Öppen</>) : (<>Kod <span className="font-mono tracking-wider text-[#112218]">{course.inviteCode}</span></>)}
          </span>
          {shareNote && <span className="text-[11px] font-semibold text-[#166534]">{shareNote}</span>}
        </div>
      </div>

      {/* Hålväljare */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {holes.map((h) => {
            const s = me.sips[h.holeNumber - 1] || 0;
            const active = h.holeNumber === hole.holeNumber;
            return (
              <button key={h.holeNumber} type="button" onClick={() => onSelectHole(h.holeNumber)}
                className={`flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-xs font-bold transition ${
                  active ? 'border-[#D4AF37] bg-[#112218] text-[#D4AF37]' : 'border-[#112218]/10 bg-white text-[#112218]'
                }`}>
                <span>{h.holeNumber}</span>
                {s > 0 ? <span className={active ? 'rounded-full bg-[#F6F4EE] p-px' : ''}><GolfScoreSymbol sips={s} par={h.par} size="xs" /></span> : <span className="text-[10px] font-medium opacity-50">P{h.par}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hålkort – bowlingbana */}
      <section className="relative overflow-hidden rounded-3xl bg-[#112218] text-[#F6F4EE] shadow-xl">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, #D4AF37 0 2px, transparent 2px 38px)' }} />
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-[#D4AF37]">Hål {hole.holeNumber} / {holes.length}</div>
              <h2 className="mt-1 font-display text-3xl font-bold leading-tight">
                {isPlaceholder(hole.pubName) ? `Hål ${hole.holeNumber}` : hole.pubName}
              </h2>
              {!isPlaceholder(hole.pubAddress) && <p className="mt-0.5 text-sm text-[#F6F4EE]/60">{hole.pubAddress}</p>}
            </div>
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-[#D4AF37] bg-black/20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Par</span>
              <span className="font-mono text-3xl font-black leading-none">{hole.par}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
            <Wine className="h-5 w-5 shrink-0 text-[#D4AF37]" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {isPlaceholder(hole.drinkName) ? drinkLabel : hole.drinkName} · {hole.volumeCl} cl
              </div>
              <div className="text-xs text-[#F6F4EE]/55">{drinkLabel}</div>
            </div>
          </div>

          {hasRule && (
            <div className="mt-3 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#D4AF37]">
                <ShieldAlert className="h-4 w-4" /> {isPlaceholder(hole.hazardTitle) ? 'Regel' : hole.hazardTitle}
              </div>
              {!isPlaceholder(hole.hazardRule) && <p className="mt-1 text-sm text-[#F6F4EE]/85">{hole.hazardRule}</p>}
            </div>
          )}

          {!isPlaceholder(hole.caddieTip) && (
            <p className="mt-3 text-xs italic text-[#F6F4EE]/55">Caddietips: {hole.caddieTip}</p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button type="button" disabled={hole.holeNumber <= 1} onClick={() => onSelectHole(hole.holeNumber - 1)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" /> Förra
            </button>
            <button type="button" disabled={hole.holeNumber >= holes.length} onClick={() => onSelectHole(hole.holeNumber + 1)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-30">
              Nästa <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Min score */}
      <section className="rounded-3xl border border-[#112218]/10 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <GolferAvatar avatarSeed={me.avatarSeed} displayName={me.displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[#112218]">Din score på hål {hole.holeNumber}</div>
            <div className="text-xs text-[#112218]/60">
              {savedSips > 0 ? `Registrerat: ${savedSips} klunkar` : 'Inte registrerat än'}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setDraftSips((v) => Math.max(1, v - 1))}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6F4EE] text-[#112218] active:scale-95" aria-label="En klunk mindre">
            <Minus className="h-6 w-6" />
          </button>
          <div className="text-center">
            <div className="font-mono text-5xl font-black text-[#112218]">{draftSips}</div>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-[#166534]">
              <GolfScoreSymbol sips={draftSips} par={hole.par} size="sm" /> {evalDraft.svLabel}
              <span className="text-[#112218]/50">({evalDraft.diffFormatted})</span>
            </div>
          </div>
          <button type="button" onClick={() => setDraftSips((v) => Math.min(20, v + 1))}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6F4EE] text-[#112218] active:scale-95" aria-label="En klunk till">
            <Plus className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {savedSips > 0 && (
            <button type="button" onClick={() => onUpdateHoleSips(hole.holeNumber, 0)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[#112218]/15 px-4 text-xs font-semibold text-[#112218]/70" title="Nollställ hålet">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button type="button" disabled={!isDirty}
            onClick={() => {
              onUpdateHoleSips(hole.holeNumber, draftSips);
              // Första registreringen: hoppa vidare till nästa hål när firandet visats
              if (savedSips === 0 && hole.holeNumber < holes.length) {
                const next = hole.holeNumber + 1;
                setTimeout(() => onSelectHole(next), 2500);
              }
            }}
            className="flex-1 rounded-2xl bg-[#112218] py-3.5 text-sm font-bold text-[#F6F4EE] shadow disabled:opacity-40">
            {savedSips > 0 ? 'Uppdatera score' : 'Registrera score'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-[#112218]/10 rounded-2xl bg-[#F6F4EE] py-3 text-center">
          <div>
            <div className="font-mono text-xl font-black text-[#112218]">{summary.toParFormatted}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#112218]/50">Mot par</div>
          </div>
          <div>
            <div className="font-mono text-xl font-black text-[#112218]">{summary.totalSips}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#112218]/50">Klunkar</div>
          </div>
          <div>
            <div className="font-mono text-xl font-black text-[#112218]">{myRank?.positionLabel || '–'}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#112218]/50">Placering</div>
          </div>
        </div>
      </section>

      {/* Topp-listan + knappar */}
      <section className="rounded-3xl border border-[#112218]/10 bg-white p-4 shadow-xs">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">Leaderboard</h3>
          <span className="text-[11px] text-[#112218]/50">Thru = antal spelade hål</span>
        </div>
        <ol className="space-y-1">
          {board.slice(0, 5).map((e) => (
            <li key={e.player.uid}
              className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${e.player.uid === me.uid ? 'bg-[#D4AF37]/15' : ''}`}>
              <span className="w-7 text-center font-mono text-sm font-bold text-[#112218]/70">{e.positionLabel}</span>
              <GolferAvatar avatarSeed={e.player.avatarSeed} displayName={e.player.displayName} size="xs" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#112218]">{e.player.displayName}</span>
              <span className="text-xs text-[#112218]/50">Thru {e.summary.thruHoles}</span>
              <span className="w-10 text-right font-mono text-sm font-bold text-[#112218]">{e.summary.toParFormatted}</span>
            </li>
          ))}
        </ol>
        <div className={`mt-3 grid gap-2 ${isOwner ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button type="button" onClick={() => setSheet('leaderboard')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#112218] py-3 text-xs font-bold text-[#F6F4EE]">
            <Trophy className="h-4 w-4 text-[#D4AF37]" /> {course.gameMode === 'brutal' ? 'Tabell & lag' : 'Hela tabellen'}
          </button>
          <button type="button" onClick={() => setSheet('map')}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 py-3 text-xs font-bold text-[#112218]">
            <MapIcon className="h-4 w-4 text-[#166534]" /> Karta
          </button>
          {isOwner && (
            <button type="button" onClick={() => setSheet('edit')}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 py-3 text-xs font-bold text-[#112218]">
              <Pencil className="h-4 w-4 text-[#166534]" /> Redigera
            </button>
          )}
        </div>
      </section>

      <Sheet open={sheet === 'leaderboard'} title="Leaderboard" onClose={() => setSheet(null)}>
        <LeaderboardView
          course={course}
          holes={holes}
          players={players}
          activePlayerUid={me.uid}
          isCourseOwner={isOwner}
          onUpdateCourseGameMode={(mode: PubGolfGameMode) => onSaveCourseMeta({ ...course, gameMode: mode })}
          onAssignTeam={onAssignTeam}
          onInspectPlayerProfile={(uid) => {
            setSheet(null);
            onInspectPlayer(uid);
          }}
          onGoToScorecard={() => setSheet(null)}
        />
      </Sheet>

      <Sheet open={sheet === 'map'} title="Karta över hålen" onClose={() => setSheet(null)}>
        <PubRouteMap
          course={course}
          holes={holes}
          selectedHoleNum={hole.holeNumber}
          onSelectHole={onSelectHole}
          isCourseOwner={isOwner}
          compact
        />
      </Sheet>

      {isOwner && (
        <Sheet open={sheet === 'edit'} title="Redigera banan" onClose={() => setSheet(null)}>
          <CourseGuideView
            course={course}
            holes={holes}
            activePlayer={me}
            selectedHoleNum={hole.holeNumber}
            onSelectHole={onSelectHole}
            onSaveHoleConfig={onSaveHoleConfig}
            onSaveCourseMeta={onSaveCourseMeta}
            onGoToScorecardHole={(n) => {
              onSelectHole(n);
              setSheet(null);
            }}
          />
        </Sheet>
      )}
    </div>
  );
};
