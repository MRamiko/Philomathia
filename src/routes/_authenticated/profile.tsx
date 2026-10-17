import { useState } from 'react';
import { Button } from '@/components/auth-form';
import { ConfirmDialog, MotionList, Presence } from '@/components/motion';
import { cleanDisplayName, validDisplayName, displayName, avatarInitial } from '@/lib/display-name';
import { useAction } from "@/lib/use-action";
import { useLocale } from "@/lib/locale";
import { recommend } from "@/lib/recommend";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loading, Shell } from "@/components/phi";
import { supabase } from "@/integrations/supabase/client";
import { useItems, useMe, useRefresh, tasteAction } from "@/lib/data";
import { deleteAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · Philomathia" }, { name: "description", content: "Language, avoided genres and your data." }, { property: "og:title", content: "Profile · Philomathia" }, { property: "og:description", content: "Language, avoided genres and your data." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Profile,
});

function Profile() {
  const { t, lang: appLang, setLanguage } = useLocale();
  const action=useAction();
  const me = useMe();
  const items = useItems();
  const refresh = useRefresh();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false); const [draft, setDraft] = useState('');
  const [nameError, setNameError] = useState(''); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState<'reset' | 'wipe' | null>(null);
  async function saveName() {
    if (saving || !me.data) return;
    if (!validDisplayName(draft)) { setNameError(t('Display name must be 1 to 40 characters.') + ' ' + t('Use letters, digits, spaces and basic punctuation.')); return; }
    const previous = me.data; const name = cleanDisplayName(draft);
    setSaving(true); setNameError(''); setSaved(false);
    qc.setQueryData(['me'], { ...previous, profile: { ...previous.profile, display_name: name } });
    try {
      const result = await supabase.from('profiles').update({ display_name: name }).eq('id',previous.uid).select('display_name').single();
      if (result.error) throw result.error;
      setEditing(false); setSaved(true); 
      await refresh();
    } catch { qc.setQueryData(['me'],previous); setNameError(t('Could not save. Please retry.')); }
    finally { setSaving(false); }
  }
  if (items.error || me.error) return <Shell><p role="alert" className="error">{t("Could not load.")}</p><button className="btn" onClick={()=>{items.refetch();me.refetch();}}>{t("Retry")}</button></Shell>;
  if (!me.data || !items.data) return <Shell><Loading /></Shell>;
  const p = me.data.profile;
  const genres = Array.from(new Set(items.data.flatMap((i) => i.genres))).sort();
  const update = async (patch: { preferred_language?: string; avoided_genres?: string[] }) => { const {error}=await supabase.from("profiles").update(patch).eq("id", me.data?.uid??"");if(error)throw error;await refresh(); };

  async function reset() {
    await tasteAction(null, "reset");
    refresh();
  }
  async function wipe() {
    await deleteAccount();
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/login", replace: true });
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/login", replace: true });
  }

  return (
    <Shell>
      {action.error&&<p role="alert" className="error">{action.error}</p>}
      <h1 className="h1">{t('Profile')}</h1>
      <div className="row"><span className="avatar" aria-hidden="true">{avatarInitial(displayName(p.display_name,me.data.email))}</span><h2 className="h2">{displayName(p.display_name,me.data.email)}</h2></div>
      {editing ? <div className="stack"><label className="field">{t('Display name')}<input className="input" autoFocus value={draft} onChange={e => setDraft(e.target.value)} aria-invalid={Boolean(nameError)} disabled={saving}/></label><div className="row"><Button className="btn-primary" disabled={saving} onClick={saveName}>{t(nameError ? 'Retry' : 'Save')}</Button><Button disabled={saving} onClick={() => { setEditing(false); setNameError(''); }}>{t('Cancel')}</Button></div></div> : <Button onClick={() => { setDraft(displayName(p.display_name,me.data?.email ?? '')); setEditing(true); setSaved(false); }}>{t('Display name')}</Button>}
      {nameError && <p className="error" role="alert">{nameError}</p>}
      {saved && <Presence autoClose={2000} className="snackbar" onExit={() => setSaved(false)}>{() => <span role="status">{t('Saved ✓')}</span>}</Presence>}
      {confirmation && <ConfirmDialog message={t(confirmation === 'reset' ? 'Reset your taste profile? This clears your swipes and taste weights.' : 'Delete all your data? Swipes, diary, taste weights and profile settings will be removed.')} onClose={() => setConfirmation(null)} onConfirm={() => action.run(confirmation === 'reset' ? reset : wipe)} />}
      <div className="h2">{t('App language')}</div>
      <div className="toggle" style={{ '--selected': appLang === 'en' ? 0 : 1 } as React.CSSProperties}>
        <button className={appLang === "en" ? "on" : ""} disabled={action.busy} onClick={() => action.run(()=>setLanguage("en"))}>{t('English')}</button>
        <button className={appLang === "ka" ? "on" : ""} disabled={action.busy} onClick={() => action.run(()=>setLanguage("ka"))}>ქართული</button>
      </div>
      <div className="h2">{t('Avoided genres')}</div>
      <MotionList scope="avoided-genres" className="row">
        {genres.map((g) => {
          const on = p.avoided_genres.includes(g);
          return <button key={g} className={`chip ${on ? "chip-active" : ""}`} disabled={action.busy} onClick={() => action.run(()=>update({ avoided_genres: on ? p.avoided_genres.filter((x) => x !== g) : [...p.avoided_genres, g] }))}>{t(g)}</button>;
        })}
      </MotionList>
      <div className="h2">{t('How recommendations work')}</div>
      <div className="box stack"><h2 className="h2">{t('Credits')}</h2><p className="small">{t('Films and posters by TMDB')}</p><p className="small">{t('Books and covers by Open Library and Google Books')}</p><p className="small">{t('Georgian titles from Wikidata')}</p><p className="small">{t('This product uses the TMDB API but is not endorsed or certified by TMDB.')}</p></div>
      {me.data.roles.includes('admin')&&<Link to="/admin-import" className="btn">{t('Admin Import')}</Link>}
      <p className="small">{t('Every like adds points to the genres, moods, keywords and creator of that title, and every pass takes some away. Each new title is scored mostly by how well its tags match those points, plus its creator, your chosen mood and a little novelty. About one card in five is a deliberate step outside your usual taste, and every reason shown is built from the tags that actually matched.')}</p>
      {me.data.roles.includes("admin") && <div className="stack">
        <h2 className="h2">{t('Taste debug')}</h2>
        {Object.entries(me.data.weights).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([tag,weight])=><span key={tag}>{tag}: {weight.toFixed(3)}</span>)}
        <strong>{t('Recent likes')}</strong>
        {me.data.swipes.filter(s=>s.action==="like").slice(0,5).map(s=><span key={s.item_id}>{items.data?.find(i=>i.id===s.item_id)?.title_en}</span>)}
        <pre>{JSON.stringify(recommend({items:items.data,weights:me.data.weights,swipes:me.data.swipes,excludedIds:new Set([...me.data.swipes.map(s=>s.item_id),...me.data.logs.filter(l=>l.status==="seen").map(l=>l.item_id)]),likedIds:new Set(me.data.swipes.filter(s=>s.action==="like").map(s=>s.item_id)),avoidedGenres:p.avoided_genres,mediaType:"film"},1)[0]?.parts,null,2)}</pre>
      </div>}
      <div className="stack" style={{ marginTop: 16 }}>
        <Link to="/shops" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>{t('Bookshops')}</Link>
        {(me.data.roles.includes('shop')||me.data.roles.includes('admin'))&&<Link to="/shop-stock" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>{t('Shop stock')}</Link>}
        <button className="btn" disabled={action.busy} onClick={()=>setConfirmation("reset")}>{t('Reset my taste profile')}</button>
        <button className="btn" disabled={action.busy} onClick={()=>setConfirmation("wipe")}>{t('Delete my data')}</button>
        <button className="btn" disabled={action.busy} onClick={()=>action.run(signOut)}>{t('Sign out')}</button>
      </div>
    </Shell>
  );
}
