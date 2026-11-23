import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Globe2, KeyRound, Loader2, Lock, Play, Users } from 'lucide-react';
import type { PubCourse, PubRound } from '../../utils/golfRules';
import { GAME_MODE_LABELS, formatEventDate } from '../../utils/golfRules';

interface PlayViewProps {
  myRounds: PubRound[];
  myCourses: PubCourse[];
  publicCourses: PubCourse[];
  currentUid: string;
  titleForRound: (round: PubRound) => string;
  initialCode?: string;
  onBack: () => void;
  onOpenRound: (roundId: string) => void;
  onStartCourse: (courseId: string) => void;
  onCreateCourse: () => void;
  onJoin: (code: string) => Promise<{ ok: boolean; message: string; roundId?: string }>;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">{children}</h2>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-5 text-center text-sm text-[#112218]/55">{children}</p>
);

const CourseRow: React.FC<{ course: PubCourse; mine: boolean; onStart: () => void }> = ({ course, mine, onStart }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-4 py-3 shadow-xs">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F6F4EE] text-[#166534]">
      {course.isPublic ? <Globe2 className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
    </div>
    <div className="min-w-0 flex-1">
      <div className="truncate font-semibold text-[#112218]">{course.title}</div>
      <div className="truncate text-xs text-[#112218]/60">
        {course.city} · {mine ? (course.isPublic ? 'Din bana · öppen' : 'Din bana · privat') : `av ${course.ownerName}`}
      </div>
    </div>
    <button type="button" onClick={onStart}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#166534] px-4 py-2 text-xs font-bold text-white">
      <Play className="h-3.5 w-3.5" /> Spela
    </button>
  </div>
);

export const PlayView: React.FC<PlayViewProps> = ({
  myRounds,
  myCourses,
  publicCourses,
  currentUid,
  titleForRound,
  initialCode = '',
  onBack,
  onOpenRound,
  onStartCourse,
  onCreateCourse,
  onJoin,
}) => {
  const [code, setCode] = useState(initialCode);
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

      {/* Starta ny runda på en bana */}
      <section>
        <SectionTitle>Starta runda på mina banor ({myCourses.length})</SectionTitle>
        {myCourses.length === 0 ? (
          <Empty>
            Du har inga egna banor än.{' '}
            <button type="button" onClick={onCreateCourse} className="font-semibold text-[#166534] underline">Skapa en bana</button>
          </Empty>
        ) : (
          <div className="space-y-2">
            {myCourses.map((c) => (
              <CourseRow key={c.courseId} course={c} mine onStart={() => onStartCourse(c.courseId)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Öppna banor ({publicCourses.length})</SectionTitle>
        {publicCourses.length === 0 ? (
          <Empty>Inga öppna banor från andra just nu.</Empty>
        ) : (
          <div className="space-y-2">
            {publicCourses.map((c) => (
              <CourseRow key={c.courseId} course={c} mine={false} onStart={() => onStartCourse(c.courseId)} />
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-[#112218]/55">
          En öppen bana är en mall. Du spelar den i en egen runda med ditt eget gäng, inte i någon annans.
        </p>
      </section>
    </div>
  );
};
