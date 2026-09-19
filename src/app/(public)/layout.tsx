import type { Metadata } from "next";
import { generateDynamicMetadata } from "@/lib/seo";
import { Header } from "@/components/public/header";
import { ThemeProvider } from "@/components/public/os/theme-context";
import { LanguageProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart-context";
import { CartDialog } from "@/components/public/cart-dialog";
import { getProfile } from "@/lib/actions";
import { resolveUIStrings } from "@/lib/ui-strings-config";
import { OSBootLoader } from "@/components/public/os/os-boot-loader";
import { OSSoundLayer } from "@/components/public/os/os-sound-layer";
import VisitorTracker from "@/components/public/visitor-tracker";
import { RetroBot } from "@/components/public/retro-bot";

export async function generateMetadata(): Promise<Metadata> {
  // Sengaja tidak membaca searchParams di sini: mengaksesnya memaksa seluruh
  // halaman publik menjadi dinamis (39 halaman statis hilang). hreflang tetap
  // diemit statis untuk kedua varian, dan <html lang> diperbaiki client-side
  // oleh LanguageProvider (document.documentElement.lang).
  return await generateDynamicMetadata();
}

export default async function RootPublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getProfile();
  const uiStrings = await resolveUIStrings();

  return (
    <LanguageProvider overrides={uiStrings}>
      <ThemeProvider>
        <CartProvider>
          <div className="h-screen max-h-screen w-screen max-w-full desktop-viewport flex flex-col desktop-wallpaper text-foreground overflow-hidden relative">
            {/* 1. Authentic 5s Retro BIOS Boot Loader (Session Persistent) */}
            <OSBootLoader />

            {/* Suara retro global: ketukan tombol + nada pindah halaman */}
            <OSSoundLayer />

            {/* Anonymous visit beacon → self-hosted Cloudflare Worker (no cookies) */}
            <VisitorTracker />

            {/* Asisten AI retro standby (SSE, hybrid local-first + cloud opt-in) */}
            <RetroBot />

            {/* 2. Top OS Menubar */}
            <Header />

            {/* 3. Main Desktop Viewport (Locked to 100vh, Never Scrolls Entire Page) */}
            <main className="flex-1 flex flex-col overflow-hidden w-full relative min-h-0">
              {children}
            </main>

            {/* Global Shopping Cart Modal */}
            <CartDialog profile={profile} />
          </div>
        </CartProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
