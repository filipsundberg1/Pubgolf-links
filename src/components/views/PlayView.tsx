import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Eye, Flag, Globe2, KeyRound, Loader2, Lock, Play, Search, Users } from 'lucide-react';
import type { PubCourse, PubRound } from '../../utils/golfRules';
import { GAME_MODE_LABELS, formatEventDate } from '../../utils/golfRules';

interface PlayViewProps {
  myRounds: PubRound[];
  finishedRounds: PubRound[];
  /** Alla banor man kan spela: öppna banor (allas) + mina privata. */
  courses: PubCourse[];
  currentUid: string;
  titleForRound: (round: PubRound) => string;
  holeCountFor: (course: PubCourse) => number;
  initialCode?: string;
  onBack: () => void;
  onOpenRound: (roundId: string) => void;
  onStartCourse: (courseId: string) => void;
  onPreviewCourse: (courseId: string) => void;
  onCreateCourse: () => void;
  onJoin: (code: string) => Promise<{ ok: boolean; message: string; roundId?: string }>;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">{children}</h2>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-5 text-center text-sm text-[#112218]/55">{children}</p>
);

const CourseRow: React.FC<{ course: PubCourse; mine: boolean; holes: number; onPreview: () => void; onStart: () => void }> = ({
  course,
  mine,
  holes,
  onPreview,
  onStart,
}) => (
  <div className="flex items-center gap-2 rounded-2xl border border-[#112218]/10 bg-white py-3 pl-3 pr-3 shadow-xs">
    <button type="button" onClick={onPreview} className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F6F4EE] text-[#166534]">
        {course.isPublic ? <Globe2 className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold leading-snug text-[#112218]">{course.title}</div>
        <div className="truncate text-xs text-[#112218]/60">
          {course.city} · {holes} hål · {mine ? (course.isPublic ? 'din bana · öppen' : 'din bana · privat') : `av ${course.ownerName}`}
        </div>
      </div>
    </button>
    <button type="button" onClick={onPreview} aria-label={`Banguide för ${course.title}`}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#112218]/15 px-2.5 py-2 text-xs font-semibold text-[#112218]">
      <Eye className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
    </button>
    <button type="button" onClick={onStart}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#166534] px-3.5 py-2 text-xs font-bold text-white">
      <Play className="h-3.5 w-3.5" /> Spela
    </button>
  </div>
);

export const PlayView: React.FC<PlayViewProps> = ({
  myRounds,
  finishedRounds,
  courses,
  currentUid,
  titleForRound,
  holeCountFor,
  initialCode = '',
  onBack,
  onOpenRound,
  onStartCourse,
  onPreviewCourse,
  onCreateCourse,
  onJoin,
}) => {
  const [code, setCode] = useState(initialCode);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shownCourses = courses.filter(
    (c) => !needle || c.title.toLowerCase().includes(needle) || c.city.toLowerCase().includes(needle) || c.ownerName.toLowerCase().includes(needle)
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const join = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await onJoin(code);
      if (res.ok && res.roundId) {
        onOpenRound(res.roundId);
        return;
      }
      setMessage({ ok: res.ok, text: res.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>
        <h1 className="font-display text-3xl font-bold text-[#112218]">Spela</h1>
      </div>

      {/* Gå med via kod */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void join();
        }}
        className="rounded-3xl bg-[#112218] p-5 text-[#F6F4EE] shadow-lg"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-[#D4AF37]" /> Fått en kod? Gå med i rundan
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="PG-XXXXXX"
            maxLength={16}
            className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 font-mono text-base tracking-[0.2em] text-white placeholder:text-white/40 outline-none focus:border-[#D4AF37]"
          />
          <button type="submit" disabled={!code.trim() || busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 text-sm font-bold text-[#112218] disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Gå med
          </button>
        </div>
        {message && <p className={`mt-2 text-xs ${message.ok ? 'text-[#D4AF37]' : 'text-red-300'}`}>{message.text}</p>}
      </form>

      {/* Pågående rundor */}
      <section>
        <SectionTitle>Mina rundor ({myRounds.length})</SectionTitle>
        {myRounds.length === 0 ? (
          <Empty>Du är inte med i någon runda just nu.</Empty>
        ) : (
          <div className="space-y-2">
            {myRounds.map((r) => (
              <button key={r.roundId} type="button" onClick={() => onOpenRound(r.roundId)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-4 py-3 text-left shadow-xs hover:bg-[#112218]/5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#112218] text-[#D4AF37]">
                  {r.locked ? <Lock className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-[#112218]">{titleForRound(r)}</div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#112218]/60">
                    {r.status === 'lobby' && <span className="rounded-full bg-[#D4AF37]/20 px-1.5 font-bold text-[#856a32]">Lobby</span>}
                    <span>{formatEventDate(r.eventDate)}</span>
                    <span>· {GAME_MODE_LABELS[r.gameMode].title}</span>
                    <span>· {r.memberIds.length} spelare</span>
                    {r.locked && <span>· låst</span>}
                    {r.ownerId === currentUid && <span className="font-semibold text-[#166534]">· Du är ägare</span>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#112218]/40" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Banor att spela */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionTitle>Banor ({courses.length})</SectionTitle>
          <button type="button" onClick={onCreateCourse} className="mb-2 text-xs font-semibold text-[#166534]">+ Skapa bana</button>
        </div>
        {courses.length > 4 && (
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#112218]/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök bana, stad eller skapare"
              className="w-full rounded-xl border border-[#112218]/15 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#166534]" />
          </div>
        )}
        {shownCourses.length === 0 ? (
          <Empty>
            {courses.length === 0 ? 'Inga banor än. ' : 'Ingen bana matchar. '}
            <button type="button" onClick={onCreateCourse} className="font-semibold text-[#166534] underline">Skapa en bana</button>
          </Empty>
        ) : (
          <div className="space-y-2">
            {shownCourses.map((c) => (
              <CourseRow key={c.courseId} course={c} mine={c.ownerId === currentUid} holes={holeCountFor(c)}
                onPreview={() => onPreviewCourse(c.courseId)} onStart={() => onStartCourse(c.courseId)} />
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-[#112218]/55">
          Tryck på en bana för att se banguiden – barer, regler och gångväg – innan ni bestämmer er.
        </p>
      </section>

      {finishedRounds.length > 0 && (
        <section>
          <SectionTitle>Avslutade rundor</SectionTitle>
          <div className="space-y-2">
            {finishedRounds.slice(0, 5).map((r) => (
              <button key={r.roundId} type="button" onClick={() => onOpenRound(r.roundId)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-4 py-3 text-left shadow-xs hover:bg-[#112218]/5">
                <Flag className="h-4 w-4 shrink-0 text-[#166534]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#112218]">{titleForRound(r)}</div>
                  <div className="text-xs text-[#112218]/60">{formatEventDate(r.eventDate)} · {r.memberIds.length} spelare</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#112218]/40" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
