import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Eye, Globe2, Loader2, Lock, Pencil, Play, PlusCircle, Share2, Shirt } from 'lucide-react';
import type { PlayerCareerStats, PlayerRoundHistoryItem, PubCourse } from '../../utils/golfRules';
import { formatEventDate } from '../../utils/golfRules';
import { AvatarCustomizer, GolferAvatar } from '../GolferAvatar';

export type ProfileFields = {
  displayName: string;
  nickname: string;
  country: string;
  homePub: string;
  signatureDrink: string;
  favoriteClub: string;
  handicap: string;
  bio: string;
  avatarSeed: string;
};

/** En rad i rundhistoriken: alla rundor man spelat, även de som inte räknas i HCP. */
export interface ProfileHistoryEntry extends PlayerRoundHistoryItem {
  countsForHcp: boolean;
  deleted: boolean;
}

interface MyProfileViewProps {
  profile: ProfileFields;
  playerCode: string;
  stats: PlayerCareerStats | undefined;
  history: ProfileHistoryEntry[];
  onBack: () => void;
  onSave: (fields: ProfileFields) => Promise<void>;
  onOpenRound: (courseId: string) => void;
  myCourses: PubCourse[];
  holeCountFor: (course: PubCourse) => number;
  initialTab?: 'rounds' | 'courses';
  onOpenCourse: (courseId: string) => void;
  onEditCourse: (courseId: string) => void;
  onStartCourse: (courseId: string) => void;
  onCreateCourse: () => void;
  /** Länk som lägger till mig ("Lägg till mig på Pubgolf Links"). Tom = spelar-ID saknas än. */
  shareUrl?: string;
}

const inputClass =
  'w-full rounded-xl border border-[#112218]/15 bg-white px-3 py-2.5 text-sm text-[#112218] outline-none focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#112218]/70';

