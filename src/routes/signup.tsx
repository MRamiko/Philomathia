import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/lib/locale';
import { signupValidity } from '@/lib/auth-form';
import { cleanDisplayName } from '@/lib/display-name';
import { Button, PasswordField, useEmailDraft, keepFocusedFieldVisible } from '@/components/auth-form';
import { PhiLogo } from '@/components/icons';

export const Route = createFileRoute('/signup')({
  head: () => ({ meta: [{ title: 'Create your account · Philomathia' }, { name: 'description', content: 'Join Philomathia and begin your private film and book diary.' }, { property: 'og:title', content: 'Create your account · Philomathia' }, { property: 'og:description', content: 'Start discovering films and books with a diary that learns your taste.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: Signup,
});
function Signup() {
  const { t } = useLocale();
  const { email, setEmail } = useEmailDraft();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nav = useNavigate();
  const validity = signupValidity(name, email, password, confirmation);
  const valid = Object.values(validity).every(Boolean);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    if (!valid) {
      const next = { ...(!validity.name ? { name: t('Display name must be 1 to 40 characters.') } : {}), ...(!validity.email ? { email: t('Enter a valid email address.') } : {}), ...(!validity.password ? { password: t('Password is too short.') } : {}), ...(!validity.confirmation ? { confirmation: t('Passwords do not match.') } : {}) };
      setErrors(next); form.querySelector<HTMLInputElement>(`[name="${Object.keys(next)[0]}"]`)?.focus(); return;
    }
    setBusy(true); setErrors({});
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: cleanDisplayName(name) } } });
      if (error) {
        const field = error.code === 'weak_password' ? 'password' : ['user_already_exists', 'email_exists'].includes(error.code ?? '') ? 'email' : 'form';
        setErrors({ [field]: t(field === 'password' ? 'Password is too short.' : field === 'email' ? 'Email is already registered.' : 'Could not create account. Please retry.') });
        form.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus();
      } else if (data.session) await nav({ to: '/onboarding' });
      else setConfirmed(true);
    } catch { setErrors({ form: t('Could not create account. Please retry.') }); }
    finally { setBusy(false); }
  }
  const checklist = (met: boolean, text: string) => <p key={`${text}-${met}`} className={`small checklist ${met ? 'check-met' : ''}`}><span aria-hidden="true">{met ? '✓' : '✕'}</span>{t(text)}</p>;
  return <main className="app auth-app signup-app" onFocusCapture={keepFocusedFieldVisible}>
    <header className="topbar"><Link className="btn icon-btn" to="/login" aria-label={t('Back to Login')}>←</Link><PhiLogo size={96}/></header>
    <div className="signup-content stack">
      <header className="stack"><h1 className="h1">{t('Create your account')}</h1><p className="lede">{t('Log what you watch and read, and get recommendations that learn from you.')}</p></header>
      <div className="box signup-benefits">{['Swipe to discover films and books', 'Keep a private diary', 'Georgian titles included'].map(line => <p key={line}><span className="check-met" aria-hidden="true">✓</span> {t(line)}</p>)}</div>
      {confirmed ? <section className="box" role="status"><p>{t('Check your email to confirm your account.')}</p><Link className="btn" to="/login">{t('Back to Login')}</Link></section> : <form className="stack auth-fields" noValidate onSubmit={submit} aria-busy={busy}>
        <div className={`field stack${errors['name'] ? ' field-error' : ''}`}><label htmlFor="signup-name">{t('Display name')}</label><input id="signup-name" name="name" className="input" autoComplete="nickname" required value={name} onChange={e => setName(e.target.value)} aria-invalid={Boolean(errors['name'])} />{!validity.name && name.length > 0 && <p className="error small">{t('Display name must be 1 to 40 characters.')}</p>}{errors['name'] && <p className="error small">{errors['name']}</p>}</div>
        <div className={`field stack${errors['email'] ? ' field-error' : ''}`}><label htmlFor="signup-email">{t('Email')}</label><input id="signup-email" name="email" className="input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={e => { setEmail(e.target.value); setErrors({}); }} aria-invalid={Boolean(errors['email'])} aria-describedby={errors['email'] ? 'signup-email-error' : undefined} />{errors['email'] && <p id="signup-email-error" className="error small">{errors['email']}</p>}</div>
        <PasswordField id="signup-password" name="password" label={t('Password')} autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} error={errors['password']} aria-describedby="password-check" />
        <div id="password-check" aria-live="polite">{checklist(validity.password, 'At least 8 characters')}</div>
        <PasswordField id="signup-confirmation" name="confirmation" label={t('Confirm password')} autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} error={errors['confirmation']} aria-describedby="confirmation-check" />
        <div id="confirmation-check" aria-live="polite">{checklist(validity.confirmation, 'Passwords must match')}</div>
        {errors['form'] && <p className="error small" role="alert">{errors['form']}</p>}
        <Button type="submit" className="btn-primary" disabled={!valid || busy}>{t(busy ? 'Loading…' : 'Create account')}</Button>
      </form>}
      <Link className="btn btn-text auth-switch" to="/login">{t('Already have an account? Sign in')}</Link>
    </div>
  </main>;
}