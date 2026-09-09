import type { Metadata } from "next";
import { generateDynamicMetadata } from "@/lib/seo";
import { Header } from "@/components/public/header";
import { Footer } from "@/components/public/footer";

import { ThemeProvider } from "@/components/public/os/theme-context";

export async function generateMetadata(): Promise<Metadata> {
  return await generateDynamicMetadata();
}

export default function RootPublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col desktop-wallpaper text-foreground">
        <Header />
        <main className="flex-1 overflow-x-hidden w-full max-w-full">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
