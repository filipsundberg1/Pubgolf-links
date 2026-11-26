import React, { useRef, useState } from 'react';
import { BookOpen, ChevronDown, Eye, Flag, Loader2, LogOut, Play, Settings2, Share2 } from 'lucide-react';
import {
  formatEventDate,
  type PlayerTourProfile,
  type PubCourse,
  type PubHole,
  type ReusablePlayerProfile,
  type RoundMessage,
} from '../../utils/golfRules';
import { GolferAvatar } from '../GolferAvatar';
import { Sheet } from '../shell/Sheet';
import { RulesList } from '../RulesList';
import { ChatPanel } from '../lobby/ChatPanel';
import { Splat, TomatoIcon } from '../lobby/Tomato';
import { useTomatoHits } from '../lobby/useTomatoHits';

interface LobbyViewProps {
  /** Rundan i PubCourse-form (courseId = rundans kod). */
  course: PubCourse;
  holes: PubHole[];
  players: PlayerTourProfile[];
  invited: ReusablePlayerProfile[];
  meUid: string;
  isOwner: boolean;
  ownerName: string;
  messages: RoundMessage[];
  nameFor: (uid: string) => string;
  avatarFor: (uid: string) => string;
  manageSheet: React.ReactNode;
  onSend: (text: string) => Promise<void>;
  onTomato: (targetUid: string) => Promise<void>;
  onStart: () => Promise<void>;
  onLeave: () => Promise<void>;
  onMinimize: () => void;
  onOpenGuide: () => void;
}

