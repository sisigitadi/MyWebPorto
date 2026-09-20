import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasClerkPublishableKey } from "@/lib/env";

export const metadata = {
  title: "Daftar - MyWebPorto",
  description: "Halaman pendaftaran MyWebPorto.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md space-y-6 flex flex-col items-center">
        <div className="w-full flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Beranda</span>
            </Link>
          </Button>

          <span className="text-xs font-semibold text-muted-foreground">
            MyWebPorto
          </span>
        </div>

        {hasClerkPublishableKey() ? (
          <SignUp />
        ) : (
          <div className="w-full border border-border bg-card rounded-xl p-6 text-card-foreground shadow-sm text-center space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Daftar Akun (Clerk Autentikasi)</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Komponen Clerk belum aktif. Atur{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                </code>{" "}
                di <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">.env.local</code>.
              </p>
            </div>
            <Button asChild className="w-full text-xs h-9">
              <Link href="/">Kembali ke Beranda</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
