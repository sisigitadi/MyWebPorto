"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  QrCode,
  Building2,
  MessageCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Maximize2,
  Download,
  Copy,
  Check,
  X,
  Globe,
  Receipt,
} from "lucide-react";
import { useCart, formatIdr, CustomerOrderInfo } from "@/lib/cart-context";
import {
  formatUsd,
  parseLegacyBankInfo,
  normalizeBankAccounts,
} from "@/lib/whatsapp-order";
import { ProfileData } from "@/lib/dummy-data";
import { STORE_NAME, storeName, platformLabelFromUrl, isExternalStoreUrl } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { useFeature } from "@/lib/features-context";
import { OSWindow } from "@/components/public/os/os-window";
import { playOS } from "@/lib/os-sound";
import { toast } from "sonner";
import { getStoreConfig, createOrder, StoreConfig } from "@/lib/order-actions";

interface CartDialogProps {
  profile?: ProfileData;
  initialStoreConfig?: StoreConfig | null;
}

const CUSTOMER_STORAGE_KEY = "sigitos_customer_data_v1";

export function CartDialog({ profile, initialStoreConfig }: CartDialogProps) {
  const router = useRouter();
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, clearCart, totalCount, totalAmount, initialStep } = useCart();
  const { language } = useTranslation();
  const isEn = language === "en";

  const hasExternal = items.some(({ product }) => isExternalStoreUrl(product.ctaUrl));

  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const [channel, setChannel] = useState<"whatsapp" | "external">("whatsapp");
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(initialStoreConfig || null);
  const [qrisZoomOpen, setQrisZoomOpen] = useState(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customer, setCustomer] = useState<CustomerOrderInfo>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    paymentMethod: "qris",
  });
  const [lastInvoice, setLastInvoice] = useState("");
  const [showTrackInput, setShowTrackInput] = useState(false);
  const [trackInvoiceInput, setTrackInvoiceInput] = useState("");

  const handleTrackSubmit = () => {
    if (!trackInvoiceInput.trim()) return;
    const trimmed = trackInvoiceInput.trim().toUpperCase();
    const match = trimmed.match(/INV-\d{8}-[A-Za-z0-9]{4}/);
    if (match) {
      handleClose();
      router.push(`/order/${match[0]}`);
    } else {
      toast.error(
        isEn
          ? "Invalid format! Example: INV-13102026-0001"
          : "Format salah! Contoh: INV-13102026-0001"
      );
    }
  };

  const currentQris = storeConfig?.qrisImageUrl || profile?.paymentQrUrl;

  const parsedProfileBankAccounts = React.useMemo(() => {
    return normalizeBankAccounts(parseLegacyBankInfo(profile?.paymentBankInfo));
  }, [profile?.paymentBankInfo]);

  const bankAccounts = React.useMemo(() => {
    const raw = (storeConfig?.bankAccounts && storeConfig.bankAccounts.length > 0)
      ? storeConfig.bankAccounts
      : parsedProfileBankAccounts;
    return normalizeBankAccounts(raw).filter((acc) => acc.isActive !== false);
  }, [storeConfig, parsedProfileBankAccounts]);

  const isQrisEnabled = storeConfig?.paymentMethods?.qris !== false && Boolean(currentQris);
  const isBankEnabled = storeConfig?.paymentMethods?.bank !== false && bankAccounts.length > 0;
  const isPaypalEnabled = storeConfig?.paymentMethods?.paypal !== false && Boolean(storeConfig?.internationalPayment?.paypalUrl || storeConfig?.internationalPayment?.wiseInfo || isEn);
  const isWaDirectEnabled = storeConfig?.paymentMethods?.wa_direct !== false;

  // Auto-switch jika metode pembayaran yang terpilih saat ini dinonaktifkan oleh admin
  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomer((prev) => {
        if (prev.paymentMethod === "qris" && !isQrisEnabled) {
          if (isBankEnabled) return { ...prev, paymentMethod: "bank" };
          if (isWaDirectEnabled) return { ...prev, paymentMethod: "wa_direct" };
          if (isPaypalEnabled) return { ...prev, paymentMethod: "paypal" };
        } else if (prev.paymentMethod === "bank" && !isBankEnabled) {
          if (isQrisEnabled) return { ...prev, paymentMethod: "qris" };
          if (isWaDirectEnabled) return { ...prev, paymentMethod: "wa_direct" };
          if (isPaypalEnabled) return { ...prev, paymentMethod: "paypal" };
        } else if (prev.paymentMethod === "paypal" && !isPaypalEnabled) {
          if (isQrisEnabled) return { ...prev, paymentMethod: "qris" };
          if (isBankEnabled) return { ...prev, paymentMethod: "bank" };
          if (isWaDirectEnabled) return { ...prev, paymentMethod: "wa_direct" };
        } else if (prev.paymentMethod === "wa_direct" && !isWaDirectEnabled) {
          if (isQrisEnabled) return { ...prev, paymentMethod: "qris" };
          if (isBankEnabled) return { ...prev, paymentMethod: "bank" };
          if (isPaypalEnabled) return { ...prev, paymentMethod: "paypal" };
        }
        return prev;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [isQrisEnabled, isBankEnabled, isPaypalEnabled, isWaDirectEnabled]);

  // Ambil store config terpusat saat modal dibuka agar selalu instan sinkron dengan admin
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    getStoreConfig()
      .then((cfg) => {
        if (mounted && cfg) setStoreConfig(cfg);
      })
      .catch((err) => console.error("[cart-dialog] getStoreConfig failed:", err));
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Muat data pelanggan dari localStorage browser (Auto-Fill / Zero Friction)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === "object") {
            setCustomer((prev) => ({
              ...prev,
              name: saved.name || prev.name,
              phone: saved.phone || prev.phone,
              email: saved.email || (saved.emailOrAddress?.includes("@") ? saved.emailOrAddress : prev.email),
              address: saved.address || (!saved.emailOrAddress?.includes("@") ? saved.emailOrAddress : prev.address),
            }));
          }
        }
      } catch {
        // Abaikan jika localStorage tidak dapat diakses
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Sinkronkan step awal saat modal dibuka (cart vs checkout instan)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setStep(initialStep || "cart");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialStep]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setStep("cart");
      setQrisZoomOpen(false);
    }, 300);
  }, [setIsOpen]);

  useEffect(() => {
    if (isOpen) playOS("windowOpen");
  }, [isOpen]);

  // Tutup dengan Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (qrisZoomOpen) {
          setQrisZoomOpen(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, qrisZoomOpen, handleClose]);

  const enableStoreCart = useFeature("enable_store_cart");
  if (!enableStoreCart) return null;
  if (!isOpen) return null;

  const handleProceedCheckout = () => {
    if (items.length === 0) return;
    setStep("checkout");
  };

  // Unduh QRIS ke perangkat pengguna
  const handleDownloadQris = async () => {
    const qrUrl = storeConfig?.qrisImageUrl || profile?.paymentQrUrl;
    if (!qrUrl) return;
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "QRIS-SigitAdi-Payment.png";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(isEn ? "QRIS barcode downloaded!" : "Barcode QRIS berhasil diunduh!");
    } catch {
      window.open(qrUrl, "_blank");
    }
  };

  // Salin Nomor Rekening 1-Klik (Hanya digit bersih untuk mempermudah transfer m-banking)
  const handleCopyBank = (accNumber: string, bankName: string, id: string) => {
    const cleanNum = accNumber.replace(/[^\d]/g, "") || accNumber.trim();
    navigator.clipboard.writeText(cleanNum);
    setCopiedBankId(id);
    setTimeout(() => setCopiedBankId(null), 2500);
    toast.success(
      isEn
        ? `${bankName} account number (${cleanNum}) copied!`
        : `Nomor rekening ${bankName} (${cleanNum}) berhasil disalin!`
    );
  };

  // Submit Order & Persistensi ke Database
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.name.trim() || !customer.phone.trim()) {
      toast.error(isEn ? "Please fill in your name and phone number." : "Mohon lengkapi nama dan nomor WhatsApp.");
      return;
    }

    const adminPhone = storeConfig?.adminWhatsapp || profile?.phone;
    if (!adminPhone || !adminPhone.trim()) {
      toast.error(
        isEn
          ? "Admin WhatsApp number is not configured yet. Please contact the owner directly."
          : "Nomor WhatsApp admin toko belum dikonfigurasi. Silakan gunakan menu kontak."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Simpan data pemesan ke localStorage untuk kunjungan berikutnya
      try {
        localStorage.setItem(
          CUSTOMER_STORAGE_KEY,
          JSON.stringify({
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
          })
        );
      } catch {}

      // Tangkap kode referral jika ada di URL (?ref=kode)
      const referralCode =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("ref") || undefined
          : undefined;

      // 1. Simpan pesanan ke database PostgreSQL (Supabase) secara persisten
      const orderRes = await createOrder({
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email?.trim() || undefined,
        customerAddress: customer.address?.trim() || undefined,
        customerNotes: customer.notes?.trim() || undefined,
        items: items.map((it) => ({
          productId: it.product.id,
          title: it.product.title,
          titleEn: it.product.titleEn || null,
          price: it.product.priceAmount || 0,
          quantity: it.quantity,
          subtotal: (it.product.priceAmount || 0) * it.quantity,
          imageUrl: it.product.thumbnailUrl || null,
        })),
        totalAmount,
        currency: isEn ? "USD" : "IDR",
        paymentMethod: customer.paymentMethod,
        referralCode,
      });

      const inv = orderRes.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
      setLastInvoice(inv);

      playOS("success");
      clearCart();
      handleClose();
      toast.success(
        isEn
          ? `Order ${inv} recorded! Opening invoice page...`
          : `Pesanan ${inv} berhasil dibuat! Membuka halaman faktur...`
      );
      router.push(`/order/${inv}`);
    } catch (err) {
      console.error("[cart-dialog] submit error:", err);
      toast.error(isEn ? "Failed to record order. Please try again." : "Gagal mencatat pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        onClick={handleClose}
      >
        <div
          className="relative w-full sm:max-w-xl h-[95dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col rounded-t-lg sm:rounded-none overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
          onClick={(e) => e.stopPropagation()}
        >
          <OSWindow
            onClose={handleClose}
            title={
              step === "cart"
                ? `${storeName(isEn)}_Cart.zip :: [${totalCount} Item]`
                : step === "checkout"
                ? `${storeName(isEn)}_Checkout.exe`
                : "Order_Success.txt"
            }
            icon={<ShoppingCart className="h-3.5 w-3.5 text-[#ffd400]" />}
            statusText={
              step === "cart"
                ? `Total: ${isEn ? formatUsd(totalAmount) : formatIdr(totalAmount)} // Ready for checkout`
                : step === "checkout"
                ? channel === "whatsapp"
                  ? `${storeName(isEn).toUpperCase()} // SECURE MANUAL CHECKOUT`
                  : `${storeName(isEn).toUpperCase()} // BUY AT PARTNER STORES`
                : "Order Transmitted"
            }
            className="w-full flex-1 flex flex-col overflow-hidden shadow-2xl vt-window-pop"
            bodyClassName="p-3 sm:p-5 flex-1 overflow-y-auto vt-scrollbar bg-[var(--vt-paper)] text-[var(--vt-ink)]"
          >
            {/* STEP 1: CART ITEMS LIST */}
            {step === "cart" && (
              <div className="space-y-4 font-mono text-xs">
                {items.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-muted/60 border border-border mx-auto flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-bold">
                      {isEn ? "Your cart is currently empty." : "Keranjang belanja Anda masih kosong."}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isEn
                        ? `Browse digital products at ${storeName(isEn)} and click the Add button!`
                        : `Jelajahi produk digital di ${STORE_NAME} dan klik tombol Tambah!`}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="vt-btn vt-btn-chrome px-4 py-2 text-xs font-bold cursor-pointer"
                      >
                        {isEn ? "Continue Browsing" : "Lanjut Belanja"}
                      </button>
                    </div>

                    <div className="pt-3 border-t border-border/60">
                      <p className="text-[11px] text-muted-foreground mb-1">
                        {isEn ? "Already placed an order?" : "Sudah pernah memesan?"}
                      </p>
                      {showTrackInput ? (
                        <div className="flex items-center justify-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="INV-DDMMYYYY-XXXX"
                            value={trackInvoiceInput}
                            onChange={(e) => setTrackInvoiceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleTrackSubmit();
                              }
                            }}
                            autoFocus
                            className="px-2.5 py-1.5 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs font-mono font-bold text-xs uppercase w-44 focus:outline-none focus:border-[var(--vt-cyan)]"
                          />
                          <button
                            type="button"
                            onClick={handleTrackSubmit}
                            className="vt-btn vt-btn-pink px-3 py-1.5 text-xs font-bold font-mono text-white cursor-pointer shadow-xs"
                          >
                            {isEn ? "Track" : "Lacak"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowTrackInput(false)}
                            className="vt-btn vt-btn-chrome px-2 py-1.5 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowTrackInput(true)}
                          className="text-[11px] font-bold text-[var(--vt-cyan)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="h-3 w-3" />
                          <span>{isEn ? "Track existing invoice here" : "Lacak status invoice Anda di sini"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1 vt-scrollbar">
                      {items.map(({ product, quantity }) => {
                        const title = isEn && product.titleEn ? product.titleEn : product.title;
                        const subtotal = (product.priceAmount || 0) * quantity;
                        const priceText = product.priceAmount
                          ? isEn
                            ? formatUsd(subtotal)
                            : formatIdr(subtotal)
                          : isEn
                          ? product.priceLabelEn || product.priceFormatted
                          : product.priceFormatted;

                        return (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 p-2.5 rounded-xs vt-card-inset bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)]"
                          >
                            <div className="h-12 w-12 rounded-xs overflow-hidden bg-muted border border-border shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={product.thumbnailUrl}
                                alt={title}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate text-[var(--vt-ink)]">{title}</p>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                {priceText}
                              </p>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, quantity - 1)}
                                className="vt-btn vt-btn-chrome h-6 w-6 p-0 flex items-center justify-center cursor-pointer"
                                aria-label="Kurangi jumlah"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-xs">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, quantity + 1)}
                                className="vt-btn vt-btn-chrome h-6 w-6 p-0 flex items-center justify-center cursor-pointer"
                                aria-label="Tambah jumlah"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => removeItem(product.id)}
                              className="text-red-500 hover:text-red-600 p-1 rounded-xs transition-colors cursor-pointer"
                              aria-label="Hapus item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary & Checkout Button */}
                    <div className="pt-3 border-t border-border space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold">{isEn ? "Total Amount:" : "Total Estimasi:"}</span>
                        <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-pixel">
                          {totalAmount > 0
                            ? isEn
                              ? formatUsd(totalAmount)
                              : formatIdr(totalAmount)
                            : isEn
                            ? "Custom Quote"
                            : "Sesuai Penawaran"}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={clearCart}
                          className="vt-btn vt-btn-chrome px-3 py-2 text-xs font-bold cursor-pointer"
                        >
                          {isEn ? "Clear" : "Kosongkan"}
                        </button>
                        <button
                          type="button"
                          onClick={handleProceedCheckout}
                          className="vt-btn vt-btn-pink flex-1 py-2.5 px-4 text-xs font-bold font-mono text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:brightness-110"
                        >
                          <span>{isEn ? "PROCEED TO CHECKOUT" : "LANJUT KE PEMBAYARAN"}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="pt-1 text-center">
                        {showTrackInput ? (
                          <div className="flex items-center justify-center gap-1.5 pt-1">
                            <input
                              type="text"
                              placeholder="INV-DDMMYYYY-XXXX"
                              value={trackInvoiceInput}
                              onChange={(e) => setTrackInvoiceInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleTrackSubmit();
                                }
                              }}
                              autoFocus
                              className="px-2.5 py-1.5 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs font-mono font-bold text-xs uppercase w-44 focus:outline-none focus:border-[var(--vt-cyan)]"
                            />
                            <button
                              type="button"
                              onClick={handleTrackSubmit}
                              className="vt-btn vt-btn-pink px-3 py-1.5 text-xs font-bold font-mono text-white cursor-pointer shadow-xs"
                            >
                              {isEn ? "Track" : "Lacak"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowTrackInput(false)}
                              className="vt-btn vt-btn-chrome px-2 py-1.5 text-xs font-bold cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowTrackInput(true)}
                            className="text-[11px] text-muted-foreground hover:text-[var(--vt-cyan)] transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Receipt className="h-3 w-3" />
                            <span>{isEn ? "Have an existing invoice? Track status" : "Punya invoice sebelumnya? Lacak status"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 2: CHECKOUT FORM & PAYMENT METHODS */}
            {step === "checkout" && (
              <form onSubmit={handleSubmitOrder} className="space-y-4 font-mono text-xs">
                <div className="p-3 bg-muted/40 rounded-xs border border-border flex justify-between items-center text-xs">
                  <span className="font-bold">
                    {isEn ? `${totalCount} item(s) in order` : `${totalCount} item dalam pesanan`}
                  </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-pixel">
                    {totalAmount > 0
                      ? isEn
                        ? formatUsd(totalAmount)
                        : formatIdr(totalAmount)
                      : isEn
                      ? "Custom Quote"
                      : "Sesuai Penawaran"}
                  </span>
                </div>

                {/* Pilihan jalur pembelian */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="block text-[11px] font-bold">
                    {isEn ? "How would you like to complete your purchase?" : "Bagaimana cara menyelesaikan pembelian Anda?"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChannel("whatsapp")}
                      className={`p-2.5 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        channel === "whatsapp"
                          ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                          : "bg-[var(--vt-card)] border-border hover:bg-muted text-[var(--vt-ink)]"
                      }`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-[11px] font-bold">
                        {isEn ? "Direct Order via WhatsApp" : "Pesan via WhatsApp Admin"}
                      </span>
                      <span className="text-[9px] opacity-80">
                        {isEn ? "Recorded in database, pay QRIS/Bank/PayPal" : "Tercatat di sistem, bayar QRIS / Bank / Transfer"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel("external")}
                      disabled={!hasExternal}
                      className={`p-2.5 rounded-xs border text-center transition-all flex flex-col items-center gap-1 ${
                        channel === "external"
                          ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                          : "bg-[var(--vt-card)] border-border hover:bg-muted text-[var(--vt-ink)]"
                      } ${hasExternal ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-[11px] font-bold">
                        {isEn ? "Buy on Partner Stores" : "Beli di Toko Online Partner"}
                      </span>
                      <span className="text-[9px] opacity-80">
                        {hasExternal
                          ? isEn
                            ? "Complete checkout on partner platform"
                            : "Selesaikan checkout di platform partner"
                          : isEn
                          ? "No store link available"
                          : "Item ini tidak punya link eksternal"}
                      </span>
                    </button>
                  </div>
                </div>

                {channel === "whatsapp" && (
                  <>
                    {/* Customer Inputs (Auto-Fill Supported) */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold mb-1">
                            {isEn ? "Full Name *" : "Nama Lengkap *"}
                          </label>
                          <input
                            type="text"
                            required
                            value={customer.name}
                            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                            placeholder={isEn ? "Your full name" : "Nama lengkap Anda"}
                            className="w-full p-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold mb-1">
                            {isEn ? "WhatsApp / Phone No. *" : "No. WhatsApp / HP *"}
                          </label>
                          <input
                            type="tel"
                            required
                            value={customer.phone}
                            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                            placeholder="08xxxxxxxxxx / +62..."
                            className="w-full p-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold mb-1 flex items-center justify-between">
                            <span>{isEn ? "Email Address" : "Alamat Email"}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {isEn ? "Recommended" : "Rekomendasi"}
                            </span>
                          </label>
                          <input
                            type="email"
                            value={customer.email || ""}
                            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                            placeholder="nama@domain.com"
                            className="w-full p-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold mb-1">
                            {isEn ? "Additional Notes (Optional)" : "Catatan Tambahan (Opsional)"}
                          </label>
                          <input
                            type="text"
                            value={customer.notes || ""}
                            onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                            placeholder={isEn ? "Project details or license requests" : "Catatan khusus atau spesifikasi lisensi"}
                            className="w-full p-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <label className="block text-[11px] font-bold">
                        {isEn ? "Select Payment Method:" : "Pilih Metode Pembayaran:"}
                      </label>
                      <div className={`grid ${[isQrisEnabled, isBankEnabled, isPaypalEnabled, isWaDirectEnabled].filter(Boolean).length <= 2 ? "grid-cols-2" : [isQrisEnabled, isBankEnabled, isPaypalEnabled, isWaDirectEnabled].filter(Boolean).length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"} gap-2`}>
                        {isQrisEnabled && (
                          <button
                            type="button"
                            onClick={() => setCustomer({ ...customer, paymentMethod: "qris" })}
                            className={`p-2 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              customer.paymentMethod === "qris"
                                ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                                : "bg-[var(--vt-card)] border-border hover:bg-muted text-[var(--vt-ink)]"
                            }`}
                          >
                            <QrCode className="h-4 w-4" />
                            <span className="text-[10px]">QRIS</span>
                          </button>
                        )}

                        {isBankEnabled && (
                          <button
                            type="button"
                            onClick={() => setCustomer({ ...customer, paymentMethod: "bank" })}
                            className={`p-2 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              customer.paymentMethod === "bank"
                                ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                                : "bg-[var(--vt-card)] border-border hover:bg-muted text-[var(--vt-ink)]"
                            }`}
                          >
                            <Building2 className="h-4 w-4" />
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]">{isEn ? "Bank Transfer" : "Transfer Bank"}</span>
                              {bankAccounts.length > 0 && (
                                <span
                                  className={`text-[9px] px-1 rounded-xs font-mono font-bold ${
                                    customer.paymentMethod === "bank"
                                      ? "bg-white/20 text-white"
                                      : "bg-primary/10 text-primary"
                                  }`}
                                >
                                  {bankAccounts.length}
                                </span>
                              )}
                            </div>
                          </button>
                        )}

                        {isPaypalEnabled && (
                          <button
                            type="button"
                            onClick={() => setCustomer({ ...customer, paymentMethod: "paypal" })}
                            className={`p-2 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              customer.paymentMethod === "paypal"
                                ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                                : "bg-[var(--vt-card)] border-border hover:bg-muted text-[var(--vt-ink)]"
                            }`}
                          >
                            <Globe className="h-4 w-4" />
                            <span className="text-[10px]">PayPal / Wise</span>
                          </button>
                        )}

                        {isWaDirectEnabled && (
                          <button
                            type="button"
                            onClick={() => setCustomer({ ...customer, paymentMethod: "wa_direct" })}
                            className={`p-2 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              customer.paymentMethod === "wa_direct"
                                ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                                : "bg-[var(--vt-card)] border-border hover:bg-muted text-[var(--vt-ink)]"
                            }`}
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-[10px]">{isEn ? "WhatsApp Direct" : "Chat WhatsApp"}</span>
                          </button>
                        )}
                      </div>

                      {/* QRIS Display with Zoom & Download Buttons */}
                      {customer.paymentMethod === "qris" && (
                        <div className="p-3 bg-[var(--vt-card)] border border-border rounded-xs text-center space-y-2.5 animate-in fade-in">
                          <p className="text-[11px] font-bold">
                            {isEn ? "Scan QRIS Barcode to Pay:" : "Scan Barcode QRIS untuk Pembayaran:"}
                          </p>

                          {currentQris ? (
                            <div className="space-y-2">
                              <div
                                className="max-w-[190px] mx-auto p-2 bg-white rounded border border-border relative group cursor-pointer"
                                onClick={() => setQrisZoomOpen(true)}
                                title={isEn ? "Click to enlarge" : "Klik untuk memperbesar"}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={currentQris}
                                  alt="QRIS Barcode"
                                  className="w-full h-auto object-contain mx-auto"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1 rounded">
                                  <Maximize2 className="h-4 w-4" />
                                  <span>{isEn ? "Zoom" : "Perbesar"}</span>
                                </div>
                              </div>

                              {/* Tombol Perbesar & Unduh QRIS */}
                              <div className="flex items-center justify-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setQrisZoomOpen(true)}
                                  className="vt-btn vt-btn-chrome px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Maximize2 className="h-3 w-3" />
                                  <span>{isEn ? "Enlarge QRIS" : "Perbesar QRIS"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDownloadQris}
                                  className="vt-btn vt-btn-pink px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-sm hover:brightness-110"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>{isEn ? "Download QRIS" : "Unduh QRIS"}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-muted/60 text-muted-foreground text-[11px]">
                              {isEn
                                ? "The QRIS barcode will be sent directly by admin via WhatsApp chat."
                                : "Barcode QRIS akan dikirimkan langsung oleh admin melalui chat WhatsApp."}
                            </div>
                          )}

                          {bankAccounts.length > 0 && (
                            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                {isEn ? "Prefer manual bank transfer?" : "Ingin transfer manual ke rekening bank?"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCustomer({ ...customer, paymentMethod: "bank" })}
                                className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <span>
                                  {isEn
                                    ? `View Bank Accounts (${bankAccounts.length})`
                                    : `Lihat Rekening Bank (${bankAccounts.length})`}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}

                          <p className="text-[10px] text-muted-foreground">
                            {isEn
                              ? "After scanning, submit the order below to transmit invoice & confirmation to WhatsApp."
                              : "Setelah scan/transfer, tekan tombol di bawah untuk meneruskan invoice resmi ke WhatsApp admin."}
                          </p>
                        </div>
                      )}

                      {/* Bank Info Display with Copy Buttons */}
                      {customer.paymentMethod === "bank" && (
                        <div className="p-3 bg-[var(--vt-card)] border border-border rounded-xs space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5 text-primary" />
                              <span>{isEn ? "Destination Bank Accounts:" : "Nomor Rekening Tujuan Transfer:"}</span>
                            </p>
                            {bankAccounts.length > 0 && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {bankAccounts.length} {isEn ? "accounts" : "rekening"}
                              </span>
                            )}
                          </div>

                          {bankAccounts.length > 0 ? (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 vt-scrollbar">
                              {bankAccounts.map((acc) => (
                                <div
                                  key={acc.id}
                                  className="p-2.5 bg-muted/60 rounded border border-border flex items-center justify-between gap-2 hover:bg-muted/80 transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-[11px] text-primary px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20 uppercase tracking-wide">
                                        {acc.bankName}
                                      </span>
                                      {acc.accountHolder && (
                                        <span className="text-[10px] text-muted-foreground truncate">
                                          a.n. <strong className="text-foreground">{acc.accountHolder}</strong>
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-mono font-extrabold text-sm sm:text-base tracking-wider text-foreground mt-1 select-all">
                                      {acc.accountNumber}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyBank(acc.accountNumber, acc.bankName, acc.id)}
                                    className={`vt-btn px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-colors ${
                                      copiedBankId === acc.id
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "vt-btn-chrome hover:bg-muted"
                                    }`}
                                  >
                                    {copiedBankId === acc.id ? (
                                      <>
                                        <Check className="h-3.5 w-3.5" />
                                        <span>{isEn ? "Copied!" : "Tersalin!"}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>{isEn ? "Copy" : "Salin No. Rekening"}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 bg-muted/60 rounded border border-border text-xs text-muted-foreground text-center">
                              {isEn
                                ? "Bank account information will be shared directly by admin via WhatsApp chat."
                                : "Informasi nomor rekening akan dikirimkan langsung oleh admin melalui chat WhatsApp."}
                            </div>
                          )}

                          <p className="text-[10px] text-muted-foreground">
                            {isEn
                              ? "Please transfer to one of the accounts above, then submit below to send invoice to WhatsApp."
                              : "Silakan transfer ke salah satu rekening di atas, lalu tekan tombol di bawah untuk meneruskan invoice resmi ke WhatsApp admin."}
                          </p>
                        </div>
                      )}

                      {/* International Payment Display */}
                      {customer.paymentMethod === "paypal" && (
                        <div className="p-3 bg-[var(--vt-card)] border border-border rounded-xs space-y-2 animate-in fade-in">
                          <p className="text-[11px] font-bold flex items-center gap-1.5 text-primary">
                            <Globe className="h-3.5 w-3.5" />
                            <span>International Payment (PayPal / Wise):</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {storeConfig?.internationalPayment?.instructionsEn ||
                              "Please complete checkout below to receive our international PayPal / Wise payment details via WhatsApp chat."}
                          </p>
                          {storeConfig?.internationalPayment?.paypalUrl && (
                            <a
                              href={storeConfig.internationalPayment.paypalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="vt-btn vt-btn-chrome px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
                            >
                              <span>Open PayPal Payment Link</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Jalur toko online eksternal */}
                {channel === "external" && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-[11px] text-muted-foreground">
                      {isEn
                        ? "Complete checkout on each product's platform. The cart total is a summary only."
                        : "Selesaikan checkout di platform masing-masing produk. Total keranjang hanya ringkasan."}
                    </p>
                    {items.map(({ product, quantity }) => {
                      const title = isEn && product.titleEn ? product.titleEn : product.title;
                      const url = isExternalStoreUrl(product.ctaUrl) ? product.ctaUrl : null;
                      const label = platformLabelFromUrl(url);
                      return (
                        <div
                          key={product.id}
                          className="flex items-center gap-2 p-2.5 rounded-xs vt-card-inset bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)]"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate text-[var(--vt-ink)]">{title}</p>
                            <p className="text-[10px] text-muted-foreground">x{quantity}</p>
                          </div>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="vt-btn vt-btn-pink px-3 py-2 text-[11px] font-bold font-mono text-white flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110 shrink-0"
                            >
                              <span>
                                {isEn ? "Buy on" : "Beli di"} {label ?? (isEn ? "Store" : "Toko")}
                              </span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {isEn ? "WhatsApp only" : "Hanya via WhatsApp"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-border flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("cart")}
                    disabled={isSubmitting}
                    className="vt-btn vt-btn-chrome px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    {isEn ? "Back" : "Kembali"}
                  </button>
                  {channel === "whatsapp" ? (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="vt-btn vt-btn-pink flex-1 py-2.5 px-4 text-xs font-bold font-mono text-white flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-110 disabled:opacity-50"
                    >
                      <Receipt className="h-4 w-4" />
                      <span>
                        {isSubmitting
                          ? isEn
                            ? "CREATING ORDER..."
                            : "MEMBUAT PESANAN..."
                          : isEn
                          ? "CONFIRM & GO TO INVOICE"
                          : "KONFIRMASI & LANJUT KE INVOICE"}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClose}
                      className="vt-btn vt-btn-chrome flex-1 py-2.5 px-4 text-xs font-bold cursor-pointer"
                    >
                      {isEn ? "Done" : "Selesai"}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* STEP 3: SUCCESS CONFIRMATION */}
            {step === "done" && (
              <div className="text-center py-6 space-y-4 font-mono text-xs animate-in zoom-in-95">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-pixel">
                    {isEn ? "ORDER CONFIRMED!" : "PESANAN BERHASIL DICATAT!"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    {isEn ? "Invoice " : "Invoice resmi "}
                    <span className="font-bold text-foreground font-mono">{lastInvoice}</span>
                    {isEn
                      ? " has been saved to database and forwarded to WhatsApp admin for direct verification."
                      : " telah tersimpan aman di database dan diteruskan ke WhatsApp admin untuk verifikasi pembayaran."}
                  </p>
                </div>

                {/* Tombol Lacak Pesanan Mandiri */}
                {lastInvoice && (
                  <div className="p-3 bg-muted/40 rounded border border-border max-w-sm mx-auto space-y-2">
                    <p className="text-[11px] font-bold text-foreground flex items-center justify-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 text-primary" />
                      <span>{isEn ? "Track Your Order Online:" : "Lacak Status Pesanan Anda:"}</span>
                    </p>
                    <Link
                      href={`/order/${lastInvoice}`}
                      onClick={handleClose}
                      className="vt-btn vt-btn-pink w-full py-2 px-3 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:brightness-110"
                    >
                      <span>{isEn ? "Open Order Tracking Page" : "Buka Halaman Pelacakan Pesanan"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="vt-btn vt-btn-chrome px-5 py-2 text-xs font-bold cursor-pointer"
                  >
                    {isEn ? "Done & Close" : "Selesai & Tutup"}
                  </button>
                </div>
              </div>
            )}
          </OSWindow>
        </div>
      </div>

      {/* LIGHTBOX MODAL: PERBESAR QRIS FULLSCREEN */}
      {qrisZoomOpen && currentQris && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setQrisZoomOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-white rounded-lg p-5 shadow-2xl space-y-4 animate-in zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold font-mono text-black">Barcode QRIS Resmi Toko</span>
              <button
                type="button"
                onClick={() => setQrisZoomOpen(false)}
                className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-black hover:bg-muted/80 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-2 bg-white rounded border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentQris}
                alt="QRIS Full Resolution"
                className="w-full h-auto object-contain mx-auto"
              />
            </div>

            <div className="flex items-center justify-center gap-2 pt-1 font-mono">
              <button
                type="button"
                onClick={handleDownloadQris}
                className="vt-btn vt-btn-pink px-4 py-2 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isEn ? "Download Barcode" : "Unduh Barcode (PNG)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setQrisZoomOpen(false)}
                className="vt-btn vt-btn-chrome px-4 py-2 text-xs font-bold cursor-pointer"
              >
                {isEn ? "Close" : "Tutup"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
