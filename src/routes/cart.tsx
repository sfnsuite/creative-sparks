import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { shopConfig } from "@/config/shop";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `السلة — ${shopConfig.name}` },
      { name: "description", content: "عرض ومراجعة سلة التسوق الخاصة بك" },
    ],
  }),
  component: CartPage,
});

interface CartItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  size?: string;
  image?: string;
}

const CART_STORAGE_KEY = "shop-cart";

function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // تحميل من localStorage عند التشغيل الأول
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        try {
          setItems(JSON.parse(stored));
        } catch (e) {
          console.error("[Cart] Failed to parse stored cart:", e);
        }
      }
      setHydrated(true);
    }
  }, []);

  // حفظ في localStorage عند التغيير
  useEffect(() => {
    if (hydrated && typeof window !== "undefined") {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId && i.size === item.size);
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  };

  const updateQuantity = (productId: string, size: string | undefined, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => !(i.productId === productId && i.size === size));
      }
      return prev.map((i) =>
        i.productId === productId && i.size === size ? { ...i, quantity } : i
      );
    });
  };

  const removeItem = (productId: string, size: string | undefined) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.size === size)));
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    total,
    itemCount: items.length,
  };
}

function CartPage() {
  const cart = useCart();

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1">
          <section className="px-4 py-12 md:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
              <h1 className="font-display text-3xl font-bold text-primary">السلة فارغة</h1>
              <p className="mt-3 text-muted-foreground">لم تضف أي منتجات حتى الآن</p>
              <Link
                to="/shop"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <ArrowRight className="h-4 w-4" />
                تصفح المتجر
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1">
        <section className="px-4 py-12 md:py-16">
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <h1 className="font-display text-3xl font-bold text-primary">السلة</h1>
              <button
                onClick={() => {
                  cart.clearCart();
                  toast.success("تم حذف جميع العناصر");
                }}
                className="text-sm text-red-600 hover:underline"
              >
                حذف الكل
              </button>
            </div>

            {/* Grid Layout */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Items List */}
              <div className="lg:col-span-2 space-y-4">
                {cart.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.size}`}
                    className="rounded-lg border border-border bg-card p-4 flex gap-4"
                  >
                    {/* Product Image */}
                    {item.image && (
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      {item.size && (
                        <p className="mt-1 text-sm text-muted-foreground">القياس: {item.size}</p>
                      )}
                      <p className="mt-2 font-semibold text-primary">
                        {(item.price * item.quantity).toFixed(0)} {shopConfig.currencySymbol}
                      </p>

                      {/* Quantity Controls */}
                      <div className="mt-3 inline-flex items-center rounded-lg border border-border">
                        <button
                          onClick={() =>
                            cart.updateQuantity(
                              item.productId,
                              item.size,
                              item.quantity - 1
                            )
                          }
                          className="px-3 py-1 text-sm hover:bg-accent"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            cart.updateQuantity(
                              item.productId,
                              item.size,
                              item.quantity + 1
                            )
                          }
                          className="px-3 py-1 text-sm hover:bg-accent"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => {
                        cart.removeItem(item.productId, item.size);
                        toast.success("تم حذف العنصر");
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-20 rounded-lg border border-border bg-card p-6">
                  <h3 className="mb-4 font-semibold">ملخص الطلب</h3>

                  <div className="space-y-2 border-b border-border pb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">عدد المنتجات:</span>
                      <span className="font-semibold">{cart.items.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الكمية الإجمالية:</span>
                      <span className="font-semibold">
                        {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between">
                    <span className="font-bold">الإجمالي:</span>
                    <span className="font-display text-xl font-bold text-primary">
                      {cart.total.toFixed(0)} {shopConfig.currencySymbol}
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <Link
                      to="/account"
                      className="block rounded-lg bg-primary px-4 py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90 transition"
                    >
                      متابعة الطلب
                    </Link>
                    <a
                      href={`https://wa.me/${shopConfig.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `السلام، بغيت نشري:\n${cart.items
                          .map((i) => `- ${i.title}${i.size ? ` (${i.size})` : ""} × ${i.quantity}`)
                          .join("\n")}\n\nالإجمالي: ${cart.total.toFixed(0)} ${shopConfig.currencySymbol}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-primary/30 px-4 py-3 text-center font-semibold text-primary hover:bg-primary/5 transition"
                    >
                      شراء عبر واتساب
                    </a>
                  </div>

                  <p className="mt-4 text-xs text-muted-foreground text-center">
                    تم حفظ السلة تلقائياً في الجهاز
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
