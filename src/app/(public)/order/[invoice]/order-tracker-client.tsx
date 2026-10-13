"use client";

import React, { useState } from "react";
import {
  Package,
  CheckCircle2,
  Clock,
  ExternalLink,
  Printer,
  Copy,
  Check,
  CreditCard,
  QrCode,
  MessageCircle,
  Briefcase,
  AlertCircle,
  Maximize2,
  Download,
  X,
} from "lucide-react";
import type { Order } from "@/db/schema";
import type { StoreConfig } from "@/lib/order-actions";
import { formatIdr, formatUsd } from "@/lib/whatsapp-order";
import { OSWindow } from "@/components/public/os/os-window";
import { toast } from "sonner";

interface OrderTrackerClientProps {
  order: Order;
  storeConfig: StoreConfig;
}

export function OrderTrackerClient({ order, storeConfig }: OrderTrackerClientProps) {
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [qrisZoomOpen, setQrisZoomOpen] = useState(false);

  const formattedTotal =
    order.currency === "USD"
      ? formatUsd(order.totalAmount)
      : formatIdr(order.totalAmount);

  const orderDate = new Date(order.createdAt);
  const dd = String(orderDate.getDate()).padStart(2, "0");
  const mm = String(orderDate.getMonth() + 1).padStart(2, "0");
  const yyyy = orderDate.getFullYear();
  const hh = String(orderDate.getHours()).padStart(2, "0");
  const min = String(orderDate.getMinutes()).padStart(2, "0");
  const dateFormatted = `${dd}/${mm}/${yyyy} pukul ${hh}.${min}`;

  const statusColors = {
    pending: "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40",
    paid: "bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/40",
    processing: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/40",
    completed: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
    cancelled: "bg-red-500/20 text-red-500 border-red-500/40",
  };

  const statusLabels = {
    pending: "Menunggu Pembayaran / Verifikasi",
    paid: "Pembayaran Diterima",
    processing: "Sedang Diproses / Akses Dikirim",
    completed: "Pesanan Selesai",
    cancelled: "Pesanan Dibatalkan",
  };

  const currentStatus = (order.status || "pending") as keyof typeof statusLabels;

  const handleCopyBank = (accNumber: string, bankName: string, id: string) => {
    navigator.clipboard.writeText(accNumber.replace(/\s+/g, ""));
    setCopiedBankId(id);
    setTimeout(() => setCopiedBankId(null), 2000);
    toast.success(`Nomor rekening ${bankName} berhasil disalin!`);
  };

  const handleDownloadQris = async () => {
    if (!storeConfig.qrisImageUrl) return;
    try {
      const res = await fetch(storeConfig.qrisImageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QRIS-Payment-${order.invoiceNumber}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Gambar QRIS berhasil diunduh!");
    } catch {
      window.open(storeConfig.qrisImageUrl, "_blank");
    }
  };

  const cleanAdminPhone = (storeConfig.adminWhatsapp || "").replace(/\D/g, "");
  const waChatUrl = cleanAdminPhone
    ? `https://wa.me/${cleanAdminPhone}?text=${encodeURIComponent(
        `Halo Admin, saya ingin menanyakan perkembangan pesanan saya [${order.invoiceNumber}] atas nama ${order.customerName}. Terima kasih!`
      )}`
    : "";

  return (
    <>
      <OSWindow
        title={`Invoice_${order.invoiceNumber}.pdf`}
        icon={<Package className="h-3.5 w-3.5 text-[#ffd400]" />}
        statusText={`Order_Status // ${currentStatus.toUpperCase()} // Live`}
        className="print:border-none print:shadow-none"
        bodyClassName="p-4 sm:p-6 space-y-6 font-mono text-xs"
      >
        {/* Header Invoice */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              STATUS PESANAN RESMI
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-pixel tracking-wide text-[var(--vt-ink)]">
              {order.invoiceNumber}
            </h1>
            <p className="text-[11px] text-muted-foreground">{dateFormatted}</p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-xs text-xs font-pixel font-bold border ${statusColors[currentStatus] || "bg-muted"}`}
            >
              {statusLabels[currentStatus] || currentStatus}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="vt-btn vt-btn-chrome h-8 px-3 font-mono text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer print:hidden"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Invoice</span>
            </button>
          </div>
        </div>

        {/* Status Timeline Stepper */}
        <div className="p-4 bg-[var(--vt-card)] vt-card-inset rounded-xs border border-[var(--vt-edge-lo-2)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="space-y-1">
              <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold">
                ✓
              </div>
              <p className="font-bold text-[11px]">1. Pesanan Dibuat</p>
              <p className="text-[10px] text-muted-foreground">Tercatat di sistem</p>
            </div>

            <div className="space-y-1">
              <div
                className={`h-7 w-7 rounded-full mx-auto flex items-center justify-center font-bold ${
                  currentStatus !== "pending" && currentStatus !== "cancelled"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/20 text-amber-600"
                }`}
              >
                {currentStatus !== "pending" && currentStatus !== "cancelled" ? "✓" : "2"}
              </div>
              <p className="font-bold text-[11px]">2. Pembayaran</p>
              <p className="text-[10px] text-muted-foreground">
                {currentStatus === "pending" ? "Menunggu verifikasi" : "Terverifikasi"}
              </p>
            </div>

            <div className="space-y-1">
              <div
                className={`h-7 w-7 rounded-full mx-auto flex items-center justify-center font-bold ${
                  currentStatus === "processing" || currentStatus === "completed"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStatus === "completed" ? "✓" : "3"}
              </div>
              <p className="font-bold text-[11px]">3. Proses Pengerjaan</p>
              <p className="text-[10px] text-muted-foreground">Akses / Milestone</p>
            </div>

            <div className="space-y-1">
              <div
                className={`h-7 w-7 rounded-full mx-auto flex items-center justify-center font-bold ${
                  currentStatus === "completed"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStatus === "completed" ? "✓" : "4"}
              </div>
              <p className="font-bold text-[11px]">4. Selesai</p>
              <p className="text-[10px] text-muted-foreground">Serah terima tuntas</p>
            </div>
          </div>
        </div>

        {/* Project Link if Jasa / FreelanceOps */}
        {order.projectUrl && (
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-bold text-xs text-foreground">Ruang Kerja Proyek FreelanceOps Aktif</p>
                <p className="text-[11px] text-muted-foreground">
                  Proyek Anda sedang dikelola di portal workspace FreelanceOps.
                </p>
              </div>
            </div>
            <a
              href={order.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="vt-btn vt-btn-pink px-4 py-2 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110 shrink-0"
            >
              <span>Buka Ruang Kerja Proyek</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Customer & Payment Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-muted/40 rounded-xs border border-border space-y-1.5">
            <span className="font-bold text-[11px] text-primary uppercase block">Data Pemesan</span>
            <p className="font-bold text-xs">{order.customerName}</p>
            <p className="text-[11px] text-muted-foreground">{order.customerPhone}</p>
            {order.customerEmail && <p className="text-[11px] text-muted-foreground">{order.customerEmail}</p>}
            {order.customerAddress && <p className="text-[11px] text-muted-foreground">{order.customerAddress}</p>}
          </div>

          <div className="p-3 bg-muted/40 rounded-xs border border-border space-y-1.5">
            <span className="font-bold text-[11px] text-primary uppercase block">Detail Pembayaran</span>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Metode Bayar:</span>
              <span className="font-bold uppercase">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Mata Uang:</span>
              <span className="font-bold">{order.currency}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-border">
              <span className="font-bold">Total Pembayaran:</span>
              <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-pixel">
                {formattedTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-2">
          <span className="font-bold text-[11px] text-primary uppercase block">Daftar Produk / Jasa Dipesan</span>
          <div className="border border-border rounded-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="p-2.5 font-bold">Item</th>
                  <th className="p-2.5 font-bold text-center w-16">Qty</th>
                  <th className="p-2.5 font-bold text-right w-28">Harga</th>
                  <th className="p-2.5 font-bold text-right w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((it, idx) => (
                  <tr key={idx} className="border-b border-border/60 last:border-none">
                    <td className="p-2.5 font-medium">{it.title}</td>
                    <td className="p-2.5 text-center">{it.quantity}</td>
                    <td className="p-2.5 text-right font-mono">
                      {order.currency === "USD" ? formatUsd(it.price) : formatIdr(it.price)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold">
                      {order.currency === "USD" ? formatUsd(it.subtotal) : formatIdr(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Catatan Admin jika ada */}
        {order.adminNotes && (
          <div className="p-3 bg-muted/60 border border-border rounded-xs space-y-1">
            <span className="font-bold text-[11px] text-primary block">Catatan Admin:</span>
            <p className="text-xs whitespace-pre-line text-foreground">{order.adminNotes}</p>
          </div>
        )}

        {/* Instruksi Pembayaran jika Status masih PENDING */}
        {currentStatus === "pending" && (
          <div className="p-4 bg-[var(--vt-card)] border-2 border-amber-500/30 rounded-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-bold text-xs font-pixel">PANDUAN PENYELESAIAN PEMBAYARAN</span>
            </div>

            {/* QRIS jika metode QRIS */}
            {order.paymentMethod === "qris" && storeConfig.qrisImageUrl && (
              <div className="p-3 bg-white text-black rounded border border-border text-center space-y-2 max-w-xs mx-auto">
                <p className="text-xs font-bold">Scan Barcode QRIS di bawah ini:</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storeConfig.qrisImageUrl}
                  alt="QRIS Barcode"
                  className="w-48 h-48 mx-auto object-contain cursor-pointer"
                  onClick={() => setQrisZoomOpen(true)}
                />
                <div className="flex items-center justify-center gap-2 pt-1 font-mono">
                  <button
                    type="button"
                    onClick={() => setQrisZoomOpen(true)}
                    className="vt-btn vt-btn-chrome px-3 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="h-3 w-3" />
                    <span>Perbesar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQris}
                    className="vt-btn vt-btn-pink px-3 py-1 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>Unduh QRIS</span>
                  </button>
                </div>
              </div>
            )}

            {/* Rekening jika Transfer Bank */}
            {order.paymentMethod === "bank" && (storeConfig.bankAccounts || []).length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold">Kirim transfer ke salah satu rekening berikut:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {storeConfig.bankAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-2.5 bg-muted/60 rounded border border-border flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-primary">{acc.bankName}</span>
                        <p className="font-mono font-extrabold text-sm">{acc.accountNumber}</p>
                        {acc.accountHolder && (
                          <span className="text-[10px] text-muted-foreground">a.n. {acc.accountHolder}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyBank(acc.accountNumber, acc.bankName, acc.id)}
                        className="vt-btn vt-btn-chrome px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedBankId === acc.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedBankId === acc.id ? "Tersalin!" : "Salin"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <p className="text-[11px] text-muted-foreground text-center sm:text-left">
            Butuh bantuan atau ingin konfirmasi bukti transfer?
          </p>

          {waChatUrl && (
            <a
              href={waChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="vt-btn vt-btn-pink py-2 px-4 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 w-full sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Hubungi Admin via WhatsApp</span>
            </a>
          )}
        </div>
      </OSWindow>

      {/* Lightbox QRIS */}
      {qrisZoomOpen && storeConfig.qrisImageUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setQrisZoomOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-white rounded-lg p-5 shadow-2xl space-y-4 text-center text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold font-mono">Barcode QRIS Resmi</span>
              <button
                type="button"
                onClick={() => setQrisZoomOpen(false)}
                className="h-7 w-7 rounded-full bg-muted flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={storeConfig.qrisImageUrl} alt="QRIS Zoom" className="w-full h-auto object-contain mx-auto" />
            <button
              type="button"
              onClick={handleDownloadQris}
              className="vt-btn vt-btn-pink px-4 py-2 text-xs font-bold text-white w-full cursor-pointer shadow-sm"
            >
              Unduh Barcode (PNG)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
