"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Share2,
  Copy,
  Check,
  Download,
  QrCode,
  X,
  MessageCircle,
  Send,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { InstagramIcon } from "@/components/public/social-icons";
import {
  buildTelegramShareUrl,
  buildLinkedInShareUrl,
  buildFacebookShareUrl,
} from "@/lib/whatsapp-order";

const emptySubscribe = () => () => {};

export interface ContentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  summary?: string;
  thumbnailUrl?: string;
  badge?: string;
  isEn?: boolean;
}

export function ContentShareModal({
  isOpen,
  onClose,
  title,
  url,
  summary,
  thumbnailUrl,
  badge,
  isEn = false,
}: ContentShareModalProps) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [customRef] = useState("");
  const [showQr, setShowQr] = useState(false);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Esc key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Resolve absolute URL
  const origin = typeof window !== "undefined" ? window.location.origin : "https://sigitadi.id";
  const absoluteUrl = url.startsWith("http")
    ? url
    : `${origin}${url.startsWith("/") ? "" : "/"}${url}`;

  const finalUrl = customRef.trim()
    ? `${absoluteUrl}${absoluteUrl.includes("?") ? "&" : "?"}ref=${encodeURIComponent(customRef.trim())}`
    : absoluteUrl;

  const cleanSummary = summary?.trim() || "";
  const shareBroadcastText = [
    `**${title}**`,
    cleanSummary,
    finalUrl,
  ]
    .filter(Boolean)
    .join("\n\n");

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareBroadcastText)}`;
  const telegramShareUrl = buildTelegramShareUrl(finalUrl, shareBroadcastText);
  const linkedInShareUrl = buildLinkedInShareUrl(finalUrl);
  const facebookShareUrl = buildFacebookShareUrl(finalUrl);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(finalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success(isEn ? "Link copied to clipboard!" : "Tautan berhasil disalin ke clipboard!");
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareBroadcastText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast.success(isEn ? "Share text copied to clipboard!" : "Teks bagikan berhasil disalin!");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: cleanSummary || title,
          url: finalUrl,
        });
        toast.success(isEn ? "Shared successfully!" : "Berhasil dibagikan!");
      } catch (_err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQr = async () => {
    try {
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const slugName = title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
      a.download = `QR-${slugName}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success(isEn ? "QR Code downloaded!" : "QR Code berhasil diunduh!");
    } catch {
      window.open(qrImageUrl, "_blank");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-[var(--vt-paper)] text-[var(--vt-ink)] border-2 border-[var(--vt-edge-lo-2)] rounded-sm p-4 sm:p-6 shadow-2xl space-y-4 font-mono text-xs max-h-[90vh] overflow-y-auto vt-scrollbar my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - sticky so close button never scrolls out of view */}
        <div className="sticky top-0 bg-[var(--vt-paper)] z-10 flex items-center justify-between border-b border-border pb-3 -mt-1 pt-1">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm tracking-tight">
              {isEn ? "SHARE TO" : "BAGIKAN TAUTAN & KONTEN"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] rounded-xs bg-muted/60 flex items-center justify-center hover:bg-muted cursor-pointer transition-colors"
            aria-label={isEn ? "Close" : "Tutup"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Social Card Preview */}
        <div className="rounded-xs overflow-hidden vt-card-inset bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)]">
          {thumbnailUrl && (
            <div className="aspect-[1200/630] w-full overflow-hidden bg-muted/40 border-b border-[var(--vt-edge-lo-2)] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailUrl}
                alt={title}
                className="h-full w-full object-cover block"
                loading="lazy"
              />
            </div>
          )}
          <div className="p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide truncate">
                {origin.replace(/^https?:\/\//, "")}
              </p>
              {badge && (
                <span className="text-[9px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded-xs font-bold shrink-0">
                  {badge}
                </span>
              )}
            </div>
            <p className="font-bold text-xs sm:text-sm text-[var(--vt-ink)] line-clamp-2 leading-snug">
              {title}
            </p>
            {cleanSummary && (
              <p className="text-[11px] text-[var(--vt-ink-mute)] leading-relaxed line-clamp-2 break-words">
                {cleanSummary}
              </p>
            )}
          </div>
        </div>

        {/* 1-Click Copas Bar */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground">
            {isEn ? "Direct Link & One-Click Copy:" : "Salin Tautan Langsung:"}
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={finalUrl}
              className="flex-1 bg-background border border-border rounded-xs px-2.5 py-2 text-xs font-mono select-all truncate text-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-9 min-h-[44px] px-3 rounded-xs bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              title={isEn ? "Copy URL" : "Salin Link"}
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? (isEn ? "Copied!" : "Tersalin!") : (isEn ? "Copy Link" : "Salin Link")}</span>
            </button>
          </div>
        </div>

        {/* Quick Share to Social Channels */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted-foreground">
            {isEn ? "Share Directly To:" : "Kirim Langsung Ke:"}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* WhatsApp */}
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xs bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold transition-colors text-center"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={telegramShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold transition-colors text-center"
            >
              <Send className="h-4 w-4 shrink-0" />
              <span>Telegram</span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                navigator.clipboard.writeText(finalUrl);
                toast.success(isEn ? "Link copied! Opening Instagram..." : "Tautan disalin! Membuka Instagram...");
              }}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xs bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30 font-semibold transition-colors text-center cursor-pointer"
            >
              <InstagramIcon className="h-4 w-4 shrink-0" />
              <span>Instagram</span>
            </a>

            {/* LinkedIn */}
            <a
              href={linkedInShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xs bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold transition-colors text-center"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span>LinkedIn</span>
            </a>

            {/* Facebook */}
            <a
              href={facebookShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-semibold transition-colors text-center"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span>Facebook</span>
            </a>

            {/* Native Mobile Share / Copas Text */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold transition-colors text-center cursor-pointer"
            >
              <Share2 className="h-4 w-4 shrink-0" />
              <span>{isEn ? "More..." : "Lainnya..."}</span>
            </button>
          </div>
        </div>

        {/* Copywriting Share Format */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <span>{isEn ? "Copy Ready-to-Send Text:" : "Format Copas Siap Kirim (Chat / Sosmed):"}</span>
            </label>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              {copiedText ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              <span>{copiedText ? (isEn ? "Copied!" : "Tersalin!") : (isEn ? "Copy Text" : "Salin Teks")}</span>
            </button>
          </div>
          <div className="p-2.5 rounded-xs bg-muted/40 border border-border text-[11px] whitespace-pre-wrap font-sans text-muted-foreground">
            {shareBroadcastText}
          </div>
        </div>

        {/* QR Code Toggle */}
        <div className="pt-1 border-t border-border/60">
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="w-full min-h-[44px] flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-2 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <QrCode className="h-4 w-4 text-primary" />
              <span>{showQr ? (isEn ? "Hide QR Code" : "Sembunyikan QR Code") : (isEn ? "Show QR Code" : "Tampilkan QR Code")}</span>
            </span>
            <span className="text-[11px] text-primary font-sans underline">
              {showQr ? (isEn ? "Close" : "Tutup") : (isEn ? "Scan / Download" : "Scan / Unduh")}
            </span>
          </button>

          {showQr && (
            <div className="mt-2 p-4 rounded-xs bg-white text-black flex flex-col items-center justify-center space-y-3 animate-in fade-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="QR Code" className="h-44 w-44 object-contain border border-neutral-300 p-1" />
              <button
                type="button"
                onClick={handleDownloadQr}
                className="min-h-[44px] px-4 py-2 rounded-xs bg-black text-white hover:bg-neutral-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isEn ? "Download QR Code" : "Unduh Gambar QR"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
