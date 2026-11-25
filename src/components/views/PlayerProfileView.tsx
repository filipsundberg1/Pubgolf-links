import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Globe2, Lock } from 'lucide-react';
import { formatEventDate, type PlayerCareerStats, type PubCourse, type ReusablePlayerProfile } from '../../utils/golfRules';
import { GolferAvatar } from '../GolferAvatar';
import { FollowButton, lastActiveLabel, type Relation } from './ExploreView';

interface PlayerProfileViewProps {
  player: ReusablePlayerProfile;
  stats: PlayerCareerStats | undefined;
  handicap: string;
  relation: Relation;
  /** Öppnad via spelarens "Lägg till mig"-länk. */
  invited?: boolean;
  /** Spelarens banor som man får se (öppna banor, eller alla om det är ens egna). */
  courses: PubCourse[];
  holeCountFor: (course: PubCourse) => number;
  onBack: () => void;
  onFollow: () => Promise<void>;
  onOpenCourse: (courseId: string) => void;
}

/** En annan spelares profil: spelarkort, banor och rundor man spelat ihop. */
export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  player,
  stats,
  handicap,
  relation,
  invited = false,
  courses,
  holeCountFor,
  onBack,
  onFollow,
  onOpenCourse,
}) => {
  const [tab, setTab] = useState<'courses' | 'rounds'>('courses');
  const history = stats?.roundHistory || [];
  return (
    <div className="space-y-5 pb-10">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
        <ArrowLeft className="h-4 w-4" /> Tillbaka
      </button>

      {invited && relation !== 'friend' && relation !== 'following' && (
        <section className="flex items-center gap-3 rounded-2xl border-2 border-[#D4AF37] bg-[#D4AF37]/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[#112218]">{player.displayName.split(' ')[0]} vill spela pubgolf med dig</div>
            <div className="text-xs text-[#112218]/65">Lägg till så kan ni ta med varandra i rundor direkt.</div>
          </div>
          <FollowButton relation={relation} onFollow={onFollow} size="md" />
        </section>
      )}

      <section className="overflow-hidden rounded-3xl bg-[#112218] text-[#F6F4EE] shadow-xl">
        <div className="flex items-center gap-4 p-5">
          <GolferAvatar avatarSeed={player.avatarSeed} displayName={player.displayName} size="lg" wins={player.wins || 0} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">{lastActiveLabel(player.lastActiveMs)}</div>
            <h1 className="truncate font-display text-2xl font-bold">{player.displayName}</h1>
            <p className="truncate text-sm text-[#F6F4EE]/65">"{player.nickname}" · {player.homePub}</p>
            {player.playerCode && (
              <p className="mt-1 text-xs text-[#F6F4EE]/65">
                Spelar-ID <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono font-bold tracking-wider text-[#F6F4EE]">{player.playerCode}</span>
              </p>
            )}
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">HCP</div>
            <div className="font-mono text-3xl font-black">{handicap}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 py-3 text-center">
          {[
            ['Vinster', player.wins ?? stats?.wins ?? 0],
            ['Rundor ihop', stats?.roundsPlayed ?? 0],
            ['Signatur', player.signatureDrink],
            ['Klubba', player.favoriteClub],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 px-1">
              <div className="truncate font-mono text-base font-black">{value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#F6F4EE]/50">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        {player.bio ? <p className="min-w-0 flex-1 text-sm text-[#112218]/75">{player.bio}</p> : <span />}
        <FollowButton relation={relation} onFollow={onFollow} size="md" />
      </div>

      <div className="flex gap-1 rounded-2xl bg-[#112218]/5 p-1">
        {([
          ['courses', `Banor (${courses.length})`],
          ['rounds', `Rundor ihop (${history.length})`],
        ] as ['courses' | 'rounds', string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab === id ? 'bg-white text-[#112218] shadow-xs' : 'text-[#112218]/60'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'courses' &&
        (courses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-5 text-center text-sm text-[#112218]/55">Inga öppna banor.</p>
        ) : (
          <div className="space-y-2">
            {courses.map((c) => (
              <button key={c.courseId} type="button" onClick={() => onOpenCourse(c.courseId)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-4 py-3 text-left shadow-xs hover:bg-[#112218]/5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F6F4EE] text-[#166534]">
                  {c.isPublic ? <Globe2 className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-[#112218]">{c.title}</div>
                  <div className="truncate text-xs text-[#112218]/60">{c.city} · {holeCountFor(c)} hål</div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#112218]/40" />
              </button>
            ))}
          </div>
        ))}

      {tab === 'rounds' &&
        (history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#112218]/20 px-4 py-5 text-center text-sm text-[#112218]/55">Ni har inte spelat ihop än.</p>
        ) : (
          <div className="space-y-2">
            {history.map((r) => (
              <div key={r.courseId} className="flex items-center gap-3 rounded-2xl border border-[#112218]/10 bg-white px-4 py-3 shadow-xs">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-[#112218]">{r.title}</div>
                  <div className="text-xs text-[#112218]/60">{formatEventDate(r.eventDate)} · {r.thruHoles} hål</div>
                </div>
                <div className="font-mono text-base font-black text-[#112218]">{r.toParFormatted}</div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
};
