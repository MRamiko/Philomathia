import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Philomathia" },
      { name: "description", content: "Sign in to your Philomathia film and book diary." },
      { property: "og:title", content: "Sign in · Philomathia" },
      { property: "og:description", content: "A film and book diary with swipe discovery, made for Georgia." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
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
      if (error) setErr(error.message); else nav({ to: "/discover" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) setErr(error.message);
      else if (data.session) nav({ to: "/discover" });
      else setMsg("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }

  return (
    <div className="app">
      <div className="brand" style={{ fontSize: 100, textAlign: "center" }}>Φ</div>
      <h1 className="h1" style={{ textAlign: "center" }}>Philomathia</h1>
      <p className="muted small" style={{ textAlign: "center" }}>A film and book diary, made for Georgia.</p>
      <div className="toggle" style={{ margin: "16px 0" }}>
        <button className={mode === "in" ? "on" : ""} onClick={() => setMode("in")}>Sign in</button>
        <button className={mode === "up" ? "on" : ""} onClick={() => setMode("up")}>Sign up</button>
      </div>
      <form className="stack" onSubmit={submit}>
        <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-primary" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
      </form>
      {err && <p className="error small">{err}</p>}
      {msg && <p className="ok small">{msg}</p>}
      <div className="footer">Sample data for demo</div>
    </div>
  );
}
