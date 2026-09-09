import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Toaster } from "@/components/ui/sonner";
import { AutoThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KaryaProfilKu - Portofolio & Personal Branding Profesional",
  description:
    "Website profil pribadi elegan untuk menampilkan portofolio proyek, layanan keahlian, katalog produk, dan testimoni.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <AutoThemeProvider>
          <LanguageProvider>
            <ClerkProvider appearance={{ theme: shadcn }}>
              {children}
              <Toaster position="bottom-right" richColors />
            </ClerkProvider>
          </LanguageProvider>
        </AutoThemeProvider>
      </body>
    </html>
  );
}
