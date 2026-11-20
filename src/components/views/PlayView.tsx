import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Globe2, KeyRound, Loader2, Lock, Users } from 'lucide-react';
import type { PubCourse } from '../../utils/golfRules';
import { GAME_MODE_LABELS, formatEventDate } from '../../utils/golfRules';

interface PlayViewProps {
  myRounds: PubCourse[];
  publicRounds: PubCourse[];
  playerCountByCourse: Record<string, number>;
  currentUid: string;
  initialCode?: string;
  onBack: () => void;
  onOpenRound: (courseId: string) => void;
  onJoin: (codeOrCourseId: string) => Promise<{ ok: boolean; message: string; courseId?: string }>;
}

const RoundRow: React.FC<{
  course: PubCourse;
  players: number;
  isOwner: boolean;
  action: React.ReactNode;
  onClick?: () => void;
}> = ({ course, players, isOwner, action, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-4 py-3 shadow-xs ${onClick ? 'cursor-pointer hover:bg-[#112218]/5' : ''}`}
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#112218] text-[#D4AF37]">
      {course.isPublic ? <Globe2 className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
    </div>
    <div className="min-w-0 flex-1">
      <div className="truncate font-semibold text-[#112218]">{course.title}</div>
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#112218]/60">
        <span>{formatEventDate(course.eventDate)}</span>
        <span>· {course.city}</span>
        <span>· {GAME_MODE_LABELS[course.gameMode || 'single'].title}</span>
        <span className="inline-flex items-center gap-0.5">· <Users className="h-3 w-3" /> {players}</span>
        {isOwner && <span className="font-semibold text-[#166534]">· Din runda</span>}
      </div>
    </div>
    {action}
  </div>
);

export const PlayView: React.FC<PlayViewProps> = ({
  myRounds,
  publicRounds,
  playerCountByCourse,
  currentUid,
  initialCode = '',
  onBack,
  onOpenRound,
  onJoin,
}) => {
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const join = async (value: string, key: string) => {
    if (!value.trim()) return;
    setBusy(key);
    setMessage(null);
    try {
      const res = await onJoin(value);
      if (res.ok && res.courseId) {
        onOpenRound(res.courseId);
        return;
      }
      setMessage({ ok: res.ok, text: res.message });
    } finally {
      setBusy(null);
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

      {/* Kod */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void join(code, 'code');
        }}
        className="rounded-3xl bg-[#112218] p-5 text-[#F6F4EE] shadow-lg"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-[#D4AF37]" /> Har du en kod till en privat runda?
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KOD"
            maxLength={16}
            className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 font-mono text-base tracking-[0.25em] text-white placeholder:text-white/40 outline-none focus:border-[#D4AF37]"
          />
          <button
            type="submit"
            disabled={!code.trim() || busy === 'code'}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 text-sm font-bold text-[#112218] disabled:opacity-50"
          >
            {busy === 'code' && <Loader2 className="h-4 w-4 animate-spin" />} Gå med
          </button>
        </div>
        {message && (
          <p className={`mt-2 text-xs ${message.ok ? 'text-[#D4AF37]' : 'text-red-300'}`}>{message.text}</p>
        )}
      </form>

      {/* Mina rundor */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">
          Mina rundor ({myRounds.length})
        </h2>
        {myRounds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-5 text-center text-sm text-[#112218]/55">
            Du är inte med i någon runda än.
          </p>
        ) : (
          <div className="space-y-2">
            {myRounds.map((c) => (
              <RoundRow
                key={c.courseId}
                course={c}
                players={playerCountByCourse[c.courseId] || 0}
                isOwner={c.ownerId === currentUid}
                onClick={() => onOpenRound(c.courseId)}
                action={<ChevronRight className="h-5 w-5 shrink-0 text-[#112218]/40" />}
              />
            ))}
          </div>
        )}
      </section>

      {/* Publika */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">
          Öppna rundor ({publicRounds.length})
        </h2>
        {publicRounds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-5 text-center text-sm text-[#112218]/55">
            Inga öppna rundor just nu. Skapa en egen!
          </p>
        ) : (
          <div className="space-y-2">
            {publicRounds.map((c) => (
              <RoundRow
                key={c.courseId}
                course={c}
                players={playerCountByCourse[c.courseId] || 0}
                isOwner={c.ownerId === currentUid}
                action={
                  <button
                    type="button"
                    onClick={() => void join(c.courseId, c.courseId)}
                    disabled={busy === c.courseId}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#166534] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {busy === c.courseId && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Gå med
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
