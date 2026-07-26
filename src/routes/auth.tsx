import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVerifiedAdmin } from "@/lib/admin-auth";
import { SiteNav } from "@/components/site-nav";
import { shopConfig } from "@/config/shop";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `دخول — ${shopConfig.name}` },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: Auth,
});

const GENERIC_ERROR = "بيانات الدخول غير صحيحة أو ليس لديك صلاحية.";

function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already a verified admin, skip to /admin
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const admin = await getVerifiedAdmin();
      if (!cancelled && admin) navigate({ to: "/admin", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        setPassword("");
        toast.error(GENERIC_ERROR);
        return;
      }
      const admin = await getVerifiedAdmin();
      if (!admin) {
        setPassword("");
        toast.error(GENERIC_ERROR);
        return;
      }
      navigate({ to: "/admin", replace: true });
    } catch {
      setPassword("");
      toast.error(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteNav />
      <section className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="font-display text-2xl font-bold text-primary text-center">
            دخول الأدمين
          </h1>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            هاد الصفحة خاصة بمسؤولي المحل فقط.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-3" autoComplete="on">
            <input
              required
              type="email"
              name="email"
              inputMode="email"
              autoComplete="username"
              maxLength={254}
              placeholder="الإيميل"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
              minLength={8}
              maxLength={128}
              placeholder="كلمة السر"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "..." : "دخول"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">
              ← رجع للرئيسية
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
