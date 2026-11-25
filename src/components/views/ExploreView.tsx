import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, Search, UserCheck, UserPlus } from 'lucide-react';
import type { ReusablePlayerProfile } from '../../utils/golfRules';
import { GolferAvatar } from '../GolferAvatar';

export type Relation = 'me' | 'friend' | 'following' | 'follower' | 'none';

interface ExploreViewProps {
  players: ReusablePlayerProfile[];
  relationFor: (uid: string) => Relation;
  handicapFor: (uid: string) => string;
  courseCountFor: (uid: string) => number;
  onBack: () => void;
  onOpenPlayer: (uid: string) => void;
  onFollow: (uid: string) => Promise<void>;
}

export const lastActiveLabel = (ms?: number) => {
  if (!ms) return 'Ny';
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return 'Aktiv idag';
  if (days === 1) return 'Aktiv igår';
  if (days < 7) return `Aktiv för ${days} dagar sen`;
  if (days < 30) return `Aktiv för ${Math.floor(days / 7)} v sen`;
  return 'Inte aktiv på länge';
};

/** Knapp för att lägga till en spelare – ett tryck. */
export const FollowButton: React.FC<{ relation: Relation; onFollow: () => Promise<void>; size?: 'sm' | 'md' }> = ({
  relation,
  onFollow,
  size = 'sm',
}) => {
  const [busy, setBusy] = useState(false);
  if (relation === 'me') return null;
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  if (relation === 'friend')
    return (
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#166534]/10 font-semibold text-[#166534] ${pad}`}>
        <UserCheck className="h-3.5 w-3.5" /> Vän
      </span>
    );
  if (relation === 'following')
    return (
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#112218]/5 font-semibold text-[#112218]/70 ${pad}`}>
        <Check className="h-3.5 w-3.5" /> Tillagd
      </span>
    );
  return (
    <button type="button" disabled={busy}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          await onFollow();
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#166534] font-bold text-white disabled:opacity-60 ${pad}`}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
      {relation === 'follower' ? 'Lägg till tillbaka' : 'Lägg till'}
    </button>
  );
};

/** Utforska: alla spelare, de som använt appen senast först. Lägg till med ett tryck. */
export const ExploreView: React.FC<ExploreViewProps> = ({
  players,
  relationFor,
  handicapFor,
  courseCountFor,
  onBack,
  onOpenPlayer,
  onFollow,
}) => {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...players]
      .filter((p) => relationFor(p.uid) !== 'me')
      .filter(
        (p) =>
          !needle ||
          p.displayName.toLowerCase().includes(needle) ||
          p.nickname.toLowerCase().includes(needle) ||
          (p.playerCode || '').toLowerCase().includes(needle)
      )
      .sort((a, b) => (b.lastActiveMs || 0) - (a.lastActiveMs || 0));
  }, [players, q, relationFor]);

  return (
    <div className="space-y-5 pb-10">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>
        <h1 className="font-display text-3xl font-bold text-[#112218]">Utforska</h1>
        <p className="mt-1 text-sm text-[#112218]/65">Spelarna som kört senast. Tryck "Lägg till" så kan du ta med dem i rundor direkt.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#112218]/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök namn, smeknamn eller spelar-ID"
          className="w-full rounded-2xl border border-[#112218]/15 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-[#166534]" />
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-6 text-center text-sm text-[#112218]/55">
          {q ? 'Ingen spelare matchar.' : 'Inga andra spelare än.'}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((p) => {
            const courses = courseCountFor(p.uid);
            return (
              <li key={p.uid}>
                <div role="button" tabIndex={0} onClick={() => onOpenPlayer(p.uid)}
                  onKeyDown={(e) => e.key === 'Enter' && onOpenPlayer(p.uid)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-3 py-3 shadow-xs hover:bg-[#112218]/5">
                  <GolferAvatar avatarSeed={p.avatarSeed} displayName={p.displayName} size="sm" wins={p.wins} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#112218]">{p.displayName}</div>
                    <div className="truncate text-xs text-[#112218]/55">
                      "{p.nickname}" · HCP {handicapFor(p.uid)}
                      {courses > 0 && ` · ${courses} ${courses === 1 ? 'bana' : 'banor'}`}
                    </div>
                    <div className="text-[11px] font-medium text-[#166534]">{lastActiveLabel(p.lastActiveMs)}</div>
                  </div>
                  <FollowButton relation={relationFor(p.uid)} onFollow={() => onFollow(p.uid)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
