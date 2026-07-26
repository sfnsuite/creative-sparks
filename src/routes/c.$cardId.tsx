import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { ProductCard } from "@/components/product-card";
import { shopConfig } from "@/config/shop";
import { publicImageUrl } from "@/lib/storage";
import { useEffect } from "react";
import type { Tables } from "@/integrations/supabase/types";

type PromoCard = Tables<"promo_cards">;
type Product = Tables<"products">;

const cardQuery = (id: string) =>
  queryOptions({
    queryKey: ["promo", id],
    queryFn: async () => {
      const { data: card, error } = await supabase
        .from("promo_cards")
        .select("*")
        .eq("id", id)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      if (!card) throw notFound();
      const ids = [card.active_product_id, ...(card.companion_product_ids ?? [])].filter(
        Boolean,
      ) as string[];
      let products: Product[] = [];
      if (ids.length) {
        const { data: p, error: pe } = await supabase
          .from("products")
          .select("*")
          .in("id", ids)
          .eq("active", true);
        if (pe) throw pe;
        products = p ?? [];
      }
      return { card, products };
    },
  });

export const Route = createFileRoute("/c/$cardId")({
  head: ({ loaderData }: { loaderData?: { card: PromoCard; products: Product[] } }) => {
    const main = loaderData?.products.find((p) => p.id === loaderData.card.active_product_id);
    return {
      meta: [
        {
          title: main?.title
            ? `${main.title} — ${shopConfig.name}`
            : `${shopConfig.name} — ${shopConfig.tagline}`,
        },
        {
          name: "description",
          content: loaderData?.card.headline ?? main?.description ?? shopConfig.description,
        },
        { property: "og:title", content: main?.title ?? shopConfig.name },
        {
          property: "og:description",
          content: loaderData?.card.headline ?? shopConfig.description,
        },
        ...(main?.images?.[0]
          ? [
              { property: "og:image", content: publicImageUrl(main.images[0]) },
              { name: "twitter:image", content: publicImageUrl(main.images[0]) },
            ]
          : []),
      ],
    };
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(cardQuery(params.cardId)),
  component: CardPage,
});

function CardPage() {
  const { cardId } = Route.useParams();
  const { data } = useSuspenseQuery(cardQuery(cardId));
  const main = data.products.find((p) => p.id === data.card.active_product_id);
  const companions = data.products.filter((p) => p.id !== data.card.active_product_id);

  useEffect(() => {
    // Fire-and-forget click count via SECURITY DEFINER RPC. No direct UPDATE
    // access is granted to anon/authenticated on promo_cards; the RPC only
    // bumps click_count for active cards. Failures are silently ignored to
    // avoid weakening RLS or leaking existence information.
    supabase.rpc("increment_promo_card_click", { _card_id: cardId }).then(
      () => undefined,
      () => undefined,
    );
  }, [cardId]);

  if (!main) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-primary">قريباً</h1>
          <p className="mt-2 text-muted-foreground">هاد الكارت غايوجد قريب.</p>
          <Link
            to="/shop"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            شوف المتجر
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <section className="mx-auto max-w-6xl px-4 py-8">
        {data.card.headline && (
          <div className="mb-6 rounded-2xl bg-gradient-to-l from-primary/10 to-gold/20 p-6 text-center">
            <h1 className="font-display text-2xl font-bold text-primary md:text-3xl">
              {data.card.headline}
            </h1>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            {main.images?.[0] && (
              <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                <img
                  src={publicImageUrl(main.images[0])}
                  alt={main.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
          <div>
            {main.category && <div className="text-xs text-muted-foreground">{main.category}</div>}
            <h2 className="mt-1 font-display text-3xl font-bold text-primary md:text-4xl">
              {main.title}
            </h2>
            <div className="mt-3 flex items-baseline gap-1 text-primary">
              <span className="font-display text-3xl font-bold">
                {Number(main.price).toFixed(0)}
              </span>
              <span className="text-sm">{shopConfig.currencySymbol}</span>
            </div>
            {main.description && (
              <p className="mt-4 whitespace-pre-line text-sm text-foreground/80">
                {main.description}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/product/$slug"
                params={{ slug: main.slug }}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                طلب الآن
              </Link>
              <a
                href={`https://wa.me/${shopConfig.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`سلام، رأيت ${main.title}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary hover:bg-accent"
              >
                واتساب
              </a>
            </div>
          </div>
        </div>

        {companions.length > 0 && (
          <div className="mt-16">
            <h3 className="font-display text-2xl font-bold text-primary">شوف تا هادو</h3>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {companions.map((p) => (
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
