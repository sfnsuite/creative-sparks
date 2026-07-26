import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { ProductCard } from "@/components/product-card";
import { shopConfig } from "@/config/shop";
import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });

  // استخراج الفئات الفريدة
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [products]);

  // تطبيق الفلاترات والبحث
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !search ||
        product.title.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = !selectedCategory || product.category === selectedCategory;

      const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max;

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [products, search, selectedCategory, priceRange]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-primary md:text-4xl">المتجر</h1>
        <p className="mt-2 text-muted-foreground">كل المنتجات المتوفرة دابا</p>

        {/* Filters & Search */}
        <div className="mt-8 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pr-10 pl-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  الفئة
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      selectedCategory === null
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    الكل
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        selectedCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price Range */}
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                السعر: {priceRange.min} - {priceRange.max} {shopConfig.currencySymbol}
              </label>
              <div className="flex gap-2">
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={priceRange.min}
                  onChange={(e) =>
                    setPriceRange({ ...priceRange, min: Number(e.target.value) })
                  }
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={priceRange.max}
                  onChange={(e) =>
                    setPriceRange({ ...priceRange, max: Number(e.target.value) })
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            {search || selectedCategory || priceRange.min > 0 || priceRange.max < 10000
              ? "لم يتم العثور على منتجات تطابق البحث"
              : "مازال ما زدنا شي منتج. عاود بعد شوية."}
          </div>
        ) : (
          <div className="mt-8">
            <p className="mb-4 text-sm text-muted-foreground">
              عدد المنتجات: {filteredProducts.length}
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
