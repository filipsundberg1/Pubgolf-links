import React, { useRef } from 'react';
import { ChevronUp } from 'lucide-react';

interface MiniRoundBarProps {
  title: string;
  holeLabel: string;
  toPar: string;
  position: string;
  leaderLine: string;
  onOpen: () => void;
}

/** Nedfälld runda: en rad längst ner. Tryck eller dra upp för att öppna rundan igen. */
export const MiniRoundBar: React.FC<MiniRoundBarProps> = ({ title, holeLabel, toPar, position, leaderLine, onOpen }) => {
  const startY = useRef<number | null>(null);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <button
        type="button"
        onClick={onOpen}
        onTouchStart={(e) => {
          startY.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (startY.current !== null && startY.current - e.touches[0].clientY > 30) {
            startY.current = null;
            onOpen();
          }
        }}
        onTouchEnd={() => {
          startY.current = null;
        }}
        className="mx-auto flex w-full max-w-3xl touch-none items-center gap-3 rounded-2xl border border-[#D4AF37]/40 bg-[#112218] px-4 py-2.5 text-left text-[#F6F4EE] shadow-2xl"
        aria-label={`Öppna rundan ${title}`}
      >
        <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl border border-[#D4AF37]/60">
          <ChevronUp className="h-4 w-4 text-[#D4AF37]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="truncate text-[11px] text-[#F6F4EE]/60">{holeLabel} · {leaderLine}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-lg font-black leading-none">{toPar}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37]">{position}</div>
        </div>
      </button>
    </div>
  );
};

/** Höjden som fasta knapprader längst ner ska lämna åt raden. */
export const MINI_BAR_HEIGHT = 72;
