"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Clock, PackageCheck, Search, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { OSWindow } from "@/components/public/os/os-window";
import { getOrderByInvoice } from "@/lib/order-actions";
import { formatIdr, formatUsd } from "@/lib/whatsapp-order";
import type { Order } from "@/db/schema";

const RECENT_INVOICES_KEY = "sigitos_recent_invoices";

export function recordRecentInvoice(invoiceNumber: string): void {
  if (typeof window === "undefined" || !invoiceNumber) return;
  try {
    const clean = invoiceNumber.trim().toUpperCase();
    if (!/^INV-\d{8}-[A-Z0-9]{4}$/.test(clean)) return;
    const raw = localStorage.getItem(RECENT_INVOICES_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [clean, ...(Array.isArray(list) ? list : []).filter((item) => item !== clean)].slice(0, 5);
    localStorage.setItem(RECENT_INVOICES_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors in restricted browsing contexts.
  }
}

function loadRecentInvoices(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_INVOICES_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? list.filter((x): x is string => typeof x === "string" && /^INV-\d{8}-[A-Z0-9]{4}$/.test(x))
      : [];
  } catch {
    return [];
  }
}

function getStatusBadge(status: string, isEn: boolean): { label: string; className: string } {
  switch (status) {
    case "paid":
      return {
        label: isEn ? "PAID" : "LUNAS",
        className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      };
    case "processing":
      return {
        label: isEn ? "PROCESSING" : "DIPROSES",
        className: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
      };
    case "completed":
      return {
        label: isEn ? "COMPLETED" : "SELESAI",
        className: "border-emerald-600/40 bg-emerald-600/20 text-emerald-800 dark:text-emerald-300",
      };
    case "cancelled":
      return {
        label: isEn ? "CANCELLED" : "DIBATALKAN",
        className: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
      };
    default:
      return {
        label: isEn ? "PENDING PAYMENT" : "MENUNGGU BAYAR",
        className: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300",
      };
  }
}

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: "id" | "en";
}

export function OrderTrackerModal({ isOpen, onClose, language }: OrderTrackerModalProps) {
  if (!isOpen) return null;
  return <OrderTrackerModalInner onClose={onClose} language={language} />;
}

