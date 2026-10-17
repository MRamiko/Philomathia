import { createContext, useContext, useState, type ReactNode, type ComponentProps } from 'react';
import { useLocale } from '@/lib/locale';

const EmailDraft = createContext({ email: '', setEmail: (_email: string) => {} });
export function AuthDraftProvider({ children }: { children: ReactNode }) {
  const [email, setEmailState] = useState(() => (typeof window === 'undefined' ? '' : sessionStorage.getItem('phi-email-draft') ?? ''));
  const setEmail = (next: string) => { setEmailState(next); try { sessionStorage.setItem('phi-email-draft', next); } catch { /* private mode */ } };
  return <EmailDraft.Provider value={{ email, setEmail }}>{children}</EmailDraft.Provider>;
}
export const useEmailDraft = () => useContext(EmailDraft);
export function Button({ className = '', ...props }: ComponentProps<'button'>) {
  return <button className={`btn ${className}`} {...props} />;
}
export function PasswordField({ label, visibleToggle = false, error, ...props }: ComponentProps<'input'> & { label: string; visibleToggle?: boolean; error?: string | undefined }) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  return <div className={`field stack${error ? ' field-error' : ''}`}>
    <label htmlFor={props.id}>{label}</label>
    <div className="password-control">
      <input {...props} className="input" type={visible ? 'text' : 'password'} aria-invalid={Boolean(error)} aria-describedby={error ? `${props.id}-error` : props['aria-describedby']} />
      {visibleToggle && <Button type="button" className="password-toggle btn-text" aria-controls={props.id} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{t(visible ? 'Hide' : 'Show')}</Button>}
    </div>
    {error && <p className="error small" id={`${props.id}-error`}>{error}</p>}
  </div>;
}
export function keepFocusedFieldVisible(event: React.FocusEvent<HTMLElement>) {
  const field = event.target;
  if (field instanceof HTMLInputElement) field.scrollIntoView({ block: 'nearest', behavior: 'instant' });
}