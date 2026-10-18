import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { Button } from './auth-form';
import { Shell, Loading } from './phi';
import { recordTiming } from '@/lib/timings';
const screens = {
  '/discover': lazy(() => import('@/routes/_authenticated/discover').then(m => ({ default: m.Discover }))),
  '/search': lazy(() => import('@/routes/_authenticated/search').then(m => ({ default: m.SearchPage }))),
  '/library': lazy(() => import('@/routes/_authenticated/library').then(m => ({ default: m.Library }))),
  '/ask': lazy(() => import('@/routes/_authenticated/ask').then(m => ({ default: m.Ask }))),
  '/profile': lazy(() => import('@/routes/_authenticated/profile').then(m => ({ default: m.Profile }))),
};
class TabBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Shell><p role="alert" className="error">This tab could not load.</p><Button onClick={() => this.setState({ failed: false })}>Retry</Button></Shell> : this.props.children; }
}
export function TabWorkspace() {
  const path = useRouterState({ select: state => state.location.pathname });
  const [visited, setVisited] = useState<string[]>([]);
  const scroll = useRef(new Map<string, number>());
  const previous = useRef(path);
  const isTab = Object.hasOwn(screens, path);
  const mounted = isTab && !visited.includes(path) ? [...visited, path] : visited;
  useEffect(() => {
    if (isTab) setVisited(old => old.includes(path) ? old : [...old, path]);
    window.scrollTo(0, scroll.current.get(path) ?? 0);
    const start = sessionStorage.getItem('phi-tab-start');
    if (start) { requestAnimationFrame(() => recordTiming('tab switch', performance.now() - Number(start))); sessionStorage.removeItem('phi-tab-start'); }
    const capture = () => scroll.current.set(path, window.scrollY);
    window.addEventListener('scroll', capture, { passive: true }); previous.current = path;
    return () => window.removeEventListener('scroll', capture);
  }, [path]);
  return <>{mounted.map(key => {
    const Screen = screens[key as keyof typeof screens];
    return <div key={key} hidden={path !== key} aria-hidden={path !== key}><TabBoundary><Suspense fallback={<Shell><Loading /></Shell>}><Screen /></Suspense></TabBoundary></div>;
  })}{!isTab && <Outlet />}</>;
}