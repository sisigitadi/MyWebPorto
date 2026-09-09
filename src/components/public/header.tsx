"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Shield, ArrowUpRight } from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<string>("hero");
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();
  const { t } = useTranslation();

  // Aligned strictly with page DOM scroll order: Hero -> Layanan -> Proyek -> Produk -> Testimoni -> Kontak
  const navLinks = [
    { label: t.nav_home, href: "/#hero", id: "hero" },
    { label: t.nav_services, href: "/#layanan", id: "layanan" },
    { label: t.nav_projects, href: "/#proyek", id: "proyek" },
    { label: t.nav_products, href: "/#produk", id: "produk" },
    { label: t.nav_testimonials, href: "/#testimoni", id: "testimoni" },
    { label: t.nav_contact, href: "/#kontak", id: "kontak" },
  ];

  // ScrollSpy to keep active tab in sync with scrolled sections
  React.useEffect(() => {
    if (pathname !== "/") return;

    const sectionIds = ["hero", "layanan", "proyek", "produk", "testimoni", "kontak"];

    const handleScroll = () => {
      if (window.scrollY < 80) {
        setActiveSection("hero");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-15% 0px -45% 0px",
        threshold: [0.1, 0.25, 0.5],
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [pathname]);

  const isLinkActive = (item: (typeof navLinks)[number]) => {
    if (pathname === "/") {
      return activeSection === item.id;
    }
    if (pathname.startsWith("/proyek") && item.id === "proyek") {
      return true;
    }
    return pathname === item.href;
  };

  // Admin identification based on ADMIN_CLERK_ID
  const adminClerkId = process.env.NEXT_PUBLIC_ADMIN_CLERK_ID;
  const isAdmin =
    isSignedIn &&
    (!adminClerkId || adminClerkId === "user_xxxxxxxxxxxxxxxxx" || user?.id === adminClerkId);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group font-semibold text-lg tracking-tight text-foreground transition-all duration-200 hover:text-primary"
        >
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 group-hover:animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary group-hover:scale-125 transition-transform duration-300" />
          </span>
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">
            My<span className="font-light text-muted-foreground">WebPorto</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navLinks.map((item) => {
            const active = isLinkActive(item);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "px-3.5 py-1.5 rounded-md transition-all duration-200 relative hover:text-foreground text-muted-foreground hover:-translate-y-0.5",
                  active && "text-foreground font-semibold"
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          {/* Only show Admin Panel button and UserButton when authenticated as Admin */}
          {isLoaded && isAdmin && (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <Link href="/admin">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span>{t.nav_admin_panel}</span>
                </Link>
              </Button>
              <UserButton />
            </>
          )}

          <Button asChild size="sm" className="relative group overflow-hidden text-xs h-8 gap-1 transition-all duration-300 hover:shadow-md hover:shadow-primary/20">
            <Link href="/#kontak">
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span>{t.nav_contact_me}</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {isLoaded && isAdmin && <UserButton />}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((item) => {
              const active = isLinkActive(item);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-3 py-2 text-base rounded-md font-medium transition-colors",
                    active
                      ? "text-primary font-bold bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Button asChild size="sm" className="w-full justify-center">
              <Link href="/#kontak" onClick={() => setMobileMenuOpen(false)}>
                {t.nav_contact_me}
              </Link>
            </Button>
            {isLoaded && isAdmin && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full justify-center gap-1.5 text-xs text-muted-foreground"
              >
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span>{t.nav_admin_panel}</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
