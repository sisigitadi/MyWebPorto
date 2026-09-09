import type { Metadata } from "next";
import { generateDynamicMetadata } from "@/lib/seo";
import { Header } from "@/components/public/header";
import { ThemeProvider } from "@/components/public/os/theme-context";
import { LanguageProvider } from "@/lib/i18n";
import { OSBootLoader } from "@/components/public/os/os-boot-loader";

export async function generateMetadata(): Promise<Metadata> {
  return await generateDynamicMetadata();
}

export default function RootPublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <div className="h-screen max-h-screen w-screen max-w-full desktop-viewport flex flex-col desktop-wallpaper text-foreground overflow-hidden relative">
        {/* 1. Authentic 5s Retro BIOS Boot Loader (Session Persistent) */}
        <OSBootLoader />

        {/* 2. Top OS Menubar */}
        <Header />

        {/* 3. Main Desktop Viewport (Locked to 100vh, Never Scrolls Entire Page) */}
        <main className="flex-1 flex flex-col overflow-hidden w-full relative min-h-0">
          {children}
        </main>
      </div>
      </ThemeProvider>
    </LanguageProvider>
  );
}
