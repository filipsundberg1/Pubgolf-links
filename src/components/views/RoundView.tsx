import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  LogOut,
  Map as MapIcon,
  Minus,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  ShieldAlert,
  SlidersHorizontal,
  Trophy,
  Wine,
} from 'lucide-react';
import {
  DRINK_CATALOG,
  GAME_MODE_LABELS,
  PENALTY_ORDER,
  PENALTY_TYPES,
  isSwearHole,
  penaltyAppliesOn,
  isSplitTheGHole,
  type PenaltyType,
  type RoundMessage,
  buildLeaderboard,
  calculateRoundSummary,
  evaluateGolfHoleScore,
  formatEventDate,
  isPlaceholderText as isPlaceholder,
  type PlayerTourProfile,
  type PubCourse,
  type PubGolfGameMode,
  type PubHole,
  type RoundStatus,
} from '../../utils/golfRules';
import { GolfScoreSymbol } from '../GolfScoreSymbol';
import { GolferAvatar } from '../GolferAvatar';
import { Sheet } from '../shell/Sheet';
import { RulesList } from '../RulesList';
import { HoleListEditor, holeToDraft, type HoleDraft } from '../HoleListEditor';
import { ChatPanel } from '../lobby/ChatPanel';
import { Splat, TomatoIcon } from '../lobby/Tomato';
import { useTomatoHits } from '../lobby/useTomatoHits';

// Tunga delar laddas först när de öppnas
const LeaderboardView = lazy(() => import('../LeaderboardView').then((m) => ({ default: m.LeaderboardView })));
const PubRouteMap = lazy(() => import('../PubRouteMap').then((m) => ({ default: m.PubRouteMap })));

const SheetFallback = () => <p className="py-8 text-center text-sm text-[#112218]/60">Laddar…</p>;

interface RoundViewProps {
  /** Rundan i PubCourse-form (courseId = rundans kod). */
  course: PubCourse;
  /** Banan (mallen) som rundan spelas på. */
  courseDoc: PubCourse | null;
  holes: PubHole[];
  me: PlayerTourProfile;
  players: PlayerTourProfile[];
  /** Ägare av rundan (spelform, lag, lokala ändringar). */
  isOwner: boolean;
  status: RoundStatus;
  locked: boolean;
  /** Rundan har egna hål (ändrad ordning eller lokala ändringar). */
  hasCustomHoles: boolean;
  manageSheet: React.ReactNode;
  selectedHoleNum: number;
  onSelectHole: (n: number) => void;
  onMinimize: () => void;
  onUpdateHoleSips: (holeNumber: number, sips: number) => void;
  onAddPenalty: (holeNumber: number, type: PenaltyType) => void;
  onRemovePenalty: (holeNumber: number, type: PenaltyType) => void;
  onSaveCourseMeta: (course: PubCourse) => Promise<void>;
  /** Spara hålen bara för den här rundan. null = tillbaka till banans original. */
  onSaveRoundHoles: (holes: HoleDraft[] | null) => Promise<void>;
  onAssignTeam: (uids: string[], teamId: string, teamName: string) => Promise<void>;
  onInspectPlayer: (uid: string) => void;
  onFinish: () => Promise<void>;
  onReopen: () => Promise<void>;
  onLeave: () => Promise<void>;
  messages: RoundMessage[];
  nameFor: (uid: string) => string;
  avatarFor: (uid: string) => string;
  onSend: (text: string) => Promise<void>;
  onTomato: (targetUid: string) => Promise<void>;
}

