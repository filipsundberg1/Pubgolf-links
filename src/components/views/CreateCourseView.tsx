import React, { useState } from 'react';
import { ArrowLeft, Check, Globe2, Lock, Loader2, Trash2 } from 'lucide-react';
import { HoleListEditor, blankHoleDraft, holesDraftPar, type HoleDraft } from '../HoleListEditor';
import { DEFAULT_HOLE_COUNT } from '../../utils/golfRules';

export type { HoleDraft } from '../HoleListEditor';

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
  /** Finns = redigera en befintlig bana. */
  initial?: CreateCourseInput;
  onBack: () => void;
  onCreate: (input: CreateCourseInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const inputClass =
  'w-full rounded-xl border border-[#112218]/15 bg-white px-3 py-2.5 text-sm text-[#112218] outline-none focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#112218]/70';

export const CreateCourseView: React.FC<CreateCourseViewProps> = ({ defaultCity, initial, onBack, onCreate, onDelete }) => {
  const editing = !!initial;
  const [title, setTitle] = useState(initial?.title || '');
  const [city, setCity] = useState(initial?.city || defaultCity);
  const [isPublic, setIsPublic] = useState(initial ? initial.isPublic : true);
  const [holes, setHoles] = useState<HoleDraft[]>(
    () => initial?.holes || Array.from({ length: DEFAULT_HOLE_COUNT }, () => blankHoleDraft())
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 2) return setError('Ge banan ett namn (minst 2 tecken).');
    if (city.trim().length < 2) return setError('Ange stad eller område.');
    const badDrink = holes.findIndex((h) => h.drinkName.trim().length < 2);
    if (badDrink >= 0) return setError(`Hål ${badDrink + 1}: ange vilken dryck som gäller.`);
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
      setError(err instanceof Error ? err.message : 'Kunde inte spara banan. Försök igen.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 pb-28">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>
        <h1 className="font-display text-3xl font-bold text-[#112218]">{editing ? 'Redigera bana' : 'Skapa bana'}</h1>
        <p className="mt-1 text-sm text-[#112218]/65">
          Banan är din banguide: barer, dryck, par och regler. {holes.length} hål · totalt par {holesDraftPar(holes)}
        </p>
      </div>

      <section className="space-y-4 rounded-3xl border border-[#112218]/10 bg-white p-5 shadow-xs">
        <div>
          <label className={labelClass} htmlFor="course-title">Banans namn</label>
          <input id="course-title" className={inputClass} value={title} maxLength={80}
            placeholder="t.ex. December Links – Söder" onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="course-city">Stad / område</label>
          <input id="course-city" className={inputClass} value={city} maxLength={60}
            placeholder="Södermalm, Stockholm" onChange={(e) => setCity(e.target.value)} />
        </div>

        <div>
          <span className={labelClass}>Vem får spela banan?</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: true, icon: Globe2, title: 'Öppen bana', text: 'Syns under Spela för alla.' },
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

      <HoleListEditor holes={holes} onChange={setHoles} city={city} initialOpen={editing ? -1 : 0} />

      {editing && onDelete && (
        <section className="rounded-3xl border border-red-200 bg-white p-4">
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-red-900">Ta bort banan för gott?</p>
              <p className="text-xs text-red-900/75">Banguiden försvinner. Pågående rundor på banan visar då tomma hål.</p>
              <div className="flex gap-2">
                <button type="button" disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      await onDelete();
                    } catch {
                      setError('Kunde inte ta bort banan. Försök igen.');
                      setSubmitting(false);
                    }
                  }}
                  className="flex-1 rounded-xl bg-red-700 py-2.5 text-xs font-bold text-white disabled:opacity-60">Ja, ta bort</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 rounded-xl border border-[#112218]/15 py-2.5 text-xs font-semibold">Avbryt</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-red-700">
              <Trash2 className="h-4 w-4" /> Ta bort banan
            </button>
          )}
        </section>
      )}

      <div style={{ bottom: 'var(--pg-mini-bar, 0px)' }} className="fixed inset-x-0 bottom-0 z-20 border-t border-[#112218]/10 bg-[#F6F4EE]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">{error}</p>}
          <button type="submit" disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#112218] py-3.5 text-sm font-bold text-[#F6F4EE] shadow-lg disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#D4AF37]" />}
            {submitting ? 'Sparar…' : editing ? 'Spara ändringar' : 'Skapa bana'}
          </button>
        </div>
      </div>
    </form>
  );
};
