"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { ProductData } from "@/lib/dummy-data";
import { STORE_NAME } from "@/lib/store";
import { maxStockFor, isOutOfStock } from "@/lib/cart-stock";

export interface CartItem {
  product: ProductData;
  quantity: number;
}

export interface CustomerOrderInfo {
  name: string;
  phone: string;
  emailOrAddress: string;
  notes?: string;
  paymentMethod: "qris" | "bank" | "wa_direct";
}

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  // true bila item benar-benar masuk/ter-update; false bila produk habis —
  // pemanggil boleh menahan feedback "DITAMBAHKAN!" agar tidak menyesatkan.
  addItem: (product: ProductData, qty?: number) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "sigitos_cart_v1";

// Logika stok (maxStockFor / isOutOfStock) ada di @/lib/cart-stock — modul .ts
// murni agar bisa diuji langsung (vitest environment node tidak bisa parse JSX).

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load cart from localStorage after mount
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Shape-validate: payload lama/korup tanpa product.id membuat render crash
          setItems(
            parsed.filter(
              (it): it is CartItem =>
                it &&
                typeof it === "object" &&
                it.product &&
                typeof it.product.id === "string" &&
                // qty>=1: payload hasil bug qty-0 (produk habis) tidak boleh
                // dihidupkan kembali dari localStorage — baris zombie.
                typeof it.quantity === "number" &&
                it.quantity >= 1
            )
          );
        }
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage error
    }
  }, [items, mounted]);

  const addItem = useCallback((product: ProductData, qty = 1) => {
    // Produk habis ditolak di sini (bukan hanya di tombol UI) — pertahanan
    // bila produk di-disable lewat rute lain atau stok berubah setelah render.
    if (isOutOfStock(product)) return false;
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.product.id === product.id);
      const maxStock = maxStockFor(product);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + qty;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: Math.min(newQty, maxStock),
        };
        return updated;
      }
      return [...prev, { product, quantity: Math.min(qty, maxStock) }];
    });
    setIsOpen(true);
    return true;
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id === productId) {
          const maxStock = maxStockFor(i.product);
          return { ...i, quantity: Math.min(quantity, maxStock) };
        }
        return i;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const unitPrice = item.product.priceAmount || 0;
      return sum + unitPrice * item.quantity;
    }, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      isOpen,
      setIsOpen,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalCount,
      totalAmount,
    }),
    [items, isOpen, addItem, removeItem, updateQuantity, clearCart, totalCount, totalAmount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}

/**
 * Format currency IDR
 */
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Helper to generate pre-filled WhatsApp Checkout URL.
 * Mengembalikan string kosong bila nomor admin belum diatur — pemanggil
 * wajib menahan submit daripada mengirim order ke nomor placeholder.
 */
export function buildWhatsAppOrderUrl(
  phone: string | undefined,
  customer: CustomerOrderInfo,
  items: CartItem[],
  totalAmount: number,
  invoiceNo?: string
): string {
  if (!phone || !phone.trim()) return "";
  const cleanPhone = phone.replace(/\D/g, "");
  const inv = invoiceNo || `ORD-${Date.now().toString().slice(-6)}`;

  const paymentLabel =
    customer.paymentMethod === "qris"
      ? "QRIS (Scan Barcode)"
      : customer.paymentMethod === "bank"
      ? "Transfer Bank Manual"
      : "Konfirmasi via WhatsApp";

  const lines = [
    `*PESANAN BARU — ${STORE_NAME.toUpperCase()} [${inv}]*`,
    `Halo, saya ingin melakukan pemesanan produk:`,
    "",
    `*Daftar Produk:*`,
    ...items.map((item, idx) => {
      const priceStr = item.product.priceAmount
        ? formatIdr(item.product.priceAmount * item.quantity)
        : item.product.priceFormatted;
      return `${idx + 1}. *${item.product.title}* x${item.quantity} (${priceStr})`;
    }),
    "",
    totalAmount > 0 ? `*Total Pembayaran:* ${formatIdr(totalAmount)}` : `*Total:* Sesuai Penawaran`,
    `*Metode Pembayaran:* ${paymentLabel}`,
    "",
    `*Informasi Pemesan:*`,
    `• Nama: ${customer.name}`,
    `• No. WA / Telp: ${customer.phone}`,
    `• Alamat / Email: ${customer.emailOrAddress}`,
    customer.notes ? `• Catatan: ${customer.notes}` : "",
    "",
    `Mohon info instruksi selanjutnya. Terima kasih!`,
  ].filter(Boolean);

  const text = lines.join("\n");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Helper to generate instant single-product WhatsApp Order URL.
 * Mengembalikan string kosong bila nomor admin belum diatur.
 */
export function buildSingleProductWhatsAppUrl(
  phone: string | undefined,
  product: ProductData
): string {
  if (!phone || !phone.trim()) return "";
  const cleanPhone = phone.replace(/\D/g, "");
  const price = product.priceFormatted || "Gratis / Diskusi";
  const text = [
    `Halo, saya tertarik untuk memesan produk di ${STORE_NAME}:`,
    `*${product.title}* (${price})`,
    "",
    `Apakah produk ini masih tersedia? Mohon info detail pembayarannya. Terima kasih!`,
  ].join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
