import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://porto.sigitadi.id"),
  title: "MyWebPorto - Portofolio & Personal Branding Profesional",
  description:
    "Website profil pribadi elegan untuk menampilkan portofolio proyek, layanan keahlian, katalog produk, dan testimoni.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-theme="retro90s" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('sigit-os-theme') || 'retro90s';
                document.documentElement.setAttribute('data-theme', savedTheme);
                document.documentElement.classList.remove('dark');
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <LanguageProvider>
          <ClerkProvider appearance={{ theme: shadcn }}>
            {children}
            <Toaster position="bottom-right" richColors />
          </ClerkProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
