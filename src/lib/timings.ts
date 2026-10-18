import { useSyncExternalStore } from 'react';
export type Timing = { name: string; ms: number; at: string };
let values: Timing[] = [];
const listeners = new Set<() => void>();
export function recordTiming(name: string, ms: number) {
  values = [...values, { name, ms: Math.round(ms * 10) / 10, at: new Date().toISOString() }].slice(-20);
  listeners.forEach(listener => listener());
}
export function startTiming(name: string) { const start = performance.now(); return () => recordTiming(name, performance.now() - start); }
export function useTimings() { return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => values, () => values); }
export function haptic() { if (typeof navigator !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(10); }