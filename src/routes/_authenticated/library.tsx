import { Pagination } from "@/components/pagination";
import { REC } from "@/lib/config";
import { useAction } from "@/lib/use-action";
import { useLocale } from "@/lib/locale";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ItemRow, Loading, Shell } from "@/components/phi";
import { supabase } from "@/integrations/supabase/client";
import { saveLog, undoSwipe, useItems, useMe, useRefresh, type Log } from "@/lib/data";
import type { Item } from "@/lib/recommend";
import { motionWait, MotionList, Presence } from '@/components/motion';

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Library · Philomathia" }, { name: "description", content: "Your liked, wanted and finished films and books." }, { property: "og:title", content: "Library · Philomathia" }, { property: "og:description", content: "Your liked, wanted and finished films and books." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Library,
});

function Library() {
  const { t, lang: appLang } = useLocale();
  const action=useAction(); const [hidden,setHidden]=useState<string[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const items = useItems();
  const me = useMe();
  const refresh = useRefresh();
  if (items.error || me.error) return <Shell><p role="alert" className="error">{t("Could not load.")}</p><button className="btn" onClick={()=>{items.refetch();me.refetch();}}>{t("Retry")}</button></Shell>;
  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  const d = me.data;
  const lang = appLang;
  const byId = new Map(items.data.map((i) => [i.id, i]));
  const logged = (s: string) => d.logs.filter((l) => l.status === s).map((l) => ({ l, i: byId.get(l.item_id) })).filter((x):x is {l:Log;i:Item} => !!x.i);
  const liked = d.swipes.filter((s) => s.action === "like").map((s) => byId.get(s.item_id)).filter((i):i is Item=>!!i);
  const passed = d.swipes.filter((s) => s.action === "pass" && !hidden.includes(s.item_id)).map((s) => byId.get(s.item_id)).filter((i):i is Item=>!!i);

  const positive = Object.entries(d.weights).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
  const total = positive.reduce((s, [, w]) => s + w, 0);
  const cloud = positive.slice(0, 12);

  return (
    <Shell>
      {action.error&&<p role="alert" className="error">{action.error}</p>}
      <h1 className="h1">{t('Library')}</h1>
      <div className="box">
        <strong>{t('Taste Cloud')}</strong>
        {cloud.length === 0 ? <p className="muted small">{t('Like a few titles to grow your taste cloud.')}</p> : (
          <MotionList scope="taste-cloud" className="tag-cloud">
            {cloud.map(([tag, w]) => (
              <Link key={tag} to="/discover" search={{ tag }}>
                {tag.startsWith("creator:") ? tag.slice(8) : t(tag)} <span className="muted">{Math.round((w / total) * 100)}%</span>
              </Link>
            ))}
          </MotionList>
        )}
      </div>

      <Section title={t('Liked')} empty={t('Nothing liked yet.')}>{liked.map((i) => <ItemRow key={i.id} item={i} lang={lang} />)}</Section>
      {(["want", "in_progress"] as const).map((s) => (
        <Section key={s} title={s === "want" ? t('Want to watch or read') : t('In progress')} empty={t('Empty.')}>
          {logged(s).map(({ l, i }) => <ItemRow key={i.id} item={i} lang={lang} right={<MarkDone uid={d.uid} item={i} prev={l} onDone={refresh} />} />)}
        </Section>
      ))}
      <Section title={t('Done')} empty={t('Nothing finished yet.')}>
        {logged("seen").map(({ l, i }) => <ItemRow key={i.id} item={i} lang={lang} right={<span className="small">{l.rating ? `${l.rating} / 5` : <span className="muted">{t('No rating')}</span>}</span>} />)}
      </Section>
      <Section title={t('Passed')} empty={t('No passes.')}>
        {passed.map((i) => <div key={i.id} className={removing === i.id ? 'row-removing' : ''}><ItemRow item={i} lang={lang} right={<button className="btn btn-sm" disabled={action.busy} onClick={()=>action.run(async()=>{await Promise.all([undoSwipe(i,"pass"),motionWait()]);setHidden(h=>[...h,i.id]);await refresh();setRemoving(null);},()=>setRemoving(i.id),()=>{setRemoving(null);setHidden(h=>h.filter(id=>id!==i.id));})}>{t('Undo')}</button>} /></div>)}
      </Section>
      <LetterboxdImport items={items.data} uid={d.uid} logs={d.logs} onDone={refresh} />
    </Shell>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] | React.ReactNode }) {
  const { t, lang: appLang } = useLocale();
  const [page,setPage]=useState(1);
  const entries=Array.isArray(children)?children:[children];
  const has = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <>
      <div className="h2">{title}</div>
      {<MotionList scope={`library-${title}`} setKey={String(page)} stagger={page === 1} empty={<p className="muted small">{empty}</p>}>{entries.slice((page-1)*REC.PAGE_SIZE,page*REC.PAGE_SIZE)}</MotionList>}
      <Pagination page={page} total={entries.filter(Boolean).length} onChange={setPage}/>
    </>
  );
}

