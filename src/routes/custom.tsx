import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { shopConfig } from "@/config/shop";
import { toast } from "sonner";
import { Scissors } from "lucide-react";

export const Route = createFileRoute("/custom")({
  head: () => ({
    meta: [
      { title: `صمم موديلك — ${shopConfig.name}` },
      { name: "description", content: "عندك موديل ف بالك؟ رسلو لينا ونصاوبوه ليك على المقاس." },
      { property: "og:title", content: `صمم موديلك — ${shopConfig.name}` },
      { property: "og:description", content: "خياطة على المقاس حسب طلبك." },
    ],
  }),
  component: Custom,
});

function Custom() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", description: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("custom_orders").insert({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        description: form.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("وصلات لينا طلبك، غانتواصلو معاك قريب.");
      navigate({ to: "/" });
    },
    onError: (e: any) => toast.error(e.message ?? "وقعت مشكلة"),
  });

  return (
    <div className="min-h-screen">
      <SiteNav />
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Scissors className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold text-primary md:text-4xl">
            صمم موديلك الخاص
          </h1>
          <p className="mt-2 text-muted-foreground">
            وصف لينا الموديل اللي بغيتي، والقياسات، ولا رسلنا صورة، وحنا نتكلفو بالباقي.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6"
        >
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
            <label className="text-sm font-semibold">رقم التيليفون / واتساب</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-semibold">الإيميل (اختياري)</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-semibold">وصف الموديل والمقاسات</label>
            <textarea
              required
              rows={6}
              placeholder="مثال: قندورة نسائية بلون بيج، مقاس M، بأكمام طويلة، وطرز ذهبي عند الرقبة..."
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            نصيحة: يمكن ليك ترسل صورة مرجعية أو تشرح التفاصيل ف الواتساب بعد ما نتواصلو معاك.
          </p>
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
