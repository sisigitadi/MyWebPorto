import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { getProfile } from "@/lib/actions";
import { JsonLdSchema } from "@/components/public/json-ld";

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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.dev";
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getProfile();

  return (
    <ClerkProvider>
      <html lang="id" suppressHydrationWarning>
        <head>
          <JsonLdSchema profile={profile} />
        </head>
        <body
          className={`${inter.variable} ${firaCode.variable} font-sans antialiased selection:bg-primary selection:text-primary-foreground`}
        >
          {children}
          <Toaster position="top-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
