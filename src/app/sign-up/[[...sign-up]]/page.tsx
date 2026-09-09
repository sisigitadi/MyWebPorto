import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Daftar - KaryaProfilKu",
  description: "Halaman pendaftaran KaryaProfilKu.",
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
            KaryaProfilKu
          </span>
        </div>

        <SignUp />
      </div>
    </div>
  );
}
