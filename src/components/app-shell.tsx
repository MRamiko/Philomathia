import { useEffect, useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useLocale } from '@/lib/locale';
import { rememberTab } from '@/lib/pwa';
import { haptic } from '@/lib/timings';
import { bootMark, firstInteractive, renderCounter } from '@/lib/startup-diagnostics';
import { Icon, PhiLogo, type IconName } from './icons';
const TABS = [
  { to: "/discover", label: "Discover" },
  { to: "/search", label: "Search" },
  { to: "/library", label: "Library" },
  { to: "/ask", label: "Ask Phi" },
  { to: "/profile", label: "Profile" },
] as const;

export function Shell({ children, footer, header }: { children: ReactNode; footer?: ReactNode; header?:ReactNode }) {
  renderCounter('Shell');
  useEffect(() => { bootMark('[BOOT] shell rendered'); firstInteractive(); }, []);
  const { t, lang: appLang } = useLocale();
  const [offline,setOffline]=useState(false);
  useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);};},[]);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(()=>{rememberTab(path);},[path]);
  return (
    <>
      <div className="app">
        {offline && <p role="alert" className="offline">{t("You are offline")}</p>}
        <header className="topbar"><PhiLogo />{header}</header>
        {children}
        {footer&&<div className="footer">{footer}</div>}
      </div>
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-indicator" style={{ transform: `translateX(${Math.max(0, TABS.findIndex(tab => path.startsWith(tab.to))) * 100}%)` }} />
          {TABS.map((tab) => (
            <Link key={tab.to} to={tab.to} aria-label={tab.label} title={tab.label} onClick={()=>{try{sessionStorage.setItem('phi-tab-start',String(performance.now()));}catch{}haptic();}} className={path.startsWith(tab.to) ? "active" : ""}>
              <Icon name={(tab.to.slice(1)==='ask'?'ask':tab.to.slice(1)) as IconName}/>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

