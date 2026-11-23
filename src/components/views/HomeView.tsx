import React from 'react';
import { ChevronRight, Flag, PlusCircle } from 'lucide-react';
import type { PubRound } from '../../utils/golfRules';
import { formatEventDate } from '../../utils/golfRules';

interface HomeViewProps {
  firstName: string;
  myOpenRounds: PubRound[];
  titleForRound: (round: PubRound) => string;
  onCreate: () => void;
  onPlay: () => void;
  onOpenRound: (roundId: string) => void;
}

/** Startsida efter inloggning: två stora val + snabbväg till pågående rundor. */
export const HomeView: React.FC<HomeViewProps> = ({ firstName, myOpenRounds, titleForRound, onCreate, onPlay, onOpenRound }) => (
  <div className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166534]">Klubbhuset</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-[#112218]">Välkommen, {firstName}!</h1>
      <p className="mt-1 text-sm text-[#112218]/65">Vad blir det idag?</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={onCreate}
        className="group relative overflow-hidden rounded-3xl bg-[#112218] p-6 text-left text-[#F6F4EE] shadow-lg transition hover:-translate-y-0.5"
      >
        <PlusCircle className="h-9 w-9 text-[#D4AF37]" />
        <h2 className="mt-6 font-display text-2xl font-bold">Skapa bana</h2>
        <p className="mt-1 text-sm text-[#F6F4EE]/70">Bygg banguiden: pubar, par, drycker och regler. Öppen för alla eller bara din.</p>
        <ChevronRight className="absolute right-5 top-6 h-6 w-6 text-[#D4AF37] transition group-hover:translate-x-1" />
      </button>

      <button
        type="button"
        onClick={onPlay}
        className="group relative overflow-hidden rounded-3xl border-2 border-[#D4AF37] bg-white p-6 text-left text-[#112218] shadow-lg transition hover:-translate-y-0.5"
      >
        <Flag className="h-9 w-9 text-[#166534]" />
        <h2 className="mt-6 font-display text-2xl font-bold">Spela</h2>
        <p className="mt-1 text-sm text-[#112218]/65">Starta en runda på en bana, gå med via kod eller fortsätt där du var.</p>
        <ChevronRight className="absolute right-5 top-6 h-6 w-6 text-[#166534] transition group-hover:translate-x-1" />
      </button>
    </div>

    {myOpenRounds.length > 0 && (
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">Mina rundor</h3>
        <div className="space-y-2">
          {myOpenRounds.slice(0, 3).map((c) => (
            <button
              key={c.roundId}
              type="button"
              onClick={() => onOpenRound(c.roundId)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#112218]/10 bg-white px-4 py-3 text-left shadow-xs hover:bg-[#112218]/5"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-[#112218]">{titleForRound(c)}</div>
                <div className="text-xs text-[#112218]/60">
                  {formatEventDate(c.eventDate)} · {c.city} · {c.memberIds.length} spelare
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#112218]/40" />
            </button>
          ))}
        </div>
      </section>
    )}
  </div>
);
