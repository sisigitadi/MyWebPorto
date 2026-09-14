import type { Metadata } from "next";
import {
  Inter,
  Fira_Code,
  Silkscreen,
  Azeret_Mono,
  Space_Grotesk,
  Unbounded,
} from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { getProfile } from "@/lib/actions";
import { JsonLdSchema } from "@/components/public/json-ld";
import { SwRegister } from "@/components/public/sw-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

// Tipografi retro SigitOS — di-host sendiri oleh next/font saat build, sehingga
// tidak ada request ke fonts.googleapis.com/fonts.gstatic.com saat runtime.
const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-silkscreen",
  display: "swap",
});

const azeretMono = Azeret_Mono({
  subsets: ["latin"],
  variable: "--font-azeret-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  display: "swap",
});

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id").replace(/\/$/, "");
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || "nO80bNSBPyrM7VQYvpPKCmgcQVBuJ_7Ydaxhfsk5Vbw";
const bingVerification = process.env.NEXT_PUBLIC_BING_VERIFICATION || "e5b871c984924b179571fcfdca565780";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Sigit Adi Pranoto — Senior Web Developer & Tech Creator",
    template: "%s | Sigit Web Porto",
  },
  description: "Portofolio profesional Sigit Adi Pranoto menampilkan karya pengembangan web modern, sistem berbasis AI, arsitektur cloud, dan solusi full-stack.",
  keywords: [
    "Sigit Adi Pranoto",
    "Web Developer Indonesia",
    "Full Stack Engineer",
    "Jasa Pembuatan Website",
    "React Next.js Developer",
    "AI Developer Indonesia",
    "Portofolio Digital",
    "Software Engineer Portfolio",
  ],
  authors: [{ name: "Sigit Adi Pranoto", url: appUrl }],
  creator: "Sigit Adi Pranoto",
  publisher: "Sigit Adi Pranoto",
  alternates: {
    canonical: appUrl,
    types: {
      "application/rss+xml": `${appUrl}/feed.xml`,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: appUrl,
    title: "Sigit Adi Pranoto — Senior Web Developer & Tech Creator",
    description: "Jelajahi portofolio interaktif SigitOS dengan sistem modern, karya unggulan, dan integrasi kecerdasan buatan.",
    siteName: "Sigit Web Porto",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Sigit Adi Pranoto - Portofolio & Workstation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sigit Adi Pranoto — Senior Web Developer & Tech Creator",
    description: "Portofolio digital interaktif Sigit Adi Pranoto berbasis Next.js dan SigitOS.",
    images: ["/opengraph-image"],
  },
  verification: {
    google: googleVerification,
    other: {
      "msvalidate.01": bingVerification,
    },
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#0a0f1e",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SigitOS",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getProfile();

  return (
    <ClerkProvider>
      <html
        lang="id"
        suppressHydrationWarning
        className={`${inter.variable} ${firaCode.variable} ${silkscreen.variable} ${azeretMono.variable} ${spaceGrotesk.variable} ${unbounded.variable}`}
      >
        <head>
          <JsonLdSchema profile={profile} />
        </head>
        <body className="font-sans antialiased selection:bg-primary selection:text-primary-foreground">
          {children}
          <Toaster position="top-right" richColors />
          <SwRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
