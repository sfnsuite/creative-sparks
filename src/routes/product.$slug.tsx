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
                onClick={() => {
                  // أضف إلى السلة
                  const cartItem = {
                    productId: product.id,
                    title: product.title,
                    price: product.price,
                    quantity: qty,
                    size: size,
                    image: product.images?.[0],
                  };
                  const stored = localStorage.getItem("shop-cart") || "[]";
                  const cart = JSON.parse(stored);
                  const existing = cart.find(
                    (i: any) => i.productId === cartItem.productId && i.size === cartItem.size
                  );
                  if (existing) {
                    existing.quantity += qty;
                  } else {
                    cart.push(cartItem);
                  }
                  localStorage.setItem("shop-cart", JSON.stringify(cart));
                  window.dispatchEvent(new Event("storage"));
                  toast.success("تم إضافة المنتج للسلة");
                }}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                أضف للسلة
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="rounded-full border border-primary/30 bg-card px-6 py-3 text-sm font-semibold text-primary hover:bg-accent"
              >
                طلب مباشر
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"info" | "confirm">("info");

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.full_name.trim()) {
      newErrors.full_name = "الاسم مطلوب";
    }
    if (!form.phone.trim()) {
      newErrors.phone = "رقم الهاتف مطلوب";
    } else if (!/^[0-9\s\-\+]{8,}$/.test(form.phone.replace(/\s/g, ""))) {
      newErrors.phone = "رقم هاتف غير صحيح";
    }
    if (!form.address.trim()) {
      newErrors.address = "العنوان مطلوب";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      navigate({ to: "/account" });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "وقعت مشكلة"),
  });

  const handleNext = () => {
    if (validateForm()) {
      setStep("confirm");
    }
  };

  const handleSubmit = () => {
    mutation.mutate();
  };

  const totalPrice = Number(product.price) * qty;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        {step === "info" ? (
          <>
            <h3 className="font-display text-xl font-bold text-primary">بيانات الطلب</h3>

            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="full_name" className="mb-1 block text-xs font-semibold text-muted-foreground">
                  الاسم الكامل
                </label>
                <input
                  id="full_name"
                  type="text"
                  placeholder="أدخل اسمك الكامل"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm transition ${
                    errors.full_name ? "border-red-500 bg-red-50/50" : "border-border bg-background"
                  }`}
                  value={form.full_name}
                  onChange={(e) => {
                    setForm({ ...form, full_name: e.target.value });
                    if (errors.full_name) setErrors({ ...errors, full_name: "" });
                  }}
                />
                {errors.full_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block text-xs font-semibold text-muted-foreground">
                  رقم الهاتف
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="0612345678"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm transition ${
                    errors.phone ? "border-red-500 bg-red-50/50" : "border-border bg-background"
                  }`}
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (errors.phone) setErrors({ ...errors, phone: "" });
                  }}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="address" className="mb-1 block text-xs font-semibold text-muted-foreground">
                  العنوان
                </label>
                <input
                  id="address"
                  type="text"
                  placeholder="مثلاً: شارع محمد الخامس، رقم 42"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm transition ${
                    errors.address ? "border-red-500 bg-red-50/50" : "border-border bg-background"
                  }`}
                  value={form.address}
                  onChange={(e) => {
                    setForm({ ...form, address: e.target.value });
                    if (errors.address) setErrors({ ...errors, address: "" });
                  }}
                />
                {errors.address && (
                  <p className="mt-1 text-xs text-red-600">{errors.address}</p>
                )}
              </div>

              <div>
                <label htmlFor="city" className="mb-1 block text-xs font-semibold text-muted-foreground">
                  المدينة (اختياري)
                </label>
                <input
                  id="city"
                  type="text"
                  placeholder="الدار البيضاء"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="notes" className="mb-1 block text-xs font-semibold text-muted-foreground">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  id="notes"
                  placeholder="مثلاً: تسليم بعد الساعة 18:00"
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                التالي
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-display text-xl font-bold text-primary">تأكيد الطلب</h3>

            <div className="mt-4 space-y-4 rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المنتج:</span>
                <span className="font-semibold">{product.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">القياس:</span>
                <span className="font-semibold">{size || "بدون"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الكمية:</span>
                <span className="font-semibold">{qty}</span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">الإجمالي:</span>
                  <span className="font-display text-lg font-bold text-primary">
                    {totalPrice} {shopConfig.currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-blue-50/50 p-3 text-xs text-blue-800">
              <p className="font-semibold mb-1">ملاحظة مهمة:</p>
              <p>سيتم التواصل معك ف أقرب وقت لتأكيد الطلب والتفاصيل النهائية.</p>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setStep("info")}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {mutation.isPending ? "جاري الإرسال..." : "تأكيد الطلب"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
