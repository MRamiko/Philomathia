import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loading, Shell } from "@/components/phi";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/shops")({
  head: () => ({ meta: [{ title: "Bookshops · Philomathia" }, { name: "description", content: "Tbilisi bookshops and their stock." }] }),
  component: Shops,
});

function Shops() {
  const q = useQuery({
    queryKey: ["shops"],
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,name,address,city,shop_stock(price_gel,quantity,items(id,title_en))").order("name");
      return data ?? [];
    },
  });
  return (
    <Shell>
      <div className="between"><h1 className="h1">Bookshops</h1><span className="muted small">Sample data</span></div>
      {!q.data ? <Loading /> : q.data.map((s: any) => (
        <div key={s.id} className="box" style={{ marginBottom: 16 }}>
          <strong>{s.name}</strong>
          <div className="muted small">{s.address}, {s.city}</div>
          {s.shop_stock.map((st: any, k: number) => (
            <div key={k} className="between small" style={{ padding: "8px 0" }}>
              <Link to="/item/$id" params={{ id: st.items.id }} style={{ color: "white" }}>{st.items.title_en}</Link>
              <span>{st.quantity > 0 ? `${st.price_gel} GEL · ${st.quantity}` : <span className="muted">Out of stock</span>}</span>
            </div>
          ))}
        </div>
      ))}
    </Shell>
  );
}
