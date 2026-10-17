import { useLocale } from "@/lib/locale";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Philomathia" },
      { name: "description", content: "Sign in to your Philomathia film and book diary." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Sign in · Philomathia" },
      { property: "og:description", content: "A film and book diary with swipe discovery, made for Georgia." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang: appLang } = useLocale();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(t("Sign-in failed. Check your details and try again.")); else nav({ to: "/discover" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) setErr(t("Sign-in failed. Check your details and try again."));
      else if (data.session) nav({ to: "/discover" });
      else setMsg(t("Check your email to confirm your account, then sign in."));
    }
    setBusy(false);
  }

  return (
    <div className="app">
      <div className="brand-hero" aria-hidden="true">Φ</div>
      <div className="stack center">
        <h1 className="h1">{t('Philomathia')}</h1>
        <p className="lede">{t('Find your next great story.')}</p>
        <p className="small muted">{t('A film and book diary, made for Georgia.')}</p>
      </div>
      <form className="stack" onSubmit={submit}>
        <label className="field">{t('Email')}<input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field">{t('Password')}<input className="input" type="password" aria-invalid={!!err} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p className="error small" role="alert">{err}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? t('Loading…') : mode === "in" ? t('Sign in') : t('Create account')}</button>
      </form>
      <button className="btn btn-text" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); setMsg(null); }}>{mode === "in" ? t('New here? Create an account') : t('Already have an account? Sign in')}</button>
      {msg && <p className="ok small">{msg}</p>}
      <div className="footer">{t('Sample data for demo')}</div>
    </div>
  );
}
