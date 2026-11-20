import React from 'react';
import { evaluateGolfHoleScore } from '../utils/golfRules';

interface GolfScoreSymbolProps {
  sips: number;
  par: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * Renders traditional golf scorecard geometric notation around a stroke count:
 * - Double gold circle: Hole-in-One / Albatross
 * - Double circle: Eagle (-2)
 * - Single circle: Birdie (-1)
 * - Plain number: Par (E)
 * - Single square: Bogey (+1)
 * - Double square: Dubbelbogey+ (>= +2)
 */
export const GolfScoreSymbol: React.FC<GolfScoreSymbolProps> = ({
  sips,
  par,
  size = 'md',
}) => {
  const evaluation = evaluateGolfHoleScore(sips, par);

  const dims =
    size === 'xs'
      ? 'w-6 h-6 text-[11px]'
      : size === 'sm'
        ? 'w-7 h-7 text-xs'
        : size === 'lg'
          ? 'w-11 h-11 text-base'
          : 'w-9 h-9 text-sm';

  if (evaluation.key === 'unplayed') {
    return (
      <span
        className={`inline-flex items-center justify-center font-mono-tabular text-[#112218]/35 ${dims}`}
      >
        —
      </span>
    );
  }

  if (evaluation.shapeStyle === 'double-circle-gold') {
    return (
      <span
        title={evaluation.svLabel}
        className={`relative inline-flex items-center justify-center rounded-full border-2 border-[#B8860B] bg-[#B8860B]/15 font-mono-tabular font-bold text-[#7A5600] ${dims}`}
      >
        <span className="pointer-events-none absolute inset-[2px] rounded-full border border-[#B8860B]" />
        {sips}
      </span>
    );
  }

  if (evaluation.shapeStyle === 'double-circle') {
    return (
      <span
        title={evaluation.svLabel}
        className={`relative inline-flex items-center justify-center rounded-full border-2 border-[#166534] bg-[#166534]/10 font-mono-tabular font-bold text-[#14532D] ${dims}`}
      >
        <span className="pointer-events-none absolute inset-[2px] rounded-full border border-[#166534]" />
        {sips}
      </span>
    );
  }

  if (evaluation.shapeStyle === 'single-circle') {
    return (
      <span
        title={evaluation.svLabel}
        className={`inline-flex items-center justify-center rounded-full border-2 border-[#166534] bg-[#166534]/5 font-mono-tabular font-semibold text-[#166534] ${dims}`}
      >
        {sips}
      </span>
    );
  }

  if (evaluation.shapeStyle === 'single-square') {
    return (
      <span
        title={evaluation.svLabel}
        className={`inline-flex items-center justify-center border-2 border-[#9A3412] bg-[#9A3412]/5 font-mono-tabular font-semibold text-[#9A3412] ${dims}`}
      >
        {sips}
      </span>
    );
  }

  if (evaluation.shapeStyle === 'double-square') {
    return (
      <span
        title={evaluation.svLabel}
        className={`relative inline-flex items-center justify-center border-2 border-[#991B1B] bg-[#991B1B]/10 font-mono-tabular font-bold text-[#991B1B] ${dims}`}
      >
        <span className="pointer-events-none absolute inset-[2px] border border-[#991B1B]" />
        {sips}
      </span>
    );
  }

  // Par (clean unboxed number)
  return (
    <span
      title={evaluation.svLabel}
      className={`inline-flex items-center justify-center font-mono-tabular font-semibold text-[#112218] ${dims}`}
    >
      {sips}
    </span>
  );
};
