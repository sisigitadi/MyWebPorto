"use client";

import React, { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { useCart, formatIdr, buildWhatsAppOrderUrl, CustomerOrderInfo } from "@/lib/cart-context";
import { ProfileData } from "@/lib/dummy-data";
import { STORE_NAME, storeName, platformLabelFromUrl, isExternalStoreUrl } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import { playOS } from "@/lib/os-sound";
import { toast } from "sonner";

interface CartDialogProps {
  profile?: ProfileData;
}

export function CartDialog({ profile }: CartDialogProps) {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, clearCart, totalCount, totalAmount } = useCart();
  const { language } = useTranslation();
  const isEn = language === "en";
  // Minimal satu item punya link toko eksternal agar opsi "Beli di Toko Online" aktif
  const hasExternal = items.some(({ product }) => isExternalStoreUrl(product.ctaUrl));

  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  // Jalur penyelesaian pembelian yang dipilih pembeli di langkah checkout
  const [channel, setChannel] = useState<"whatsapp" | "external">("whatsapp");
  const [customer, setCustomer] = useState<CustomerOrderInfo>({
    name: "",
    phone: "",
    emailOrAddress: "",
    notes: "",
    paymentMethod: "qris",
  });
  const [lastInvoice, setLastInvoice] = useState("");

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Reset step setelah animasi tutup
    setTimeout(() => setStep("cart"), 300);
  }, [setIsOpen]);

  // Efek suara jendela: buka saat muncul
  useEffect(() => {
    if (isOpen) playOS("windowOpen");
  }, [isOpen]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleProceedCheckout = () => {
    if (items.length === 0) return;
    setStep("checkout");
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.name || !customer.phone) return;

    const inv = `INV-${Date.now().toString().slice(-6)}`;
    const waUrl = buildWhatsAppOrderUrl(profile?.phone, customer, items, totalAmount, inv);
    if (!waUrl) {
      toast.error(
        isEn
          ? "Admin WhatsApp number is not configured yet. Please use the contact window instead."
          : "Nomor WhatsApp admin belum dikonfigurasi. Silakan gunakan jendela kontak."
      );
      return;
    }
    setLastInvoice(inv);

    window.open(waUrl, "_blank", "noopener,noreferrer");

    playOS("success");
    setStep("done");
    clearCart();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col"
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
              ? `Total: ${formatIdr(totalAmount)} // Ready for checkout`
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
                  <button
                    type="button"
                    onClick={handleClose}
                    className="vt-btn vt-btn-chrome px-4 py-2 text-xs font-bold"
                  >
                    {isEn ? "Continue Browsing" : "Lanjut Belanja"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1 vt-scrollbar">
                    {items.map(({ product, quantity }) => {
                      const title = isEn && product.titleEn ? product.titleEn : product.title;
                      const subtotal = (product.priceAmount || 0) * quantity;
                      const priceText = product.priceAmount
                        ? formatIdr(subtotal)
                        : product.priceFormatted;

                      return (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 p-2.5 rounded-xs vt-card-inset bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.thumbnailUrl}
                            alt={title}
                            className="h-12 w-16 object-cover rounded-xs border border-border shrink-0 bg-muted"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate text-[var(--vt-ink)]">{title}</p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
                              {priceText}
                            </p>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              className="vt-btn vt-btn-chrome h-6 w-6 p-0 flex items-center justify-center cursor-pointer text-xs"
                              title="Kurangi"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="w-5 text-center font-extrabold text-xs">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              className="vt-btn vt-btn-chrome h-6 w-6 p-0 flex items-center justify-center cursor-pointer text-xs"
                              title="Tambah"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(product.id)}
                              className="h-6 w-6 p-0 ml-1.5 flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer"
                              title="Hapus dari keranjang"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary & Checkout Action */}
                  <div className="pt-3 border-t-2 border-border space-y-3">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>{isEn ? "Total Amount:" : "Total Pembayaran:"}</span>
                      <span className="text-base text-emerald-600 dark:text-emerald-400 font-pixel">
                        {totalAmount > 0 ? formatIdr(totalAmount) : isEn ? "As Offered" : "Sesuai Penawaran"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="vt-btn vt-btn-chrome px-3 py-2 text-xs font-bold cursor-pointer"
                        title={isEn ? "Close cart and return to the store" : "Tutup keranjang dan kembali ke toko"}
                      >
                        {isEn ? "Back to Store" : "Ke Toko"}
                      </button>
                      <button
                        type="button"
                        onClick={clearCart}
                        className="vt-btn vt-btn-chrome px-3 py-2 text-xs font-bold text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        {isEn ? "Empty" : "Kosongkan"}
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
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: CHECKOUT FORM & PAYMENT METHODS */}
          {step === "checkout" && (
            <form onSubmit={handleSubmitOrder} className="space-y-4 font-mono text-xs">
              <div className="p-3 bg-muted/40 rounded-xs border border-border flex justify-between items-center text-xs">
                <span className="font-bold">{isEn ? `${totalCount} item(s) in order` : `${totalCount} item dalam pesanan`}</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-pixel">
                  {totalAmount > 0 ? formatIdr(totalAmount) : isEn ? "As Offered" : "Sesuai Penawaran"}
                </span>
              </div>

              {/* Pilihan jalur pembelian — dibeli pembeli */}
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
                    <span className="text-[11px] font-bold">{isEn ? "Order via WhatsApp" : "Pesan via WhatsApp"}</span>
                    <span className="text-[9px] opacity-80">
                      {isEn ? "Pay QRIS/transfer, confirmed by admin" : "Bayar QRIS/transfer, dikonfirmasi admin"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel("external")}
                    disabled={!hasExternal}
                    title={hasExternal ? undefined : isEn ? "No store link available for these items" : "Tidak ada link toko untuk item ini"}
                    className={`p-2.5 rounded-xs border text-center transition-all flex flex-col items-center gap-1 ${
                      channel === "external"
                        ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                        : "bg-[var(--vt-card)] border-border hover:bg-muted text-[var(--vt-ink)]"
                    } ${hasExternal ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-[11px] font-bold">{isEn ? "Buy at Online Store" : "Beli di Toko Online"}</span>
                    <span className="text-[9px] opacity-80">
                      {hasExternal
                        ? isEn
                          ? "Checkout on the product's platform"
                          : "Checkout di platform produk"
                        : isEn
                        ? "No store link for these items"
                        : "Item ini tidak punya link toko"}
                    </span>
                  </button>
                </div>
              </div>

              {channel === "whatsapp" && (
              <>
              {/* Customer Inputs */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold mb-1">{isEn ? "Full Name *" : "Nama Lengkap *"}</label>
                  <input
                    type="text"
                    required
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder={isEn ? "Your name" : "Nama Anda"}
                    className="w-full p-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold mb-1">{isEn ? "WhatsApp / Phone No. *" : "No. WhatsApp / HP *"}</label>
                    <input
                      type="tel"
                      required
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full p-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">{isEn ? "Email / Shipping Address *" : "Email / Alamat Pengiriman *"}</label>
                    <input
                      type="text"
                      required
                      value={customer.emailOrAddress}
                      onChange={(e) => setCustomer({ ...customer, emailOrAddress: e.target.value })}
                      placeholder={isEn ? "name@email.com / Address" : "nama@email.com / Alamat"}
                      className="w-full p-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1">{isEn ? "Additional Notes (Optional)" : "Catatan Tambahan (Opsional)"}</label>
                  <input
                    type="text"
                    value={customer.notes || ""}
                    onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                    placeholder={isEn ? "Special request or delivery instructions" : "Request khusus atau instruksi pengiriman"}
                    className="w-full p-2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-xs text-xs outline-none"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="block text-[11px] font-bold">{isEn ? "Choose Payment Method:" : "Pilih Cara Pembayaran:"}</label>
                <div className="grid grid-cols-3 gap-2">
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
                    <span className="text-[10px]">{isEn ? "Bank Transfer" : "Transfer Bank"}</span>
                  </button>

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
                    <span className="text-[10px]">{isEn ? "WhatsApp Chat" : "Chat WhatsApp"}</span>
                  </button>
                </div>

                {/* QRIS Display */}
                {customer.paymentMethod === "qris" && (
                  <div className="p-3 bg-[var(--vt-card)] border border-border rounded-xs text-center space-y-2 animate-in fade-in">
                    <p className="text-[11px] font-bold">{isEn ? "Scan the QRIS barcode to pay:" : "Scan barcode QRIS untuk pembayaran:"}</p>
                    {profile?.paymentQrUrl ? (
                      <div className="max-w-[180px] mx-auto p-2 bg-white rounded border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={profile.paymentQrUrl}
                          alt="QRIS Barcode"
                          className="w-full h-auto object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-muted/60 text-muted-foreground text-[11px]">
                        {isEn
                          ? "The QRIS barcode will be sent directly by the admin via WhatsApp chat."
                          : "Barcode QRIS akan dikirimkan langsung oleh admin melalui chat WhatsApp."}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {isEn
                        ? "After scanning/transferring, click the button below to confirm & send proof."
                        : "Setelah scan/transfer, klik tombol di bawah untuk konfirmasi & kirim bukti."}
                    </p>
                  </div>
                )}

                {/* Bank Info Display */}
                {customer.paymentMethod === "bank" && (
                  <div className="p-3 bg-[var(--vt-card)] border border-border rounded-xs space-y-1.5 animate-in fade-in">
                    <p className="text-[11px] font-bold flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      <span>{isEn ? "Destination Bank Account:" : "Nomor Rekening Tujuan:"}</span>
                    </p>
                    {profile?.paymentBankInfo ? (
                      <div className="p-2.5 bg-muted/60 rounded border border-border whitespace-pre-line text-xs font-mono font-bold">
                        {profile.paymentBankInfo}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-muted/60 rounded border border-border text-xs text-muted-foreground">
                        {isEn
                          ? "Bank account details will be sent by the admin via WhatsApp chat."
                          : "Detail rekening akan dikirimkan oleh admin melalui chat WhatsApp."}
                      </div>
                    )}
                  </div>
                )}
              </div>

              </>
              )}

              {/* Jalur toko online: daftar tautan per produk, label mengikuti domain link */}
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
                  className="vt-btn vt-btn-chrome px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  {isEn ? "Back" : "Kembali"}
                </button>
                {channel === "whatsapp" ? (
                  <button
                    type="submit"
                    className="vt-btn vt-btn-pink flex-1 py-2.5 px-4 text-xs font-bold font-mono text-white flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-110"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{isEn ? "SEND ORDER VIA WHATSAPP" : "KIRIM PESANAN KE WHATSAPP"}</span>
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
            <div className="text-center py-8 space-y-3 font-mono text-xs animate-in zoom-in-95">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-bold font-pixel">{isEn ? "ORDER SENT!" : "PESANAN TERKIRIM!"}</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {isEn ? "Invoice " : "Invoice "}
                <span className="font-bold text-foreground">{lastInvoice}</span>
                {isEn
                  ? " has been forwarded to WhatsApp. The admin will verify shortly and deliver your digital product access."
                  : " telah diteruskan ke WhatsApp. Admin akan segera memverifikasi dan mengirimkan akses produk digital Anda."}
              </p>
              <div className="pt-3">
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
  );
}
