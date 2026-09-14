"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMedia } from "@/lib/local-upload";
import type { MediaItem } from "@/lib/storage";

function formatBytes(size: number | null): string {
  if (size === null) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaList({ items, remote }: { items: MediaItem[]; remote: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCopy = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedKey(item.key);
      setTimeout(() => setCopiedKey((k) => (k === item.key ? null : k)), 1500);
    } catch {
      setError("Gagal menyalin URL.");
    }
  };

  const handleDelete = (item: MediaItem) => {
    if (!window.confirm(`Hapus ${item.name}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setError("");
    startTransition(async () => {
      const res = await deleteMedia(item.key);
      if (!res.success) {
        setError(res.error || "Gagal menghapus.");
      }
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {remote
          ? "Belum ada berkas di Bunny Storage."
          : "Belum ada gambar lokal. Unggah lewat form profil/proyek/artikel."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-3 border border-border rounded-lg p-2.5 bg-card"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.name}
            loading="lazy"
            className="h-12 w-12 rounded object-cover border border-border shrink-0 bg-muted"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate font-mono">{item.name}</p>
            <p className="text-[11px] text-muted-foreground truncate font-mono">{item.url}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatBytes(item.size)}
              {item.lastChanged
                ? ` · ${new Date(item.lastChanged).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleCopy(item)} title="Salin URL">
              {copiedKey === item.key ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" asChild title="Buka">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:border-destructive/30"
              onClick={() => handleDelete(item)}
              disabled={pending}
              title="Hapus"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