function OrderTrackerModalInner({
  onClose,
  language,
}: Omit<OrderTrackerModalProps, "isOpen">) {
  const router = useRouter();
  const isEn = language === "en";
  const [invoiceInput, setInvoiceInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<string[]>(() => loadRecentInvoices());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const lookupInvoice = async (rawInput: string) => {
    const raw = rawInput.trim().toUpperCase();
    if (!raw) {
      setErrorMsg(isEn ? "Please enter an invoice number." : "Masukkan nomor invoice.");
      return;
    }
    const match = raw.match(/INV-\d{8}-[A-Z0-9]{4}/);
    if (!match) {
      setErrorMsg(
        isEn
          ? "Invoice format must be INV-DDMMYYYY-XXXX (e.g. INV-13102026-0001)."
          : "Format invoice harus berupa INV-DDMMYYYY-XXXX (contoh: INV-13102026-0001)."
      );
      return;
    }

    setErrorMsg("");
    setIsSearching(true);
    try {
      const order = await getOrderByInvoice(match[0]);
      if (order) {
        recordRecentInvoice(order.invoiceNumber);
        setRecentInvoices(loadRecentInvoices());
        setTrackedOrder(order);
      } else {
        setErrorMsg(
          isEn
            ? `Order ${match[0]} was not found. Check your invoice number or try again.`
            : `Pesanan ${match[0]} tidak ditemukan. Periksa kembali nomor invoice Anda.`
        );
      }
    } catch {
      setErrorMsg(
        isEn
          ? "Unable to reach order lookup service. Opening invoice page directly..."
          : "Gagal terhubung ke layanan pelacakan. Membuka halaman faktur..."
      );
      onClose();
      router.push(`/order/${match[0]}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await lookupInvoice(invoiceInput);
  };

  const statusMeta = trackedOrder ? getStatusBadge(trackedOrder.status, isEn) : null;
  const needsProofUpload =
    trackedOrder && trackedOrder.status === "pending" && !trackedOrder.paymentProofUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto vt-scrollbar"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-tracker-heading"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md sm:max-w-lg my-auto max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <OSWindow
          title={trackedOrder ? `Lacak_${trackedOrder.invoiceNumber}.exe` : "Lacak_Pesanan.exe"}
          icon={<Search className="h-4 w-4 text-[var(--vt-cyan)]" />}
          statusText={
            trackedOrder
              ? `STATUS: ${trackedOrder.status.toUpperCase()} // LIVE`
              : "INVOICE_TRACKER_V2.0"
          }
          onClose={onClose}
          className="w-full flex-1 flex flex-col max-h-full overflow-hidden shadow-2xl vt-window-pop"
          bodyClassName="p-4 sm:p-5 bg-[var(--vt-paper)] text-[var(--vt-ink)] font-mono text-xs space-y-4 flex-1 min-h-0 overflow-y-auto vt-scrollbar"
        >
          {!trackedOrder ? (
            <>
              <div>
                <h2 id="order-tracker-heading" className="font-bold text-sm mb-1 text-[var(--vt-ink)]">
                  {isEn ? "Track Your Digital Order" : "Lacak Status Pesanan Digital"}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {isEn
                    ? "Enter your invoice number received after checkout (e.g. INV-13102026-4821)."
                    : "Masukkan nomor invoice yang Anda peroleh saat checkout (contoh: INV-13102026-4821)."}
                </p>
              </div>

              {recentInvoices.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{isEn ? "Recent Orders on This Device" : "Pesanan Terakhir di Perangkat Ini"}</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {recentInvoices.map((inv) => (
                      <button
                        key={inv}
                        type="button"
                        onClick={() => {
                          setInvoiceInput(inv);
                          void lookupInvoice(inv);
                        }}
                        className="vt-btn vt-btn-chrome min-h-[36px] px-2.5 py-1 text-[11px] font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-cyan)]"
                      >
                        {inv}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="tracker-invoice-input" className="text-[11px] font-bold block text-muted-foreground uppercase">
                    {isEn ? "Invoice Number" : "Nomor Invoice"}
                  </label>
                  <input
                    id="tracker-invoice-input"
                    type="text"
                    value={invoiceInput}
                    onChange={(e) => {
                      setInvoiceInput(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="INV-DDMMYYYY-XXXX"
                    autoFocus
                    disabled={isSearching}
                    className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs font-mono font-bold text-xs uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-cyan)] focus-visible:border-[var(--vt-cyan)] placeholder:text-muted-foreground/60 disabled:opacity-60"
                  />
                  {errorMsg && (
                    <p role="alert" className="text-red-500 font-bold text-[11px] mt-1">
                      {errorMsg}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSearching}
                    className="vt-btn vt-btn-chrome min-h-[44px] sm:min-h-0 px-3.5 py-2 font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-cyan)]"
                  >
                    {isEn ? "Cancel" : "Batal"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="vt-btn vt-btn-pink min-h-[44px] sm:min-h-0 flex-1 py-2 px-4 font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-cyan)]"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>
                      {isSearching
                        ? isEn
                          ? "Searching..."
                          : "Mencari..."
                        : isEn
                        ? "Check Order Status"
                        : "Cek Status Pesanan"}
                    </span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    {isEn ? "INVOICE NUMBER" : "NOMOR INVOICE"}
                  </span>
                  <p id="order-tracker-heading" className="text-base font-bold font-pixel text-[var(--vt-ink)]">
                    {trackedOrder.invoiceNumber}
                  </p>
                </div>
                {statusMeta && (
                  <span className={`px-2.5 py-1 rounded-xs text-[11px] font-bold border font-pixel uppercase shrink-0 ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                )}
              </div>

              <div className="p-3 bg-[var(--vt-card)] vt-card-inset rounded-xs border border-[var(--vt-edge-lo-2)] space-y-1">
                <p className="font-bold text-xs">
                  {isEn ? "Customer:" : "Pemesan:"} {trackedOrder.customerName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isEn ? "Phone / WA:" : "Telepon / WA:"} {trackedOrder.customerPhone}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isEn ? "Payment Method:" : "Metode Pembayaran:"}{" "}
                  <strong className="uppercase">{trackedOrder.paymentMethod}</strong>
                </p>
                {trackedOrder.paymentProofUrl && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 pt-0.5">
                    <PackageCheck className="h-3.5 w-3.5" />
                    <span>
                      {isEn ? "Payment proof uploaded" : "Bukti pembayaran sudah diunggah"}
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-[11px] text-primary block uppercase">
                  {isEn ? "Order Items:" : "Daftar Pesanan:"}
                </span>
                <div className="border border-border rounded-xs divide-y divide-border/60 overflow-hidden">
                  {(trackedOrder.items || []).map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold truncate">
                          {isEn && it.titleEn ? it.titleEn : it.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Qty: {it.quantity}</p>
                      </div>
                      <span className="font-bold font-mono shrink-0">
                        {trackedOrder.currency === "USD" ? formatUsd(it.subtotal) : formatIdr(it.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-muted/60 rounded-xs border border-border">
                <span className="font-bold">{isEn ? "Total Payment:" : "Total Pembayaran:"}</span>
                <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400 font-pixel">
                  {trackedOrder.currency === "USD"
                    ? formatUsd(trackedOrder.totalAmount)
                    : formatIdr(trackedOrder.totalAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrackedOrder(null);
                    setErrorMsg("");
                  }}
                  className="vt-btn vt-btn-chrome min-h-[44px] sm:min-h-0 px-3 py-2 text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-cyan)]"
                >
                  {isEn ? "Track Another" : "Lacak Lain"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/order/${trackedOrder.invoiceNumber}`);
                  }}
                  className="vt-btn vt-btn-pink min-h-[44px] sm:min-h-0 flex-1 py-2 px-3 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-cyan)]"
                >
                  {needsProofUpload ? (
                    <Upload className="h-3.5 w-3.5" />
                  ) : null}
                  <span>
                    {needsProofUpload
                      ? isEn
                        ? "Upload Payment Proof & Invoice"
                        : "Unggah Bukti Bayar & Invoice"
                      : isEn
                      ? "Open Full Invoice & Print (A4)"
                      : "Buka Halaman Lengkap & Cetak (A4)"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </OSWindow>
      </div>
    </div>
  );
}
