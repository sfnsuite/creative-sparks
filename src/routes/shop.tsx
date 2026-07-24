import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { ProductCard } from "@/components/product-card";
import { shopConfig } from "@/config/shop";

const shopQuery = queryOptions({
  queryKey: ["products", "shop"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: `المتجر — ${shopConfig.name}` },
      { name: "description", content: `تصفح منتجاتنا الجاهزة من ${shopConfig.name}` },
      { property: "og:title", content: `المتجر — ${shopConfig.name}` },
      { property: "og:description", content: `تصفح منتجاتنا الجاهزة من ${shopConfig.name}` },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(shopQuery),
  component: Shop,
});

function Shop() {
  const { data: products } = useSuspenseQuery(shopQuery);

  return (
    <div className="min-h-screen">
      <SiteNav />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-primary md:text-4xl">المتجر</h1>
        <p className="mt-2 text-muted-foreground">كل المنتجات المتوفرة دابا</p>

        {products.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            مازال ما زدنا شي منتج. عاود بعد شوية.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
