import { supabase } from '@/integrations/supabase/client';
import type { Item } from './recommend';
import { startTiming } from './timings';
export type QueueCard = { item: Item; reason: string; matched: string[]; score: number; exploratory: boolean };
export async function discoverQueue(media: 'film' | 'book', filters: Record<string, unknown>, excludes: string[], seed: string): Promise<QueueCard[]> {
  const finish = startTiming('queue refill');
  try {
    const result = await supabase.rpc('get_discover_queue', { media_type: media, filters: filters as never, exclude_ids: excludes, seed, limit: 8 }).abortSignal(AbortSignal.timeout(8000));
    if (result.error) throw result.error;
    return (result.data as unknown as QueueCard[]).map(card => ({ ...card, item: { description_en: '', description_ka: null, ...card.item } }));
  } finally { finish(); }
}
export async function recordSwipe(item: Item, action: 'like' | 'pass', dwell: number, opened: boolean) {
  const finish = startTiming('record-swipe request');
  try { const result = await supabase.rpc('record_swipe', { item_id: item.id, action, dwell_ms: Math.round(dwell), opened_details: opened }); if (result.error) throw result.error; return result.data; }
  finally { finish(); }
}