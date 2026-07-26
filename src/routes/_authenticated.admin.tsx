import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shopConfig } from "@/config/shop";
import { useState } from "react";
import { toast } from "sonner";
import { publicImageUrl, uploadProductImage } from "@/lib/storage";
import { Plus, Package, ShoppingBag, Megaphone, LogOut, Trash2, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Order = Tables<"orders">;
type CustomOrder = Tables<"custom_orders">;
type Lead = Tables<"wholesale_leads">;
type PromoCard = Tables<"promo_cards">;

// Authorization is enforced by the parent `_authenticated` layout via
// getVerifiedAdmin(). Child routes inherit that context; we intentionally
// avoid a redundant session-only check here. RLS is the final authority.
export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { userId, email } = Route.useRouteContext();
  const [tab, setTab] = useState<"products" | "cards" | "orders">("products");
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="font-display text-lg font-bold text-primary">{shopConfig.name}</Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground md:inline">{email}</span>
            <button onClick={logout} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 hover:bg-accent">
              <LogOut className="h-4 w-4" /> خروج
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          <TabBtn active={tab === "products"} onClick={() => setTab("products")} icon={<Package className="h-4 w-4" />}>المنتجات</TabBtn>
          <TabBtn active={tab === "cards"} onClick={() => setTab("cards")} icon={<Megaphone className="h-4 w-4" />}>الكارتات</TabBtn>
          <TabBtn active={tab === "orders"} onClick={() => setTab("orders")} icon={<ShoppingBag className="h-4 w-4" />}>الطلبات</TabBtn>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "products" && <ProductsTab userId={userId} />}
        {tab === "cards" && <CardsTab />}
        {tab === "orders" && <OrdersTab />}
      </main>
      <Outlet />
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: any) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {icon} {children}
    </button>
  );
}

/* ============================ PRODUCTS ============================ */

