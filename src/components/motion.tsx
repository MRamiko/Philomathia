import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { useBlocker, useRouterState } from '@tanstack/react-router';
import { Button } from './auth-form';
import { useLocale } from '@/lib/locale';
export function motionWait() {
  const duration = getComputedStyle(document.documentElement).getPropertyValue(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '--motion-fast' : '--motion-standard');
  return new Promise<void>(resolve => window.setTimeout(resolve, parseFloat(duration)));
}

export function ScreenMotion({ children }: { children: ReactNode }) {
  const location = useRouterState({ select: s => s.location });
  const previous = useRef(location.pathname);
  const previousIndex = useRef(location.state.__TSR_index ?? 0);
  const [intro, setIntro] = useState(false);
  const path = location.pathname;
  const from = previous.current;
  const backward = Number(location.state.__TSR_index ?? 0) < Number(previousIndex.current);
  const direction = backward || path === '/login' && from === '/signup' ? 'back' : ['/signup', '/shops'].includes(path) || path.startsWith('/item/') ? 'push' : 'tab';
  useEffect(() => { previous.current = path; previousIndex.current = location.state.__TSR_index ?? 0; }, [path, location.state.__TSR_index]);
  useEffect(() => {
    if (!(window as Window & { phiMotionLogged?: boolean }).phiMotionLogged) {
      console.info(`Philomathia prefers-reduced-motion: ${window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'active' : 'inactive'}`);
      (window as Window & { phiMotionLogged?: boolean }).phiMotionLogged = true;
    }
    if (sessionStorage.getItem('phi-launched')) return;
    sessionStorage.setItem('phi-launched', '1');
    setIntro(true);
    const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-slow'));
    const timer = window.setTimeout(() => setIntro(false), duration);
    return () => window.clearTimeout(timer);
  }, []);
  return <>
    {intro && <div className="launch-mark" aria-hidden="true">Φ</div>}
    <div key={location.href} className={`screen-motion screen-${direction}`}>{children}</div>
  </>;
}

