import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { shopConfig } from "@/config/shop";
import { publicImageUrl } from "@/lib/storage";
import { useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as NonNullable<typeof data>;
    },
  });

export const Route = createFileRoute("/product/$slug")({
  head: ({ loaderData }: { loaderData?: Product }) => {
    const p = loaderData;
    return {
      meta: p
        ? [
            { title: `${p.title} — ${shopConfig.name}` },
            { name: "description", content: p.description ?? shopConfig.description },
            { property: "og:title", content: p.title },
            { property: "og:description", content: p.description ?? shopConfig.description },
            ...(p.images?.[0]
              ? [
                  { property: "og:image", content: publicImageUrl(p.images[0]) },
                  { name: "twitter:image", content: publicImageUrl(p.images[0]) },
                ]
              : []),
          ]
        : [{ title: "المنتج" }, { name: "robots", content: "noindex" }],
    };
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(productQuery(params.slug)),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQuery(slug));
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState<string | undefined>(product.sizes?.[0]);
  const [qty, setQty] = useState(1);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen">
      <SiteNav />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
              {product.images?.[activeImg] && (
                <img
                  src={publicImageUrl(product.images[activeImg])}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setActiveImg(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === activeImg ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={publicImageUrl(img)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {product.category && (
              <div className="text-xs text-muted-foreground">{product.category}</div>
            )}
            <h1 className="mt-1 font-display text-3xl font-bold text-primary md:text-4xl">
              {product.title}
            </h1>
            <div className="mt-3 flex items-baseline gap-1 text-primary">
              <span className="font-display text-3xl font-bold">
                {Number(product.price).toFixed(0)}
              </span>
              <span className="text-sm">{shopConfig.currencySymbol}</span>
            </div>
            {product.description && (
              <p className="mt-4 whitespace-pre-line text-sm text-foreground/80">
                {product.description}
              </p>
            )}

            {product.sizes.length > 0 && (
              <div className="mt-6">
                <div className="text-sm font-semibold">القياس</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`rounded-md border px-3 py-1.5 text-sm ${size === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="text-sm font-semibold">الكمية</div>
              <div className="mt-2 inline-flex items-center rounded-md border border-border">
                <button className="px-3 py-1.5" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span className="w-10 text-center">{qty}</span>
                <button className="px-3 py-1.5" onClick={() => setQty((q) => q + 1)}>
                  +
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                طلب الآن
              </button>
              <a
                href={`https://wa.me/${shopConfig.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`سلام، بغيت نسول على ${product.title}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-primary/30 bg-card px-6 py-3 text-sm font-semibold text-primary hover:bg-accent"
              >
                سؤال ف واتساب
              </a>
            </div>
          </div>
        </div>

        {showForm && (
          <OrderForm product={product} size={size} qty={qty} onClose={() => setShowForm(false)} />
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function OrderForm({
  product,
  size,
  qty,
  onClose,
}: {
  product: Product;
  size?: string;
  qty: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", city: "", notes: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").insert({
        ...form,
        product_id: product.id,
        product_snapshot: {
          title: product.title,
          price: product.price,
          image: product.images?.[0],
        },
        size,
        quantity: qty,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إرسال طلبك! غانتواصلو معاك ف أقرب وقت.");
      onClose();
      navigate({ to: "/" });
    },
    onError: (e: any) => toast.error(e.message ?? "وقعت مشكلة"),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl font-bold text-primary">تفاصيل الطلب</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mt-4 space-y-3"
        >
          <input
            required
            placeholder="الاسم الكامل"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <input
            required
            placeholder="رقم التيليفون"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            required
            placeholder="العنوان"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            placeholder="المدينة"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <textarea
            placeholder="ملاحظات (اختياري)"
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border px-4 py-2 text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending ? "..." : "أكد الطلب"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
