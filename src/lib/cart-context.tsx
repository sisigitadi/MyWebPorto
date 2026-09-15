"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { ProductData } from "@/lib/dummy-data";
import { maxStockFor, isOutOfStock } from "@/lib/cart-stock";
import type { CustomerOrderInfo } from "@/lib/whatsapp-order";

export interface CartItem {
  product: ProductData;
  quantity: number;
}

// CustomerOrderInfo dan builder pesan WhatsApp kini hidup di
// @/lib/whatsapp-order — modul .ts murni agar bisa diuji langsung dengan
// vitest (lingkungan node tidak bisa parse JSX). Re-export di sini agar
// pemanggil lama (import { buildWhatsAppOrderUrl } from "@/lib/cart-context")
// tetap kompatibel.
export type { CustomerOrderInfo };

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

export { formatIdr, buildWhatsAppOrderUrl, buildSingleProductWhatsAppUrl } from "@/lib/whatsapp-order";
