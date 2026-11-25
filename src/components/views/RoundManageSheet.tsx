import React, { useState } from 'react';
import { Copy, Globe2, KeyRound, Loader2, Lock, LockOpen, LogOut, Trash2, UserMinus, UserPlus } from 'lucide-react';
import type { PlayerTourProfile, PubCourse, PubRound, ReusablePlayerProfile } from '../../utils/golfRules';
import { GolferAvatar } from '../GolferAvatar';

interface RoundManageSheetProps {
  round: PubRound;
  course: PubCourse | null;
  players: PlayerTourProfile[];
  me: PlayerTourProfile;
  myPlayerCode: string;
  isRoundOwner: boolean;
  isCourseOwner: boolean;
  onToggleLock: (locked: boolean) => Promise<void>;
  onAddPlayer: (playerCode: string) => Promise<{ ok: boolean; message: string }>;
  /** Vänner (och folk man följer) som inte är med än – läggs till med ett tryck. */
  quickAdd?: ReusablePlayerProfile[];
  /** Övriga spelare i appen (senast aktiva först). */
  morePlayers?: ReusablePlayerProfile[];
  /** Inbjudna som inte svarat än. */
  invited?: ReusablePlayerProfile[];
  onCancelInvite?: (uid: string) => Promise<void>;
  onRemovePlayer: (uid: string) => Promise<void>;
  onToggleCoursePublic: (isPublic: boolean) => Promise<void>;
  onSetCountsForHcp: (counts: boolean) => Promise<void>;
  onLeave: () => Promise<void>;
  onDeleteForAll: (keepMyResult: boolean) => Promise<void>;
}

const card = 'rounded-2xl border border-[#112218]/10 bg-white p-4';
const h3 = 'mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#112218]/55';

const Toggle: React.FC<{ on: boolean; onClick: () => void; disabled?: boolean; label: string }> = ({ on, onClick, disabled, label }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} disabled={disabled}
    className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${on ? 'bg-[#166534]' : 'bg-[#112218]/20'}`}>
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${on ? 'left-6' : 'left-1'}`} />
  </button>
);

