import { useLocale } from "@/lib/locale";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/strings";
import { useQuery } from "@tanstack/react-query";
import { Loading, Shell } from "@/components/phi";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/shops")({
  head: () => ({ meta: [{ title: "Bookshops · Philomathia" }, { name: "description", content: "Tbilisi bookshops and their stock." }, { property: "og:title", content: "Bookshops · Philomathia" }, { property: "og:description", content: "Tbilisi bookshops and their stock." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Shops,
});

function Shops() {
  const { t, lang: appLang } = useLocale();
  const q = useQuery({
    queryKey: ["shops"],
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,name,address,city,shop_stock(price_gel,quantity,items(id,title_en,title_ka))").order("name");
      return data ?? [];
    },
  });
  return (
    <Shell>
      <div className="between"><h1 className="h1">{t('Bookshops')}</h1><span className="muted small">{t('Sample data, not real stores')}</span></div>
      {!q.data ? <Loading /> : q.data.map((s: any) => (
        <div key={s.id} className="box" style={{ marginBottom: 16 }}>
          <strong>{s.name}</strong>
          <div className="muted small">{s.address}, {s.city}</div>
          {s.shop_stock.map((st: any, k: number) => (
            <div key={k} className="between small" style={{ padding: "8px 0" }}>
              <Link to="/item/$id" params={{ id: st.items.id }} style={{ color: "white" }}>{appLang === "ka" && st.items.title_ka?.trim() ? st.items.title_ka : st.items.title_en}</Link>
              <span>{st.quantity > 0 ? `${formatPrice(st.price_gel,appLang)} · ${st.quantity}` : <span className="muted">{t('Out of stock')}</span>}</span>
            </div>
          ))}
        </div>
      ))}
    </Shell>
  );
}
