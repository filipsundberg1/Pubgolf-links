import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { GENERAL_RULES, isPlaceholderText, type PubHole } from '../utils/golfRules';

/** Alla regler för banan: hålens egna regler + grundreglerna. */
export const RulesList: React.FC<{ holes: PubHole[]; dark?: boolean }> = ({ holes, dark = false }) => {
  const holeRules = holes.filter((h) => !isPlaceholderText(h.hazardTitle) || !isPlaceholderText(h.hazardRule));
  const muted = dark ? 'text-[#F6F4EE]/65' : 'text-[#112218]/65';
  const strong = dark ? 'text-[#F6F4EE]' : 'text-[#112218]';
  const card = dark ? 'bg-white/5' : 'bg-white border border-[#112218]/10 shadow-xs';
  return (
    <div className="space-y-4">
      <div>
        <h3 className={`mb-2 text-xs font-semibold uppercase tracking-[0.15em] ${muted}`}>Hålens regler</h3>
        {holeRules.length === 0 ? (
          <p className={`text-sm ${muted}`}>Banan har inga egna regler på hålen.</p>
        ) : (
          <ul className="space-y-2">
            {holeRules.map((h) => (
              <li key={h.holeNumber} className={`flex gap-3 rounded-2xl px-3 py-2.5 ${card}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#112218] font-mono text-xs font-bold text-[#D4AF37]">
                  {h.holeNumber}
                </span>
                <div className="min-w-0">
                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${strong}`}>
                    <ShieldAlert className="h-3.5 w-3.5 text-[#D4AF37]" />
                    {isPlaceholderText(h.hazardTitle) ? 'Regel' : h.hazardTitle}
                    <span className={`font-normal ${muted}`}>· {isPlaceholderText(h.pubName) ? `Hål ${h.holeNumber}` : h.pubName}</span>
                  </div>
                  {!isPlaceholderText(h.hazardRule) && <p className={`mt-0.5 text-sm ${muted}`}>{h.hazardRule}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className={`mb-2 text-xs font-semibold uppercase tracking-[0.15em] ${muted}`}>Grundregler</h3>
        <ul className="space-y-2">
          {GENERAL_RULES.map((r) => (
            <li key={r.title} className={`rounded-2xl px-3 py-2.5 ${card}`}>
              <div className={`text-sm font-semibold ${strong}`}>{r.title}</div>
              <p className={`mt-0.5 text-sm ${muted}`}>{r.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
