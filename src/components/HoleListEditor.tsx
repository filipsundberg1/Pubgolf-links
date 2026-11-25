import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ChevronDown,
  Copy,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  DRINK_CATALOG,
  MAX_HOLES,
  VALID_DRINK_TYPES,
  isPlaceholderText,
  moveHole,
  type DrinkCategory,
  type FairwayShape,
  type PubHole,
  type RoundHoleOverride,
} from '../utils/golfRules';
import { PubPlaceAutocomplete } from './PubPlaceAutocomplete';

/** Ett hål under redigering. Ordningen i listan = hålnumret. */
export interface HoleDraft {
  key: string;
  pubName: string;
  pubAddress: string;
  drinkType: DrinkCategory;
  drinkName: string;
  volumeCl: number;
  par: number;
  hazardTitle: string;
  hazardRule: string;
  /** Bevaras från befintliga hål. */
  lengthMeters?: number;
  shape?: FairwayShape;
  caddieTip?: string;
}

let keySeq = 0;
const newKey = () => `h${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export const blankHoleDraft = (): HoleDraft => ({
  key: newKey(),
  pubName: '',
  pubAddress: '',
  drinkType: 'lager',
  drinkName: DRINK_CATALOG.lager.brands[0],
  volumeCl: DRINK_CATALOG.lager.defaultCl,
  par: 3,
  hazardTitle: '',
  hazardRule: '',
});

const clean = (v: string) => (isPlaceholderText(v) ? '' : v);

/** Befintligt hål (från banan eller rundan) → redigerbart utkast. */
export const holeToDraft = (h: PubHole | RoundHoleOverride): HoleDraft => ({
  key: newKey(),
  pubName: clean(h.pubName),
  pubAddress: clean(h.pubAddress),
  drinkType: h.drinkType,
  drinkName: isPlaceholderText(h.drinkName) ? DRINK_CATALOG[h.drinkType]?.brands[0] || '' : h.drinkName,
  volumeCl: h.volumeCl,
  par: h.par,
  hazardTitle: clean(h.hazardTitle),
  hazardRule: clean(h.hazardRule),
  lengthMeters: h.lengthMeters,
  shape: h.shape,
  caddieTip: h.caddieTip,
});

const SHAPE_CYCLE: FairwayShape[] = ['straight', 'dogleg-left', 'island-green', 'dogleg-right', 'double-dogleg'];
const text = (v: string, fallback: string, max: number) => (v.trim().length >= 2 ? v.trim().slice(0, max) : fallback);

/** Utkast → hålets sparade fält (klarar databasens minimikrav). */
export function draftToOverride(d: HoleDraft, index: number): RoundHoleOverride {
  const hasRule = d.hazardTitle.trim().length >= 2 || d.hazardRule.trim().length >= 2;
  return {
    pubName: text(d.pubName, `Hål ${index + 1}`, 80),
    pubAddress: text(d.pubAddress, 'Ange gatuadress', 120),
    drinkType: d.drinkType,
    drinkName: text(d.drinkName, DRINK_CATALOG[d.drinkType]?.label || 'Valfri dryck', 80),
    volumeCl: Math.max(2, Math.min(100, Math.round(d.volumeCl) || 40)),
    par: Math.max(1, Math.min(6, Math.round(d.par) || 3)),
    hazardTitle: hasRule ? text(d.hazardTitle, 'Hålets regel', 80) : 'Lokalt pubhinder',
    hazardRule: hasRule
      ? text(d.hazardRule, d.hazardTitle.trim().length >= 2 ? d.hazardTitle.trim() : 'Se rubriken.', 180)
      : 'Ange lokal regel eller pliktslag för detta hål.',
    caddieTip: d.caddieTip && !isPlaceholderText(d.caddieTip) ? d.caddieTip.slice(0, 200) : 'Inga ursäkter. Svep det.',
    lengthMeters: Math.max(50, Math.min(650, Math.round(d.lengthMeters || 350))),
    shape: d.shape || SHAPE_CYCLE[index % SHAPE_CYCLE.length],
  };
}

export const holesDraftPar = (holes: HoleDraft[]) => holes.reduce((s, h) => s + (h.par || 0), 0);

const OTHER = '__other__';
const inputClass =
  'w-full rounded-xl border border-[#112218]/15 bg-white px-3 py-2.5 text-sm text-[#112218] outline-none focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#112218]/70';
const iconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#112218]/10 bg-white text-[#112218]/70 hover:bg-[#112218]/5 disabled:opacity-25';

interface HoleListEditorProps {
  holes: HoleDraft[];
  onChange: (holes: HoleDraft[]) => void;
  city: string;
  /** Öppna det här hålet (index) från början. */
  initialOpen?: number;
  /** false = antal hål går inte att ändra. */
  allowCountChange?: boolean;
}

/** Lista med hål: sök bar på Google, byt plats, vänd ordning, lägg till och ta bort hål. */
export const HoleListEditor: React.FC<HoleListEditorProps> = ({
  holes,
  onChange,
  city,
  initialOpen = 0,
  allowCountChange = true,
}) => {
  const [openKey, setOpenKey] = useState<string | null>(holes[initialOpen]?.key ?? null);
  const [customBrand, setCustomBrand] = useState<Record<string, boolean>>({});
  const [manualAddress, setManualAddress] = useState<Record<string, boolean>>({});

  const update = (key: string, patch: Partial<HoleDraft>) =>
    onChange(holes.map((h) => (h.key === key ? { ...h, ...patch } : h)));

  const move = (index: number, to: number) => onChange(moveHole(holes, index, to));

  const changeDrinkType = (key: string, type: DrinkCategory) => {
    setCustomBrand((p) => ({ ...p, [key]: false }));
    update(key, { drinkType: type, drinkName: DRINK_CATALOG[type].brands[0], volumeCl: DRINK_CATALOG[type].defaultCl });
  };

  const copyDrinkToAll = (src: HoleDraft) => {
    setCustomBrand((p) => {
      const next = { ...p };
      for (const h of holes) next[h.key] = !!p[src.key];
      return next;
    });
    onChange(holes.map((h) => ({ ...h, drinkType: src.drinkType, drinkName: src.drinkName, volumeCl: src.volumeCl })));
  };

  const addHole = () => {
    if (holes.length >= MAX_HOLES) return;
    const last = holes[holes.length - 1];
    const fresh = { ...blankHoleDraft(), ...(last ? { drinkType: last.drinkType, drinkName: last.drinkName, volumeCl: last.volumeCl } : {}) };
    onChange([...holes, fresh]);
    setOpenKey(fresh.key);
  };

  const removeHole = (key: string) => {
    if (holes.length <= 1) return;
    onChange(holes.filter((h) => h.key !== key));
    if (openKey === key) setOpenKey(null);
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55">
          {holes.length} hål · par {holesDraftPar(holes)}
        </h2>
        <button type="button" onClick={() => onChange([...holes].reverse())} disabled={holes.length < 2}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#112218]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#112218] disabled:opacity-40">
          <ArrowDownUp className="h-3.5 w-3.5 text-[#166534]" /> Vänd ordningen
        </button>
      </div>
      <p className="text-xs text-[#112218]/55">Byt plats med pilarna. Hålnumret följer ordningen i listan.</p>

      {holes.map((h, index) => {
        const holeNumber = index + 1;
        const expanded = openKey === h.key;
        const catalog = DRINK_CATALOG[h.drinkType];
        const isCustom = customBrand[h.key] || !catalog.brands.includes(h.drinkName);
        const showManual = manualAddress[h.key] || (!!h.pubName && !h.pubAddress);
        return (
          <div key={h.key} className="overflow-hidden rounded-2xl border border-[#112218]/10 bg-white shadow-xs">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button type="button" onClick={() => setOpenKey(expanded ? null : h.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#112218] font-display text-sm font-bold text-[#D4AF37]">
                  {holeNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#112218]">
                    {h.pubName.trim() || `Hål ${holeNumber} – välj bar`}
                  </span>
                  <span className="block truncate text-xs text-[#112218]/60">
                    Par {h.par} · {h.drinkName} {h.volumeCl} cl{h.hazardTitle.trim() ? ` · ${h.hazardTitle}` : ''}
                  </span>
                </span>
              </button>
              <button type="button" className={iconBtn} disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Flytta hål ${holeNumber} upp`}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className={iconBtn} disabled={index === holes.length - 1} onClick={() => move(index, index + 1)} aria-label={`Flytta hål ${holeNumber} ner`}>
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setOpenKey(expanded ? null : h.key)} aria-label={expanded ? 'Stäng' : 'Öppna'}
                className="flex h-8 w-6 items-center justify-center text-[#112218]/40">
                <ChevronDown className={`h-5 w-5 transition ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {expanded && (
              <div className="space-y-4 border-t border-[#112218]/10 px-4 pb-4 pt-3">
                <div className="space-y-2">
                  <PubPlaceAutocomplete
                    city={city}
                    holeNumber={holeNumber}
                    compact
                    placeholder="Sök bar, t.ex. Mästers eller Wollmar"
                    onSelectPlace={(place) => {
                      update(h.key, { pubName: place.pubName, pubAddress: place.pubAddress });
                      setManualAddress((p) => ({ ...p, [h.key]: false }));
                    }}
                  />
                  {h.pubName && !showManual && (
                    <div className="flex items-start gap-2 rounded-xl bg-[#F6F4EE] px-3 py-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#166534]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[#112218]">{h.pubName}</div>
                        <div className="truncate text-xs text-[#112218]/60">{h.pubAddress}</div>
                      </div>
                    </div>
                  )}
                  {showManual ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={inputClass} value={h.pubName} maxLength={80} placeholder="Barens namn"
                        onChange={(e) => update(h.key, { pubName: e.target.value })} />
                      <input className={inputClass} value={h.pubAddress} maxLength={120} placeholder="Gatuadress"
                        onChange={(e) => update(h.key, { pubAddress: e.target.value })} />
                    </div>
                  ) : (
                    <button type="button" onClick={() => setManualAddress((p) => ({ ...p, [h.key]: true }))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#112218]/60">
                      <Pencil className="h-3 w-3" /> Skriv in namn och adress själv
                    </button>
                  )}
                </div>

                <div>
                  <span className={labelClass}>Par</span>
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((p) => (
                      <button key={p} type="button" onClick={() => update(h.key, { par: p })}
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
                      onChange={(e) => changeDrinkType(h.key, e.target.value as DrinkCategory)}>
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
                          setCustomBrand((p) => ({ ...p, [h.key]: true }));
                          update(h.key, { drinkName: '' });
                        } else {
                          setCustomBrand((p) => ({ ...p, [h.key]: false }));
                          update(h.key, { drinkName: e.target.value });
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
                      onChange={(e) => update(h.key, { volumeCl: Math.max(2, Math.min(100, Number(e.target.value) || 2)) })} />
                  </div>
                </div>
                {isCustom && (
                  <input className={inputClass} value={h.drinkName} maxLength={80} placeholder="Skriv vilken dryck"
                    onChange={(e) => update(h.key, { drinkName: e.target.value })} />
                )}

                <div className="space-y-2">
                  <span className={labelClass}>Regel för hålet (valfritt)</span>
                  <input className={inputClass} value={h.hazardTitle} maxLength={80} placeholder="Rubrik, t.ex. Vänsterhand"
                    onChange={(e) => update(h.key, { hazardTitle: e.target.value })} />
                  <textarea className={`${inputClass} min-h-[70px]`} value={h.hazardRule} maxLength={180}
                    placeholder="t.ex. Glaset får bara hållas med vänster hand – annars +1 slag."
                    onChange={(e) => update(h.key, { hazardRule: e.target.value })} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => copyDrinkToAll(h)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
                      <Copy className="h-3.5 w-3.5" /> Samma dryck på alla hål
                    </button>
                    {allowCountChange && holes.length > 1 && (
                      <button type="button" onClick={() => removeHole(h.key)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                        <Trash2 className="h-3.5 w-3.5" /> Ta bort hålet
                      </button>
                    )}
                  </div>
                  {index < holes.length - 1 && (
                    <button type="button" onClick={() => setOpenKey(holes[index + 1].key)}
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

      {allowCountChange && (
        <button type="button" onClick={addHole} disabled={holes.length >= MAX_HOLES}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#166534]/30 py-3 text-sm font-semibold text-[#166534] disabled:opacity-40">
          <Plus className="h-4 w-4" /> {holes.length >= MAX_HOLES ? `Max ${MAX_HOLES} hål` : 'Lägg till hål'}
        </button>
      )}
    </section>
  );
};