const productsQuery = queryOptions({
  queryKey: ["admin", "products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

function ProductsTab({ userId }: { userId: string }) {
  const { data: products } = useSuspenseQuery(productsQuery);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">المنتجات ({products.length})</h2>
        <button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-5 w-5" /> منتج جديد
        </button>
      </div>

      {products.length === 0 ? (
        <EmptyState msg="مازال ما زدتي شي منتج. كليك على 'منتج جديد' باش تبدا." />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <button key={p.id} onClick={() => setEditing(p)} className="group overflow-hidden rounded-xl border border-border bg-card text-right transition hover:border-primary">
              <div className="aspect-square overflow-hidden bg-muted">
                {p.images?.[0] ? (
                  <img src={publicImageUrl(p.images[0])} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-muted-foreground">بلا صورة</div>
                )}
              </div>
              <div className="p-3">
                <div className="line-clamp-1 text-sm font-semibold">{p.title}</div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-primary">{Number(p.price).toFixed(0)} {shopConfig.currencySymbol}</span>
                  <span className={p.active ? "text-green-600" : "text-muted-foreground"}>{p.active ? "نشط" : "متوقف"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {editing && <ProductEditor product={editing === "new" ? null : editing} userId={userId} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProductEditor({ product, userId, onClose }: { product: Product | null; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: product?.title ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product?.price?.toString() ?? "",
    category: product?.category ?? "",
    sizes: product?.sizes?.join(", ") ?? "",
    stock: product?.stock?.toString() ?? "0",
    active: product?.active ?? true,
    images: product?.images ?? [],
  });
  const [uploading, setUploading] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(uploadProductImage));
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
    } catch (e: any) {
      toast.error(e.message ?? "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        slug: form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") || crypto.randomUUID().slice(0, 8),
        description: form.description || null,
        price: Number(form.price) || 0,
        category: form.category || null,
        sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
        stock: Number(form.stock) || 0,
        active: form.active,
        images: form.images,
      };
      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(product ? "تحدثات" : "زيدات");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "فشل الحفظ"),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!product) return;
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمسحات");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "فشل المسح"),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-primary">{product ? "تعديل منتج" : "منتج جديد"}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-muted-foreground">×</button>
        </div>

        {/* Instagram-style image picker */}
        <div className="mt-4">
          <label className="text-sm font-semibold">الصور</label>
          <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-4">
            {form.images.map((img, i) => (
              <div key={img} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <img src={publicImageUrl(img)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                  className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-8 w-8" />}
              <input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
            </label>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <input placeholder="اسم المنتج" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="الوصف" rows={4} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid gap-3 md:grid-cols-3">
            <input placeholder={`الثمن (${shopConfig.currencySymbol})`} type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input placeholder="النوع (قندورة، تيشرت...)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input placeholder="المخزون" type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <input placeholder="القياسات (S, M, L)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            نشط ويظهر ف المتجر
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          {product && (
            <button onClick={() => confirm("متأكد؟") && del.mutate()} className="rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
              مسح
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">إلغاء</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.title} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {save.isPending ? "..." : "نشر"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================ CARDS ============================ */

const cardsQuery = queryOptions({
  queryKey: ["admin", "cards"],
  queryFn: async () => {
    const { data, error } = await supabase.from("promo_cards").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

function CardsTab() {
  const { data: cards } = useSuspenseQuery(cardsQuery);
  const { data: products } = useSuspenseQuery(productsQuery);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newId, setNewId] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const id = newId || crypto.randomUUID().slice(0, 8);
      const { error } = await supabase.from("promo_cards").insert({ id, headline: "" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("زيد كارت");
      qc.invalidateQueries({ queryKey: ["admin", "cards"] });
      setCreating(false);
      setNewId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">كارتات الإشهار</h2>
          <p className="text-sm text-muted-foreground">لينك ثابت لإعلانات Instagram. بدل المنتج بلا ما يتكسر الإشهار.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          <Plus className="h-5 w-5" /> كارت جديد
        </button>
      </div>

      {creating && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="flex gap-2">
            <input placeholder="ID د الكارت (اختياري، مثال: promo-eid)" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" value={newId} onChange={(e) => setNewId(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())} />
            <button onClick={() => create.mutate()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">إنشاء</button>
            <button onClick={() => setCreating(false)} className="rounded-md border border-border px-4 py-2 text-sm">إلغاء</button>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <EmptyState msg="مازال ما عندك كارتات. كل كارت عندو URL ثابت تحطو ف Instagram Ads." />
      ) : (
        <div className="space-y-3">
          {cards.map((c) => <CardRow key={c.id} card={c} products={products} />)}
        </div>
      )}
    </div>
  );
}

function CardRow({ card, products }: { card: PromoCard; products: Product[] }) {
  const qc = useQueryClient();
  const [companions, setCompanions] = useState<string[]>(card.companion_product_ids ?? []);
  const activeProduct = products.find((p) => p.id === card.active_product_id);

  const update = useMutation({
    mutationFn: async (patch: Partial<PromoCard>) => {
      const { error } = await supabase.from("promo_cards").update(patch).eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تحدث الكارت");
      qc.invalidateQueries({ queryKey: ["admin", "cards"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("promo_cards").delete().eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cards"] });
    },
  });

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${card.id}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">/{card.id}</span>
            <span className="text-xs text-muted-foreground">{card.click_count} نقرات</span>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(url); toast.success("انسخات الرابط"); }}
            className="mt-1 truncate text-sm text-primary hover:underline"
          >
            {url}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={card.active} onChange={(e) => update.mutate({ active: e.target.checked })} />
            نشط
          </label>
          <button onClick={() => confirm("مسح؟") && del.mutate()} className="text-destructive hover:opacity-70">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs font-semibold">عنوان الكارت</label>
        <input
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          defaultValue={card.headline ?? ""}
          onBlur={(e) => e.target.value !== (card.headline ?? "") && update.mutate({ headline: e.target.value })}
        />
      </div>

      <div className="mt-3">
        <label className="text-xs font-semibold">المنتج المعروض ف الكارت</label>
        <select
          value={card.active_product_id ?? ""}
          onChange={(e) => update.mutate({ active_product_id: e.target.value || null })}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">— اختار منتج —</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        {activeProduct && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/50 p-2 text-xs">
            {activeProduct.images?.[0] && <img src={publicImageUrl(activeProduct.images[0])} className="h-10 w-10 rounded object-cover" />}
            <span>{activeProduct.title}</span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <label className="text-xs font-semibold">منتجات مصاحبة (تظهر تحت المنتج الرئيسي)</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {products.filter((p) => p.id !== card.active_product_id).map((p) => {
            const on = companions.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => {
                  const next = on ? companions.filter((id) => id !== p.id) : [...companions, p.id];
                  setCompanions(next);
                  update.mutate({ companion_product_ids: next });
                }}
                className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
              >
                {p.title}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================ ORDERS ============================ */

const ordersQuery = queryOptions({
  queryKey: ["admin", "orders-all"],
  queryFn: async () => {
    const [o, c, w] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("custom_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("wholesale_leads").select("*").order("created_at", { ascending: false }),
    ]);
    if (o.error) throw o.error;
    if (c.error) throw c.error;
    if (w.error) throw w.error;
    return { orders: o.data, custom: c.data, wholesale: w.data };
  },
});

function OrdersTab() {
  const { data } = useSuspenseQuery(ordersQuery);
  const [kind, setKind] = useState<"orders" | "custom" | "wholesale">("orders");

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">الطلبات</h2>
      <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1 text-sm">
        <SubTab active={kind === "orders"} onClick={() => setKind("orders")}>شراء ({data.orders.length})</SubTab>
        <SubTab active={kind === "custom"} onClick={() => setKind("custom")}>تصميم ({data.custom.length})</SubTab>
        <SubTab active={kind === "wholesale"} onClick={() => setKind("wholesale")}>جملة ({data.wholesale.length})</SubTab>
      </div>
      <div className="mt-4 space-y-3">
        {kind === "orders" && data.orders.map((o) => <OrderCard key={o.id} order={o} />)}
        {kind === "custom" && data.custom.map((o) => <CustomOrderCard key={o.id} order={o} />)}
        {kind === "wholesale" && data.wholesale.map((o) => <LeadCard key={o.id} lead={o} />)}
        {((kind === "orders" && data.orders.length === 0) || (kind === "custom" && data.custom.length === 0) || (kind === "wholesale" && data.wholesale.length === 0)) && (
          <EmptyState msg="مازال ما وصل شي طلب هنا." />
        )}
      </div>
    </div>
  );
}

function SubTab({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={`flex-1 rounded-md px-3 py-2 text-sm ${active ? "bg-card font-semibold shadow-sm" : "text-muted-foreground"}`}>{children}</button>
  );
}

function OrderCard({ order }: { order: Order }) {
  const snap = order.product_snapshot as any;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{order.full_name}</div>
          <a href={`tel:${order.phone}`} className="text-sm text-primary">{order.phone}</a>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{order.status}</span>
      </div>
      <div className="mt-2 text-sm">
        <div>{snap?.title} × {order.quantity} {order.size && `— ${order.size}`}</div>
        <div className="text-muted-foreground">{order.address}{order.city && ` — ${order.city}`}</div>
        {order.notes && <div className="mt-1 text-xs italic">{order.notes}</div>}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("ar-MA")}</div>
    </div>
  );
}

function CustomOrderCard({ order }: { order: CustomOrder }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{order.full_name}</div>
          <a href={`tel:${order.phone}`} className="text-sm text-primary">{order.phone}</a>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{order.status}</span>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm">{order.description}</p>
      <div className="mt-2 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("ar-MA")}</div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{lead.full_name} {lead.company && <span className="text-muted-foreground">— {lead.company}</span>}</div>
          <a href={`tel:${lead.phone}`} className="text-sm text-primary">{lead.phone}</a>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{lead.status}</span>
      </div>
      <div className="mt-2 text-sm">
        {lead.product_type && <div>{lead.product_type} × {lead.quantity ?? "؟"}</div>}
        {lead.message && <div className="mt-1 whitespace-pre-line text-muted-foreground">{lead.message}</div>}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleString("ar-MA")}</div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">{msg}</div>;
}
