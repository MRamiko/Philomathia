import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ItemRow, Loading, Shell } from "@/components/phi";
import { supabase } from "@/integrations/supabase/client";
import { saveLog, undoSwipe, useItems, useMe, useRefresh, type Log } from "@/lib/data";
import type { Item } from "@/lib/recommend";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Library · Philomathia" }, { name: "description", content: "Your liked, wanted and finished films and books." }] }),
  component: Library,
});

function Library() {
  const items = useItems();
  const me = useMe();
  const refresh = useRefresh();
  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  const d = me.data;
  const lang = d.profile.preferred_language;
  const byId = new Map(items.data.map((i) => [i.id, i]));
  const logged = (s: string) => d.logs.filter((l) => l.status === s).map((l) => ({ l, i: byId.get(l.item_id)! })).filter((x) => x.i);
  const liked = d.swipes.filter((s) => s.action === "like").map((s) => byId.get(s.item_id)!).filter(Boolean);
  const passed = d.swipes.filter((s) => s.action === "pass").map((s) => byId.get(s.item_id)!).filter(Boolean);

  const positive = Object.entries(d.weights).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
  const total = positive.reduce((s, [, w]) => s + w, 0);
  const cloud = positive.slice(0, 12);

  return (
    <Shell>
      <h1 className="h1">Library</h1>
      <div className="box">
        <strong>Taste Cloud</strong>
        {cloud.length === 0 ? <p className="muted small">Like a few titles to grow your taste cloud.</p> : (
          <p className="tag-cloud">
            {cloud.map(([t, w]) => (
              <Link key={t} to="/discover" search={{ tag: t }}>
                {t.replace("creator:", "")} <span className="muted">{Math.round((w / total) * 100)}%</span>
              </Link>
            ))}
          </p>
        )}
      </div>

      <Section title="Liked" empty="Nothing liked yet.">{liked.map((i) => <ItemRow key={i.id} item={i} lang={lang} />)}</Section>
      {(["want", "in_progress"] as const).map((s) => (
        <Section key={s} title={s === "want" ? "Want to watch or read" : "In progress"} empty="Empty.">
          {logged(s).map(({ l, i }) => <ItemRow key={i.id} item={i} lang={lang} right={<MarkDone uid={d.uid} item={i} prev={l} onDone={refresh} />} />)}
        </Section>
      ))}
      <Section title="Done" empty="Nothing finished yet.">
        {logged("seen").map(({ l, i }) => <ItemRow key={i.id} item={i} lang={lang} right={<span className="small">{l.rating ? `${l.rating} / 5` : <span className="muted">No rating</span>}</span>} />)}
      </Section>
      <Section title="Passed" empty="No passes.">
        {passed.map((i) => <ItemRow key={i.id} item={i} lang={lang} right={<button className="btn btn-sm" onClick={async () => { await undoSwipe(i, "pass"); refresh(); }}>Undo</button>} />)}
      </Section>
      <LetterboxdImport items={items.data} uid={d.uid} logs={d.logs} onDone={refresh} />
    </Shell>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] | React.ReactNode }) {
  const has = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <>
      <div className="h2">{title}</div>
      {has ? children : <p className="muted small">{empty}</p>}
    </>
  );
}

function MarkDone({ uid, item, prev, onDone }: { uid: string; item: Item; prev: Log; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [r, setR] = useState("");
  if (!open) return <button className="btn btn-sm" onClick={() => setOpen(true)}>Mark done</button>;
  return (
    <>
      <select className="input" value={r} onChange={(e) => setR(e.target.value)}>
        <option value="">No rating</option>
        {Array.from({ length: 10 }, (_, k) => (k + 1) / 2).map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <button className="btn btn-sm btn-primary" onClick={async () => { await saveLog(uid, item, prev, { status: "seen", rating: r ? Number(r) : null, review: prev.review }); onDone(); }}>Save</button>
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
  const [rows, setRows] = useState<{ name: string; year: string; rating: number | null; item: Item | undefined; on: boolean }[] | null>(null);
  const [msg, setMsg] = useState("");
  async function onFile(f: File) {
    const data = parseCsv(await f.text());
    const head = (data[0] ?? []).map((h) => h.trim().toLowerCase());
    const ni = head.indexOf("name"), yi = head.indexOf("year"), ri = head.indexOf("rating");
    if (ni < 0) { setMsg("This file has no Name column."); return; }
    const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    setRows(data.slice(1).map((r) => {
      const name = r[ni] ?? "", year = r[yi] ?? "";
      const item = items.find((i) => i.media_type === "film" && [i.title_en, i.original_title].some((t) => t && norm(t) === norm(name)) && (!year || String(i.year) === year.trim()));
      const rt = Number(r[ri]);
      return { name, year, rating: rt >= 0.5 && rt <= 5 ? Math.round(rt * 2) / 2 : null, item, on: !!item };
    }));
  }
  async function confirm() {
    const pick = rows!.filter((r) => r.on && r.item);
    for (const r of pick) await saveLog(uid, r.item!, logs.find((l) => l.item_id === r.item!.id), { status: "seen", rating: r.rating, review: null });
    setMsg(`Imported ${pick.length} films.`); setRows(null); onDone();
  }
  return (
    <div className="box stack" style={{ marginTop: 24 }}>
      <strong>Import from Letterboxd</strong>
      <span className="muted small">Upload ratings.csv (Name, Year, Rating).</span>
      <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {rows && (
        <>
          <table className="t">
            <thead><tr><th></th><th>Name</th><th>Year</th><th>Rating</th><th>Match</th></tr></thead>
            <tbody>
              {rows.map((r, k) => (
                <tr key={k}>
                  <td><input type="checkbox" disabled={!r.item} checked={r.on} onChange={(e) => setRows(rows.map((x, j) => (j === k ? { ...x, on: e.target.checked } : x)))} /></td>
                  <td>{r.name}</td><td>{r.year}</td><td>{r.rating ?? ""}</td>
                  <td>{r.item ? <span className="ok">Matched</span> : <span className="muted">Unmatched</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-primary" onClick={confirm}>Confirm</button>
        </>
      )}
      {msg && <span className="small ok">{msg}</span>}
    </div>
  );
}
