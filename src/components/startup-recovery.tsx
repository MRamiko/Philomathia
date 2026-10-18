import { useEffect, useState } from 'react';
import { Button } from './auth-form';
import { PhiLogo } from './icons';
import { bootMark, isInteractive, reportText, resetLocalApp, useBootEntries } from '@/lib/startup-diagnostics';
import { translate } from '@/lib/strings';
const t = (key: string) => translate('en', key);
export function StartupRecovery({ retry }: { retry: () => void }) {
  const [error,setError]=useState(false);
  return <div className="stack" role="alert"><p>{t('Taking longer than usual')}</p><Button onClick={retry}>{t('Retry')}</Button><Button onClick={() => {void resetLocalApp().catch(()=>setError(true));}}>{t('Reset app data')}</Button>{error&&<p>{t('Could not reset local app data. Please retry.')}</p>}</div>;
}
export function StartupContent({ checking = false, retry }: { checking?: boolean; retry?: () => void }) {
  const [slow, setSlow] = useState(false); const [watchdog, setWatchdog] = useState(false);
  useEffect(() => { const hint = window.setTimeout(() => setSlow(true), 10000); const timer = window.setTimeout(() => setWatchdog(true), 30000); return () => { clearTimeout(hint); clearTimeout(timer); }; }, []);
  return <div className="startup-content">{watchdog ? <StartupRecovery retry={retry ?? (() => location.reload())}/> : <><span className="boot-pulse" role="status" aria-label={t('Loading…')}><PhiLogo size={48}/></span>{checking && slow && <p className="small muted">{t('Checking sign-in...')}</p>}</>}</div>;
}
export function BootDiagnostics() {
  const entries = useBootEntries(); const [enabled, setEnabled] = useState(false); const [extra, setExtra] = useState('');
  const [stalled, setStalled] = useState(false); const [copied, setCopied] = useState(false);
  useEffect(() => {
    const debug = new URLSearchParams(location.search).get('debug') === '1';setEnabled(debug);
    const timer = window.setTimeout(() => { if (!isInteractive()) setStalled(true); }, 30000);
    if(!debug)return()=>clearTimeout(timer);
    void Promise.allSettled(['serviceWorker' in navigator ? navigator.serviceWorker.getRegistrations() : Promise.resolve([]), 'caches' in window ? caches.keys() : Promise.resolve([])]).then(results => {
      const workers = results[0].status === 'fulfilled' ? results[0].value.length : 'unavailable';
      const names = results[1].status === 'fulfilled' ? results[1].value.join(', ') : 'unavailable';
      let size = 0; try { for (const storage of [localStorage, sessionStorage]) for (let n = 0; n < storage.length; n++) { const key = storage.key(n); if (key) size += (key.length + (storage.getItem(key)?.length ?? 0)) * 2; } } catch {}
      setExtra(`Build: ${import.meta.env.MODE}\nViewport: ${innerWidth} x ${innerHeight}\nService workers: ${workers}\nController: ${navigator.serviceWorker?.controller ? 'active' : 'none'}\nCaches: ${names || 'none'}\nStorage: ${size} bytes`);
    });
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { bootMark('[BOOT] diagnostics available'); }, [enabled]);
  if (!enabled && !stalled) return null;
  return <aside className="boot-diagnostics">{stalled && <StartupRecovery retry={() => location.reload()}/>} {enabled && <details open><summary>{t('Startup diagnostics')}</summary><pre>{reportText(extra)}</pre><Button onClick={async () => { try { await navigator.clipboard.writeText(reportText(extra)); setCopied(true); } catch { setCopied(false); } }}>{t(copied ? 'Copied' : 'Copy report')}</Button></details>}</aside>;
}