function duration(token: string) { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '--motion-fast' : token)) || 100; }
export function usePresence(onExit: () => void) {
  const [state, setState] = useState<'open' | 'closing' | 'closed'>('open');
  const locked = useRef(false); const done = useRef(false); const exit = useRef(onExit); exit.current = onExit;
  const finish = () => { if (done.current) return; done.current = true; setState('closed'); exit.current(); };
  const close = () => { if (locked.current) return; locked.current = true; setState('closing'); };
  useEffect(() => { if (state !== 'closing') return; const timer = window.setTimeout(finish, duration('--motion-standard') + 50); return () => clearTimeout(timer); }, [state]);
  return { state, close, finish };
}
export function Presence({ children, onExit, className = '', historyEntry = false, autoClose }: { children: (close: () => void) => ReactNode; onExit: () => void; className?: string; historyEntry?: boolean; autoClose?: number }) {
  const { state, close, finish } = usePresence(onExit);
  const root = useRef<HTMLDivElement>(null);
  useBlocker({ shouldBlockFn: async ({ action }) => {
    if (!historyEntry) return false;
    close();
    if (action === 'BACK') return true;
    await new Promise<void>(resolve => window.setTimeout(resolve,duration('--motion-standard') + 50));
    return false;
  }, enableBeforeUnload: false });
  useEffect(() => { if (!autoClose) return; const timer = window.setTimeout(close,autoClose); return () => clearTimeout(timer); }, [autoClose]);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.current?.querySelector<HTMLElement>('button,input,select,textarea,a[href]')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key !== 'Tab') return;
      const controls = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select,textarea,a[href]') ?? []);
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); if (opener?.isConnected) opener.focus(); };
  }, []);
  if (state === 'closed') return null;
  return <div ref={root} className={`${className}${state === 'closing' ? ' exiting' : ''}`} data-presence={state} onAnimationEnd={e => { if (state === 'closing' && e.target === e.currentTarget) finish(); }}>{children(close)}</div>;
}
export function ConfirmDialog({ message, onClose, onConfirm }: { message: string; onClose: () => void; onConfirm: () => void }) {
  const { t } = useLocale(); const accepted = useRef(false);
  return <Presence historyEntry className="drawer-bg dialog-bg" onExit={() => { onClose(); if (accepted.current) onConfirm(); }}>{close => <>
    <div className="drawer-dismiss" onClick={close} />
    <div className="dialog stack" role="dialog" aria-modal="true" aria-label={message}><p>{message}</p><div className="row"><Button onClick={close}>{t('Cancel')}</Button><Button className="btn-danger" onClick={() => { accepted.current = true; close(); }}>{t('Confirm')}</Button></div></div>
  </>}</Presence>;
}
const seenRows = new Set<string>();
type Entry = { id: string; node: ReactNode; removing?: boolean; entrance?: string; delay?: number };
export function flipRows(root: HTMLElement, previous: Map<string, DOMRect>) {
  const rows = Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-list-id]'));
  const next = new Map(rows.map(row => [row.dataset['listId'] ?? '', row.getBoundingClientRect()]));
  if (rows.length <= 30 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) for (const row of rows) {
    const id = row.dataset['listId'] ?? ''; const before = previous.get(id); const after = next.get(id);
    if (!before || !after || before.top === after.top) continue;
    row.style.transition = 'none'; row.style.transform = `translateY(${before.top - after.top}px)`;
    requestAnimationFrame(() => { row.style.transition = 'transform var(--motion-standard) var(--ease-enter)'; row.style.transform = 'translateY(0)'; });
  }
  return next;
}
export function MotionList({ children, scope, setKey = '', empty, className = '', stagger = true }: { children: ReactNode; scope: string; setKey?: string; empty?: ReactNode; className?: string; stagger?: boolean }) {
  const makeEntries = () => Children.toArray(children).map((node, index) => {
    const id = isValidElement(node) ? String(node.key) : String(node);
    const seen = `${scope}/${setKey}/${id}`; const fresh = !seenRows.has(seen); seenRows.add(seen);
    return { id, node, entrance: fresh ? (stagger && index < 8 ? 'list-enter' : 'list-fade') : '', delay: stagger && index < 8 ? index * 40 : 0 };
  });
  const [entries, setEntries] = useState<Entry[]>(makeEntries);
  const [switching, setSwitching] = useState(false);
  const previousSet = useRef(setKey); const root = useRef<HTMLDivElement>(null); const positions = useRef(new Map<string, DOMRect>());
  useEffect(() => {
    if (previousSet.current !== setKey) {
      setSwitching(true);
      const timer = window.setTimeout(() => { previousSet.current = setKey; setEntries(makeEntries()); setSwitching(false); }, duration('--motion-fast'));
      return () => clearTimeout(timer);
    }
    const next = makeEntries();
    setEntries(old => {
      const ids = new Set(next.map(row => row.id));
      const removed = old.filter(row => !ids.has(row.id)).map(row => ({ ...row, removing: true }));
      const combined: Entry[] = next.map(row => { const existing = old.find(e => e.id === row.id); return existing ? { ...row, entrance: existing.entrance ?? '', delay: existing.delay ?? 0 } : row; });
      for (const row of removed) combined.splice(Math.min(old.findIndex(e => e.id === row.id),combined.length),0,row);
      return combined;
    });
    const timer = window.setTimeout(() => setEntries(old => old.filter(row => !row.removing)), duration('--motion-standard') + 50);
    return () => clearTimeout(timer);
  }, [children, setKey]);
  useLayoutEffect(() => { if (root.current) positions.current = flipRows(root.current, positions.current); }, [entries]);
  return <div ref={root} className={`${className} ${switching ? 'list-switching' : ''}`}>
    {entries.length ? entries.map(row => <div key={row.id} data-list-id={row.id} className="list-cell"><div className={row.removing ? 'row-removing' : row.entrance} style={{ '--row-delay': `${row.delay ?? 0}ms` } as CSSProperties}>{row.node}</div></div>) : <div className="list-empty">{empty}</div>}
  </div>;
}