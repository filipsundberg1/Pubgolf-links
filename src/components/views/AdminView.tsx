import React, { useMemo, useState } from 'react';
import { ArrowLeft, Ban, Globe2, Loader2, Lock, Search, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import type { PubCourse, PubRound, ReusablePlayerProfile } from '../../utils/golfRules';
import { formatEventDate } from '../../utils/golfRules';
import { GolferAvatar } from '../GolferAvatar';

interface AdminViewProps {
  profiles: ReusablePlayerProfile[];
  courses: PubCourse[];
  rounds: PubRound[] | null;
  bannedUids: Set<string>;
  adminUids: string[];
  currentUid: string;
  handicapFor: (uid: string) => string;
  onBack: () => void;
  onOpenPlayer: (uid: string) => void;
  onToggleBan: (uid: string, ban: boolean) => Promise<void>;
  onDeleteProfile: (uid: string) => Promise<void>;
  onDeleteRound: (roundId: string) => Promise<void>;
  onDeleteCourse: (courseId: string) => Promise<void>;
}

type Tab = 'accounts' | 'rounds' | 'courses';

const lastActive = (ms?: number) => {
  if (!ms) return 'okänt';
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return 'idag';
  if (days === 1) return 'igår';
  if (days < 30) return `${days} dagar sedan`;
  return new Date(ms).toLocaleDateString('sv-SE');
};

/** Admin: överblick över konton, rundor och banor. Bara för Filip och Adam. */
export const AdminView: React.FC<AdminViewProps> = ({
  profiles,
  courses,
  rounds,
  bannedUids,
  adminUids,
  currentUid,
  handicapFor,
  onBack,
  onOpenPlayer,
  onToggleBan,
  onDeleteProfile,
  onDeleteRound,
  onDeleteCourse,
}) => {
  const [tab, setTab] = useState<Tab>('accounts');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const nameByUid = useMemo(() => new Map(profiles.map((p) => [p.uid, p.displayName])), [profiles]);
  const needle = q.trim().toLowerCase();

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      setConfirm(null);
    } catch (err) {
      console.error(err);
      alertless(`Det gick inte: ${err instanceof Error ? err.message.slice(0, 120) : 'okänt fel'}`);
    } finally {
      setBusy(null);
    }
  };
  const [error, setError] = useState<string | null>(null);
  function alertless(text: string) {
    setError(text);
    setTimeout(() => setError(null), 5000);
  }

  const accounts = profiles
    .filter((p) => !needle || p.displayName.toLowerCase().includes(needle) || (p.playerCode || '').toLowerCase().includes(needle))
    .sort((a, b) => (b.lastActiveMs || 0) - (a.lastActiveMs || 0));
  const roundList = (rounds || [])
    .filter((r) => !needle || r.courseTitle.toLowerCase().includes(needle) || r.roundId.toLowerCase().includes(needle))
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const courseList = courses
    .filter((c) => !needle || c.title.toLowerCase().includes(needle) || c.ownerName.toLowerCase().includes(needle))
    .sort((a, b) => a.title.localeCompare(b.title, 'sv'));

  const ConfirmDelete: React.FC<{ id: string; label: string; onConfirm: () => Promise<void> }> = ({ id, label, onConfirm }) =>
    confirm === id ? (
      <span className="flex gap-1">
        <button type="button" disabled={!!busy} onClick={() => void run(id, onConfirm)}
          className="inline-flex items-center gap-1 rounded-full bg-red-700 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50">
          {busy === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} {label}
        </button>
        <button type="button" onClick={() => setConfirm(null)} className="rounded-full border border-[#112218]/15 px-2.5 py-1 text-[11px] font-semibold">
          Nej
        </button>
      </span>
    ) : (
      <button type="button" onClick={() => setConfirm(id)} aria-label="Radera"
        className="inline-flex items-center rounded-full border border-red-200 p-1.5 text-red-700">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );

  const tabBtn = (t: Tab, label: string) => (
    <button type="button" onClick={() => setTab(t)}
      className={`flex-1 rounded-xl py-2 text-xs font-bold ${tab === t ? 'bg-[#112218] text-[#F6F4EE]' : 'text-[#112218]/70'}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-4 pb-10">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-[#112218]">
          <ShieldCheck className="h-7 w-7 text-[#D4AF37]" /> Admin
        </h1>
        <p className="mt-1 text-sm text-[#112218]/65">
          {profiles.length} konton · {rounds ? rounds.length : '…'} rundor · {courses.length} banor. Mejladresser och själva Google-kontona hanteras i Firebase Console.
        </p>
      </div>

      <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-xs">
        {tabBtn('accounts', `Konton (${profiles.length})`)}
        {tabBtn('rounds', `Rundor (${rounds ? rounds.length : '…'})`)}
        {tabBtn('courses', `Banor (${courses.length})`)}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#112218]/15 bg-white px-3">
        <Search className="h-4 w-4 text-[#112218]/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök…" className="min-w-0 flex-1 py-2.5 text-sm outline-none" />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}

      {tab === 'accounts' && (
        <ul className="space-y-2">
          {accounts.map((p) => {
            const banned = bannedUids.has(p.uid);
            const admin = adminUids.includes(p.uid);
            return (
              <li key={p.uid} className={`flex items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 shadow-xs ${banned ? 'border-red-200 bg-red-50/50' : 'border-[#112218]/10'}`}>
                <button type="button" onClick={() => onOpenPlayer(p.uid)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <GolferAvatar avatarSeed={p.avatarSeed} displayName={p.displayName} size="sm" wins={p.wins} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-[#112218]">
                      {p.displayName}
                      {admin && <span className="rounded bg-[#D4AF37]/20 px-1.5 text-[10px] font-bold text-[#856a32]">ADMIN</span>}
                      {banned && <span className="rounded bg-red-100 px-1.5 text-[10px] font-bold text-red-700">AVSTÄNGD</span>}
                    </div>
                    <div className="truncate text-xs text-[#112218]/55">
                      <span className="font-mono">{p.playerCode || '—'}</span> · HCP {handicapFor(p.uid)} · aktiv {lastActive(p.lastActiveMs)}
                    </div>
                  </div>
                </button>
                {!admin && p.uid !== currentUid && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" disabled={!!busy} onClick={() => void run(`ban-${p.uid}`, () => onToggleBan(p.uid, !banned))}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-50 ${banned ? 'border border-[#112218]/15 text-[#112218]' : 'border border-red-200 text-red-700'}`}>
                      {banned ? <><Undo2 className="h-3 w-3" /> Häv</> : <><Ban className="h-3 w-3" /> Stäng av</>}
                    </button>
                    <ConfirmDelete id={`p-${p.uid}`} label="Radera profil" onConfirm={() => onDeleteProfile(p.uid)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'rounds' &&
        (rounds === null ? (
          <p className="text-sm text-[#112218]/60">Laddar rundor…</p>
        ) : (
          <ul className="space-y-2">
            {roundList.map((r) => (
              <li key={r.roundId} className="flex items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-3 py-2.5 shadow-xs">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#112218]">
                    {r.courseTitle} {r.status === 'deleted' && <span className="text-xs font-bold text-red-700">· raderad</span>}
                  </div>
                  <div className="truncate text-xs text-[#112218]/55">
                    <span className="font-mono">{r.roundId}</span> · {formatEventDate(r.eventDate)} · ägare {nameByUid.get(r.ownerId) || r.ownerName} · {r.memberIds.length} spelare{r.locked ? ' · låst' : ''}
                  </div>
                  <div className="truncate text-[11px] text-[#112218]/45">{r.memberIds.map((u) => nameByUid.get(u) || 'okänd').join(', ')}</div>
                </div>
                <ConfirmDelete id={`r-${r.roundId}`} label="Radera för alla" onConfirm={() => onDeleteRound(r.roundId)} />
              </li>
            ))}
          </ul>
        ))}

      {tab === 'courses' && (
        <ul className="space-y-2">
          {courseList.map((c) => (
            <li key={c.courseId} className="flex items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-3 py-2.5 shadow-xs">
              {c.isPublic ? <Globe2 className="h-4 w-4 shrink-0 text-[#166534]" /> : <Lock className="h-4 w-4 shrink-0 text-[#112218]/40" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#112218]">{c.title}</div>
                <div className="truncate text-xs text-[#112218]/55">
                  {c.city} · av {nameByUid.get(c.ownerId) || c.ownerName} · {c.isPublic ? 'öppen' : 'privat'}
                </div>
              </div>
              <ConfirmDelete id={`c-${c.courseId}`} label="Radera bana" onConfirm={() => onDeleteCourse(c.courseId)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
