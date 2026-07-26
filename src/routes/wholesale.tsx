import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { shopConfig } from "@/config/shop";
import { toast } from "sonner";
import { Users } from "lucide-react";

export const Route = createFileRoute("/wholesale")({
  head: () => ({
    meta: [
      { title: `إنتاج بالجملة — ${shopConfig.name}` },
      { name: "description", content: "خدمة B2B: نصنعو ملابس بالكميات للتجار والمحلات." },
      { property: "og:title", content: `إنتاج بالجملة — ${shopConfig.name}` },
      { property: "og:description", content: "خدمة B2B للتجار." },
    ],
  }),
  component: Wholesale,
});

function Wholesale() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    company: "",
    product_type: "",
    quantity: "",
    message: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("wholesale_leads").insert({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        company: form.company || null,
        product_type: form.product_type || null,
        quantity: form.quantity ? Number(form.quantity) : null,
        message: form.message || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("وصل ليك طلبك. غاتوصلك مكالمة قريباً.");
      navigate({ to: "/" });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "وقعت مشكلة"),
  });

  return (
    <div className="min-h-screen">
      <SiteNav />
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold text-primary md:text-4xl">
            إنتاج بالجملة
          </h1>
          <p className="mt-2 text-muted-foreground">
            تاجر أو صاحب محل؟ نصاوبو ليك منتجاتك بكميات وبأسعار مناسبة.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">الاسم الكامل</label>
              <input
                required
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">رقم التيليفون</label>
              <input
                required
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">الشركة / المحل</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">الإيميل</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">نوع المنتج</label>
              <input
                placeholder="مثلا: تيشرت، قندورة..."
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.product_type}
                onChange={(e) => setForm({ ...form, product_type: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">الكمية المطلوبة</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">تفاصيل إضافية</label>
            <textarea
              rows={5}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending ? "..." : "أرسل الطلب"}
          </button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}
