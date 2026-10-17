import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
export function motionWait() {
  const duration = getComputedStyle(document.documentElement).getPropertyValue(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '--motion-fast' : '--motion-standard');
  return new Promise<void>(resolve => window.setTimeout(resolve, parseFloat(duration) || 200));
}

export function ScreenMotion({ children }: { children: ReactNode }) {
  const location = useRouterState({ select: s => s.location });
  const previous = useRef(location.pathname);
  const [intro, setIntro] = useState(false);
  const path = location.pathname;
  const from = previous.current;
  const backward = Number(location.state.__TSR_index ?? 0) < Number(useRef(location.state.__TSR_index ?? 0).current);
  const direction = backward || path === '/login' && from === '/signup' ? 'back' : ['/signup', '/shops'].includes(path) || path.startsWith('/item/') ? 'push' : 'tab';
  useEffect(() => { previous.current = path; }, [path]);
  useEffect(() => {
    if (sessionStorage.getItem('phi-launched')) return;
    sessionStorage.setItem('phi-launched', '1');
    setIntro(true);
    const timer = window.setTimeout(() => setIntro(false), 400);
    return () => window.clearTimeout(timer);
  }, []);
  return <>
    {intro && <div className="launch-mark" aria-hidden="true">Φ</div>}
    <div key={location.href} className={`screen-motion screen-${direction}`}>{children}</div>
  </>;
}

export function Presence({ children, onExit, className = '' }: { children: (close: () => void) => ReactNode; onExit: () => void; className?: string }) {
  const [closing, setClosing] = useState(false);
  const close = () => setClosing(true);
  return <div className={`${className}${closing ? ' exiting' : ''}`} onAnimationEnd={e => { if (closing && e.target === e.currentTarget) onExit(); }}>{children(close)}</div>;
}