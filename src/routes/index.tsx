import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { ProductCard } from "@/components/product-card";
import { shopConfig } from "@/config/shop";
import { ArrowLeft, Scissors, Package, Users } from "lucide-react";

const featuredQuery = queryOptions({
  queryKey: ["products", "featured"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${shopConfig.name} — ${shopConfig.tagline}` },
      { name: "description", content: shopConfig.description },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQuery),
  component: Index,
});

function Index() {
  const { data: products } = useSuspenseQuery(featuredQuery);

  return (
    <div className="min-h-screen">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gold/40 bg-card/60 px-4 py-1 text-xs text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {shopConfig.city} — خياطة مغربية أصيلة
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold text-primary md:text-6xl">
            {shopConfig.tagline}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            {shopConfig.description}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {shopConfig.services.readyToBuy && (
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                شوف المتجر
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            {shopConfig.services.customDesign && (
              <Link
                to="/custom"
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card px-6 py-3 text-sm font-semibold text-primary hover:bg-accent"
              >
                صمم موديلك
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-center text-primary">شنو كنقدمو</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {shopConfig.services.readyToBuy && (
            <ServiceCard
              icon={<Package className="h-6 w-6" />}
              title="ملابس جاهزة"
              desc="اشري ديركت من الكتالوغ، وصلا لباب دارك."
              to="/shop"
            />
          )}
          {shopConfig.services.customDesign && (
            <ServiceCard
              icon={<Scissors className="h-6 w-6" />}
              title="خياطة على المقاس"
              desc="عندك موديل ف راسك؟ رسلو ليا ونصنعو ليك."
              to="/custom"
            />
          )}
          {shopConfig.services.wholesale && (
            <ServiceCard
              icon={<Users className="h-6 w-6" />}
              title="إنتاج بالجملة"
              desc="تاجر أو محل؟ نصاوبو ليك منتجاتك بكميات."
              to="/wholesale"
            />
          )}
        </div>
      </section>

      {/* FEATURED */}
      {products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-3xl font-bold text-primary">جدد ما وصل</h2>
            <Link to="/shop" className="text-sm text-primary hover:underline">
              شوف الكل
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}

function ServiceCard({
  icon,
  title,
  desc,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-card p-6 transition hover:border-gold hover:shadow-lg"
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
        بدا <ArrowLeft className="h-4 w-4" />
      </div>
    </Link>
  );
}
