import React, { useMemo, useState } from 'react';
import { Check, Loader2, Pencil, Shuffle, User, Users, X } from 'lucide-react';
import { GAME_MODE_LABELS, type PlayerTourProfile, type PubGolfGameMode } from '../../utils/golfRules';
import { GolferAvatar } from '../GolferAvatar';

interface TeamSetupProps {
  players: PlayerTourProfile[];
  gameMode: PubGolfGameMode;
  isOwner: boolean;
  meUid: string;
  onSetGameMode: (mode: PubGolfGameMode) => Promise<void>;
  onAssignTeam: (uids: string[], teamId: string, teamName: string) => Promise<void>;
}

const first = (name: string) => name.split(' ')[0] || name;
const teamIdFor = (uids: string[]) => `team-${[...uids].sort().join('-')}`.slice(0, 60);

/** Spelform och lagindelning – görs i lobbyn innan rundan startar. Bara ägaren ändrar. */
export const TeamSetup: React.FC<TeamSetupProps> = ({ players, gameMode, isOwner, meUid, onSetGameMode, onAssignTeam }) => {
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const isTeams = gameMode === 'brutal';

  const { teams, unassigned } = useMemo(() => {
    const map = new Map<string, { teamId: string; teamName: string; members: PlayerTourProfile[] }>();
    const free: PlayerTourProfile[] = [];
    for (const p of players) {
      const id = (p.teamId || '').trim();
      if (!id) {
        free.push(p);
        continue;
      }
      const t = map.get(id) || { teamId: id, teamName: p.teamName || '', members: [] };
      t.members.push(p);
      if (!t.teamName && p.teamName) t.teamName = p.teamName;
      map.set(id, t);
    }
    return { teams: [...map.values()], unassigned: free };
  }, [players]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const pair = (a: PlayerTourProfile, b?: PlayerTourProfile) => {
    const uids = b ? [a.uid, b.uid] : [a.uid];
    const name = b ? `${first(a.displayName)} & ${first(b.displayName)}` : `Lag ${first(a.displayName)}`;
    return onAssignTeam(uids, teamIdFor(uids), name);
  };

  const pick = (p: PlayerTourProfile) => {
    if (!isOwner || busy) return;
    if (!picked) return setPicked(p.uid);
    if (picked === p.uid) return setPicked(null);
    const a = players.find((x) => x.uid === picked);
    setPicked(null);
    if (a) void run('pair', () => pair(a, p));
  };

  const shuffle = () =>
    run('shuffle', async () => {
      const pool = [...players];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      for (let i = 0; i < pool.length; i += 2) await pair(pool[i], pool[i + 1]);
    });

  return (
    <div className="space-y-3">
      {/* Spelform */}
      <div className="grid grid-cols-2 gap-2">
        {(['single', 'brutal'] as PubGolfGameMode[]).map((mode) => {
          const active = gameMode === mode;
          const Icon = mode === 'single' ? User : Users;
          return (
            <button key={mode} type="button" disabled={!isOwner || !!busy}
              onClick={() => !active && void run('mode', () => onSetGameMode(mode))}
              className={`rounded-2xl border-2 p-3 text-left transition disabled:cursor-default ${active ? 'border-[#166534] bg-[#166534]/5' : 'border-[#112218]/10 bg-white'} ${!isOwner && !active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#112218]">
                <Icon className={`h-4 w-4 ${active ? 'text-[#166534]' : 'text-[#112218]/50'}`} /> {GAME_MODE_LABELS[mode].title}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-[#112218]/60">{GAME_MODE_LABELS[mode].description}</div>
            </button>
          );
        })}
      </div>
      {!isOwner && <p className="text-xs text-[#112218]/55">Ägaren väljer spelform och lag innan start.</p>}

      {isTeams && (
        <div className="space-y-3">
          {/* Lagen */}
          {teams.length > 0 && (
            <ul className="space-y-2">
              {teams.map((t) => (
                <li key={t.teamId} className={`rounded-2xl border px-3 py-2.5 ${t.members.some((m) => m.uid === meUid) ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#112218]/10 bg-[#F6F4EE]'}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 -space-x-2">
                      {t.members.map((m) => (
                        <GolferAvatar key={m.uid} avatarSeed={m.avatarSeed} displayName={m.displayName} size="sm" />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      {renaming === t.teamId ? (
                        <form className="flex gap-1.5" onSubmit={(e) => {
                          e.preventDefault();
                          const name = nameDraft.trim().slice(0, 60) || t.teamName;
                          setRenaming(null);
                          void run(`ren-${t.teamId}`, () => onAssignTeam(t.members.map((m) => m.uid), t.teamId, name));
                        }}>
                          <label htmlFor={`team-name-${t.teamId}`} className="sr-only">Lagnamn</label>
                          <input id={`team-name-${t.teamId}`} autoFocus value={nameDraft} maxLength={60} onChange={(e) => setNameDraft(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-[#112218]/20 bg-white px-2 py-1 text-sm" />
                          <button type="submit" aria-label="Spara lagnamn" className="rounded-lg bg-[#166534] px-2 text-white"><Check className="h-4 w-4" /></button>
                        </form>
                      ) : (
                        <>
                          <div className="truncate text-sm font-bold text-[#112218]">{t.teamName || 'Lag'}</div>
                          <div className="truncate text-[11px] text-[#112218]/60">{t.members.map((m) => (m.uid === meUid ? 'du' : first(m.displayName))).join(' + ')}</div>
                        </>
                      )}
                    </div>
                    {isOwner && renaming !== t.teamId && (
                      <>
                        <button type="button" aria-label={`Byt namn på ${t.teamName}`} disabled={!!busy}
                          onClick={() => { setRenaming(t.teamId); setNameDraft(t.teamName); }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#112218]/60 hover:bg-[#112218]/5">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label={`Lös upp ${t.teamName}`} disabled={!!busy}
                          onClick={() => void run(`un-${t.teamId}`, () => onAssignTeam(t.members.map((m) => m.uid), '', ''))}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#112218]/60 hover:bg-[#112218]/5">
                          {busy === `un-${t.teamId}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-4 w-4" />}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Utan lag */}
          {unassigned.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold text-[#112218]/55">
                Utan lag ({unassigned.length}){isOwner ? ' – tryck på två spelare för att para ihop dem' : ''}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map((p) => (
                  <button key={p.uid} type="button" disabled={!isOwner || !!busy} onClick={() => pick(p)}
                    className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition disabled:cursor-default ${picked === p.uid ? 'border-[#166534] bg-[#166534] text-white' : 'border-[#112218]/15 bg-white text-[#112218]'}`}>
                    <GolferAvatar avatarSeed={p.avatarSeed} displayName={p.displayName} size="xs" />
                    {p.uid === meUid ? 'Du' : first(p.displayName)}
                  </button>
                ))}
                {isOwner && picked && unassigned.length % 2 === 1 && (
                  <button type="button" disabled={!!busy}
                    onClick={() => { const a = players.find((x) => x.uid === picked); setPicked(null); if (a) void run('solo', () => pair(a)); }}
                    className="rounded-full border border-dashed border-[#112218]/30 px-3 py-1 text-xs font-semibold text-[#112218]/70">
                    Kör solo
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-[#112218]/50">Den som saknar lag när rundan startar paras ihop automatiskt.</p>
            </div>
          )}

          {isOwner && players.length > 1 && (
            <button type="button" disabled={!!busy} onClick={() => void shuffle()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#112218]/15 bg-white py-2.5 text-xs font-bold text-[#112218] disabled:opacity-60">
              {busy === 'shuffle' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4 text-[#166534]" />}
              Slumpa lag
            </button>
          )}
        </div>
      )}
    </div>
  );
};
