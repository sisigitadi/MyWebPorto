import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Receipt } from "lucide-react";
import { getOrderByInvoice, getStoreConfig } from "@/lib/order-actions";
import { OrderTrackerClient } from "./order-tracker-client";

interface PageProps {
  params: Promise<{ invoice: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { invoice } = await params;
  return {
    title: `Invoice ${invoice} - Status Pesanan`,
    description: `Lacak status pesanan resmi ${invoice} di toko digital Sigit Adi.`,
    robots: { index: false, follow: false },
  };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { invoice } = await params;
  const [order, storeConfig] = await Promise.all([
    getOrderByInvoice(invoice),
    getStoreConfig(),
  ]);

  if (!order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full vt-card p-6 text-center space-y-4 font-mono text-xs">
          <Receipt className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="text-base font-bold font-pixel">PESANAN TIDAK DITEMUKAN</h2>
          <p className="text-muted-foreground">
            Nomor invoice <span className="font-bold text-foreground">{invoice}</span> tidak ditemukan dalam database.
          </p>
          <div className="pt-2">
            <Link href="/#produk" className="vt-btn vt-btn-chrome px-4 py-2 inline-flex items-center gap-1.5 font-bold">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Toko</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto vt-scrollbar py-6 sm:py-10 vt-crt-on">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 space-y-6">
        {/* Nav header */}
        <div className="flex items-center justify-between gap-2 print-hidden">
          <Link
            href="/#produk"
            className="vt-btn vt-btn-chrome h-8 px-3 font-mono text-xs font-bold inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Toko</span>
          </Link>
          <span className="text-[11px] font-mono text-muted-foreground">
            Status Terverifikasi Sistem
          </span>
        </div>

        {/* Client Interactive Wrapper (Print trigger, WhatsApp, dll) */}
        <OrderTrackerClient order={order} storeConfig={storeConfig} />
      </div>
    </div>
  );
}
