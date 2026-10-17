import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MOODS = ["thought-provoking", "comforting", "melancholic", "mysterious", "philosophical", "suspenseful", "hopeful", "emotionally intense", "escapist", "curious"];

export type Filters = { media_type: "film" | "book" | "either"; max_minutes: number | null; moods: string[]; georgian_only: boolean; keywords: string[] };

async function chat(system: string, user: string): Promise<any | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return JSON.parse(j.choices?.[0]?.message?.content ?? "null");
  } catch {
    return null;
  }
}

function validate(raw: any): Filters | null {
  if (!raw || typeof raw !== "object") return null;
  const mt = ["film", "book", "either"].includes(raw.media_type) ? raw.media_type : "either";
  const mm = typeof raw.max_minutes === "number" && raw.max_minutes > 0 && raw.max_minutes < 1000 ? Math.round(raw.max_minutes) : null;
  const moods = Array.isArray(raw.moods) ? raw.moods.filter((m: unknown) => typeof m === "string" && MOODS.includes(m)) : [];
  const kws = Array.isArray(raw.keywords) ? raw.keywords.filter((k: unknown) => typeof k === "string" && k.length < 40).slice(0, 6).map((k: string) => k.toLowerCase()) : [];
  return { media_type: mt, max_minutes: mm, moods, georgian_only: raw.georgian_only === true, keywords: kws };
}

export const parseQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => ({ text: String(d.text ?? "").slice(0, 300) }))
  .handler(async ({ data }) => {
    const raw = await chat(
      `Convert the user's request for a film or book into JSON with exactly these keys: media_type ("film","book" or "either"), max_minutes (number or null; only for films), moods (array, only from: ${MOODS.join(", ")}), georgian_only (boolean), keywords (array of short lowercase genre or topic words, e.g. "thriller"). Reply with JSON only.`,
      data.text,
    );
    const f = validate(raw);
    return { filters: f, aiUsed: !!f };
  });

export const rewriteReasons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lang: string; items: { title: string; reason: string }[] }) => ({ lang: d.lang === "ka" ? "ka" : "en", items: (d.items ?? []).slice(0, 5) }))
  .handler(async ({ data }) => {
    const raw = await chat(
      `Rewrite each reason as one short friendly sentence in ${data.lang === "ka" ? "Georgian" : "English"}. Use ONLY the features named in the reason; do not add facts. Reply as JSON {"reasons": [string, ...]} in the same order.`,
      JSON.stringify(data.items),
    );
    const r = raw?.reasons;
    if (!Array.isArray(r) || r.length !== data.items.length || !r.every((x: unknown) => typeof x === "string")) return null;
    return r as string[];
  });
