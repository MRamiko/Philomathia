import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loading, Shell } from "@/components/phi";
import { supabase } from "@/integrations/supabase/client";
import { useItems, useMe, useRefresh } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · Philomathia" }, { name: "description", content: "Language, avoided genres and your data." }] }),
  component: Profile,
});

function Profile() {
  const me = useMe();
  const items = useItems();
  const refresh = useRefresh();
  const qc = useQueryClient();
  const nav = useNavigate();
  if (!me.data || !items.data) return <Shell><Loading /></Shell>;
  const p = me.data.profile;
  const genres = Array.from(new Set(items.data.flatMap((i) => i.genres))).sort();
  const update = async (patch: { preferred_language?: string; avoided_genres?: string[] }) => { await supabase.from("profiles").update(patch).eq("id", me.data!.uid); refresh(); };

  async function reset() {
    if (!confirm("Reset your taste profile? This clears your swipes and taste weights.")) return;
    await supabase.from("swipes").delete().eq("user_id", me.data!.uid);
    await supabase.from("tag_weights").delete().eq("user_id", me.data!.uid);
    refresh();
  }
  async function wipe() {
    if (!confirm("Delete all your data? Swipes, diary, taste weights and profile settings will be removed.")) return;
    const uid = me.data!.uid;
    await supabase.from("swipes").delete().eq("user_id", uid);
    await supabase.from("tag_weights").delete().eq("user_id", uid);
    await supabase.from("logs").delete().eq("user_id", uid);
    await supabase.from("profiles").update({ avoided_genres: [], preferred_language: "en", onboarded: false }).eq("id", uid);
    refresh();
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <Shell>
      <h1 className="h1">Profile</h1>
      <p className="muted small">{me.data.email}</p>
      <div className="h2">Language</div>
      <div className="toggle">
        <button className={p.preferred_language === "en" ? "on" : ""} onClick={() => update({ preferred_language: "en" })}>English</button>
        <button className={p.preferred_language === "ka" ? "on" : ""} onClick={() => update({ preferred_language: "ka" })}>ქართული</button>
      </div>
      <div className="h2">Avoided genres</div>
      <div className="row">
        {genres.map((g) => {
          const on = p.avoided_genres.includes(g);
          return <button key={g} className={`chip ${on ? "chip-active" : ""}`} onClick={() => update({ avoided_genres: on ? p.avoided_genres.filter((x) => x !== g) : [...p.avoided_genres, g] })}>{g}</button>;
        })}
      </div>
      <div className="h2">How recommendations work</div>
      <p className="small">Every like adds points to the genres, moods, keywords and creator of that title, and every pass takes some away. Each new title is scored mostly by how well its tags match those points, plus its creator, your chosen mood and a little novelty. About one card in five is a deliberate step outside your usual taste, and every reason shown is built from the tags that actually matched.</p>
      <div className="stack" style={{ marginTop: 16 }}>
        <Link to="/shops" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>Bookshops</Link>
        <button className="btn" onClick={reset}>Reset my taste profile</button>
        <button className="btn" onClick={wipe}>Delete my data</button>
        <button className="btn" onClick={signOut}>Sign out</button>
      </div>
    </Shell>
  );
}
