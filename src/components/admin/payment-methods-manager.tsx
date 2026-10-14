"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  QrCode,
  Globe,
  MessageCircle,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Power,
  CreditCard,
  Check,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/admin/image-upload";
import {
  getStoreConfig,
  saveStoreConfig,
  type StoreConfig,
  type BankAccountItem,
} from "@/lib/order-actions";

const POPULAR_BANKS = [
  "BCA",
  "MANDIRI",
  "BRI",
  "BNI",
  "BSI",
  "BANK JAGO",
  "SEABANK",
  "CIMB NIAGA",
  "PERMATA",
  "BCA SYARIAH",
  "DANAMON",
  "BTPN / JENIUS",
  "OCBC NISP",
  "PANIN",
  "LAINNYA",
];

interface PaymentMethodsManagerProps {
  onSaved?: (cfg: StoreConfig) => void;
  className?: string;
  showCardWrapper?: boolean;
}

export function PaymentMethodsManager({
  onSaved,
  className = "",
  showCardWrapper = true,
}: PaymentMethodsManagerProps) {
  const [config, setConfig] = useState<StoreConfig>({
    adminWhatsapp: "",
    bankAccounts: [],
    qrisImageUrl: "",
    qrisMerchantName: "",
    paymentMethods: {
      qris: true,
      bank: true,
      paypal: true,
      wa_direct: true,
    },
    internationalPayment: {
      paypalUrl: "",
      wiseInfo: "",
      stripeUrl: "",
      instructionsEn: "Please send payment via PayPal or Wise to our account, then confirm via WhatsApp chat.",
    },
    storeNotice: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cfg = await getStoreConfig();
      if (cfg) {
        setConfig({
          adminWhatsapp: cfg.adminWhatsapp || "",
          bankAccounts: cfg.bankAccounts || [],
          qrisImageUrl: cfg.qrisImageUrl || "",
          qrisMerchantName: cfg.qrisMerchantName || "",
          paymentMethods: {
            qris: cfg.paymentMethods?.qris !== false,
            bank: cfg.paymentMethods?.bank !== false,
            paypal: cfg.paymentMethods?.paypal !== false,
            wa_direct: cfg.paymentMethods?.wa_direct !== false,
          },
          internationalPayment: {
            paypalUrl: cfg.internationalPayment?.paypalUrl || "",
            wiseInfo: cfg.internationalPayment?.wiseInfo || "",
            stripeUrl: cfg.internationalPayment?.stripeUrl || "",
            instructionsEn: cfg.internationalPayment?.instructionsEn || "",
          },
          storeNotice: cfg.storeNotice || "",
        });
      }
    } catch (err) {
      console.error("[payment-methods-manager] loadData failed:", err);
      toast.error("Gagal memuat pengaturan metode pembayaran.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler update rekening
  const handleAddBankAccount = () => {
    const newAcc: BankAccountItem = {
      id: `bank-${Date.now()}`,
      bankName: "BCA",
      accountNumber: "",
      accountHolder: "",
      notes: "",
      isActive: true,
    };
    setConfig((prev) => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAcc],
    }));
    setHasChanges(true);
  };

  const handleUpdateBankAccount = (
    id: string,
    field: keyof BankAccountItem,
    value: string | boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      ),
    }));
    setHasChanges(true);
  };

  const handleToggleBankAccount = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map((b) =>
        b.id === id ? { ...b, isActive: b.isActive === false } : b
      ),
    }));
    setHasChanges(true);
  };

  const handleRemoveBankAccount = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((b) => b.id !== id),
    }));
    setHasChanges(true);
  };

  // Handler toggle metode pembayaran
  const handleToggleMethod = (
    method: "qris" | "bank" | "paypal" | "wa_direct"
  ) => {
    setConfig((prev) => {
      const currentVal = prev.paymentMethods?.[method] !== false;
      return {
        ...prev,
        paymentMethods: {
          ...prev.paymentMethods,
          [method]: !currentVal,
        },
      };
    });
    setHasChanges(true);
  };

  // Simpan perubahan ke database dan sinkronisasi
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveStoreConfig(config);
      if (res.success) {
        toast.success(res.message || "Pengaturan berhasil disimpan dan langsung aktif di publik!");
        setHasChanges(false);
        if (onSaved) onSaved(config);
      } else {
        toast.error(res.error || "Gagal menyimpan pengaturan.");
      }
    } catch (err) {
      console.error("[payment-methods-manager] save failed:", err);
      toast.error("Terjadi kesalahan saat menyimpan pengaturan ke server.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Nomor rekening disalin!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeBankCount = config.bankAccounts.filter((b) => b.isActive !== false).length;

  const content = (
    <div className={`space-y-6 ${className}`}>
      {/* Status Bar Ringkas */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-md border border-border">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">Status Publik:</span>
          <Badge
            variant={config.paymentMethods?.bank !== false && activeBankCount > 0 ? "default" : "secondary"}
            className="text-[10px] font-mono gap-1"
          >
            <Building2 className="h-3 w-3" />
            {config.paymentMethods?.bank !== false ? `${activeBankCount} Rekening Aktif` : "Transfer Bank Nonaktif"}
          </Badge>
          <Badge
            variant={config.paymentMethods?.qris !== false && Boolean(config.qrisImageUrl) ? "default" : "secondary"}
            className="text-[10px] font-mono gap-1"
          >
            <QrCode className="h-3 w-3" />
            {config.paymentMethods?.qris !== false ? (config.qrisImageUrl ? "QRIS Siap" : "QRIS Belum Ada Gambar") : "QRIS Nonaktif"}
          </Badge>
          <Badge
            variant={config.paymentMethods?.paypal !== false ? "default" : "secondary"}
            className="text-[10px] font-mono gap-1"
          >
            <Globe className="h-3 w-3" />
            {config.paymentMethods?.paypal !== false ? "PayPal Aktif" : "PayPal Nonaktif"}
          </Badge>
          <Badge
            variant={config.paymentMethods?.wa_direct !== false ? "default" : "secondary"}
            className="text-[10px] font-mono gap-1"
          >
            <MessageCircle className="h-3 w-3" />
            {config.paymentMethods?.wa_direct !== false ? "WA Direct Aktif" : "WA Direct Nonaktif"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium animate-pulse flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Perubahan belum disimpan
            </span>
          )}
          <Button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || isLoading}
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>Simpan Perubahan</span>
          </Button>
        </div>
      </div>

      {/* 1. SEKSI METODE TRANSFER BANK (MULTI REKENING) */}
      <div className="p-4 rounded-md border border-border bg-[var(--vt-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>1. Transfer Bank Multi-Rekening</span>
                <Badge
                  variant={config.paymentMethods?.bank !== false ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {config.paymentMethods?.bank !== false ? "Aktif di Publik" : "Dinonaktifkan"}
                </Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Setiap rekening memiliki input terpisah dan bisa diaktifkan/dinonaktifkan secara independen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={config.paymentMethods?.bank !== false ? "outline" : "default"}
              size="sm"
              onClick={() => handleToggleMethod("bank")}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Power className="h-3.5 w-3.5" />
              <span>
                {config.paymentMethods?.bank !== false ? "Nonaktifkan Transfer Bank" : "Aktifkan Transfer Bank"}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBankAccount}
              className="h-8 text-xs gap-1 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Rekening Baru</span>
            </Button>
          </div>
        </div>

        {/* Daftar Kartu Rekening */}
        {config.bankAccounts.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
            <p>Belum ada rekening bank yang ditambahkan.</p>
            <Button
              type="button"
              variant="link"
              onClick={handleAddBankAccount}
              className="text-xs text-primary gap-1 mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Klik di sini untuk menambahkan rekening bank pertama Anda</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {config.bankAccounts.map((acc, index) => {
              const isAccActive = acc.isActive !== false;
              const isCustomBank = !POPULAR_BANKS.includes(acc.bankName.toUpperCase()) && acc.bankName !== "";

              return (
                <div
                  key={acc.id}
                  className={`p-3.5 rounded-md border transition-all ${
                    isAccActive
                      ? "bg-muted/30 border-border shadow-xs"
                      : "bg-muted/10 border-dashed border-muted-foreground/30 opacity-75"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-bold text-xs uppercase text-foreground">
                        {acc.bankName || "BANK BARU"}
                      </span>
                      <Badge
                        variant={isAccActive ? "default" : "secondary"}
                        className={`text-[10px] ${
                          isAccActive
                            ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                            : "bg-neutral-500/20 text-muted-foreground"
                        }`}
                      >
                        {isAccActive ? "✓ Aktif (Tampil di Publik)" : "✕ Nonaktif (Disembunyikan)"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {acc.accountNumber && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(acc.accountNumber, acc.id)}
                          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Salin Nomor Rekening"
                        >
                          {copiedId === acc.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedId === acc.id ? "Tersalin" : "Salin"}</span>
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant={isAccActive ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggleBankAccount(acc.id)}
                        className="h-7 px-2.5 text-[11px] gap-1 cursor-pointer"
                      >
                        <Power className="h-3 w-3" />
                        <span>{isAccActive ? "Nonaktifkan" : "Aktifkan"}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBankAccount(acc.id)}
                        className="h-7 px-2 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        title="Hapus Rekening Ini"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only">Hapus</span>
                      </Button>
                    </div>
                  </div>

                  {/* Input Form Fields Terpisah */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. Nama Bank */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-foreground">
                        Pilih Bank *
                      </Label>
                      <select
                        value={isCustomBank ? "LAINNYA" : acc.bankName.toUpperCase()}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateBankAccount(
                            acc.id,
                            "bankName",
                            val === "LAINNYA" ? "" : val
                          );
                        }}
                        className="flex h-8 w-full rounded-md border border-input bg-[var(--vt-paper)] px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {POPULAR_BANKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      {(!POPULAR_BANKS.includes(acc.bankName.toUpperCase()) || acc.bankName === "") && (
                        <Input
                          placeholder="Ketik nama bank (mis: BANK DKI)"
                          value={acc.bankName}
                          onChange={(e) =>
                            handleUpdateBankAccount(acc.id, "bankName", e.target.value.toUpperCase())
                          }
                          className="h-8 text-xs font-bold uppercase mt-1 bg-[var(--vt-paper)]"
                        />
                      )}
                    </div>

                    {/* 2. Nomor Rekening */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-foreground">
                        Nomor Rekening *
                      </Label>
                      <Input
                        placeholder="Contoh: 1234567890"
                        value={acc.accountNumber}
                        onChange={(e) =>
                          handleUpdateBankAccount(acc.id, "accountNumber", e.target.value)
                        }
                        className="h-8 text-xs font-mono font-semibold bg-[var(--vt-paper)]"
                      />
                    </div>

                    {/* 3. Atas Nama (a.n.) */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-foreground">
                        Atas Nama Pemilik (a.n.) *
                      </Label>
                      <Input
                        placeholder="Nama pemilik rekening"
                        value={acc.accountHolder}
                        onChange={(e) =>
                          handleUpdateBankAccount(acc.id, "accountHolder", e.target.value)
                        }
                        className="h-8 text-xs bg-[var(--vt-paper)]"
                      />
                    </div>

                    {/* 4. Catatan Rekening (Opsional) */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">
                        Catatan / Keterangan (Opsional)
                      </Label>
                      <Input
                        placeholder="Misal: Utama / Bebas BI-FAST"
                        value={acc.notes || ""}
                        onChange={(e) =>
                          handleUpdateBankAccount(acc.id, "notes", e.target.value)
                        }
                        className="h-8 text-xs bg-[var(--vt-paper)]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. SEKSI METODE PEMBAYARAN QRIS */}
      <div className="p-4 rounded-md border border-border bg-[var(--vt-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>2. QRIS (Quick Response Code Indonesian Standard)</span>
                <Badge
                  variant={config.paymentMethods?.qris !== false ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {config.paymentMethods?.qris !== false ? "Aktif di Publik" : "Dinonaktifkan"}
                </Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Pembayaran instan melalui GoPay, OVO, Dana, ShopeePay, LinkAja, BCA Mobile, dan seluruh aplikasi m-banking.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant={config.paymentMethods?.qris !== false ? "outline" : "default"}
            size="sm"
            onClick={() => handleToggleMethod("qris")}
            className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
          >
            <Power className="h-3.5 w-3.5" />
            <span>
              {config.paymentMethods?.qris !== false ? "Nonaktifkan QRIS" : "Aktifkan QRIS"}
            </span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground block">
              Unggah Gambar Barcode QRIS Resmi
            </Label>
            <div className="max-w-xs">
              <ImageUpload
                value={config.qrisImageUrl}
                onChange={(url) => {
                  setConfig((prev) => ({ ...prev, qrisImageUrl: url }));
                  setHasChanges(true);
                }}
                label="Unggah Barcode QRIS"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Format yang disarankan: PNG/JPG persegi resolusi tajam agar mudah dipindai kamera ponsel.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="qrisMerchant" className="text-xs font-medium text-foreground">
                Nama Merchant / NMID QRIS (Opsional)
              </Label>
              <Input
                id="qrisMerchant"
                placeholder="Contoh: SIGIT ADI STORE / NMID: ID1020..."
                value={config.qrisMerchantName || ""}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, qrisMerchantName: e.target.value }));
                  setHasChanges(true);
                }}
                className="h-8 text-xs bg-[var(--vt-paper)] font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Ditampilkan di modal checkout untuk membantu pembeli memastikan nama penerima transfer sudah sesuai.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEKSI METODE PEMBAYARAN PAYPAL / INTERNASIONAL */}
      <div className="p-4 rounded-md border border-border bg-[var(--vt-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>3. PayPal, Wise &amp; Pembayaran Internasional</span>
                <Badge
                  variant={config.paymentMethods?.paypal !== false ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {config.paymentMethods?.paypal !== false ? "Aktif di Publik" : "Dinonaktifkan"}
                </Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Khusus untuk pembeli mancanegara (USD / mata uang asing).
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant={config.paymentMethods?.paypal !== false ? "outline" : "default"}
            size="sm"
            onClick={() => handleToggleMethod("paypal")}
            className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
          >
            <Power className="h-3.5 w-3.5" />
            <span>
              {config.paymentMethods?.paypal !== false ? "Nonaktifkan PayPal" : "Aktifkan PayPal"}
            </span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="paypalUrl" className="text-xs font-medium text-foreground">
              Tautan PayPal.me
            </Label>
            <Input
              id="paypalUrl"
              placeholder="https://paypal.me/username..."
              value={config.internationalPayment?.paypalUrl || ""}
              onChange={(e) => {
                setConfig((prev) => ({
                  ...prev,
                  internationalPayment: {
                    ...prev.internationalPayment,
                    paypalUrl: e.target.value,
                  },
                }));
                setHasChanges(true);
              }}
              className="h-8 text-xs bg-[var(--vt-paper)] font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wiseInfo" className="text-xs font-medium text-foreground">
              Informasi Rekening Wise / Transfer Global
            </Label>
            <Input
              id="wiseInfo"
              placeholder="Contoh: wise@sigitadi.id / IBAN / Account Number"
              value={config.internationalPayment?.wiseInfo || ""}
              onChange={(e) => {
                setConfig((prev) => ({
                  ...prev,
                  internationalPayment: {
                    ...prev.internationalPayment,
                    wiseInfo: e.target.value,
                  },
                }));
                setHasChanges(true);
              }}
              className="h-8 text-xs bg-[var(--vt-paper)] font-mono"
            />
          </div>
        </div>
      </div>

      {/* 4. SEKSI METODE CHAT WHATSAPP LANGSUNG & ADMIN KHUSUS */}
      <div className="p-4 rounded-md border border-border bg-[var(--vt-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>4. Chat WhatsApp Langsung / Konfirmasi Manual</span>
                <Badge
                  variant={config.paymentMethods?.wa_direct !== false ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {config.paymentMethods?.wa_direct !== false ? "Aktif di Publik" : "Dinonaktifkan"}
                </Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Nomor WhatsApp admin yang menerima seluruh format pemesanan dan bukti pembayaran transaksi toko.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant={config.paymentMethods?.wa_direct !== false ? "outline" : "default"}
            size="sm"
            onClick={() => handleToggleMethod("wa_direct")}
            className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
          >
            <Power className="h-3.5 w-3.5" />
            <span>
              {config.paymentMethods?.wa_direct !== false ? "Nonaktifkan WA Direct" : "Aktifkan WA Direct"}
            </span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="adminWhatsapp" className="text-xs font-medium text-foreground">
              Nomor WhatsApp Admin Toko Terpusat *
            </Label>
            <Input
              id="adminWhatsapp"
              required
              placeholder="6281234567890 (format angka tanpa + atau spasi)"
              value={config.adminWhatsapp}
              onChange={(e) => {
                setConfig((prev) => ({ ...prev, adminWhatsapp: e.target.value }));
                setHasChanges(true);
              }}
              className="h-8 text-xs bg-[var(--vt-paper)] font-mono font-semibold"
            />
            <p className="text-[10px] text-muted-foreground">
              Semua link checkout WhatsApp akan mengarah ke nomor ini secara otomatis.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="storeNotice" className="text-xs font-medium text-foreground">
              Pengumuman / Catatan Transaksi Toko (Opsional)
            </Label>
            <Input
              id="storeNotice"
              placeholder="Contoh: Pesanan diproses otomatis maksimal 1x24 jam."
              value={config.storeNotice || ""}
              onChange={(e) => {
                setConfig((prev) => ({ ...prev, storeNotice: e.target.value }));
                setHasChanges(true);
              }}
              className="h-8 text-xs bg-[var(--vt-paper)]"
            />
          </div>
        </div>
      </div>

      {/* Tombol Simpan Utama Bawah */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Setelah menekan <strong>Simpan Perubahan</strong>, data rekening dan metode pembayaran akan langsung berubah secara realtime pada halaman publik, modal checkout, dan chatbot AI.
        </p>

        <Button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving || isLoading}
          size="sm"
          className="h-9 px-5 text-xs font-bold gap-1.5 w-full sm:w-auto cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>Simpan Pengaturan Pembayaran &amp; Rekening</span>
        </Button>
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <Card className="p-4 sm:p-5 bg-[var(--vt-card)] border-[var(--vt-edge-lo-2)] shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">
          Pengaturan Metode Pembayaran &amp; Rekening Resmi
        </h2>
      </div>
      {content}
    </Card>
  );
}
