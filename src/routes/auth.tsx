import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { SiteNav } from "@/components/site-nav";
import { shopConfig } from "@/config/shop";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `دخول — ${shopConfig.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("تم التسجيل. شيك على بريدك للتأكيد.");
      }
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "فشل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("فشل الدخول ب Google");
  };

  return (
    <div className="min-h-screen">
      <SiteNav />
      <section className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="font-display text-2xl font-bold text-primary text-center">
            {mode === "in" ? "دخول الأدمين" : "تسجيل جديد"}
          </h1>
          <button
            onClick={google}
            className="mt-6 w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            دخول ب Google
          </button>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            أو
            <div className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input required type="email" placeholder="الإيميل" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input required type="password" minLength={6} placeholder="كلمة السر" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" disabled={loading} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {loading ? "..." : mode === "in" ? "دخول" : "تسجيل"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "in" ? "ماعندكش حساب؟ سجل هنا" : "عندك حساب؟ دخول"}
          </button>
          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">← رجع للرئيسية</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
