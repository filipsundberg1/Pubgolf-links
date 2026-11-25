import React, { Suspense, lazy, useState } from 'react';
import { ArrowLeft, Footprints, Globe2, Lock, Pencil, Play, Route, ShieldAlert, Wine } from 'lucide-react';
import {
  DRINK_CATALOG,
  formatRouteDistance,
  formatRouteDuration,
  isPlaceholderText,
  type PubCourse,
  type PubHole,
} from '../../utils/golfRules';
import { RulesList } from '../RulesList';

const PubRouteMap = lazy(() => import('../PubRouteMap').then((m) => ({ default: m.PubRouteMap })));

interface CoursePreviewViewProps {
  course: PubCourse;
  holes: PubHole[];
  isOwner: boolean;
  canStart: boolean;
  onBack: () => void;
  onStart: () => void;
  onEdit: () => void;
  onOpenOwner?: () => void;
}

type Tab = 'holes' | 'rules' | 'map';

/** Banguiden utan att starta: barer, dryck, par, regler, karta och total gångväg. */
export const CoursePreviewView: React.FC<CoursePreviewViewProps> = ({
  course,
  holes,
  isOwner,
  canStart,
  onBack,
  onStart,
  onEdit,
  onOpenOwner,
}) => {
  const [tab, setTab] = useState<Tab>('holes');
  const [selectedHole, setSelectedHole] = useState(1);
  const [totals, setTotals] = useState<{ dist: number; dur: number } | null>(null);
  const totalPar = holes.reduce((s, h) => s + h.par, 0);
  const totalCl = holes.reduce((s, h) => s + h.volumeCl, 0);

  return (
    <div className="space-y-5 pb-28">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166534]">Banguide</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#112218]">{course.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-[#112218]/65">
          {course.isPublic ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {course.city} ·{' '}
          {isOwner ? (
            'din bana'
          ) : onOpenOwner ? (
            <button type="button" onClick={onOpenOwner} className="font-semibold text-[#166534] underline">av {course.ownerName}</button>
          ) : (
            `av ${course.ownerName}`
          )}
        </p>
      </div>

      {/* Nyckeltal */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { icon: Route, label: 'Hål', value: String(holes.length) },
          { icon: ShieldAlert, label: 'Par', value: String(totalPar) },
          { icon: Footprints, label: 'Gångväg', value: totals ? formatRouteDistance(totals.dist) : '…' },
          { icon: Footprints, label: 'Gångtid', value: totals ? formatRouteDuration(totals.dur) : '…' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-[#112218] px-3 py-3 text-[#F6F4EE]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
              <k.icon className="h-3.5 w-3.5" /> {k.label}
            </div>
            <div className="mt-1 font-mono text-xl font-black">{k.value}</div>
          </div>
        ))}
      </section>
      <p className="-mt-3 text-xs text-[#112218]/55">
        {totalCl} cl totalt. Gångväg och tid räknas av Google Maps mellan barerna i ordning (promenad).
      </p>

      <div className="flex gap-1 rounded-2xl bg-[#112218]/5 p-1">
        {([
          ['holes', 'Hålen'],
          ['rules', 'Regler'],
          ['map', 'Karta'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab === id ? 'bg-white text-[#112218] shadow-xs' : 'text-[#112218]/60'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'holes' && (
        <ol className="space-y-2">
          {holes.map((h) => {
            const hasRule = !isPlaceholderText(h.hazardTitle) || !isPlaceholderText(h.hazardRule);
            return (
              <li key={h.holeNumber} className="rounded-2xl border border-[#112218]/10 bg-white px-4 py-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#112218] font-display text-sm font-bold text-[#D4AF37]">
                    {h.holeNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[#112218]">{isPlaceholderText(h.pubName) ? `Hål ${h.holeNumber}` : h.pubName}</div>
                    {!isPlaceholderText(h.pubAddress) && <div className="truncate text-xs text-[#112218]/55">{h.pubAddress}</div>}
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#112218]/70">
                      <Wine className="h-3.5 w-3.5 text-[#166534]" />
                      {isPlaceholderText(h.drinkName) ? DRINK_CATALOG[h.drinkType]?.label : h.drinkName} · {h.volumeCl} cl
                    </div>
                    {hasRule && (
                      <div className="mt-1.5 rounded-xl bg-[#D4AF37]/10 px-2.5 py-1.5 text-xs text-[#112218]">
                        <span className="font-semibold">{isPlaceholderText(h.hazardTitle) ? 'Regel' : h.hazardTitle}</span>
                        {!isPlaceholderText(h.hazardRule) && <> – {h.hazardRule}</>}
                      </div>
                    )}
                  </div>
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-[#D4AF37]">
                    <span className="text-[9px] font-bold uppercase text-[#856a32]">Par</span>
                    <span className="font-mono text-lg font-black leading-none text-[#112218]">{h.par}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {tab === 'rules' && <RulesList holes={holes} />}

      {/* Kartan laddas alltid (dold) så gångväg/tid räknas ut direkt */}
      <div className={tab === 'map' ? '' : 'hidden'}>
        <Suspense fallback={<p className="py-6 text-center text-sm text-[#112218]/60">Laddar karta…</p>}>
          <PubRouteMap
            course={course}
            holes={holes}
            selectedHoleNum={selectedHole}
            onSelectHole={setSelectedHole}
            compact
            onTotals={(dist, dur) => setTotals({ dist, dur })}
          />
        </Suspense>
      </div>

      <div style={{ bottom: 'var(--pg-mini-bar, 0px)' }} className="fixed inset-x-0 bottom-0 z-20 border-t border-[#112218]/10 bg-[#F6F4EE]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl gap-2">
          {isOwner && (
            <button type="button" onClick={onEdit}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#112218]/15 bg-white px-4 py-3.5 text-sm font-bold text-[#112218]">
              <Pencil className="h-4 w-4 text-[#166534]" /> Redigera
            </button>
          )}
          {canStart && (
            <button type="button" onClick={onStart}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#112218] py-3.5 text-sm font-bold text-[#F6F4EE] shadow-lg">
              <Play className="h-4 w-4 text-[#D4AF37]" /> Starta runda på banan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
