import { useSyncExternalStore } from 'react';

export const REQUEST_TIMEOUT_MS = 8000;
export const MAX_READ_RETRIES = 2;
type Entry = { kind: string; name: string; at: number; duration?: number | undefined; status?: number | string | undefined };
let entries: Entry[] = [];
const listeners = new Set<() => void>();
const empty: Entry[] = [];
let installed = false;
let debug = false;
let interactive = false;
const counts = new Map<string, number[]>();
export function scrub(value: string) {
  return value.replace(/https?:\/\/\S+/g, '[url]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '[id]')
    .replace(/\b(?:sb_[\w-]+|eyJ[\w.-]+)\b/g, '[secret]')
    .replace(/(?:bearer|token|apikey|password|secret|key)\s*[:=]\s*\S+/gi, '[credential]');
}
export function endpointName(input: RequestInfo | URL) {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  try {
    const path = new URL(raw, 'https://local.invalid').pathname;
    const match = path.match(/\/(?:rest\/v1\/(?:rpc\/)?|auth\/v1\/)([a-z_]+)/i);
    return match?.[1] ?? (path.includes('server-fn') ? 'server-function' : 'fetch');
  } catch { return 'fetch'; }
}
export function shouldRetry(method: string, status?: number) { return (method === 'GET' || method === 'HEAD') && (status === undefined || status >= 500); }
export function bootMark(name: string, kind = 'timeline', duration?: number, status?: number | string) {
  if (typeof window === 'undefined' || !debug) return;
  entries = [...entries, { kind, name: scrub(name), at: Math.round(performance.now()), duration, status }].slice(-200);
  if (kind === 'timeline') performance.mark(name);
  listeners.forEach(listener => listener());
}
export function firstInteractive() { interactive = true; bootMark('[UI] first screen interactive'); }
export function isInteractive() { return interactive; }
export function captureError(error: unknown) { bootMark(error instanceof Error ? error.message : String(error), 'error'); }
export function useBootEntries() { return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => entries, () => empty); }

export function initializeDiagnostics() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  debug = new URLSearchParams(location.search).get('debug') === '1';
  bootMark('[BOOT] main script executed');
  bootMark('[BOOT] React mounted');
  const nativeFetch = window.fetch.bind(window);
  // The generated client delegates to global fetch; keep that generated client untouched.
  window.fetch = async (input, init) => {
    const name = endpointName(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const parent = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const started = performance.now();
    const times = [...(counts.get(name) ?? []).filter(at => started - at < 5000), started];
    counts.set(name, times);
    if (times.length > 5) bootMark(`${name}: more than 5 calls in 5 seconds`, 'warning');
    bootMark(name, 'request-start');
    let status: number | string = 'network error';
    try {
      for (let attempt = 0; ; attempt++) {
        const controller = new AbortController();
        const abort = () => controller.abort(parent?.reason);
        if (parent?.aborted) abort(); else parent?.addEventListener('abort', abort, { once: true });
        const timer = window.setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), REQUEST_TIMEOUT_MS);
        try {
          const response = await nativeFetch(input, { ...init, signal: controller.signal });
          // Read the body within the request deadline, not only the response headers.
          const body = await response.arrayBuffer();
          status = response.status;
          if (attempt < MAX_READ_RETRIES && shouldRetry(method, response.status) && !parent?.aborted) {
            await new Promise(resolve => window.setTimeout(resolve, 250 * 2 ** attempt)); continue;
          }
          return new Response(response.status === 204 || response.status === 205 || method === 'HEAD' ? null : body, { status: response.status, statusText: response.statusText, headers: response.headers });
        } catch (error) {
          status = controller.signal.aborted ? 'aborted' : 'network error';
          if (controller.signal.aborted || parent?.aborted || attempt >= MAX_READ_RETRIES || !shouldRetry(method)) throw error;
          await new Promise(resolve => window.setTimeout(resolve, 250 * 2 ** attempt));
        } finally { window.clearTimeout(timer); parent?.removeEventListener('abort', abort); }
      }
    } finally { bootMark(name, 'request', Math.round(performance.now() - started), status); }
  };
  window.addEventListener('error', event => captureError(event.error ?? event.message));
  window.addEventListener('unhandledrejection', event => captureError(event.reason));
  if (debug) {
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => { captureError(args.map(value => value instanceof Error ? value.message : String(value)).join(' ')); original(...args); };
    try {
      const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) if (entry.duration > 50) bootMark('main-thread task', 'longtask', Math.round(entry.duration)); });
      observer.observe({ type: 'longtask', buffered: true });
      window.setTimeout(() => observer.disconnect(), 15000);
    } catch { bootMark('Long-task observer unavailable', 'warning'); }
  }
}
export function renderCounter(name: string) {
  if (!import.meta.env.DEV || !debug) return;
  const now = performance.now(); const key = `render:${name}`;
  const times = [...(counts.get(key) ?? []).filter(at => now - at < 2000), now]; counts.set(key, times);
  if (times.length === 21) bootMark(`${name}: over 20 renders in 2 seconds`, 'warning');
}
export async function resetLocalApp() {
  if ('serviceWorker' in navigator) for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
  if ('caches' in window) for (const key of await caches.keys()) if (key.startsWith('phi-')) await caches.delete(key);
  localStorage.clear(); sessionStorage.clear(); location.reload();
}
export function reportText(extra: string) { return scrub(['Philomathia startup diagnostics', extra, ...entries.map(e => `${e.at}ms ${e.kind} ${e.name}${e.duration == null ? '' : ` ${e.duration}ms`}${e.status == null ? '' : ` ${e.status}`}`)].join('\n')); }