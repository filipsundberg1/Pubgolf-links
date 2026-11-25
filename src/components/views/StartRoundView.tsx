import React, { useState } from 'react';
import { ArrowDownUp, ArrowLeft, Flag, Globe2, Loader2, Lock, Play } from 'lucide-react';
import {
  DRINK_CATALOG,
  GAME_MODE_LABELS,
  isPlaceholderText,
  type PubCourse,
  type PubGolfGameMode,
  type PubHole,
} from '../../utils/golfRules';

export interface StartRoundInput {
  eventDate: string;
  gameMode: PubGolfGameMode;
  /** Spela banan baklänges (sista hålet först). Gäller bara den här rundan. */
  reverse: boolean;
}

interface StartRoundViewProps {
  course: PubCourse;
  holes: PubHole[];
  isCourseOwner: boolean;
  onBack: () => void;
  onStart: (input: StartRoundInput) => Promise<void>;
}

const todayIso = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const inputClass =
  'w-full rounded-xl border border-[#112218]/15 bg-white px-3 py-2.5 text-sm text-[#112218] outline-none focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#112218]/70';

const looksUnset = isPlaceholderText;

/** Starta en runda på en bana: du blir ägare och får en privat kod att dela. */
export const StartRoundView: React.FC<StartRoundViewProps> = ({ course, holes, isCourseOwner, onBack, onStart }) => {
  const [eventDate, setEventDate] = useState(todayIso());
  const [gameMode, setGameMode] = useState<PubGolfGameMode>('single');
  const [reverse, setReverse] = useState(false);
  const shown = reverse ? [...holes].reverse() : holes;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalPar = holes.reduce((s, h) => s + h.par, 0);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await onStart({ eventDate, gameMode, reverse });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte starta rundan. Försök igen.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166534]">Starta runda</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#112218]">{course.title}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-[#112218]/65">
          {course.isPublic ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {course.city} · {holes.length} hål · par {totalPar} · {isCourseOwner ? 'din bana' : `bana av ${course.ownerName}`}
        </p>
      </div>

      <section className="rounded-3xl border border-[#112218]/10 bg-white p-4 shadow-xs">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">Banguide</h2>
          <button type="button" onClick={() => setReverse((v) => !v)} disabled={holes.length < 2}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${reverse ? 'bg-[#112218] text-[#D4AF37]' : 'border border-[#112218]/15 text-[#112218]'}`}>
            <ArrowDownUp className="h-3.5 w-3.5" /> {reverse ? 'Baklänges' : 'Kör baklänges'}
          </button>
        </div>
        {reverse && <p className="mb-1 text-xs text-[#112218]/60">Rundan börjar på sista hålet. Banan i sig ändras inte.</p>}
        <ol className="divide-y divide-[#112218]/5">
          {shown.map((h, idx) => (
            <li key={h.holeNumber} className="flex items-center gap-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#112218] font-mono text-xs font-bold text-[#D4AF37]">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#112218]">
                  {looksUnset(h.pubName) ? `Hål ${idx + 1}` : h.pubName}
                </div>
                <div className="truncate text-xs text-[#112218]/55">
                  {looksUnset(h.drinkName) ? DRINK_CATALOG[h.drinkType]?.label || h.drinkType : h.drinkName} · {h.volumeCl} cl
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-[#112218]/70">Par {h.par}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4 rounded-3xl border border-[#112218]/10 bg-white p-5 shadow-xs">
        <div>
          <label className={labelClass} htmlFor="start-date">Datum</label>
          <input id="start-date" type="date" className={inputClass} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <div>
          <span className={labelClass}>Spelform</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(GAME_MODE_LABELS) as PubGolfGameMode[]).map((mode) => {
              const active = gameMode === mode;
              return (
                <button key={mode} type="button" onClick={() => setGameMode(mode)}
                  className={`rounded-2xl border-2 p-3 text-left transition ${active ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#112218]/10 bg-white'}`}>
                  <div className="text-sm font-semibold text-[#112218]">{GAME_MODE_LABELS[mode].title}</div>
                  <div className="text-xs text-[#112218]/60">{GAME_MODE_LABELS[mode].description}</div>
                </button>
              );
            })}
          </div>
        </div>
        <p className="flex items-start gap-2 rounded-2xl bg-[#F6F4EE] px-3 py-2.5 text-xs text-[#112218]/70">
          <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#166534]" />
          Du blir ägare av rundan och får en privat kod. Skicka koden till de som ska vara med. Du kan också bjuda in spelare – de får en förfrågan och måste tacka ja – och låsa rundan när alla är inne.
        </p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">{error}</p>}
        <button type="button" onClick={start} disabled={busy || !eventDate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#112218] py-3.5 text-sm font-bold text-[#F6F4EE] shadow-lg disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-[#D4AF37]" />}
          {busy ? 'Startar…' : 'Starta rundan'}
        </button>
      </section>
    </div>
  );
};
