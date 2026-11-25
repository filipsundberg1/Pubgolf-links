import React, { useState } from 'react';
import { ArrowLeft, Check, Loader2, UserMinus, UserPlus, X } from 'lucide-react';
import type { ReusablePlayerProfile } from '../../utils/golfRules';
import { GolferAvatar } from '../GolferAvatar';

interface FriendsViewProps {
  myPlayerCode: string;
  friends: ReusablePlayerProfile[];
  following: ReusablePlayerProfile[];
  requests: ReusablePlayerProfile[];
  /** Alla andra spelare man inte lagt till än (senast aktiva först). */
  suggestions: ReusablePlayerProfile[];
  handicapFor: (uid: string) => string;
  onBack: () => void;
  onFollowByCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  onFollow: (uid: string) => Promise<void>;
  onUnfollow: (uid: string) => Promise<void>;
  onRemoveFriend: (uid: string) => Promise<void>;
  onDismissRequest: (uid: string) => Promise<void>;
  onOpenPlayer: (uid: string) => void;
}

const h2 = 'mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55';

const PersonRow: React.FC<{
  person: ReusablePlayerProfile;
  hcp: string;
  onOpen: () => void;
  children?: React.ReactNode;
}> = ({ person, hcp, onOpen, children }) => (
  <li className="flex items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-3 py-2.5 shadow-xs">
    <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <GolferAvatar avatarSeed={person.avatarSeed} displayName={person.displayName} size="sm" wins={person.wins} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[#112218]">{person.displayName}</div>
        <div className="text-xs text-[#112218]/55">
          <span className="font-mono">{person.playerCode || '—'}</span> · HCP {hcp}
        </div>
      </div>
    </button>
    <div className="flex shrink-0 gap-1.5">{children}</div>
  </li>
);

/** Vänner: man följer någon direkt; godkänner hen så blir ni vänner åt båda hållen. */
export const FriendsView: React.FC<FriendsViewProps> = ({
  myPlayerCode,
  friends,
  following,
  requests,
  suggestions,
  handicapFor,
  onBack,
  onFollowByCode,
  onFollow,
  onUnfollow,
  onRemoveFriend,
  onDismissRequest,
  onOpenPlayer,
}) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showCode, setShowCode] = useState(false);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const btn = 'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50';

  return (
    <div className="space-y-6 pb-10">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>
        <h1 className="font-display text-3xl font-bold text-[#112218]">Vänner</h1>
        <p className="mt-1 text-sm text-[#112218]/65">
          Tryck "Lägg till" på de du kör med – då kan du ta med dem i rundor direkt. Ditt spelar-ID:{' '}
          <span className="font-mono font-bold text-[#112218]">{myPlayerCode || '…'}</span>
        </p>
      </div>

      {suggestions.length > 0 && (
        <section>
          <h2 className={h2}>Spelare i appen ({suggestions.length})</h2>
          <ul className="space-y-2">
            {suggestions.map((p) => (
              <PersonRow key={p.uid} person={p} hcp={handicapFor(p.uid)} onOpen={() => onOpenPlayer(p.uid)}>
                <button type="button" disabled={!!busy} onClick={() => void run(`f-${p.uid}`, () => onFollow(p.uid))}
                  className={`${btn} bg-[#166534] text-white`}>
                  {busy === `f-${p.uid}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Lägg till
                </button>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      {!showCode ? (
        <button type="button" onClick={() => setShowCode(true)} className="text-xs font-semibold text-[#166534]">
          Har du ett spelar-ID? Lägg till med ID
        </button>
      ) : <form
        className="rounded-3xl bg-[#112218] p-5 text-[#F6F4EE] shadow-lg"
        onSubmit={(e) => {
          e.preventDefault();
          if (!code.trim()) return;
          void run('code', async () => {
            const res = await onFollowByCode(code);
            setMsg({ ok: res.ok, text: res.message });
            if (res.ok) setCode('');
          });
        }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="h-4 w-4 text-[#D4AF37]" /> Lägg till med spelar-ID
        </div>
        <div className="mt-3 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="t.ex. AL1234" maxLength={10}
            className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 font-mono text-base tracking-[0.2em] text-white placeholder:text-white/40 outline-none focus:border-[#D4AF37]" />
          <button type="submit" disabled={!code.trim() || busy === 'code'}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 text-sm font-bold text-[#112218] disabled:opacity-50">
            {busy === 'code' && <Loader2 className="h-4 w-4 animate-spin" />} Lägg till
          </button>
        </div>
        {msg && <p className={`mt-2 text-xs ${msg.ok ? 'text-[#D4AF37]' : 'text-red-300'}`}>{msg.text}</p>}
      </form>}

      {requests.length > 0 && (
        <section>
          <h2 className={h2}>Har lagt till dig ({requests.length})</h2>
          <ul className="space-y-2">
            {requests.map((p) => (
              <PersonRow key={p.uid} person={p} hcp={handicapFor(p.uid)} onOpen={() => onOpenPlayer(p.uid)}>
                <button type="button" disabled={!!busy} onClick={() => void run(`acc-${p.uid}`, () => onFollow(p.uid))}
                  className={`${btn} bg-[#166534] text-white`}>
                  <Check className="h-3.5 w-3.5" /> Lägg till tillbaka
                </button>
                <button type="button" disabled={!!busy} onClick={() => void run(`dis-${p.uid}`, () => onDismissRequest(p.uid))}
                  className={`${btn} border border-[#112218]/15 text-[#112218]/70`} aria-label="Ignorera">
                  <X className="h-3.5 w-3.5" />
                </button>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className={h2}>Vänner ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-5 text-center text-sm text-[#112218]/55">
            Inga vänner än. Lägg till någon i listan ovan.
          </p>
        ) : (
          <ul className="space-y-2">
            {friends.map((p) => (
              <PersonRow key={p.uid} person={p} hcp={handicapFor(p.uid)} onOpen={() => onOpenPlayer(p.uid)}>
                <button type="button" disabled={!!busy} onClick={() => void run(`rm-${p.uid}`, () => onRemoveFriend(p.uid))}
                  className={`${btn} border border-red-200 text-red-700`}>
                  <UserMinus className="h-3.5 w-3.5" /> Ta bort
                </button>
              </PersonRow>
            ))}
          </ul>
        )}
      </section>

      {following.length > 0 && (
        <section>
          <h2 className={h2}>Tillagda – har inte lagt till dig än ({following.length})</h2>
          <ul className="space-y-2">
            {following.map((p) => (
              <PersonRow key={p.uid} person={p} hcp={handicapFor(p.uid)} onOpen={() => onOpenPlayer(p.uid)}>
                <button type="button" disabled={!!busy} onClick={() => void run(`un-${p.uid}`, () => onUnfollow(p.uid))}
                  className={`${btn} border border-[#112218]/15 text-[#112218]/70`}>
                  Ta bort
                </button>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
};
