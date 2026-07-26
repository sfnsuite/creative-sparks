import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { shopConfig } from "@/config/shop";
import { Search, Phone, Calendar, Package, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: `حسابي — ${shopConfig.name}` },
      {
        name: "description",
        content: "تابع طلباتك وتحقق من حالة شراءك",
      },
    ],
  }),
  component: AccountPage,
});

type Order = Tables<"orders">;
type CustomOrder = Tables<"custom_orders">;

function AccountPage() {
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // تخزين الطلبات المجمعة من كل الجداول
  const [allOrders, setAllOrders] = useState<
    (Order & { type: "standard" } | CustomOrder & { type: "custom" })[]
  >([]);

  const searchOrders = async () => {
    if (!phone.trim()) {
      toast.error("الرجاء إدخال رقم الهاتف");
      return;
    }

    setIsSearching(true);
    try {
      // البحث عن الطلبات العادية
      const { data: standardOrders, error: e1 } = await supabase
        .from("orders")
        .select("*")
        .eq("phone", phone);

      // البحث عن الطلبات المخصصة
      const { data: customOrders, error: e2 } = await supabase
        .from("custom_orders")
        .select("*")
        .eq("phone", phone);

      if (e1 || e2) {
        throw new Error(e1?.message || e2?.message || "خطأ في البحث");
      }

      const combined = [
        ...(standardOrders || []).map((o) => ({ ...o, type: "standard" as const })),
        ...(customOrders || []).map((o) => ({ ...o, type: "custom" as const })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAllOrders(combined);

      if (combined.length === 0) {
        toast.info("لم يتم العثور على طلبات لهذا الرقم");
      }
    } catch (error) {
      console.error("[Account] Search error:", error);
      toast.error("حدث خطأ في البحث");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      searchOrders();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-transparent px-4 py-12 md:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">
              حسابي
            </h1>
            <p className="mt-4 text-lg text-foreground/70">
              ابحث عن طلباتك باستخدام رقم الهاتف
            </p>
          </div>
        </section>

        {/* Search Section */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-xl border border-border bg-card p-6">
              <label htmlFor="phone" className="mb-3 block text-sm font-semibold">
                رقم الهاتف
              </label>
              <div className="flex gap-2">
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="مثال: 0612345678"
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
                <button
                  onClick={searchOrders}
                  disabled={isSearching}
                  className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  {isSearching ? "جاري البحث..." : "بحث"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Orders Section */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-4xl">
            {allOrders.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {phone ? "لم يتم العثور على طلبات" : "ابدأ بالبحث باستخدام رقم الهاتف"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">
                    {allOrders.length} طلب{allOrders.length > 1 ? "ات" : ""}
                  </h2>
                </div>

                {allOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-border bg-card p-6 hover:border-primary/50 transition"
                  >
                    {order.type === "standard" ? (
                      <StandardOrderCard order={order as Order} />
                    ) : (
                      <CustomOrderCard order={order as CustomOrder} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function StandardOrderCard({ order }: { order: Order }) {
  const product = order.product_snapshot as Record<string, any>;
  const statusLabel = getStatusLabel(order.status);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">{product?.title || "منتج"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">رقم الطلب: {order.id.slice(0, 8)}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(order.status)}`}>
          {statusLabel}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">الكمية / القياس</p>
          <p className="mt-1 font-semibold">
            {order.quantity} × {order.size || "بدون"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">السعر الإجمالي</p>
          <p className="mt-1 font-semibold">
            {Number(product?.price || 0) * order.quantity} {shopConfig.currencySymbol}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">تاريخ الطلب</p>
          <p className="mt-1 font-semibold">{formatDate(order.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">العنوان</p>
          <p className="mt-1 font-semibold text-sm">{order.address}</p>
        </div>
      </div>

      {order.notes && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">ملاحظات:</p>
          <p className="mt-1 text-sm">{order.notes}</p>
        </div>
      )}
    </div>
  );
}

function CustomOrderCard({ order }: { order: CustomOrder }) {
  const statusLabel = getStatusLabel(order.status);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">طلب خياطة مخصصة</h3>
          <p className="mt-1 text-sm text-muted-foreground">رقم الطلب: {order.id.slice(0, 8)}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(order.status)}`}>
          {statusLabel}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">الاسم</p>
          <p className="mt-1 font-semibold">{order.full_name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">تاريخ الطلب</p>
          <p className="mt-1 font-semibold">{formatDate(order.created_at)}</p>
        </div>
      </div>

      {order.description && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">التفاصيل:</p>
          <p className="mt-1 text-sm whitespace-pre-line">{order.description}</p>
        </div>
      )}

      {order.reference_images && order.reference_images.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">صور المرجع:</p>
          <div className="flex gap-2 flex-wrap">
            {order.reference_images.map((img, i) => (
              <a
                key={i}
                href={img}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                صورة {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكدة",
    processing: "قيد المعالجة",
    completed: "مكتملة",
    cancelled: "ملغاة",
  };
  return labels[status] || status;
}

function getStatusStyles(status: string): string {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return styles[status] || "bg-muted text-muted-foreground";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ar-MA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
