import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/lib/locale';
import { Presence } from '@/components/motion';
import { Button, PasswordField, useEmailDraft, keepFocusedFieldVisible } from '@/components/auth-form';
import { PhiLogo } from '@/components/icons';

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [{ title: 'Welcome back · Philomathia' }, { name: 'description', content: 'Sign in to your private Philomathia film and book diary.' }, { property: 'og:title', content: 'Welcome back · Philomathia' }, { property: 'og:description', content: 'Continue your film and book diary and personal discoveries.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: Login,
});
function Login() {
  const { t } = useLocale();
  const { email, setEmail } = useEmailDraft();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [resetNotice, setResetNotice] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (sessionStorage.getItem('phi-pw-reset') === '1') { sessionStorage.removeItem('phi-pw-reset'); setResetNotice(true); }
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    if (!form.checkValidity()) { setAttempt(n => n + 1); setError(true); form.querySelector<HTMLInputElement>(':invalid')?.focus(); return; }
    setBusy(true); setError(false);
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) { setError(true); setAttempt(n => n + 1); form.querySelector<HTMLInputElement>('#login-email')?.focus(); }
      else {
        const userId = result.data.user?.id;
        const { data: profile } = userId ? await supabase.from('profiles').select('onboarded').eq('id', userId).maybeSingle() : { data: null };
        await nav({ to: profile && !profile.onboarded ? '/onboarding' : '/discover' });
      }
    } catch { setError(true); setAttempt(n => n + 1); form.querySelector<HTMLInputElement>('#login-email')?.focus(); }
    finally { setBusy(false); }
  }
  return <main className="app auth-app login-app" onFocusCapture={keepFocusedFieldVisible}>
    <div className="login-content">
      <div className="login-mark"><PhiLogo size={96}/></div>
      <header className="stack center login-heading"><h1 className="h1">{t('Welcome back.')}</h1><p className="lede">{t('Sign in to continue.')}</p></header>
      <form className="stack auth-fields" noValidate onSubmit={submit} aria-busy={busy}>
        <div key={`email-${attempt}`} className={`field stack${error ? ' field-error' : ''}`}><label htmlFor="login-email">{t('Email')}</label><input id="login-email" className="input" name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} aria-invalid={error} aria-describedby={error ? 'login-error' : undefined} /></div>
        <PasswordField key={`password-${attempt}`} id="login-password" name="password" label={t('Password')} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} visibleToggle aria-describedby={error ? 'login-error' : undefined} />
        <Link className="btn btn-text" to="/forgot-password">{t('Forgot password?')}</Link>
        <Button className="btn-primary" type="submit" disabled={busy}>{t(busy ? 'Loading…' : 'Sign in')}</Button>
      </form>
      {error && <p id="login-error" className="error small error-prefixed" role="alert">{t('Error: email or password is incorrect.')}</p>}
      {resetNotice && <Presence autoClose={4000} className="snackbar" onExit={() => setResetNotice(false)}>{() => <span role="status">{t('Password updated. Sign in with your new password.')}</span>}</Presence>}
      <Link className="btn btn-text auth-switch" to="/signup">{t('New here? Create an account')}</Link>
    </div>
  </main>;
}