export const RoundView: React.FC<RoundViewProps> = ({
  course,
  courseDoc,
  holes,
  me,
  players,
  isOwner,
  status,
  locked,
  hasCustomHoles,
  manageSheet,
  selectedHoleNum,
  onSelectHole,
  onMinimize,
  onUpdateHoleSips,
  onAddPenalty,
  onRemovePenalty,
  onSaveCourseMeta,
  onSaveRoundHoles,
  onAssignTeam,
  onInspectPlayer,
  onFinish,
  onReopen,
  onLeave,
  messages,
  nameFor,
  avatarFor,
  onSend,
  onTomato,
}) => {
  const [sheet, setSheet] = useState<'leaderboard' | 'map' | 'rules' | 'customize' | 'manage' | 'finish' | 'leave' | 'chat' | null>(null);
  const { hits, hitBy, tomatoCount } = useTomatoHits(messages, me.uid);
  const lastThrow = useRef(0);
  const throwAt = (uid: string) => {
    if (uid === me.uid || Date.now() - lastThrow.current < 1500) return;
    lastThrow.current = Date.now();
    void onTomato(uid).catch(() => undefined);
  };
  // Olästa meddelanden sedan snacket öppnades senast
  const [seenCount, setSeenCount] = useState(messages.length);
  const unread = sheet === 'chat' ? 0 : Math.max(0, messages.filter((m) => m.type === 'chat').length - seenCount);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<HoleDraft[]>([]);
  const [customizeError, setCustomizeError] = useState<string | null>(null);
  const readOnly = status === 'deleted';
  const finished = status === 'finished';

  const hole = holes.find((h) => h.holeNumber === selectedHoleNum) || holes[0];
  const savedSips = hole ? me.sips[hole.holeNumber - 1] || 0 : 0;
  const [draftSips, setDraftSips] = useState<number>(savedSips || hole?.par || 1);

  // När man byter hål: visa sparad score, annars par som startvärde
  useEffect(() => {
    setDraftSips(savedSips || hole?.par || 1);
  }, [hole?.holeNumber, savedSips, hole?.par]);

  const summary = useMemo(() => calculateRoundSummary(me.sips, holes, me.penalties), [me.sips, holes, me.penalties]);
  const board = useMemo(() => buildLeaderboard(players, holes), [players, holes]);
  const myRank = board.find((e) => e.player.uid === me.uid);
  const anyScores = players.some((p) => p.sips.some((s) => s > 0));

  // Dra ner handtaget för att fälla ihop rundan
  const dragStart = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const onTouchStart = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, Math.min(220, e.touches[0].clientY - dragStart.current)));
  };
  const onTouchEnd = () => {
    const pulled = dragY;
    dragStart.current = null;
    setDragY(0);
    if (pulled > 70) onMinimize();
  };

  if (!hole) {
    return <p className="text-sm text-[#112218]/60">Banan laddas…</p>;
  }

  const evalDraft = evaluateGolfHoleScore(draftSips, hole.par);
  const drinkLabel = DRINK_CATALOG[hole.drinkType]?.label || hole.drinkType;
  const hasRule = !isPlaceholder(hole.hazardTitle) || !isPlaceholder(hole.hazardRule);
  const isDirty = draftSips !== savedSips;
  const isLast = hole.holeNumber >= holes.length;
  const swearHole = isSwearHole(hole);
  const holePenalties = (me.penalties || []).filter((e) => e.hole === hole.holeNumber);
  const countOn = (type: PenaltyType) => holePenalties.filter((e) => e.type === type).length;
  // Bara de plikter som gäller på just det här hålet. Redan registrerade syns alltid (så de kan ångras).
  const penaltyOrder: PenaltyType[] = PENALTY_ORDER.filter(
    (t) => countOn(t) > 0 || penaltyAppliesOn(t, hole, hasRule, swearHole)
  ).sort((a, b) => (a === 'swear' && swearHole ? -1 : b === 'swear' && swearHole ? 1 : 0));
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const sipsToPar = summary.totalToPar - summary.penaltyStrokes + summary.bonusStrokes;

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

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      setSheet(null);
    } finally {
      setBusy(false);
    }
  };

  const openCustomize = () => {
    setDrafts(holes.map(holeToDraft));
    setCustomizeError(null);
    setSheet('customize');
  };

  return (
    <div className="space-y-4 pb-10 transition-transform" style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}>
      {hitBy && (
        <div key={hitBy.at} className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center">
          <Splat size={240} />
          <div className="pg-splat absolute mt-60 rounded-full bg-[#112218] px-4 py-2 text-sm font-bold text-[#F6F4EE] shadow-xl">
            {nameFor(hitBy.uid)} prickade dig!
          </div>
        </div>
      )}

      {/* Handtag: dra ner (eller tryck) för att fälla ihop rundan och använda resten av appen */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className="-mx-4 -mt-5 touch-none select-none px-4 pb-1 pt-2"
      >
        <button type="button" onClick={onMinimize} className="mx-auto flex flex-col items-center gap-1 px-6 py-1 text-[11px] font-semibold text-[#112218]/50">
          <span className="h-1.5 w-10 rounded-full bg-[#112218]/25" />
          <span className="inline-flex items-center gap-1"><ChevronDown className="h-3.5 w-3.5" /> Dra ner för att fälla ihop</span>
        </button>
      </div>

      {/* Rundhuvud */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold text-[#112218]">{course.title}</h1>
          <p className="text-xs text-[#112218]/60">
            {formatEventDate(course.eventDate)} · {course.city} · {GAME_MODE_LABELS[course.gameMode || 'single'].title} · {players.length} spelare
            {hasCustomHoles && ' · egen ordning'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {!finished && !readOnly && (
            <button type="button" onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#112218] px-3 py-1.5 text-xs font-semibold text-[#F6F4EE]">
              <Share2 className="h-3.5 w-3.5 text-[#D4AF37]" /> Bjud in
            </button>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#112218]/60">
            {locked ? 'Låst · ' : ''}Kod <span className="font-mono tracking-wider text-[#112218]">{course.inviteCode}</span>
          </span>
          {shareNote && <span className="text-[11px] font-semibold text-[#166534]">{shareNote}</span>}
        </div>
      </div>

      {readOnly && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Ägaren har raderat rundan. Du kan se resultatet men inte ändra det.
        </div>
      )}
      {finished && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#112218]">
          <span><Flag className="mr-1 inline h-4 w-4 text-[#166534]" /> Rundan är avslutad. Du kan fortfarande rätta din score.</span>
          {isOwner && (
            <button type="button" disabled={busy} onClick={() => void run(onReopen)}
              className="shrink-0 rounded-full bg-[#112218] px-3 py-1.5 text-xs font-semibold text-[#F6F4EE] disabled:opacity-60">
              Öppna igen
            </button>
          )}
        </div>
      )}

      {/* Hålväljare – tryck på ett spelat hål för att ändra scoren */}
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

          {/* Hålets regel – alltid synlig ihop med resten av hålet */}
          <div className={`mt-3 rounded-2xl border px-4 py-3 ${hasRule ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10' : 'border-white/10 bg-white/5'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#D4AF37]">
                <ShieldAlert className="h-4 w-4" />
                {hasRule ? (isPlaceholder(hole.hazardTitle) ? 'Regel på hålet' : hole.hazardTitle) : 'Ingen egen regel på hålet'}
              </div>
              <span className="shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F6F4EE]/80">
                {swearHole ? '+1 per svordom' : hasRule ? '+2 per brott' : 'Grundregler'}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#F6F4EE]/85">
              {hasRule
                ? isPlaceholder(hole.hazardRule)
                  ? 'Se rubriken.'
                  : hole.hazardRule
                : isSplitTheGHole(hole)
                  ? 'Grundreglerna gäller. Guinness-hål: split the G på första klunken = −2 på totalen.'
                  : 'Grundreglerna gäller: spya eller trilla = 2 slag plikt.'}
            </p>
          </div>

          {!isPlaceholder(hole.caddieTip) && (
            <p className="mt-3 text-xs italic text-[#F6F4EE]/55">Caddietips: {hole.caddieTip}</p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button type="button" disabled={hole.holeNumber <= 1} onClick={() => onSelectHole(hole.holeNumber - 1)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" /> Förra
            </button>
            <button type="button" onClick={() => setSheet('rules')}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" /> Alla regler
            </button>
            <button type="button" disabled={isLast} onClick={() => onSelectHole(hole.holeNumber + 1)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-30">
              Nästa <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Min score – går alltid att ändra i efterhand */}
      <section className={`rounded-3xl border border-[#112218]/10 bg-white p-5 shadow-xs ${readOnly ? 'pointer-events-none opacity-60' : ''}`}>
        <div className="flex items-center gap-3">
          <GolferAvatar avatarSeed={me.avatarSeed} wins={me.wins} displayName={me.displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[#112218]">Din score på hål {hole.holeNumber}</div>
            <div className="text-xs text-[#112218]/60">
              {savedSips > 0 ? `Registrerat: ${savedSips} klunkar – ändra med − / + och spara` : 'Inte registrerat än'}
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
          {isDirty || savedSips === 0 ? (
            <button type="button" onClick={() => onUpdateHoleSips(hole.holeNumber, draftSips)}
              className="flex-1 rounded-2xl bg-[#112218] py-3.5 text-sm font-bold text-[#F6F4EE] shadow">
              {savedSips > 0 ? 'Spara ändrad score' : 'Registrera score'}
            </button>
          ) : !isLast ? (
            <button type="button" onClick={() => onSelectHole(hole.holeNumber + 1)}
              className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-[#166534] py-3.5 text-sm font-bold text-white shadow">
              Nästa hål <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={() => setSheet('finish')} disabled={finished}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#166534] py-3.5 text-sm font-bold text-white shadow disabled:opacity-50">
              <Flag className="h-4 w-4" /> {finished ? 'Registrerat' : 'Sista hålet klart – avsluta'}
            </button>
          )}
        </div>

        {/* Plikt & bonus – läggs på totalen */}
        <div className="mt-5 border-t border-[#112218]/10 pt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">Plikt & bonus på hål {hole.holeNumber}</div>
            <button type="button" onClick={() => setSheet('rules')} className="text-[11px] font-semibold text-[#166534]">Regler</button>
          </div>
          <div className={`grid gap-1.5 ${penaltyOrder.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
            {penaltyOrder.map((type) => {
              const t = PENALTY_TYPES[type];
              const bonus = t.strokes < 0;
              const n = countOn(type);
              const disabled = type === 'splitg' && n > 0;
              return (
                <button key={type} type="button" disabled={disabled} title={t.hint}
                  onClick={() => onAddPenalty(hole.holeNumber, type)}
                  className={`relative flex flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition active:scale-95 disabled:opacity-40 ${
                    bonus ? 'border-[#166534]/40 bg-[#166534]/10 text-[#166534]' : 'border-red-200 bg-red-50/60 text-red-800'
                  }`}>
                  <span className="font-mono text-sm font-black">{signed(t.strokes)}</span>
                  <span className="text-[11px] font-semibold leading-tight">{t.label}</span>
                  {n > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#112218] px-1 text-[10px] font-bold text-[#F6F4EE]">{n}</span>
                  )}
                </button>
              );
            })}
          </div>
          {holePenalties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PENALTY_ORDER.filter((t) => countOn(t) > 0).map((type) => (
                <button key={type} type="button" onClick={() => onRemovePenalty(hole.holeNumber, type)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#112218]/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#112218]/75">
                  <RotateCcw className="h-3 w-3" /> Ångra {PENALTY_TYPES[type].label.toLowerCase()}
                </button>
              ))}
            </div>
          )}
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
        {(summary.penaltyStrokes > 0 || summary.bonusStrokes > 0) && (
          <p className="mt-2 text-center text-xs text-[#112218]/60">
            Klunkar {signed(sipsToPar) === '0' ? 'E' : signed(sipsToPar)}
            {summary.penaltyStrokes > 0 && <> · plikt <span className="font-semibold text-red-700">+{summary.penaltyStrokes}</span></>}
            {summary.bonusStrokes > 0 && <> · Split the G <span className="font-semibold text-[#166534]">−{summary.bonusStrokes}</span></>}
            {' '}= <span className="font-semibold text-[#112218]">{summary.toParFormatted}</span>
          </p>
        )}
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
              <GolferAvatar avatarSeed={e.player.avatarSeed} wins={e.player.wins} displayName={e.player.displayName} size="xs" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#112218]">{e.player.displayName}</span>
              {(e.summary.penaltyStrokes > 0 || e.summary.bonusStrokes > 0) && (
                <span className="text-[10px] font-semibold text-red-700/80" title="Plikt och bonus">
                  P{e.summary.penaltyStrokes === e.summary.bonusStrokes ? '±0' : signed(e.summary.penaltyStrokes - e.summary.bonusStrokes)}
                </span>
              )}
              <span className="text-xs text-[#112218]/50">Thru {e.summary.thruHoles}</span>
              <span className="w-10 text-right font-mono text-sm font-bold text-[#112218]">{e.summary.toParFormatted}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => setSheet('leaderboard')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#112218] py-3 text-xs font-bold text-[#F6F4EE]">
            <Trophy className="h-4 w-4 text-[#D4AF37]" /> {course.gameMode === 'brutal' ? 'Tabell & lag' : 'Hela tabellen'}
          </button>
          <button type="button" onClick={() => setSheet('map')}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 py-3 text-xs font-bold text-[#112218]">
            <MapIcon className="h-4 w-4 text-[#166534]" /> Karta
          </button>
          <button type="button" onClick={() => setSheet('rules')}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 py-3 text-xs font-bold text-[#112218]">
            <BookOpen className="h-4 w-4 text-[#166534]" /> Regler
          </button>
          <button type="button" onClick={() => setSheet('manage')}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 py-3 text-xs font-bold text-[#112218]">
            <Settings2 className="h-4 w-4 text-[#166534]" /> Spelare & inställningar
          </button>
          <button type="button" onClick={() => { setSeenCount(messages.filter((m) => m.type === 'chat').length); setSheet('chat'); }}
            className="relative col-span-2 flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 py-3 text-xs font-bold text-[#112218] sm:col-span-4">
            <MessageCircle className="h-4 w-4 text-[#166534]" /> Snacket & tomater
            {unread > 0 && (
              <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>
            )}
          </button>
          {isOwner && !readOnly && (
            <button type="button" onClick={openCustomize}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 py-3 text-xs font-bold text-[#112218] sm:col-span-4">
              <SlidersHorizontal className="h-4 w-4 text-[#166534]" /> Anpassa hålen för rundan
            </button>
          )}
        </div>
      </section>

      {/* Avsluta / lämna */}
      {!readOnly && (
        <div className="grid grid-cols-2 gap-2">
          {!finished && (
            <button type="button" onClick={() => setSheet('finish')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#166534] py-3.5 text-sm font-bold text-white shadow">
              <Flag className="h-4 w-4" /> {isOwner ? 'Avsluta rundan' : 'Jag är klar'}
            </button>
          )}
          <button type="button" onClick={() => setSheet('leave')}
            className={`flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-semibold text-red-700 ${finished ? 'col-span-2' : ''}`}>
            <LogOut className="h-4 w-4" /> Lämna rundan
          </button>
        </div>
      )}

      <Sheet open={sheet === 'finish'} title={isOwner ? 'Avsluta rundan' : 'Klar med rundan?'} onClose={() => setSheet(null)}>
        <div className="space-y-3">
          <div className="rounded-2xl bg-[#112218] p-4 text-[#F6F4EE]">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D4AF37]">Ditt resultat</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-mono text-4xl font-black">{summary.toParFormatted}</span>
              <span className="text-sm text-[#F6F4EE]/70">{summary.totalSips} klunkar · {summary.thruHoles}/{holes.length} hål · {myRank?.positionLabel || '–'}</span>
            </div>
            {(summary.penaltyStrokes > 0 || summary.bonusStrokes > 0) && (
              <div className="mt-2 grid grid-cols-3 gap-2 border-t border-white/10 pt-2 text-center text-xs">
                <div><div className="font-mono text-base font-black">{signed(sipsToPar) === '0' ? 'E' : signed(sipsToPar)}</div><div className="text-[#F6F4EE]/55">Klunkar</div></div>
                <div><div className="font-mono text-base font-black text-red-300">+{summary.penaltyStrokes}</div><div className="text-[#F6F4EE]/55">Plikt</div></div>
                <div><div className="font-mono text-base font-black text-[#D4AF37]">−{summary.bonusStrokes}</div><div className="text-[#F6F4EE]/55">Split the G</div></div>
              </div>
            )}
          </div>
          {summary.thruHoles < holes.length && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Du har {holes.length - summary.thruHoles} hål kvar. Bara hela rundor räknas till HCP och vinst.
            </p>
          )}
          <p className="text-sm text-[#112218]/70">
            {isOwner
              ? 'Rundan avslutas för alla och låses. Alla kan fortfarande rätta sin score i efterhand, och du kan öppna rundan igen.'
              : 'Rundan stängs för dig och ditt resultat sparas. De andra kan spela vidare.'}
          </p>
          <button type="button" disabled={busy} onClick={() => void run(onFinish)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#166534] py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
            {isOwner ? 'Avsluta för alla' : 'Ja, jag är klar'}
          </button>
          <button type="button" onClick={() => setSheet(null)} className="w-full rounded-2xl border border-[#112218]/15 py-3 text-sm font-semibold">
            Fortsätt spela
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'leave'} title="Lämna rundan?" onClose={() => setSheet(null)}>
        <div className="space-y-3">
          <p className="text-sm text-[#112218]/75">
            Du tas bort från rundan och <strong>ditt resultat raderas</strong>.
            {isOwner && players.length > 1 && ' De andra kan spela vidare utan dig. Vill du stoppa rundan för alla, använd "Radera för alla" under Spelare & inställningar.'}
          </p>
          <p className="text-xs text-[#112218]/55">Vill du bara tillbaka till resten av appen? Fäll ner rundan i stället – den ligger kvar längst ner.</p>
          <button type="button" disabled={busy} onClick={() => void run(onLeave)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-700 py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Lämna och radera mitt resultat
          </button>
          <button type="button" onClick={() => { setSheet(null); onMinimize(); }} className="w-full rounded-2xl border border-[#112218]/15 py-3 text-sm font-semibold">
            Fäll ner i stället
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'chat'} title="Snacket" onClose={() => { setSeenCount(messages.filter((m) => m.type === 'chat').length); setSheet(null); }}>
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#112218]/55">
              <TomatoIcon size={13} /> Kasta en tomat
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {players.filter((p) => p.uid !== me.uid).map((p) => (
                <button key={p.uid} type="button" onClick={() => throwAt(p.uid)} aria-label={`Kasta tomat på ${p.displayName}`}
                  className="pg-tomato-wobble relative flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl bg-[#F6F4EE] px-1 py-2">
                  <GolferAvatar avatarSeed={p.avatarSeed} displayName={p.displayName} size="sm" />
                  <span className="w-full truncate text-center text-[11px] font-semibold text-[#112218]">{p.displayName.split(' ')[0]}</span>
                  {tomatoCount(p.uid) > 0 && (
                    <span className="absolute right-0.5 top-0.5 rounded-full bg-white px-1 text-[9px] font-bold text-red-700 shadow-xs">{tomatoCount(p.uid)}</span>
                  )}
                  {hits[p.uid] && (
                    <span key={hits[p.uid]} className="absolute inset-0 flex items-center justify-center"><Splat size={60} /></span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {sheet === 'chat' && (
            <ChatPanel messages={messages} meUid={me.uid} nameFor={nameFor} avatarFor={avatarFor} onSend={onSend} maxHeightClass="max-h-[45vh]" />
          )}
        </div>
      </Sheet>

      <Sheet open={sheet === 'rules'} title="Regler" onClose={() => setSheet(null)}>
        <RulesList holes={holes} />
      </Sheet>

      <Sheet open={sheet === 'customize'} title="Anpassa hålen för rundan" onClose={() => setSheet(null)}>
        <div className="space-y-4">
          <p className="rounded-2xl bg-[#F6F4EE] px-3 py-2.5 text-xs text-[#112218]/70">
            Ändringarna gäller bara den här rundan. Banan {courseDoc ? `"${courseDoc.title}"` : ''} är oförändrad och nästa runda börjar från originalet.
          </p>
          {anyScores && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Någon har redan registrerat score. Score sitter på hålnumret, så byter ni plats på spelade hål följer scoren inte med.
            </p>
          )}
          {sheet === 'customize' && <HoleListEditor holes={drafts} onChange={setDrafts} city={course.city} initialOpen={-1} />}
          {customizeError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{customizeError}</p>}
          <div className="grid gap-2">
            <button type="button" disabled={busy}
              onClick={async () => {
                setCustomizeError(null);
                try {
                  await run(() => onSaveRoundHoles(drafts));
                } catch {
                  setCustomizeError('Kunde inte spara. Försök igen.');
                }
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#112218] py-3.5 text-sm font-bold text-[#F6F4EE] disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Spara för den här rundan
            </button>
            {hasCustomHoles && (
              <button type="button" disabled={busy}
                onClick={async () => {
                  try {
                    await run(() => onSaveRoundHoles(null));
                  } catch {
                    setCustomizeError('Kunde inte återställa. Försök igen.');
                  }
                }}
                className="rounded-2xl border border-[#112218]/15 py-3 text-sm font-semibold text-[#112218] disabled:opacity-60">
                Återställ till banans original
              </button>
            )}
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet === 'manage'} title="Spelare & inställningar" onClose={() => setSheet(null)}>
        {manageSheet}
      </Sheet>

      <Sheet open={sheet === 'leaderboard'} title="Leaderboard" onClose={() => setSheet(null)}>
        <Suspense fallback={<SheetFallback />}>
        {sheet === 'leaderboard' && <LeaderboardView
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
        />}
        </Suspense>
      </Sheet>

      <Sheet open={sheet === 'map'} title="Karta över hålen" onClose={() => setSheet(null)}>
        <Suspense fallback={<SheetFallback />}>
        {sheet === 'map' && <PubRouteMap
          course={courseDoc || course}
          holes={holes}
          selectedHoleNum={hole.holeNumber}
          onSelectHole={onSelectHole}
          compact
        />}
        </Suspense>
      </Sheet>
    </div>
  );
};
