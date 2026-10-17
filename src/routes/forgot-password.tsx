import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/lib/locale';
import { Button, useEmailDraft, keepFocusedFieldVisible } from '@/components/auth-form';

export const Route = createFileRoute('/forgot-password')({
  head: () => ({ meta: [{ title: 'Forgot password · Philomathia' }, { name: 'description', content: 'Request a link to choose a new Philomathia password.' }, { property: 'og:title', content: 'Forgot password · Philomathia' }, { property: 'og:description', content: 'Request a link to choose a new Philomathia password.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ForgotPassword,
});
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function ForgotPassword() {
  const { t } = useLocale();
  const { email, setEmail } = useEmailDraft();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);
  function startCountdown() {
    setWait(60);
    clearInterval(timer.current);
    timer.current = setInterval(() => setWait(w => { if (w <= 1) { clearInterval(timer.current); return 0; } return w - 1; }), 1000);
  }
  async function send(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy || wait > 0) return;
    if (!EMAIL_RE.test(email)) { setError(t('Enter a valid email address.')); return; }
    setBusy(true); setError('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (err) {
        setError(err.status === 429 || err.code === 'over_email_send_rate_limit' ? t('Too many attempts. Please wait and retry.') : t('Could not save. Please retry.'));
      } else { setSent(true); startCountdown(); }
    } catch { setError(t('Network error. Check your connection and retry.')); }
    finally { setBusy(false); }
  }
  return <main className="app auth-app login-app" onFocusCapture={keepFocusedFieldVisible}>
    <header className="topbar"><Link className="btn icon-btn" to="/login" aria-label={t('Back to Login')}>←</Link><span className="brand" aria-hidden="true">Φ</span></header>
    <div className="login-content">
      {sent ? <section className="box stack" role="status">
        <p>{t("If an account exists for that email, we've sent a link. Check your inbox and spam folder.")}</p>
        <Link className="btn" to="/login">{t('Back to sign in')}</Link>
        <Button type="button" className="btn-text" disabled={wait > 0 || busy} onClick={() => send()}>{t(wait > 0 ? 'Resend in {n}s' : 'Resend', { n: wait })}</Button>
      </section> : <>
        <header className="stack center login-heading"><h1 className="h1">{t('Forgot your password?')}</h1><p className="lede">{t("Enter your email and we'll send you a link to choose a new one.")}</p></header>
        <form className="stack auth-fields" noValidate onSubmit={send} aria-busy={busy}>
          <div className={`field stack${error ? ' field-error' : ''}`}><label htmlFor="forgot-email">{t('Email')}</label><input id="forgot-email" className="input" name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={e => { setEmail(e.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'forgot-error' : undefined} />{error && <p id="forgot-error" className="error small" role="alert">{error}</p>}</div>
          <Button className="btn-primary" type="submit" disabled={busy}>{t(busy ? 'Loading…' : 'Send reset link')}</Button>
        </form>
      </>}
    </div>
  </main>;
}
