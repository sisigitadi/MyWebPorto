"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  FileText,
  Eye,
  Send,
  Trash2,
  History,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  enableGodModePreviewAction,
  getGodModeDraftStatusAction,
  discardGodModeDraftAction,
  getGodModeHistoryAction,
  rollbackGodModeAction,
  type GodModeKey,
} from "@/lib/actions";
import type { SettingHistoryRecord } from "@/lib/settings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GodModeVersionBarProps {
  categoryKey: GodModeKey;
  onSaveDraft: () => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  isDirty?: boolean;
}

export function GodModeVersionBar({
  categoryKey,
  onSaveDraft,
  onPublish,
  isDirty = false,
}: GodModeVersionBarProps) {
  const router = useRouter();
  const [hasDraft, setHasDraft] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<SettingHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isPending, startTransition] = useTransition();

  const checkDraft = async () => {
    const res = await getGodModeDraftStatusAction(categoryKey);
    if (res.ok) {
      setHasDraft(res.hasDraft);
    }
  };

  useEffect(() => {
    checkDraft();
  }, [categoryKey]);

  const handleSaveDraft = () => {
    startTransition(async () => {
      const ok = await onSaveDraft();
      if (ok) {
        setHasDraft(true);
        toast.success("Draf berhasil disimpan! Gunakan Pratinjau untuk meninjau.");
      }
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      const ok = await onPublish();
      if (ok) {
        setHasDraft(false);
        toast.success("Konfigurasi berhasil dipublikasikan secara live!");
        router.refresh();
      }
    });
  };

  const handleDiscard = () => {
    if (!confirm("Yakin ingin membuang draf yang belum dipublikasikan?")) return;
    startTransition(async () => {
      const res = await discardGodModeDraftAction(categoryKey);
      if (res.ok) {
        setHasDraft(false);
        toast.info("Draf telah dibuang.");
        router.refresh();
      } else {
        toast.error("Gagal membuang draf: " + res.error);
      }
    });
  };

  const handlePreview = () => {
    startTransition(async () => {
      const res = await enableGodModePreviewAction();
      if (res.ok) {
        toast.success("Mode pratinjau aktif. Membuka tab pratinjau...");
        window.open("/?preview=1", "_blank");
      } else {
        toast.error("Gagal mengaktifkan mode pratinjau: " + res.error);
      }
    });
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setLoadingHistory(true);
    const res = await getGodModeHistoryAction(categoryKey);
    if (res.ok) {
      setHistoryList(res.history);
    } else {
      toast.error("Gagal memuat riwayat: " + res.error);
    }
    setLoadingHistory(false);
  };

  const handleRollback = (id: string, label?: string | null) => {
    if (!confirm(`Kembalikan konfigurasi live ke versi ini?\n${label || id}`)) return;
    startTransition(async () => {
      const res = await rollbackGodModeAction(id);
      if (res.ok) {
        toast.success("Berhasil rollback ke versi riwayat!");
        setHistoryOpen(false);
        router.refresh();
      } else {
        toast.error("Gagal rollback: " + res.error);
      }
    });
  };

  onPublish: () => Promise<boolean>;
  isDirty?: boolean;
}

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-muted/40 border rounded-lg">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {hasDraft ? (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1.5 py-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Ada Draf Belum Dipublikasikan</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1.5 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Versi Live Sinkron</span>
            </Badge>
          )}

          {isDirty && (
            <Badge variant="secondary" className="text-xs">
              Ada editan belum disimpan
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openHistory}
            disabled={isPending}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Riwayat & Undo</span>
          </Button>

          {hasDraft && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={isPending}
              className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Buang Draf</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={isPending}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>Pratinjau Live</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            <span>Simpan Draf</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePublish}
            disabled={isPending}
            className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90 cursor-pointer"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Publikasikan Live</span>
          </Button>
        </div>
      </div>

      {/* History & Rollback Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-primary" />
              Riwayat Versi & Snapshot ({categoryKey})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftar snapshot yang tercatat setiap kali konfigurasi dipublikasikan. Anda dapat mengembalikan konfigurasi ke versi terdahulu.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memuat riwayat...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Belum ada catatan riwayat snapshot untuk konfigurasi ini.
              </div>
            ) : (
              historyList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{item.label || "Snapshot Konfigurasi"}</p>
                    <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleString("id-ID")}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollback(item.id, item.label)}
                    disabled={isPending}
                    className="gap-1 text-[11px] h-7 shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-primary" />
                    <span>Rollback</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
