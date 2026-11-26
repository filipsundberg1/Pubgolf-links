import { useEffect, useRef, useState } from 'react';
import type { RoundMessage } from '../../utils/golfRules';

/**
 * Följer nya tomater i snacket: vem som just blev träffad (för kladd-animationen)
 * och vem som kastade på mig. Gamla tomater (innan vyn öppnades) animeras inte.
 */
export function useTomatoHits(messages: RoundMessage[], meUid: string) {
  const seen = useRef<Set<string> | null>(null);
  const [hits, setHits] = useState<Record<string, number>>({});
  const [hitBy, setHitBy] = useState<{ uid: string; at: number } | null>(null);

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(messages.map((m) => m.id));
      return;
    }
    const fresh = messages.filter((m) => !seen.current!.has(m.id));
    if (fresh.length === 0) return;
    for (const m of fresh) seen.current.add(m.id);
    const tomatoes = fresh.filter((m) => m.type === 'tomato' && m.targetUid);
    if (tomatoes.length === 0) return;
    const now = Date.now();
    setHits((prev) => {
      const next = { ...prev };
      for (const t of tomatoes) next[t.targetUid!] = now;
      return next;
    });
    const onMe = tomatoes.filter((t) => t.targetUid === meUid).pop();
    if (onMe) setHitBy({ uid: onMe.uid, at: now });
    const timer = setTimeout(() => {
      setHits((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(next)) if (Date.now() - v > 1500) delete next[k];
        return next;
      });
      setHitBy((h) => (h && Date.now() - h.at > 1500 ? null : h));
    }, 1700);
    return () => clearTimeout(timer);
  }, [messages, meUid]);

  const tomatoCount = (uid: string) => messages.filter((m) => m.type === 'tomato' && m.targetUid === uid).length;
  return { hits, hitBy, tomatoCount };
}
