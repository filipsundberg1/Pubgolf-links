import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Compass, Info, LogOut, Map as MapIcon, ShieldCheck, UserPlus, UserRound } from 'lucide-react';
import { GolferAvatar } from '../GolferAvatar';
import { BrandMark } from './BrandMark';

interface AppHeaderProps {
  displayName: string;
  avatarSeed: string;
  handicap: string;
  wins?: number;
  friendRequests?: number;
  isAdmin?: boolean;
  onOpenFriends: () => void;
  onOpenAdmin: () => void;
  onGoHome: () => void;
  onOpenMyProfile: () => void;
  onOpenMyCourses: () => void;
  onOpenPlayers: () => void;
  onOpenAbout: () => void;
  onSignOut: () => void;
}

/** Toppfält: logga till vänster, profilmeny alltid uppe till höger. */
export const AppHeader: React.FC<AppHeaderProps> = ({
  displayName,
  avatarSeed,
  handicap,
  wins = 0,
  friendRequests = 0,
  isAdmin = false,
  onOpenFriends,
  onOpenAdmin,
  onGoHome,
  onOpenMyProfile,
  onOpenMyCourses,
  onOpenPlayers,
  onOpenAbout,
  onSignOut,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const itemClass =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#112218] hover:bg-[#112218]/5';

  return (
    <header className="sticky top-0 z-30 border-b border-[#D4AF37]/30 bg-[#112218]/95 text-[#F6F4EE] shadow-[0_2px_12px_rgba(0,0,0,0.18)] backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-[#F6F4EE]"
        >
          <BrandMark size={34} className="rounded-[10px] ring-1 ring-[#D4AF37]/60" />
          <span>
            Pubgolf <span className="text-[#D4AF37]">Links</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
        <button type="button" onClick={onOpenPlayers}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#F6F4EE] hover:bg-white/10">
          <Compass className="h-4 w-4 text-[#D4AF37]" /> <span className="hidden min-[380px]:inline">Utforska</span>
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="relative flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-2.5 text-[#F6F4EE] hover:bg-white/10"
          >
            {friendRequests > 0 && (
              <span className="absolute -left-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {friendRequests}
              </span>
            )}
            <GolferAvatar avatarSeed={avatarSeed} wins={wins} displayName={displayName} size="xs" />
            <span className="hidden max-w-[110px] truncate text-xs font-semibold sm:inline">
              {displayName}
            </span>
            <ChevronDown className={`h-4 w-4 text-[#F6F4EE]/60 transition ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-[#112218]/10 bg-white p-2 shadow-xl"
            >
              <div className="mb-1 flex items-center gap-3 rounded-xl bg-[#112218] px-3 py-3 text-[#F6F4EE]">
                <GolferAvatar avatarSeed={avatarSeed} wins={wins} displayName={displayName} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{displayName}</div>
                  <div className="text-xs text-[#D4AF37]">HCP {handicap}</div>
                </div>
              </div>
              <button type="button" role="menuitem" className={itemClass} onClick={pick(onOpenMyProfile)}>
                <UserRound className="h-4 w-4 text-[#166534]" /> Min profil
              </button>
              <button type="button" role="menuitem" className={itemClass} onClick={pick(onOpenMyCourses)}>
                <MapIcon className="h-4 w-4 text-[#166534]" /> Mina banor
              </button>
              <button type="button" role="menuitem" className={itemClass} onClick={pick(onOpenFriends)}>
                <UserPlus className="h-4 w-4 text-[#166534]" /> Vänner
                {friendRequests > 0 && (
                  <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">{friendRequests} ny</span>
                )}
              </button>
              <button type="button" role="menuitem" className={itemClass} onClick={pick(onOpenPlayers)}>
                <Compass className="h-4 w-4 text-[#166534]" /> Utforska
              </button>
              <button type="button" role="menuitem" className={itemClass} onClick={pick(onOpenAbout)}>
                <Info className="h-4 w-4 text-[#166534]" /> Om sidan
              </button>
              {isAdmin && (
                <button type="button" role="menuitem" className={itemClass} onClick={pick(onOpenAdmin)}>
                  <ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> Admin
                </button>
              )}
              <div className="my-1 border-t border-[#112218]/10" />
              <button type="button" role="menuitem" className={itemClass} onClick={pick(onSignOut)}>
                <LogOut className="h-4 w-4 text-red-700" /> Logga ut
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  );
};
