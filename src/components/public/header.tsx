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
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();
  const { t } = useTranslation();

  const navLinks = [
    { label: t.nav_home, href: "/" },
    { label: t.nav_projects, href: "/proyek" },
    { label: t.nav_services, href: "/#layanan" },
    { label: t.nav_products, href: "/#produk" },
    { label: t.nav_testimonials, href: "/#testimoni" },
    { label: t.nav_contact, href: "/#kontak" },
  ];

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
          className="flex items-center gap-2 group font-semibold text-lg tracking-tight text-foreground transition-colors hover:text-primary"
        >
          <span className="h-2 w-2 rounded-full bg-accent group-hover:scale-125 transition-transform" />
          <span>
            Karya<span className="font-light text-muted-foreground">ProfilKu</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navLinks.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) && item.href !== "/#";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3.5 py-1.5 rounded-md transition-colors relative hover:text-foreground text-muted-foreground",
                  isActive && "text-foreground font-semibold"
                )}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-primary rounded-full" />
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
                className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Link href="/admin">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span>{t.nav_admin_panel}</span>
                </Link>
              </Button>
              <UserButton />
            </>
          )}

          <Button asChild size="sm" className="text-xs h-8 gap-1">
            <Link href="/#kontak">
              <span>{t.nav_contact_me}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
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
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-base rounded-md font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              >
                {item.label}
              </Link>
            ))}
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
