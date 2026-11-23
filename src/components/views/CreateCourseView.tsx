import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Copy, Globe2, Lock, Loader2 } from 'lucide-react';
import {
  DRINK_CATALOG,
  VALID_DRINK_TYPES,
  type DrinkCategory,
} from '../../utils/golfRules';

export interface HoleDraft {
  holeNumber: number;
  pubName: string;
  pubAddress: string;
  drinkType: DrinkCategory;
  drinkName: string;
  volumeCl: number;
  par: number;
  hazardTitle: string;
  hazardRule: string;
}

/** En bana = mallen (banguiden): pubar, dryck, par och regler. Rundor startas på banan. */
export interface CreateCourseInput {
  title: string;
  subtitle: string;
  city: string;
  isPublic: boolean;
  holes: HoleDraft[];
}

interface CreateCourseViewProps {
  defaultCity: string;
  onBack: () => void;
  onCreate: (input: CreateCourseInput) => Promise<void>;
}

const OTHER = '__other__';
const HOLE_COUNT = 9;

const blankHole = (holeNumber: number): HoleDraft => ({
  holeNumber,
  pubName: '',
  pubAddress: '',
  drinkType: 'lager',
  drinkName: DRINK_CATALOG.lager.brands[0],
  volumeCl: DRINK_CATALOG.lager.defaultCl,
  par: 3,
  hazardTitle: '',
  hazardRule: '',
});

const inputClass =
  'w-full rounded-xl border border-[#112218]/15 bg-white px-3 py-2.5 text-sm text-[#112218] outline-none focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#112218]/70';

