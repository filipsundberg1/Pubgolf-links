import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Panel som glider upp nerifrån (mobil) / centreras (desktop). */
export const Sheet: React.FC<SheetProps> = ({ open, title, onClose, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Stäng" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-[#F6F4EE] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#112218]/10 px-5 py-3">
          <h2 className="font-display text-lg font-bold text-[#112218]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#112218]/70 hover:bg-[#112218]/10"
            aria-label="Stäng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};
