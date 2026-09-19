"use client";

import React, { useTransition } from "react";
import { Eye, ExternalLink, LogOut, Loader2 } from "lucide-react";
import { disableGodModePreviewAction } from "@/lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function GodModePreviewBar() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleExit = () => {
    startTransition(async () => {
      const res = await disableGodModePreviewAction();
      if (res.ok) {
        toast.info("Mode pratinjau dinonaktifkan.");
        router.refresh();
      } else {
        toast.error("Gagal menonaktifkan mode pratinjau: " + res.error);
      }
    });
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 px-4 py-2 bg-amber-500/90 text-amber-950 dark:bg-amber-600/90 dark:text-amber-50 backdrop-blur-md rounded-full shadow-2xl border border-amber-400/40 text-xs font-mono animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-center gap-1.5 font-bold tracking-wide">
        <Eye className="w-4 h-4 animate-pulse text-amber-900 dark:text-amber-200" />
        <span>PRATINJAU GOD MODE AKTIF</span>
      </div>
      <div className="h-3 w-[1px] bg-amber-950/20 dark:bg-amber-100/20" />
      <span className="opacity-90 hidden sm:inline">
        Anda melihat draf internal yang belum dipublikasikan ke publik.
      </span>
      <div className="flex items-center gap-2">
        <a
          href="/admin"
          className="px-2 py-1 rounded bg-amber-950/10 hover:bg-amber-950/20 dark:bg-amber-100/10 dark:hover:bg-amber-100/20 transition-colors flex items-center gap-1"
        >
          <span>Admin</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={handleExit}
          disabled={isPending}
          className="px-2.5 py-1 rounded bg-amber-950 text-amber-50 hover:bg-amber-900 dark:bg-amber-100 dark:text-amber-950 dark:hover:bg-amber-200 font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
