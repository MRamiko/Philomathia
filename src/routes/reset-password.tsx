import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/lib/locale';
import { signupValidity } from '@/lib/auth-form';
import { Button, PasswordField, useEmailDraft, keepFocusedFieldVisible } from '@/components/auth-form';
import {PhiLogo} from '@/components/icons';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [{ title: 'Choose a new password · Philomathia' }, { name: 'description', content: 'Set a new Philomathia password from your reset link.' }, { property: 'og:title', content: 'Choose a new password · Philomathia' }, { property: 'og:description', content: 'Set a new Philomathia password from your reset link.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ResetPassword,
});
type Phase = 'checking' | 'ready' | 'invalid';
function ResetPassword() {
  const { t } = useLocale();
  const { setEmail } = useEmailDraft();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nav = useNavigate();
  const validity = signupValidity('x', 'a@b.cd', password, confirmation);
  const valid = validity.password && validity.confirmation;
  useEffect(() => {
    let done = false;
    const hasRecovery = window.location.hash.includes('type=recovery');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (done) return;
      if (event === 'PASSWORD_RECOVERY') {
        done = true;
        if (session?.user?.email) setEmail(session.user.email);
        window.history.replaceState(null, '', window.location.pathname);
        setPhase('ready');
      }
    });
    if (!hasRecovery) {
      supabase.auth.getSession().then(({ data }) => {
        if (done) return;
        done = true;
        if (data.session) void nav({ to: '/profile', replace: true });
        else setPhase('invalid');
      });
    } else {
      setTimeout(() => { if (!done) { done = true; setPhase('invalid'); } }, 6000);
    }
    return () => { done = true; subscription.unsubscribe(); };
  }, [nav, setEmail]);
  const checklist = (met: boolean, text: string) => <p key={`${text}-${met}`} className={`small checklist ${met ? 'check-met' : ''}`}><span aria-hidden="true">{met ? '✓' : '✕'}</span>{t(text)}</p>;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !valid) return;
    if (password !== confirmation) { setErrors({ confirmation: t('Error: passwords do not match') }); return; }
    setBusy(true); setErrors({});
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const key = error.code === 'same_password' ? 'Choose a different new password.' : error.code === 'weak_password' ? 'Password is too short.' : 'Could not update password. The link may have expired.';
        setErrors({ form: t(key) });
        return;
      }
      await supabase.auth.signOut({ scope: 'others' });
      await supabase.auth.signOut();
      sessionStorage.setItem('phi-pw-reset', '1');
      await nav({ to: '/login' });
    } catch { setErrors({ form: t('Could not update password. The link may have expired.') }); }
    finally { setBusy(false); }
  }
  if (phase === 'checking') return <main className="app auth-app login-app"><div className="login-content"><p className="lede">{t('Loading…')}</p></div></main>;
  if (phase === 'invalid') return <main className="app auth-app login-app">
    <header className="topbar"><Link className="btn icon-btn" to="/login" aria-label={t('Back to Login')}>←</Link><PhiLogo/></header>
    <div className="login-content stack">
      <header className="stack center login-heading"><h1 className="h1">{t('Forgot your password?')}</h1></header>
      <section className="box stack" role="alert"><p className="error">{t('This link is invalid or has expired.')}</p><Link className="btn btn-primary" to="/forgot-password">{t('Request a new link')}</Link></section>
    </div>
  </main>;
  return <main className="app auth-app signup-app" onFocusCapture={keepFocusedFieldVisible}>
    <header className="topbar"><Link className="btn icon-btn" to="/login" aria-label={t('Back to Login')}>←</Link><PhiLogo/></header>
    <div className="signup-content stack">
      <header className="stack"><h1 className="h1">{t('Choose a new password')}</h1></header>
      <form className="stack auth-fields" noValidate onSubmit={submit} aria-busy={busy}>
        <PasswordField id="reset-password" name="password" label={t('New password')} autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} error={errors['password']} visibleToggle aria-describedby="reset-password-check" />
        <div id="reset-password-check" aria-live="polite">{checklist(validity.password, 'At least 8 characters')}</div>
        <PasswordField id="reset-confirmation" name="confirmation" label={t('Retype new password')} autoComplete="new-password" required value={confirmation} onChange={e => { setConfirmation(e.target.value); setErrors({}); }} error={errors['confirmation']} visibleToggle aria-describedby="reset-confirmation-check" />
        <div id="reset-confirmation-check" aria-live="polite">{checklist(validity.confirmation, 'Passwords must match')}</div>
        {errors['form'] && <p className="error small" role="alert">{errors['form']}</p>}
        <Button type="submit" className="btn-primary" disabled={!valid || busy}>{t(busy ? 'Loading…' : 'Reset password')}</Button>
      </form>
    </div>
  </main>;
}
