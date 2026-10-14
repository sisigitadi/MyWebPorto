"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Order } from "@/db/schema";
import type { StoreConfig } from "@/lib/order-actions";
import { formatIdr, formatUsd } from "@/lib/whatsapp-order";
import { ShieldCheck, CheckCircle2, Clock } from "lucide-react";

interface PrintableInvoiceProps {
  order: Order;
  storeConfig?: StoreConfig | null;
  /** Bila true, menghilangkan shadow dan border preview untuk rendering print langsung */
  isPrintOnly?: boolean;
}

export function PrintableInvoice({
  order,
  storeConfig,
  isPrintOnly = false,
}: PrintableInvoiceProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const formattedTotal =
    order.currency === "USD"
      ? formatUsd(order.totalAmount)
      : formatIdr(order.totalAmount);

  const orderDate = new Date(order.createdAt);
  const dd = String(orderDate.getDate()).padStart(2, "0");
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const mmText = monthNames[orderDate.getMonth()];
  const yyyy = orderDate.getFullYear();
  const hh = String(orderDate.getHours()).padStart(2, "0");
  const min = String(orderDate.getMinutes()).padStart(2, "0");
  const dateFormatted = `${dd} ${mmText} ${yyyy}, ${hh}:${min} WIB`;

  // Status mapping
  const statusLabels: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: {
      label: "MENUNGGU PEMBAYARAN",
      color: "text-amber-800",
      bg: "bg-amber-50",
      border: "border-amber-400",
    },
    paid: {
      label: "LUNAS / DITERIMA",
      color: "text-emerald-800",
      bg: "bg-emerald-50",
      border: "border-emerald-500",
    },
    processing: {
      label: "SEDANG DIPROSES",
      color: "text-blue-800",
      bg: "bg-blue-50",
      border: "border-blue-400",
    },
    completed: {
      label: "PESANAN SELESAI",
      color: "text-emerald-900",
      bg: "bg-emerald-50",
      border: "border-emerald-600",
    },
    cancelled: {
      label: "DIBATALKAN",
      color: "text-rose-800",
      bg: "bg-rose-50",
      border: "border-rose-400",
    },
  };

  const statusMeta = statusLabels[order.status] || {
    label: order.status.toUpperCase(),
    color: "text-slate-800",
    bg: "bg-slate-50",
    border: "border-slate-300",
  };

  const verifyUrl = `https://sigitadi.id/order/${order.invoiceNumber}`;

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (mounted) setQrCodeDataUrl(url);
      })
      .catch(() => {
        // Fallback jika qr gagal di-render
      });

    return () => {
      mounted = false;
    };
  }, [verifyUrl]);

  const cleanAdminPhone = (storeConfig?.adminWhatsapp || "+62 822-1011-8511").trim();

  return (
    <div
      className={`bg-white text-slate-900 font-sans print:w-full print:max-w-none print:m-0 print:p-0 print:shadow-none print:border-none ${
        isPrintOnly
          ? "w-full p-0"
          : "max-w-[794px] mx-auto p-6 sm:p-10 rounded-sm shadow-xl border border-slate-200"
      }`}
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* KOP SURAT / HEADER RESMI PERUSAHAAN / FREELANCER */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-6">
        <div className="flex items-start gap-3.5">
          {/* Logo Badge Resmi */}
          <div className="w-12 h-12 rounded-xs bg-slate-900 text-white flex items-center justify-center font-mono font-black text-lg tracking-tighter shrink-0 shadow-xs">
            SA
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                SIGIT ADI
              </h1>
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              Software Engineer & Digital Solutions
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              sigitadi.id • si.sigitadi@gmail.com • {cleanAdminPhone}
            </p>
          </div>
        </div>

        {/* Judul & Nomor Invoice */}
        <div className="text-left sm:text-right shrink-0">
          <div className="text-2xl font-black tracking-wider text-slate-900 font-mono uppercase">
            FAKTUR RESMI
          </div>
          <div className="font-mono text-sm font-extrabold text-blue-900 mt-1 select-all">
            {order.invoiceNumber}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {dateFormatted}
          </div>
          <div className="mt-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xs text-[11px] font-mono font-black border ${statusMeta.border} ${statusMeta.bg} ${statusMeta.color} uppercase tracking-wider`}
            >
              {order.status === "paid" || order.status === "completed" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span>{statusMeta.label}</span>
            </span>
          </div>
        </div>
      </div>

      {/* WATERMARK STEMPEL RESMI JIKA SUDAH LUNAS */}
      {(order.status === "paid" || order.status === "completed") && (
        <div className="relative">
          <div className="absolute right-4 -top-3 pointer-events-none select-none opacity-85 z-10">
            <div className="border-4 border-emerald-600 rounded-sm px-4 py-1.5 rotate-[-8deg] shadow-xs bg-white/70 backdrop-blur-xs">
              <div className="text-center">
                <span className="block text-emerald-700 font-mono font-black text-sm tracking-widest uppercase">
                  ✓ LUNAS
                </span>
                <span className="block text-emerald-600 font-sans font-bold text-[9px] tracking-tight uppercase">
                  VERIFIED BY SIGITOS
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INFORMASI PELANGGAN & DETAIL PEMBAYARAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 pt-1 text-xs">
        {/* Kolom 1: Ditagihkan Kepada */}
        <div className="p-4 bg-slate-50 rounded-xs border border-slate-200 space-y-1.5">
          <span className="text-[10px] font-mono font-extrabold text-slate-500 tracking-wider uppercase block">
            DITAGIHKAN KEPADA:
          </span>
          <p className="font-bold text-sm text-slate-900 leading-snug">
            {order.customerName}
          </p>
          <p className="text-slate-600 font-mono">
            Telepon / WA: <strong className="text-slate-800">{order.customerPhone}</strong>
          </p>
          {order.customerEmail && (
            <p className="text-slate-600 font-mono">
              Email: <span className="text-slate-800">{order.customerEmail}</span>
            </p>
          )}
          {order.customerAddress && (
            <p className="text-slate-600 whitespace-pre-line leading-relaxed">
              Alamat: {order.customerAddress}
            </p>
          )}
          {order.customerNotes && (
            <p className="text-slate-500 italic pt-1 border-t border-slate-200">
              Catatan: &ldquo;{order.customerNotes}&rdquo;
            </p>
          )}
        </div>

        {/* Kolom 2: Rincian Transaksi */}
        <div className="p-4 bg-slate-50 rounded-xs border border-slate-200 space-y-2">
          <span className="text-[10px] font-mono font-extrabold text-slate-500 tracking-wider uppercase block">
            DETAIL TRANSAKSI:
          </span>
          <div className="flex justify-between items-center border-b border-slate-200/80 pb-1.5">
            <span className="text-slate-500">Metode Pembayaran:</span>
            <span className="font-mono font-extrabold text-slate-900 uppercase">
              {order.paymentMethod === "qris"
                ? "QRIS (Pembayaran Instan)"
                : order.paymentMethod === "bank"
                ? "Transfer Antar Bank"
                : order.paymentMethod === "paypal"
                ? "PayPal / Wise Internasional"
                : order.paymentMethod.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-200/80 pb-1.5">
            <span className="text-slate-500">Mata Uang:</span>
            <span className="font-mono font-bold text-slate-900">{order.currency}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-200/80 pb-1.5">
            <span className="text-slate-500">Tipe Transaksi:</span>
            <span className="font-bold text-slate-800">
              {order.projectUrl ? "Jasa Layanan FreelanceOps" : "Produk Digital & Lisensi"}
            </span>
          </div>
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-slate-500">Situs Resmi:</span>
            <span className="font-mono font-bold text-slate-700">sigitadi.id</span>
          </div>
        </div>
      </div>

      {/* TABEL RINCIAN PESANAN (BARANG / JASA) */}
      <div className="my-6">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-mono font-extrabold border-y-2 border-slate-800 uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-12 text-center">No.</th>
              <th className="py-2.5 px-3">Deskripsi Produk / Layanan</th>
              <th className="py-2.5 px-3 w-20 text-center">Kuantitas</th>
              <th className="py-2.5 px-3 w-32 text-right">Harga Satuan</th>
              <th className="py-2.5 px-3 w-36 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(order.items || []).map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-3 px-3 text-center font-mono text-slate-500 font-bold">
                  {idx + 1}
                </td>
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                    {item.title}
                  </div>
                  {item.titleEn && (
                    <div className="text-[11px] text-slate-500 italic mt-0.5">
                      {item.titleEn}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    SKU: {item.productId}
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-800">
                  {item.quantity}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-700">
                  {order.currency === "USD" ? formatUsd(item.price) : formatIdr(item.price)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                  {order.currency === "USD" ? formatUsd(item.subtotal) : formatIdr(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* KALKULASI TOTAL */}
      <div className="flex flex-col sm:flex-row justify-end items-end gap-4 my-6">
        <div className="w-full sm:w-72 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-600 px-1">
            <span>Subtotal:</span>
            <span>{formattedTotal}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 px-1">
            <span>Biaya Layanan / Admin:</span>
            <span className="text-emerald-700 font-bold">Rp 0 (Gratis)</span>
          </div>
          <div className="flex justify-between items-center text-slate-900 font-black text-sm sm:text-base border-y-2 border-slate-900 py-2 px-1 bg-slate-50">
            <span>TOTAL TAGIHAN:</span>
            <span className="text-blue-950 font-black">{formattedTotal}</span>
          </div>
        </div>
      </div>

      {/* PANDUAN REKENING TRANSFER JIKA STATUS BELUM LUNAS */}
      {order.status === "pending" && (
        <div className="my-6 p-4 rounded-xs border border-amber-300 bg-amber-50/60 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <Clock className="h-4 w-4 shrink-0 text-amber-700" />
            <span className="font-mono uppercase text-[11px] tracking-wide">
              Instruksi Penyelesaian Pembayaran Resmi
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Silakan kirimkan pembayaran tepat sejumlah{" "}
            <strong className="text-slate-950 font-mono font-extrabold">{formattedTotal}</strong> ke
            rekening resmi berikut:
          </p>

          {order.paymentMethod === "bank" && (
            (() => {
              const activeBanks = (storeConfig?.bankAccounts || []).filter((b) => b.isActive !== false);
              if (activeBanks.length === 0) return null;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono">
                  {activeBanks.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-2.5 bg-white rounded border border-amber-200/80 shadow-xs"
                    >
                      <div className="font-bold text-slate-900 text-xs">{acc.bankName}</div>
                      <div className="font-extrabold text-sm text-blue-900 select-all">
                        {acc.accountNumber}
                      </div>
                      {acc.accountHolder && (
                        <div className="text-[10px] text-slate-500">a.n. {acc.accountHolder}</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()
          )}

          <p className="text-[11px] text-slate-600">
            Setelah transfer, konfirmasikan bukti transfer Anda melalui WhatsApp admin:{" "}
            <strong className="text-slate-900">{cleanAdminPhone}</strong> dengan mencantumkan nomor
            invoice <strong className="font-mono text-slate-900">{order.invoiceNumber}</strong>.
          </p>
        </div>
      )}

      {/* FOOTER RESMI & VALIDASI KEASLIAN DOKUMEN */}
      <div className="mt-8 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6 text-xs text-slate-500">
        {/* Catatan Hukum & Legalitas */}
        <div className="space-y-1.5 max-w-md text-left">
          <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider font-mono">
            KETENTUAN & VALIDASI RESMI
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            1. Invoice ini merupakan dokumen transaksi digital yang sah dan diterbitkan secara
            otomatis oleh sistem <strong>sigitadi.id</strong>.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            2. Akses produk digital, lisensi, atau penyerahan milestone jasa diberikan setelah
            pembayaran diverifikasi secara sah.
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Dicetak secara resmi pada: {new Date().toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })} WIB • Sistem SigitOS v2.4
          </p>
        </div>

        {/* QR Code Verifikasi Online Langsung */}
        <div className="flex flex-col items-center text-center shrink-0">
          {qrCodeDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrCodeDataUrl}
              alt={`QR Verifikasi ${order.invoiceNumber}`}
              className="w-20 h-20 border border-slate-300 rounded p-1 bg-white"
            />
          ) : (
            <div className="w-20 h-20 border border-slate-300 rounded flex items-center justify-center text-[10px] font-mono text-slate-400">
              QR Code
            </div>
          )}
          <span className="text-[10px] font-mono text-slate-600 font-bold mt-1.5 block">
            Pindai untuk Verifikasi
          </span>
          <span className="text-[9px] font-mono text-slate-400 block truncate max-w-[160px]">
            {verifyUrl}
          </span>
        </div>
      </div>
    </div>
  );
}
