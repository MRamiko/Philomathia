import { MotionList } from '@/components/motion';
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
      const { data,error } = await supabase.from("shops").select("id,name,address,city,shop_stock(id,price_gel,quantity,items(id,title_en,title_ka))").order("name");
      if(error)throw error;
      return data ?? [];
    },
  });
  return (
    <Shell>
      <div className="between"><h1 className="h1">{t('Bookshops')}</h1><span className="muted small">{t('Sample data, not real stores')}</span></div>
      {q.error ? <p className="error">{t("Could not load.")}<button className="btn" onClick={()=>q.refetch()}>{t("Retry")}</button></p> : !q.data ? <Loading /> : q.data.length===0 ? <p>{t("No results")}</p> : q.data.map((s: any) => (
        <div key={s.id} className="box" style={{ marginBottom: 16 }}>
          <strong>{s.name}</strong><p className="muted small">{t("Sample stock and prices")}</p>
          <div className="muted small">{s.address}, {s.city}</div>
          <MotionList scope={`shop-${s.id}`}>{s.shop_stock.map((st: any) => (
            <div key={st.id} className="between small" style={{ padding: "8px 0" }}>
              <Link to="/item/$id" params={{ id: st.items.id }} className="stock-title">{appLang === "ka" && st.items.title_ka?.trim() ? st.items.title_ka : st.items.title_en}</Link>
              <span>{st.quantity > 0 ? `${formatPrice(st.price_gel,appLang)} · ${st.quantity}` : <span className="stock-out">{t('Out of stock')}</span>}</span>
            </div>
          ))}</MotionList>
        </div>
      ))}
    </Shell>
  );
}