export const CreateCourseView: React.FC<CreateCourseViewProps> = ({ defaultCity, onBack, onCreate }) => {
  const [title, setTitle] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [isPublic, setIsPublic] = useState(false);
  const [holes, setHoles] = useState<HoleDraft[]>(() =>
    Array.from({ length: HOLE_COUNT }, (_, i) => blankHole(i + 1))
  );
  const [customBrand, setCustomBrand] = useState<Record<number, boolean>>({});
  const [openHole, setOpenHole] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPar = useMemo(() => holes.reduce((s, h) => s + h.par, 0), [holes]);

  const updateHole = (holeNumber: number, patch: Partial<HoleDraft>) =>
    setHoles((prev) => prev.map((h) => (h.holeNumber === holeNumber ? { ...h, ...patch } : h)));

  const changeDrinkType = (holeNumber: number, type: DrinkCategory) => {
    setCustomBrand((p) => ({ ...p, [holeNumber]: false }));
    updateHole(holeNumber, {
      drinkType: type,
      drinkName: DRINK_CATALOG[type].brands[0],
      volumeCl: DRINK_CATALOG[type].defaultCl,
    });
  };

  const copyDrinkToAll = (src: HoleDraft) => {
    setCustomBrand((p) => {
      const next = { ...p };
      for (let n = 1; n <= HOLE_COUNT; n++) next[n] = !!p[src.holeNumber];
      return next;
    });
    setHoles((prev) =>
      prev.map((h) => ({ ...h, drinkType: src.drinkType, drinkName: src.drinkName, volumeCl: src.volumeCl }))
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 2) return setError('Ge banan ett namn (minst 2 tecken).');
    if (city.trim().length < 2) return setError('Ange stad eller område.');
    const badDrink = holes.find((h) => h.drinkName.trim().length < 2);
    if (badDrink) {
      setOpenHole(badDrink.holeNumber);
      return setError(`Hål ${badDrink.holeNumber}: ange vilken dryck som gäller.`);
    }
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        subtitle: `Pubgolf i ${city.trim()}`,
        city: city.trim(),
        isPublic,
        holes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skapa banan. Försök igen.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 pb-28">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>
        <h1 className="font-display text-3xl font-bold text-[#112218]">Skapa bana</h1>
        <p className="mt-1 text-sm text-[#112218]/65">
          Banan är din banguide: pubar, dryck, par och regler. Rundor startar du sen på banan. 9 hål · totalt par {totalPar}
        </p>
      </div>

      {/* Grundinfo */}
      <section className="space-y-4 rounded-3xl border border-[#112218]/10 bg-white p-5 shadow-xs">
        <div>
          <label className={labelClass} htmlFor="round-title">Banans namn</label>
          <input id="round-title" className={inputClass} value={title} maxLength={80}
            placeholder="t.ex. December Links – Söder" onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="round-city">Stad / område</label>
          <input id="round-city" className={inputClass} value={city} maxLength={60}
            placeholder="Södermalm, Stockholm" onChange={(e) => setCity(e.target.value)} />
        </div>

        <div>
          <span className={labelClass}>Vem får spela banan?</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: true, icon: Globe2, title: 'Öppen bana', text: 'Alla kan starta en egen runda på den.' },
              { value: false, icon: Lock, title: 'Privat bana', text: 'Bara du kan starta rundor på den.' },
            ].map((opt) => {
              const active = isPublic === opt.value;
              const Icon = opt.icon;
              return (
                <button key={opt.title} type="button" onClick={() => setIsPublic(opt.value)}
                  className={`rounded-2xl border-2 p-3 text-left transition ${active ? 'border-[#166534] bg-[#166534]/5' : 'border-[#112218]/10 bg-white'}`}>
                  <Icon className={`h-5 w-5 ${active ? 'text-[#166534]' : 'text-[#112218]/50'}`} />
                  <div className="mt-1 text-sm font-semibold text-[#112218]">{opt.title}</div>
                  <div className="text-xs text-[#112218]/60">{opt.text}</div>
                </button>
              );
            })}
          </div>
        </div>

      </section>

      {/* Hål */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">Banan</h2>
        {holes.map((h) => {
          const expanded = openHole === h.holeNumber;
          const catalog = DRINK_CATALOG[h.drinkType];
          const isCustom = customBrand[h.holeNumber] || !catalog.brands.includes(h.drinkName);
          return (
            <div key={h.holeNumber} className="overflow-hidden rounded-2xl border border-[#112218]/10 bg-white shadow-xs">
              <button type="button" onClick={() => setOpenHole(expanded ? 0 : h.holeNumber)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#112218] font-display text-sm font-bold text-[#D4AF37]">
                  {h.holeNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#112218]">
                    {h.pubName.trim() || `Hål ${h.holeNumber} – välj pub`}
                  </span>
                  <span className="block truncate text-xs text-[#112218]/60">
                    Par {h.par} · {h.drinkName} {h.volumeCl} cl{h.hazardTitle.trim() ? ` · ${h.hazardTitle}` : ''}
                  </span>
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-[#112218]/40 transition ${expanded ? 'rotate-180' : ''}`} />
              </button>

              {expanded && (
                <div className="space-y-4 border-t border-[#112218]/10 px-4 pb-4 pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Pub</label>
                      <input className={inputClass} value={h.pubName} maxLength={80} placeholder="Pubens namn"
                        onChange={(e) => updateHole(h.holeNumber, { pubName: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>Adress (för kartan)</label>
                      <input className={inputClass} value={h.pubAddress} maxLength={120} placeholder="Gatuadress"
                        onChange={(e) => updateHole(h.holeNumber, { pubAddress: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <span className={labelClass}>Par</span>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((p) => (
                        <button key={p} type="button" onClick={() => updateHole(h.holeNumber, { par: p })}
                          className={`rounded-xl py-2.5 font-display text-lg font-bold transition ${h.par === p ? 'bg-[#112218] text-[#D4AF37]' : 'bg-[#F6F4EE] text-[#112218] hover:bg-[#112218]/10'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_90px]">
                    <div>
                      <label className={labelClass}>Typ av dryck</label>
                      <select className={inputClass} value={h.drinkType}
                        onChange={(e) => changeDrinkType(h.holeNumber, e.target.value as DrinkCategory)}>
                        {VALID_DRINK_TYPES.map((t) => (
                          <option key={t} value={t}>{DRINK_CATALOG[t].label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Märke</label>
                      <select className={inputClass} value={isCustom ? OTHER : h.drinkName}
                        onChange={(e) => {
                          if (e.target.value === OTHER) {
                            setCustomBrand((p) => ({ ...p, [h.holeNumber]: true }));
                            updateHole(h.holeNumber, { drinkName: '' });
                          } else {
                            setCustomBrand((p) => ({ ...p, [h.holeNumber]: false }));
                            updateHole(h.holeNumber, { drinkName: e.target.value });
                          }
                        }}>
                        {catalog.brands.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                        <option value={OTHER}>Annat…</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>cl</label>
                      <input type="number" min={2} max={100} className={inputClass} value={h.volumeCl}
                        onChange={(e) => updateHole(h.holeNumber, { volumeCl: Math.max(2, Math.min(100, Number(e.target.value) || 2)) })} />
                    </div>
                  </div>
                  {isCustom && (
                    <input className={inputClass} value={h.drinkName} maxLength={80} placeholder="Skriv vilken dryck"
                      onChange={(e) => updateHole(h.holeNumber, { drinkName: e.target.value })} />
                  )}

                  <div className="space-y-2">
                    <span className={labelClass}>Regel för hålet (valfritt)</span>
                    <input className={inputClass} value={h.hazardTitle} maxLength={80} placeholder="Rubrik, t.ex. Vänsterhand"
                      onChange={(e) => updateHole(h.holeNumber, { hazardTitle: e.target.value })} />
                    <textarea className={`${inputClass} min-h-[70px]`} value={h.hazardRule} maxLength={180}
                      placeholder="t.ex. Glaset får bara hållas med vänster hand – annars +1 slag."
                      onChange={(e) => updateHole(h.holeNumber, { hazardRule: e.target.value })} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" onClick={() => copyDrinkToAll(h)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
                      <Copy className="h-3.5 w-3.5" /> Samma dryck på alla hål
                    </button>
                    {h.holeNumber < HOLE_COUNT && (
                      <button type="button" onClick={() => setOpenHole(h.holeNumber + 1)}
                        className="rounded-full bg-[#112218]/5 px-3 py-1.5 text-xs font-semibold text-[#112218]">
                        Nästa hål →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Fast knapp längst ner */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#112218]/10 bg-[#F6F4EE]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">{error}</p>}
          <button type="submit" disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#112218] py-3.5 text-sm font-bold text-[#F6F4EE] shadow-lg disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#D4AF37]" />}
            {submitting ? 'Skapar banan…' : 'Skapa bana'}
          </button>
        </div>
      </div>
    </form>
  );
};