/** "Rundan": allt man kan göra med rundan. Ägaren ser fler val. */
export const RoundManageSheet: React.FC<RoundManageSheetProps> = ({
  round,
  course,
  players,
  me,
  myPlayerCode,
  isRoundOwner,
  isCourseOwner,
  onToggleLock,
  onAddPlayer,
  quickAdd = [],
  morePlayers = [],
  invited = [],
  onCancelInvite,
  onRemovePlayer,
  onToggleCoursePublic,
  onSetCountsForHcp,
  onLeave,
  onDeleteForAll,
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [addCode, setAddCode] = useState('');
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const deleted = round.status === 'deleted';
  const countsForHcp = me.countsForHcp !== false;
  const hasScore = me.sips.some((s) => s > 0);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(round.roundId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* visas ändå på skärmen */
    }
  };

  return (
    <div className="space-y-3">
      {/* Kod */}
      <section className="rounded-2xl bg-[#112218] p-4 text-[#F6F4EE]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37]"><KeyRound className="h-3.5 w-3.5" /> Rundans kod</div>
            <div className="mt-1 font-mono text-2xl font-black tracking-[0.2em]">{round.roundId}</div>
          </div>
          <button type="button" onClick={copyCode} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
            <Copy className="h-3.5 w-3.5" /> {copied ? 'Kopierad!' : 'Kopiera'}
          </button>
        </div>
        <p className="mt-2 text-xs text-[#F6F4EE]/60">
          {round.locked ? 'Rundan är låst – ingen fler kan gå med.' : 'Bara de som får koden kan gå med.'} Ditt spelar-ID: <span className="font-mono font-bold text-[#F6F4EE]">{myPlayerCode || '…'}</span>
        </p>
      </section>

      {/* Ägarens val */}
      {isRoundOwner && !deleted && (
        <>
          <section className={`${card} flex items-center justify-between gap-3`}>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#112218]">
                {round.locked ? <Lock className="h-4 w-4 text-[#166534]" /> : <LockOpen className="h-4 w-4 text-[#112218]/50" />} Lås rundan
              </div>
              <p className="text-xs text-[#112218]/60">När alla är med: lås så ingen mer kan gå med via koden.</p>
            </div>
            <Toggle label="Lås rundan" on={round.locked} disabled={busy === 'lock'} onClick={() => void run('lock', () => onToggleLock(!round.locked))} />
          </section>

          <section className={card}>
            <h3 className={h3}>Spelare ({players.length})</h3>
            <ul className="space-y-1">
              {players.map((p) => (
                <li key={p.uid} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                  <GolferAvatar avatarSeed={p.avatarSeed} wins={p.wins} displayName={p.displayName} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[#112218]">{p.displayName}{p.uid === round.ownerId && ' (ägare)'}</div>
                    {p.playerCode && <div className="font-mono text-[11px] text-[#112218]/50">{p.playerCode}</div>}
                  </div>
                  {p.uid !== me.uid && (
                    <button type="button" disabled={busy === `rm-${p.uid}`}
                      onClick={() => void run(`rm-${p.uid}`, () => onRemovePlayer(p.uid))}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50">
                      <UserMinus className="h-3.5 w-3.5" /> Ta bort
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {invited.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-semibold text-[#112218]/55">Inbjudna – väntar på svar ({invited.length})</div>
                <ul className="space-y-1">
                  {invited.map((p) => (
                    <li key={p.uid} className="flex items-center gap-3 rounded-xl bg-[#D4AF37]/10 px-2 py-1.5">
                      <GolferAvatar avatarSeed={p.avatarSeed} displayName={p.displayName} size="xs" />
                      <span className="min-w-0 flex-1 truncate text-sm text-[#112218]">{p.displayName}</span>
                      {onCancelInvite && (
                        <button type="button" disabled={busy === `ci-${p.uid}`}
                          onClick={() => void run(`ci-${p.uid}`, () => onCancelInvite(p.uid))}
                          className="rounded-full border border-[#112218]/15 px-2.5 py-1 text-[11px] font-semibold text-[#112218]/70 disabled:opacity-50">
                          Ångra
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {[
              { label: 'Bjud in vänner', list: quickAdd },
              ...(morePlayers.length > 0 ? [{ label: 'Andra spelare', list: showMore ? morePlayers : morePlayers.slice(0, 6) }] : []),
            ].map((group) =>
              group.list.length === 0 ? null : (
                <div key={group.label} className="mt-3">
                  <div className="mb-1.5 text-[11px] font-semibold text-[#112218]/55">{group.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.list.map((f) => (
                      <button key={f.uid} type="button" disabled={!!busy || !f.playerCode}
                        onClick={() => void run(`qa-${f.uid}`, async () => {
                          const res = await onAddPlayer(f.playerCode || '');
                          setAddMsg({ ok: res.ok, text: res.message });
                        })}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#166534]/30 bg-[#166534]/5 py-1 pl-1 pr-2.5 text-xs font-semibold text-[#112218] disabled:opacity-50">
                        <GolferAvatar avatarSeed={f.avatarSeed} displayName={f.displayName} size="xs" />
                        {busy === `qa-${f.uid}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3 text-[#166534]" />}
                        {f.displayName.split(' ')[0]}
                      </button>
                    ))}
                    {group.label === 'Andra spelare' && !showMore && morePlayers.length > 6 && (
                      <button type="button" onClick={() => setShowMore(true)} className="px-2 text-xs font-semibold text-[#166534]">
                        +{morePlayers.length - 6} till
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
            <form className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!addCode.trim()) return;
                void run('add', async () => {
                  const res = await onAddPlayer(addCode);
                  setAddMsg({ ok: res.ok, text: res.message });
                  if (res.ok) setAddCode('');
                });
              }}>
              <input value={addCode} onChange={(e) => setAddCode(e.target.value.toUpperCase())} placeholder="Spelar-ID, t.ex. AL1234" maxLength={10}
                className="min-w-0 flex-1 rounded-xl border border-[#112218]/15 px-3 py-2 font-mono text-sm tracking-wider outline-none focus:border-[#166534]" />
              <button type="submit" disabled={!addCode.trim() || busy === 'add'}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#166534] px-3 text-xs font-bold text-white disabled:opacity-50">
                {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Bjud in
              </button>
            </form>
            {addMsg && <p className={`mt-1.5 text-xs ${addMsg.ok ? 'text-[#166534]' : 'text-red-700'}`}>{addMsg.text}</p>}
          </section>
        </>
      )}

      {isCourseOwner && course && (
        <section className={`${card} flex items-center justify-between gap-3`}>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#112218]">
              {course.isPublic ? <Globe2 className="h-4 w-4 text-[#166534]" /> : <Lock className="h-4 w-4 text-[#112218]/50" />} Öppen bana
            </div>
            <p className="text-xs text-[#112218]/60">
              {course.isPublic ? 'Alla kan starta egna rundor på banan.' : 'Banan är privat – bara du kan spela den.'} Påverkar inte den här rundan.
            </p>
          </div>
          <Toggle label="Öppen bana" on={!!course.isPublic} disabled={busy === 'pub'} onClick={() => void run('pub', () => onToggleCoursePublic(!course.isPublic))} />
        </section>
      )}

      {/* Mitt resultat */}
      <section className={`${card} flex items-center justify-between gap-3`}>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#112218]">Räkna rundan i mitt HCP</div>
          <p className="text-xs text-[#112218]/60">Stäng av om rundan inte ska påverka ditt handicap eller din statistik.</p>
        </div>
        <Toggle label="Räkna i HCP" on={countsForHcp} disabled={busy === 'hcp'} onClick={() => void run('hcp', () => onSetCountsForHcp(!countsForHcp))} />
      </section>

      {/* Lämna / radera */}
      <section className={`${card} space-y-2`}>
        {confirm === 'leave' ? (
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-900">
              {deleted || !hasScore ? 'Ta bort rundan från din historik?' : 'Avbryta rundan? Ditt resultat raderas.'}
            </p>
            {isRoundOwner && !deleted && players.length > 1 && (
              <p className="mt-1 text-xs text-red-900/80">De andra kan spela vidare. Vill du stoppa rundan för alla, använd "Radera för alla" i stället.</p>
            )}
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void run('leave', onLeave)} disabled={busy === 'leave'}
                className="flex-1 rounded-xl bg-red-700 py-2 text-xs font-bold text-white disabled:opacity-60">Ja, radera mitt resultat</button>
              <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-xl border border-[#112218]/15 py-2 text-xs font-semibold">Avbryt</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm('leave')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-700">
            <LogOut className="h-4 w-4" /> {deleted ? 'Ta bort från min historik' : isRoundOwner ? 'Radera bara för mig' : 'Avbryt rundan (radera mitt resultat)'}
          </button>
        )}

        {isRoundOwner && !deleted && (
          confirm === 'delete' ? (
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-900">Radera rundan för alla?</p>
              <p className="mt-1 text-xs text-red-900/80">Rundan stängs. Varje spelare får frågan om de vill spara sitt eget resultat.</p>
              <div className="mt-2 grid gap-2">
                <button type="button" onClick={() => void run('del', () => onDeleteForAll(true))} disabled={!!busy}
                  className="rounded-xl bg-red-700 py-2 text-xs font-bold text-white disabled:opacity-60">Radera för alla – spara mitt resultat</button>
                <button type="button" onClick={() => void run('del', () => onDeleteForAll(false))} disabled={!!busy}
                  className="rounded-xl border border-red-700 py-2 text-xs font-bold text-red-700 disabled:opacity-60">Radera för alla – även mitt resultat</button>
                <button type="button" onClick={() => setConfirm(null)} className="rounded-xl border border-[#112218]/15 py-2 text-xs font-semibold">Avbryt</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirm('delete')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-2.5 text-sm font-semibold text-white">
              <Trash2 className="h-4 w-4" /> Radera för alla
            </button>
          )
        )}
      </section>
    </div>
  );
};
