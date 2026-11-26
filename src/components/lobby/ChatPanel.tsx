import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { TRASH_TALK, type RoundMessage } from '../../utils/golfRules';
import { GolferAvatar } from '../GolferAvatar';
import { TomatoIcon } from './Tomato';

interface ChatPanelProps {
  messages: RoundMessage[];
  meUid: string;
  nameFor: (uid: string) => string;
  avatarFor: (uid: string) => string;
  onSend: (text: string) => Promise<void>;
  /** Höjd på meddelandelistan. */
  maxHeightClass?: string;
}

const timeLabel = (ms: number) =>
  new Date(ms).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

/** Rundans snack: meddelanden, tomatkast och färdiga pikar. */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  meUid,
  nameFor,
  avatarFor,
  onSend,
  maxHeightClass = 'max-h-80',
}) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Tre slumpade pikar, byts när man skickat en
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * TRASH_TALK.length));
  const taunts = useMemo(
    () => [0, 3, 5].map((o) => TRASH_TALK[(seed + o) % TRASH_TALK.length]),
    [seed]
  );

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async (value: string) => {
    const t = value.trim().slice(0, 280);
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(t);
      setText('');
      setSeed((s) => s + 1);
    } catch {
      setError('Kunde inte skicka. Försök igen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={listRef} className={`${maxHeightClass} min-h-[120px] space-y-2 overflow-y-auto rounded-2xl bg-[#F6F4EE] p-3`}>
        {messages.length === 0 && (
          <p className="py-6 text-center text-sm text-[#112218]/50">Tyst i lobbyn… börja psyka någon.</p>
        )}
        {messages.map((m) => {
          if (m.type === 'tomato') {
            return (
              <div key={m.id} className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-800/80">
                <TomatoIcon size={14} />
                {m.uid === meUid ? 'Du' : nameFor(m.uid)} kastade en tomat på{' '}
                {m.targetUid === meUid ? 'dig' : nameFor(m.targetUid || '')}
              </div>
            );
          }
          const mine = m.uid === meUid;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              {!mine && <GolferAvatar avatarSeed={avatarFor(m.uid)} displayName={nameFor(m.uid)} size="xs" />}
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? 'rounded-br-md bg-[#112218] text-[#F6F4EE]' : 'rounded-bl-md bg-white text-[#112218] shadow-xs'}`}>
                {!mine && <div className="text-[11px] font-semibold text-[#166534]">{nameFor(m.uid)}</div>}
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div className={`mt-0.5 text-right text-[10px] ${mine ? 'text-[#F6F4EE]/50' : 'text-[#112218]/40'}`}>{timeLabel(m.createdMs)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {taunts.map((t) => (
          <button key={t} type="button" disabled={busy} onClick={() => void send(t)}
            className="shrink-0 rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-semibold text-[#112218] disabled:opacity-50">
            {t}
          </button>
        ))}
      </div>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <label htmlFor="pg-chat-input" className="sr-only">Skriv i snacket</label>
        <input id="pg-chat-input" value={text} maxLength={280} onChange={(e) => setText(e.target.value)}
          placeholder="Skriv något elakt…"
          className="min-w-0 flex-1 rounded-2xl border border-[#112218]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#166534]" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Skicka"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#112218] text-[#D4AF37] disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </form>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
};
