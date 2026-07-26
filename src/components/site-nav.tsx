import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { shopConfig } from "@/config/shop";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "الرئيسية" },
  shopConfig.services.readyToBuy && { to: "/shop", label: "المتجر" },
  shopConfig.services.customDesign && { to: "/custom", label: "صمم موديلك" },
  shopConfig.services.wholesale && { to: "/wholesale", label: "بالجملة" },
].filter(Boolean) as { to: string; label: string }[];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg">
            خ
          </span>
          <span className="font-display text-lg font-bold text-primary">{shopConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent md:inline-flex"
          >
            <User className="h-4 w-4" />
            الأدمين
          </Link>
          <button
            aria-label="فتح القائمة"
            className="rounded-md border border-border p-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "md:hidden overflow-hidden border-t border-border/60 transition-all",
          open ? "max-h-96" : "max-h-0",
        )}
      >
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/auth"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            دخول الأدمين
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <div className="text-center md:text-right">
          <div className="font-display text-lg font-bold text-primary">{shopConfig.name}</div>
          <div>{shopConfig.tagline}</div>
        </div>
        <div>© {new Date().getFullYear()} — كل الحقوق محفوظة</div>
      </div>
    </footer>
  );
}
