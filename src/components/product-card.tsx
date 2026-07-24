import { Link } from "@tanstack/react-router";
import { shopConfig } from "@/config/shop";
import type { Tables } from "@/integrations/supabase/types";
import { publicImageUrl } from "@/lib/storage";

type Product = Tables<"products">;

export function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0];
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40 hover:shadow-lg"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {img ? (
          <img
            src={publicImageUrl(img)}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            بلا صورة
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 font-display text-lg font-semibold text-foreground">
          {product.title}
        </h3>
        {product.category && (
          <div className="mt-1 text-xs text-muted-foreground">{product.category}</div>
        )}
        <div className="mt-3 flex items-baseline gap-1 text-primary">
          <span className="font-display text-xl font-bold">{Number(product.price).toFixed(0)}</span>
          <span className="text-sm">{shopConfig.currencySymbol}</span>
        </div>
      </div>
    </Link>
  );
}