/** Lobbyn före start: alla samlas, snackar skit och kastar tomater. Ingen score förrän ägaren startar. */
export const LobbyView: React.FC<LobbyViewProps> = ({
  course,
  holes,
  players,
  invited,
  meUid,
  isOwner,
  ownerName,
  messages,
  nameFor,
  avatarFor,
  manageSheet,
  onSend,
  onTomato,
  onStart,
  onLeave,
  onMinimize,
  onOpenGuide,
}) => {
  const [sheet, setSheet] = useState<'rules' | 'manage' | 'leave' | 'start' | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const lastThrow = useRef(0);
  const { hits, hitBy, tomatoCount } = useTomatoHits(messages, meUid);
  const totalPar = holes.reduce((s, h) => s + h.par, 0);

  const throwAt = async (uid: string) => {
    if (uid === meUid) return;
    if (Date.now() - lastThrow.current < 1500) return;
    lastThrow.current = Date.now();
    try {
      await onTomato(uid);
    } catch {
      setNote('Tomaten missade (kunde inte skicka).');
      setTimeout(() => setNote(null), 2500);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/?join=${encodeURIComponent(course.inviteCode)}`;
    const text = `Häng med på pubgolf: ${course.title} (${formatEventDate(course.eventDate)}). Kod: ${course.inviteCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setNote('Inbjudan kopierad!');
    } catch {
      setNote(`Kod: ${course.inviteCode}`);
    }
    setTimeout(() => setNote(null), 2500);
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

  return (
    <div className="space-y-4 pb-10">
      {/* Träffad: kladd över hela skärmen */}
      {hitBy && (
        <div key={hitBy.at} className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center">
          <Splat size={260} />
          <div className="pg-splat absolute mt-64 rounded-full bg-[#112218] px-4 py-2 text-sm font-bold text-[#F6F4EE] shadow-xl">
            {nameFor(hitBy.uid)} prickade dig!
          </div>
        </div>
      )}

      <button type="button" onClick={onMinimize}
        className="mx-auto -mt-2 flex items-center gap-1 px-6 py-1 text-[11px] font-semibold text-[#112218]/50">
        <ChevronDown className="h-3.5 w-3.5" /> Fäll ner lobbyn
      </button>

      {/* Rubrik */}
      <section className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-[#112218] p-5 text-[#F6F4EE] shadow-xl">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Lobby</p>
            <h1 className="mt-1 truncate font-display text-2xl font-bold">{course.title}</h1>
            <p className="text-xs text-[#F6F4EE]/65">
              {formatEventDate(course.eventDate)} · {course.city} · {holes.length} hål · par {totalPar}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" onClick={() => void share()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF37] px-3 py-1.5 text-xs font-bold text-[#112218]">
              <Share2 className="h-3.5 w-3.5" /> Bjud in
            </button>
            <span className="text-[11px] text-[#F6F4EE]/60">
              Kod <span className="font-mono font-bold tracking-wider text-[#F6F4EE]">{course.inviteCode}</span>
            </span>
          </div>
        </div>
        <div className="mt-4">
          {isOwner ? (
            <button type="button" onClick={() => setSheet('start')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F6F4EE] py-3.5 text-sm font-black text-[#112218] shadow">
              <Play className="h-4 w-4 text-[#166534]" /> Starta rundan ({players.length} {players.length === 1 ? 'spelare' : 'spelare'})
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-[#F6F4EE]/80">
              <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" /> Väntar på att {ownerName.split(' ')[0]} startar rundan…
            </div>
          )}
        </div>
        {note && <p className="mt-2 text-xs font-semibold text-[#D4AF37]">{note}</p>}
      </section>

      {/* Spelarna – tryck för att kasta tomat */}
      <section className="rounded-3xl border border-[#112218]/10 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">I lobbyn ({players.length})</h2>
          <span className="inline-flex items-center gap-1 text-[11px] text-[#112218]/55">
            <TomatoIcon size={14} /> Tryck på någon för att kasta en tomat
          </span>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {players.map((p) => {
            const isMe = p.uid === meUid;
            const n = tomatoCount(p.uid);
            return (
              <li key={p.uid}>
                <button type="button" disabled={isMe} onClick={() => void throwAt(p.uid)}
                  aria-label={isMe ? `${p.displayName} (du)` : `Kasta tomat på ${p.displayName}`}
                  className="pg-tomato-wobble relative flex w-full flex-col items-center gap-1 rounded-2xl border border-[#112218]/10 bg-[#F6F4EE] px-1 pb-2 pt-3 disabled:cursor-default">
                  <GolferAvatar avatarSeed={p.avatarSeed} displayName={p.displayName} size="md" wins={p.wins} />
                  <span className="w-full truncate text-center text-xs font-semibold text-[#112218]">
                    {isMe ? 'Du' : p.displayName.split(' ')[0]}
                  </span>
                  {p.uid === course.ownerId && <span className="text-[10px] font-bold uppercase tracking-wider text-[#166534]">Ägare</span>}
                  {n > 0 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-red-700 shadow-xs">
                      <TomatoIcon size={11} /> {n}
                    </span>
                  )}
                  {hits[p.uid] && (
                    <span key={hits[p.uid]} className="absolute inset-0 flex items-center justify-center">
                      <Splat size={76} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {invited.map((p) => (
            <li key={p.uid}>
              <div className="flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed border-[#112218]/20 px-1 pb-2 pt-3 opacity-60">
                <GolferAvatar avatarSeed={p.avatarSeed} displayName={p.displayName} size="md" />
                <span className="w-full truncate text-center text-xs font-semibold text-[#112218]">{p.displayName.split(' ')[0]}</span>
                <span className="text-[10px] text-[#112218]/60">Inbjuden</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Snacket */}
      <section className="rounded-3xl border border-[#112218]/10 bg-white p-4 shadow-xs">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">Snacket</h2>
        <ChatPanel messages={messages} meUid={meUid} nameFor={nameFor} avatarFor={avatarFor} onSend={onSend} />
      </section>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onOpenGuide}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 bg-white py-3 text-xs font-bold text-[#112218]">
          <Eye className="h-4 w-4 text-[#166534]" /> Banguide
        </button>
        <button type="button" onClick={() => setSheet('rules')}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 bg-white py-3 text-xs font-bold text-[#112218]">
          <BookOpen className="h-4 w-4 text-[#166534]" /> Regler
        </button>
        <button type="button" onClick={() => setSheet('manage')}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#112218]/15 bg-white py-3 text-xs font-bold text-[#112218]">
          <Settings2 className="h-4 w-4 text-[#166534]" /> Spelare
        </button>
      </div>
      <button type="button" onClick={() => setSheet('leave')}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-700">
        <LogOut className="h-4 w-4" /> Lämna lobbyn
      </button>

      <Sheet open={sheet === 'start'} title="Starta rundan?" onClose={() => setSheet(null)}>
        <div className="space-y-3">
          <p className="text-sm text-[#112218]/75">
            {players.length} spelare är med.
            {invited.length > 0 && ` ${invited.length} inbjudna har inte svarat – de kan gå med efter start också.`}
            {' '}När rundan startar kan alla börja registrera score.
          </p>
          <button type="button" disabled={busy} onClick={() => void run(onStart)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#166534] py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />} Kör! Starta rundan
          </button>
          <button type="button" onClick={() => setSheet(null)} className="w-full rounded-2xl border border-[#112218]/15 py-3 text-sm font-semibold">
            Vänta lite till
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'leave'} title="Lämna lobbyn?" onClose={() => setSheet(null)}>
        <div className="space-y-3">
          <p className="text-sm text-[#112218]/75">Du tas bort från rundan. Du kan gå med igen med koden så länge den inte är låst.</p>
          <button type="button" disabled={busy} onClick={() => void run(onLeave)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-700 py-3.5 text-sm font-bold text-white disabled:opacity-60">
            <LogOut className="h-4 w-4" /> Lämna
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'rules'} title="Regler" onClose={() => setSheet(null)}>
        <RulesList holes={holes} />
      </Sheet>

      <Sheet open={sheet === 'manage'} title="Spelare & inställningar" onClose={() => setSheet(null)}>
        {manageSheet}
      </Sheet>
    </div>
  );
};