/** Fyller tomma fält så att de klarar databasens minimikrav. */
export function withProfileDefaults(f: ProfileFields): ProfileFields {
  const pick = (v: string, fallback: string, min = 2) => (v.trim().length >= min ? v.trim() : fallback);
  return {
    ...f,
    displayName: pick(f.displayName, 'Spelare'),
    nickname: pick(f.nickname, 'Rookie', 1),
    country: pick(f.country, 'Sverige'),
    homePub: pick(f.homePub, 'Klubbhuset'),
    signatureDrink: pick(f.signatureDrink, 'Lager'),
    favoriteClub: pick(f.favoriteClub, 'Driver'),
    bio: pick(f.bio, 'Ny på touren.'),
  };
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({
  profile,
  playerCode,
  stats,
  history,
  onBack,
  onSave,
  onOpenRound,
  myCourses,
  holeCountFor,
  initialTab = 'rounds',
  onOpenCourse,
  onEditCourse,
  onStartCourse,
  onCreateCourse,
  shareUrl = '',
}) => {
  const [draft, setDraft] = useState<ProfileFields>(profile);
  const [tab, setTab] = useState<'rounds' | 'courses'>(initialTab);
  const [editing, setEditing] = useState<'avatar' | 'info' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const shareProfile = async () => {
    if (!shareUrl) return;
    const text = `Lägg till mig på Pubgolf Links – ${profile.displayName} "${profile.nickname}". Mitt spelar-ID: ${playerCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Lägg till mig på Pubgolf Links', text, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      setShareNote('Länken är kopierad – klistra in den i gruppchatten!');
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setShareNote(shareUrl);
    }
    setTimeout(() => setShareNote(null), 4000);
  };

  useEffect(() => {
    if (!editing) setDraft(profile);
  }, [profile, editing]);

  const set = (k: keyof ProfileFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(withProfileDefaults(draft));
      setEditing(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
        <ArrowLeft className="h-4 w-4" /> Tillbaka
      </button>

      {/* Spelarkort */}
      <section className="overflow-hidden rounded-3xl bg-[#112218] text-[#F6F4EE] shadow-xl">
        <div className="flex items-center gap-4 p-5">
          {editing !== 'avatar' && (
            <GolferAvatar avatarSeed={draft.avatarSeed} displayName={draft.displayName} size="lg" wins={stats?.wins || 0} />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">Pubgolf Tour</div>
            <h1 className="truncate font-display text-2xl font-bold">{profile.displayName}</h1>
            <p className="truncate text-sm text-[#F6F4EE]/65">"{profile.nickname}" · {profile.homePub}</p>
            <p className="mt-1 text-xs text-[#F6F4EE]/65">
              Spelar-ID <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono font-bold tracking-wider text-[#F6F4EE]">{playerCode || '…'}</span>
            </p>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">HCP</div>
            <div className="font-mono text-3xl font-black">{stats?.computedHandicap || profile.handicap || '0.0'}</div>
          </div>
        </div>
        <div className="grid grid-cols-5 divide-x divide-white/10 border-t border-white/10 py-3 text-center">
          {[
            ['Rundor', stats?.roundsPlayed ?? 0],
            ['Vinster', stats?.wins ?? 0],
            ['Birdies', stats?.careerBirdies ?? 0],
            ['Eagles', stats?.careerEaglesOrBetter ?? 0],
            ['HIO', stats?.careerHoleInOnes ?? 0],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="font-mono text-lg font-black">{value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#F6F4EE]/50">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {saved && <p className="rounded-xl bg-[#166534]/10 px-3 py-2 text-sm font-semibold text-[#166534]">Profilen är sparad!</p>}

      {/* Dela profilen: länken öppnar min profil med en Lägg till-knapp */}
      <section className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/50 bg-white px-4 py-3 shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#112218]">Lägg till mig på Pubgolf Links</div>
          <div className="truncate text-xs text-[#112218]/60">
            {shareNote || 'Skicka länken till kompisarna – ett tryck så är ni vänner.'}
          </div>
        </div>
        <button type="button" onClick={() => void shareProfile()} disabled={!shareUrl}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#112218] px-4 py-2.5 text-xs font-bold text-[#F6F4EE] disabled:opacity-50">
          <Share2 className="h-4 w-4 text-[#D4AF37]" /> Dela profil
        </button>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setEditing(editing === 'avatar' ? null : 'avatar')}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold ${editing === 'avatar' ? 'bg-[#D4AF37] text-[#112218]' : 'border border-[#112218]/15 bg-white text-[#112218]'}`}>
          <Shirt className="h-4 w-4" /> Klä avataren
        </button>
        <button type="button" onClick={() => setEditing(editing === 'info' ? null : 'info')}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold ${editing === 'info' ? 'bg-[#D4AF37] text-[#112218]' : 'border border-[#112218]/15 bg-white text-[#112218]'}`}>
          <Pencil className="h-4 w-4" /> Redigera uppgifter
        </button>
      </div>

      {editing === 'avatar' && (
        <section className="rounded-3xl border border-[#112218]/10 bg-white p-4 shadow-xs">
          <AvatarCustomizer value={draft.avatarSeed} displayName={draft.displayName} unlockStats={stats}
            onChange={(seed) => setDraft((d) => ({ ...d, avatarSeed: seed }))} />
        </section>
      )}

      {editing === 'info' && (
        <section className="space-y-3 rounded-3xl border border-[#112218]/10 bg-white p-5 shadow-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelClass}>Namn</label><input className={inputClass} maxLength={60} value={draft.displayName} onChange={set('displayName')} /></div>
            <div><label className={labelClass}>Smeknamn</label><input className={inputClass} maxLength={50} value={draft.nickname} onChange={set('nickname')} /></div>
            <div><label className={labelClass}>Hemmapub</label><input className={inputClass} maxLength={80} value={draft.homePub} onChange={set('homePub')} /></div>
            <div><label className={labelClass}>Signaturdryck</label><input className={inputClass} maxLength={80} value={draft.signatureDrink} onChange={set('signatureDrink')} /></div>
            <div><label className={labelClass}>Favoritklubba</label><input className={inputClass} maxLength={80} value={draft.favoriteClub} onChange={set('favoriteClub')} /></div>
            <div><label className={labelClass}>Stad</label><input className={inputClass} maxLength={50} value={draft.country} onChange={set('country')} /></div>
          </div>
          <div><label className={labelClass}>Om mig</label><textarea className={`${inputClass} min-h-[80px]`} maxLength={320} value={draft.bio} onChange={set('bio')} /></div>
          <p className="text-xs text-[#112218]/55">Alla börjar på HCP 54. Det räknas sedan ut från dina bästa hela rundor (alla hål spelade), omräknat till 18 hål.</p>
        </section>
      )}

      {editing && (
        <button type="button" onClick={save} disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#112218] py-3.5 text-sm font-bold text-[#F6F4EE] disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#D4AF37]" />} Spara profil
        </button>
      )}

      {!editing && profile.bio && (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-[#112218]/75 shadow-xs">{profile.bio}</p>
      )}

      <div className="flex gap-1 rounded-2xl bg-[#112218]/5 p-1">
        {([
          ['rounds', `Rundor (${history.length})`],
          ['courses', `Mina banor (${myCourses.length})`],
        ] as ['rounds' | 'courses', string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab === id ? 'bg-white text-[#112218] shadow-xs' : 'text-[#112218]/60'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'courses' && (
        <section className="space-y-2">
          {myCourses.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-5 text-center text-sm text-[#112218]/55">
              Du har inte skapat någon bana än.
            </p>
          )}
          {myCourses.map((c) => (
            <div key={c.courseId} className="rounded-2xl border border-[#112218]/10 bg-white shadow-xs">
              <button type="button" onClick={() => onOpenCourse(c.courseId)} className="flex w-full items-center gap-3 px-4 pt-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F6F4EE] text-[#166534]">
                  {c.isPublic ? <Globe2 className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-[#112218]">{c.title}</div>
                  <div className="truncate text-xs text-[#112218]/60">
                    {c.city} · {holeCountFor(c)} hål · {c.isPublic ? 'öppen för alla' : 'privat'}
                  </div>
                </div>
              </button>
              <div className="grid grid-cols-3 gap-1.5 p-3">
                <button type="button" onClick={() => onOpenCourse(c.courseId)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-[#F6F4EE] py-2 text-xs font-semibold text-[#112218]">
                  <Eye className="h-3.5 w-3.5" /> Banguide
                </button>
                <button type="button" onClick={() => onEditCourse(c.courseId)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-[#F6F4EE] py-2 text-xs font-semibold text-[#112218]">
                  <Pencil className="h-3.5 w-3.5" /> Redigera
                </button>
                <button type="button" onClick={() => onStartCourse(c.courseId)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-[#166534] py-2 text-xs font-bold text-white">
                  <Play className="h-3.5 w-3.5" /> Spela
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={onCreateCourse}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#166534]/30 py-3 text-sm font-semibold text-[#166534]">
            <PlusCircle className="h-4 w-4" /> Skapa ny bana
          </button>
        </section>
      )}

      {/* Tidigare rundor */}
      {tab === 'rounds' && <section>
        <p className="mb-2 text-xs text-[#112218]/55">Öppna en runda och tryck på "Rundan" för att ta bort den eller välja att den inte räknas i ditt HCP.</p>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-5 text-center text-sm text-[#112218]/55">
            Inga spelade rundor än.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((r) => (
              <button key={r.courseId} type="button" onClick={() => onOpenRound(r.courseId)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-4 py-3 text-left shadow-xs hover:bg-[#112218]/5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-[#112218]">{r.title}</div>
                  <div className="text-xs text-[#112218]/60">
                    {formatEventDate(r.eventDate)} · {r.city} · {r.thruHoles} hål
                    {!r.countsForHcp && <span className="font-semibold text-[#856a32]"> · räknas ej i HCP</span>}
                    {r.deleted && <span className="font-semibold text-red-700"> · raderad av ägaren</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-base font-black text-[#112218]">{r.toParFormatted}</div>
                  <div className="text-[10px] text-[#112218]/50">{r.totalSips} klunkar</div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#112218]/40" />
              </button>
            ))}
          </div>
        )}
      </section>}
    </div>
  );
};