function MarkDone({ uid, item, prev, onDone }: { uid: string; item: Item; prev: Log; onDone: () => void }) {
  const { t, lang: appLang } = useLocale();
  const action=useAction();
  const [open, setOpen] = useState(false);
  const [r, setR] = useState("");
  if (!open) return <button className="btn btn-sm" onClick={() => setOpen(true)}>{t('Mark done')}</button>;
  return (
    <>
      <select className="input" value={r} onChange={(e) => setR(e.target.value)}>
        <option value="">{t('No rating')}</option>
        {Array.from({ length: 10 }, (_, k) => (k + 1) / 2).map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <button className="btn btn-sm btn-primary" disabled={action.busy} onClick={()=>action.run(async()=>{await saveLog(uid,item,prev,{status:"seen",rating:r?Number(r):null,review:prev.review});onDone();})}>{t('Save')}</button>{action.error&&<span className="error">{action.error}</span>}
    </>
  );
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let k = 0; k < text.length; k++) {
    const c = text[k];
    if (q) { if (c === '"' && text[k + 1] === '"') { cur += '"'; k++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[k + 1] === "\n") k++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function LetterboxdImport({ items, uid, logs, onDone }: { items: Item[]; uid: string; logs: Log[]; onDone: () => void }) {
  const { t, lang: appLang } = useLocale();
  const action=useAction();
  const [rows, setRows] = useState<{ id: string; name: string; year: string; rating: number | null; item: Item | undefined; on: boolean }[] | null>(null);
  const [msg, setMsg] = useState("");
  const [openImport, setOpenImport] = useState(false);
  async function onFile(f: File) {
    const data = parseCsv(await f.text());
    const head = (data[0] ?? []).map((h) => h.trim().toLowerCase());
    const ni = head.indexOf("name"), yi = head.indexOf("year"), ri = head.indexOf("rating");
    if (ni < 0) { setMsg(t("This file has no Name column.")); return; }
    const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    setRows(data.slice(1).map((r) => {
      const name = r[ni] ?? "", year = r[yi] ?? "";
      const item = items.find((i) => i.media_type === "film" && [i.title_en, i.original_title].some((t) => t && norm(t) === norm(name)) && (!year || String(i.year) === year.trim()));
      const rt = Number(r[ri]);
      return { id: crypto.randomUUID(), name, year, rating: rt >= 0.5 && rt<= 5 ? Math.round(rt * 2) / 2 : null, item, on: !!item };
    }));
  }
  async function confirm() {
    const pick = (rows??[]).filter((r) => r.on && r.item);
    for (const r of pick) { if(!r.item)continue; await saveLog(uid, r.item, logs.find((l) => l.item_id === r.item?.id), { status: "seen", rating: r.rating, review: null }); }
    setMsg(t("Imported {count} films.", {count:pick.length})); setRows(null); onDone();
  }
  return (
    <>
    <button className="btn" onClick={() => setOpenImport(true)}>{t('Import from Letterboxd')}</button>
    {openImport && <Presence historyEntry className="drawer-bg" onExit={() => setOpenImport(false)}>{close => <>
    <div className="drawer-dismiss" onClick={close}/>
    <div className="drawer stack" role="dialog" aria-modal="true" aria-label={t('Import from Letterboxd')}>
    <button className="btn icon-btn" aria-label={t('Close')} onClick={close}>✕</button>
      <strong>{t('Import from Letterboxd')}</strong>
      <span className="muted small">{t('Upload ratings.csv (Name, Year, Rating).')}</span>
      <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {rows && (
        <>
          <MotionList scope="import-preview" setKey={rows.map(r=>r.id).join(',')}>
              {rows.map(r => <label key={r.id} className="list-item row"><input type="checkbox" disabled={!r.item} checked={r.on} onChange={e => setRows(rows.map(x => x.id === r.id ? { ...x, on: e.target.checked } : x))}/><span className="stack"><strong>{r.name}</strong><span>{r.year} · {t('Rating')}: {r.rating ?? t('No rating')}</span>{r.item ? <span className="ok">✓ {t('Matched')}</span> : <span className="error">{t('Unmatched')}</span>}</span></label>)}
          </MotionList>
          <button className="btn btn-primary" disabled={action.busy} onClick={()=>action.run(async()=>{await confirm();close();})}>{t('Confirm')}</button>
        </>
      )}
      {action.error&&<p className="error">{action.error}</p>}
      {msg && <span className="small ok">{msg}</span>}
    </div>
    </>}</Presence>}
    </>
  );
}
