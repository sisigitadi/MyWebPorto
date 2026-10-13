"use client";

import React, { useState } from "react";
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
import type { ProductData } from "@/lib/dummy-data";
import { getProductSlug } from "@/lib/product-link";
import {
  buildProductPromoShareText,
  buildWhatsAppPromoShareUrl,
  buildTelegramShareUrl,
  buildTwitterShareUrl,
  buildLinkedInShareUrl,
  buildFacebookShareUrl,
} from "@/lib/whatsapp-order";
import { toast } from "sonner";

interface ProductShareModalProps {
  product: ProductData;
  isOpen: boolean;
  onClose: () => void;
  isEn?: boolean;
}

export function ProductShareModal({ product, isOpen, onClose, isEn = false }: ProductShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);
  const [customRef, setCustomRef] = useState("");
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const slug = getProductSlug(product);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://sigitadi.id";
  const baseUrl = `${origin}/toko/${slug}`;
  const shareUrl = customRef.trim()
    ? `${baseUrl}?ref=${encodeURIComponent(customRef.trim())}`
    : baseUrl;

  const broadcastText = buildProductPromoShareText(product, shareUrl, isEn);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success(isEn ? "Product link copied to clipboard!" : "Link produk berhasil disalin!");
  };

  const handleCopyBroadcast = () => {
    navigator.clipboard.writeText(broadcastText);
    setCopiedBroadcast(true);
    setTimeout(() => setCopiedBroadcast(false), 2000);
    toast.success(isEn ? "Broadcast copywriting copied!" : "Teks copywriting promosi berhasil disalin!");
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

  const handleDownloadQr = async () => {
    try {
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `QR-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success(isEn ? "QR Code downloaded!" : "QR Code berhasil diunduh!");
    } catch {
      window.open(qrImageUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-[var(--vt-paper)] text-[var(--vt-ink)] border-2 border-[var(--vt-edge-lo-2)] rounded-sm p-4 sm:p-6 shadow-2xl space-y-4 font-mono text-xs max-h-[90vh] overflow-y-auto vt-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm font-pixel">
              {isEn ? "SHARE & PROMOTION KIT" : "BAGIKAN & SARANA PROMOSI"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-xs bg-muted/60 flex items-center justify-center hover:bg-muted cursor-pointer"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Product Snapshot */}
        <div className="flex items-center gap-3 p-2.5 rounded-xs vt-card-inset bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)]">
          <div className="h-12 w-12 rounded-xs overflow-hidden bg-muted shrink-0 border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.thumbnailUrl} alt={product.title} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs truncate">{isEn && product.titleEn ? product.titleEn : product.title}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {isEn ? product.priceLabelEn || product.priceFormatted : product.priceFormatted}
            </p>
          </div>
        </div>

        {/* Link Share with Optional Referral Code */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold">{isEn ? "Clean Share URL:" : "Tautan Promosi Produk:"}</label>
            <span className="text-[10px] text-muted-foreground">
              {isEn ? "Supports ?ref parameter" : "Mendukung parameter mitra"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 p-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs text-[11px] font-mono outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`vt-btn px-3 py-2 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 ${
                copiedLink ? "bg-emerald-600 text-white" : "vt-btn-pink text-white hover:brightness-110"
              }`}
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? (isEn ? "Copied!" : "Tersalin!") : isEn ? "Copy" : "Salin Link"}</span>
            </button>
          </div>

          {/* Input Kode Referral Opsional */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-muted-foreground shrink-0">{isEn ? "Referral Tag:" : "Kode Mitra:"}</span>
            <input
              type="text"
              value={customRef}
              onChange={(e) => setCustomRef(e.target.value)}
              placeholder={isEn ? "partner_name (optional)" : "nama_mitra (opsional)"}
              className="p-1 px-2 bg-[var(--vt-card)] border border-border rounded-xs text-[10px] font-mono flex-1 outline-none"
            />
          </div>
        </div>

        {/* 1-Click Multi-Platform Share Buttons */}
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="block text-[11px] font-bold">
            {isEn ? "Share Directly to Platforms:" : "Bagikan Langsung ke Media Sosial:"}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <a
              href={buildWhatsAppPromoShareUrl(product, shareUrl, isEn)}
              target="_blank"
              rel="noopener noreferrer"
              className="vt-btn vt-btn-chrome p-2 text-center flex flex-col items-center justify-center gap-1 hover:text-emerald-500 cursor-pointer text-[10px] font-bold"
            >
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              <span>WhatsApp</span>
            </a>
            <a
              href={buildTelegramShareUrl(shareUrl, broadcastText)}
              target="_blank"
              rel="noopener noreferrer"
              className="vt-btn vt-btn-chrome p-2 text-center flex flex-col items-center justify-center gap-1 hover:text-sky-500 cursor-pointer text-[10px] font-bold"
            >
              <Send className="h-4 w-4 text-sky-500" />
              <span>Telegram</span>
            </a>
            <a
              href={buildTwitterShareUrl(shareUrl, broadcastText)}
              target="_blank"
              rel="noopener noreferrer"
              className="vt-btn vt-btn-chrome p-2 text-center flex flex-col items-center justify-center gap-1 hover:text-foreground cursor-pointer text-[10px] font-bold"
            >
              <span className="font-extrabold text-xs">𝕏</span>
              <span>Twitter</span>
            </a>
            <a
              href={buildLinkedInShareUrl(shareUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="vt-btn vt-btn-chrome p-2 text-center flex flex-col items-center justify-center gap-1 hover:text-blue-600 cursor-pointer text-[10px] font-bold"
            >
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <span>LinkedIn</span>
            </a>
            <a
              href={buildFacebookShareUrl(shareUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="vt-btn vt-btn-chrome p-2 text-center flex flex-col items-center justify-center gap-1 hover:text-indigo-600 cursor-pointer text-[10px] font-bold"
            >
              <Share2 className="h-4 w-4 text-indigo-600" />
              <span>Facebook</span>
            </a>
          </div>
        </div>

        {/* Copywriting Generator */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold">
              {isEn ? "Instant Broadcast Copywriting:" : "Teks Copywriting Siap Broadcast:"}
            </label>
            <button
              type="button"
              onClick={handleCopyBroadcast}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copiedBroadcast ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copiedBroadcast ? (isEn ? "Copied!" : "Tersalin!") : isEn ? "Copy Text" : "Salin Teks"}</span>
            </button>
          </div>
          <div className="p-2.5 bg-muted/60 rounded-xs border border-border text-[11px] font-mono whitespace-pre-wrap max-h-28 overflow-y-auto vt-scrollbar text-muted-foreground select-all">
            {broadcastText}
          </div>
        </div>

        {/* Instant QR Code Generator */}
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="vt-btn vt-btn-chrome px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5 text-primary" />
              <span>{showQr ? (isEn ? "Hide QR Code" : "Sembunyikan QR Code") : isEn ? "Generate QR Code" : "Tampilkan QR Code Produk"}</span>
            </button>

            {showQr && (
              <button
                type="button"
                onClick={handleDownloadQr}
                className="vt-btn vt-btn-pink px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-sm hover:brightness-110"
              >
                <Download className="h-3 w-3" />
                <span>{isEn ? "Download QR (PNG)" : "Unduh QR (PNG)"}</span>
              </button>
            )}
          </div>

          {showQr && (
            <div className="p-3 bg-white rounded border border-border text-center space-y-2 animate-in fade-in max-w-[200px] mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="Product QR Code" className="w-36 h-36 mx-auto object-contain" />
              <p className="text-[10px] text-gray-500 font-mono">Scan to open product</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
