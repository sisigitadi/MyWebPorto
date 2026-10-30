"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Copy,
  Check,
  Trash2,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  User,
  Phone,
  Sparkles,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getCustomers,
  getStoreConfig,
  StoreConfig,
} from "@/lib/order-actions";
import {
  formatIdr,
  formatUsd,
  normalizeWhatsAppPhone,
  buildFollowUpPaymentUrl,
  buildFollowUpVerifiedUrl,
  buildFollowUpDeliveryUrl,
  buildFollowUpFreelanceOpsUrl,
  buildFollowUpCompletionUrl,
} from "@/lib/whatsapp-order";
import type { Order, Customer } from "@/db/schema";

export type OrderStatusType = "pending" | "paid" | "processing" | "completed" | "cancelled";

const STATUS_CONFIG: Record<
  OrderStatusType,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "Menunggu",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  paid: {
    label: "Dibayar",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: CreditCard,
  },
  processing: {
    label: "Diproses",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    icon: Truck,
  },
  completed: {
    label: "Selesai",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Dibatalkan",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    icon: XCircle,
  },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  qris: "QRIS Barcode",
  bank: "Transfer Bank",
  wa_direct: "WhatsApp Direct",
  paypal: "PayPal",
  wise: "Wise",
  freelanceops: "FreelanceOps Jasa",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters & Search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Edit State in Modal
  const [editStatus, setEditStatus] = useState<OrderStatusType>("pending");
  const [editAdminNotes, setEditAdminNotes] = useState("");
  const [editProjectUrl, setEditProjectUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Copy helper state
  const [copiedInvoice, setCopiedInvoice] = useState<string | null>(null);

  // Initial Data Fetch
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, customersRes, cfg] = await Promise.all([
        getOrders({ limit: 100 }),
        getCustomers(),
        getStoreConfig(),
      ]);

      if (ordersRes.success) setOrders(ordersRes.orders || []);
      if (customersRes.success) setCustomers(customersRes.customers || []);
      setStoreConfig(cfg);
    } catch (err) {
      toast.error("Gagal memuat data pesanan");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus =
        orderStatusFilter === "all" ? true : o.status === orderStatusFilter;
      const q = orderSearch.toLowerCase().trim();
      if (!q) return matchesStatus;

      const matchesQuery =
        o.invoiceNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        (o.customerEmail && o.customerEmail.toLowerCase().includes(q)) ||
        (o.referralCode && o.referralCode.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingCount = orders.filter((o) => o.status === "pending").length;
    const completedCount = orders.filter((o) => o.status === "completed").length;

    let revenueIdr = 0;
    let revenueUsd = 0;
    orders.forEach((o) => {
      if (o.status !== "cancelled") {
        if (o.currency === "USD") {
          revenueUsd += o.totalAmount;
        } else {
          revenueIdr += o.totalAmount;
        }
      }
    });

    return { totalOrders, pendingCount, completedCount, revenueIdr, revenueUsd };
  }, [orders]);

  // Open Detail Modal
  const openDetailModal = (order: Order) => {
    setSelectedOrder(order);
    setEditStatus((order.status as OrderStatusType) || "pending");
    setEditAdminNotes(order.adminNotes || "");
    setEditProjectUrl(order.projectUrl || "");
    setDetailModalOpen(true);
  };

  // Save Order Status Update
  const handleSaveOrderStatus = async () => {
    if (!selectedOrder) return;
    setIsSaving(true);
    try {
      const res = await updateOrderStatus(
        selectedOrder.id,
        editStatus,
        editAdminNotes,
        editProjectUrl
      );
      if (res.success) {
        toast.success(res.message);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrder.id
              ? {
                  ...o,
                  status: editStatus,
                  adminNotes: editAdminNotes,
                  projectUrl: editProjectUrl,
                  updatedAt: new Date(),
                }
              : o
          )
        );
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status: editStatus,
                adminNotes: editAdminNotes,
                projectUrl: editProjectUrl,
                updatedAt: new Date(),
              }
            : null
        );
        setDetailModalOpen(false);
      } else {
        toast.error(res.error || "Gagal memperbarui pesanan");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan pesanan");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    startTransition(async () => {
      try {
        const res = await deleteOrder(orderToDelete.id);
        if (res.success) {
          toast.success(res.message);
          setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
          setDeleteAlertOpen(false);
          setOrderToDelete(null);
        } else {
          toast.error(res.error || "Gagal menghapus pesanan");
        }
      } catch {
        toast.error("Terjadi kesalahan saat menghapus");
      }
    });
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInvoice(id);
    toast.success("Disalin ke clipboard!");
    setTimeout(() => setCopiedInvoice(null), 2000);
  };

  // CSV Export for Orders
  const handleExportOrdersCsv = () => {
    if (!filteredOrders.length) {
      toast.error("Tidak ada data pesanan untuk diekspor");
      return;
    }

    const headers = [
      "Invoice",
      "Tanggal",
      "Nama Pelanggan",
      "No WhatsApp",
      "Email",
      "Alamat",
      "Total Nominal",
      "Mata Uang",
      "Metode Pembayaran",
      "Status",
      "Referral",
      "Daftar Produk",
      "Tautan Proyek",
      "Catatan Admin",
    ];

    const rows = filteredOrders.map((o) => {
      const itemsList = Array.isArray(o.items)
        ? o.items.map((it) => `${it.title} (${it.quantity}x)`).join(" ; ")
        : "";
      const dateStr = o.createdAt ? new Date(o.createdAt).toISOString() : "";

      return [
        `"${o.invoiceNumber}"`,
        `"${dateStr}"`,
        `"${o.customerName.replace(/"/g, '""')}"`,
        `"${o.customerPhone}"`,
        `"${(o.customerEmail || "").replace(/"/g, '""')}"`,
        `"${(o.customerAddress || "").replace(/"/g, '""')}"`,
        o.totalAmount,
        `"${o.currency}"`,
        `"${o.paymentMethod}"`,
        `"${o.status}"`,
        `"${o.referralCode || ""}"`,
        `"${itemsList.replace(/"/g, '""')}"`,
        `"${o.projectUrl || ""}"`,
        `"${(o.adminNotes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `laporan-pesanan-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan pesanan CSV berhasil diunduh!");
  };

  // CSV Export for Customers
  const handleExportCustomersCsv = () => {
    if (!filteredCustomers.length) {
      toast.error("Tidak ada data pelanggan untuk diekspor");
      return;
    }

    const headers = [
      "Nama",
      "No WhatsApp",
      "Email",
      "Alamat",
      "Total Pesanan",
      "Total Belanja (LTV)",
      "Pesanan Terakhir",
      "Tag Pelanggan",
    ];

    const rows = filteredCustomers.map((c) => {
      const tagsList = Array.isArray(c.tags) ? c.tags.join(" ; ") : "";
      const lastDate = c.lastOrderAt ? new Date(c.lastOrderAt).toISOString() : "";

      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        `"${(c.email || "").replace(/"/g, '""')}"`,
        `"${(c.address || "").replace(/"/g, '""')}"`,
        c.totalOrders,
        c.totalSpent,
        `"${lastDate}"`,
        `"${tagsList.replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `direktori-pelanggan-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Direktori pelanggan CSV berhasil diunduh!");
  };

  // Open Direct Promotional Chat
  const handleOpenPromoChat = (cust: Customer) => {
    const cleanPhone = normalizeWhatsAppPhone(cust.phone);
    const text = [
      `Halo kak ${cust.name || "Pelanggan"}, salam hangat dari Sigit Adi (https://sigitadi.id/)!`,
      "",
      "Terima kasih telah menjadi bagian dari pelanggan kami. Kami memiliki penawaran dan pembaruan produk terbaru yang mungkin menarik untuk Anda:",
      "https://sigitadi.id/products",
      "",
      "Jika ada kebutuhan produk digital atau pengembangan proyek baru, kami siap membantu dengan senang hati!",
    ].join("\n");

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Format currency for display
  const renderAmount = (amount: number, currency: string) => {
    return currency === "USD" ? formatUsd(amount) : formatIdr(amount);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[var(--vt-ink)]">
              Kelola Pesanan &amp; Pelanggan
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              Store Hub
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[var(--vt-ink-mute)] font-mono mt-1">
            Pencatatan transaksi terpusat, alur follow-up WhatsApp, tracking proyek FreelanceOps, dan direktori CRM pembeli.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-9 font-mono text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Muat Ulang</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 font-mono text-xs gap-1.5"
          >
            <Link href="/admin/products">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Katalog Produk</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-[var(--vt-edge-lo-1)] border-[var(--vt-edge-lo-2)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--vt-ink-mute)] uppercase tracking-wider">
              Total Pesanan
            </span>
            <ShoppingBag className="h-4 w-4 text-[var(--vt-ink-mute)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--vt-ink)] mt-2">
            {stats.totalOrders}
          </div>
          <p className="text-[10px] font-mono text-[var(--vt-ink-mute)] mt-1">
            Semua transaksi masuk
          </p>
        </Card>

        <Card className="p-4 bg-[var(--vt-edge-lo-1)] border-[var(--vt-edge-lo-2)] relative overflow-hidden">
          {stats.pendingCount > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 animate-pulse" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
              Menunggu Follow-up
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {stats.pendingCount}
          </div>
          <p className="text-[10px] font-mono text-[var(--vt-ink-mute)] mt-1">
            Perlu konfirmasi pembayaran
          </p>
        </Card>

        <Card className="p-4 bg-[var(--vt-edge-lo-1)] border-[var(--vt-edge-lo-2)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
              Pesanan Selesai
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.completedCount}
          </div>
          <p className="text-[10px] font-mono text-[var(--vt-ink-mute)] mt-1">
            Produk atau jasa tuntas
          </p>
        </Card>

        <Card className="p-4 bg-[var(--vt-edge-lo-1)] border-[var(--vt-edge-lo-2)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--vt-ink-mute)] uppercase tracking-wider">
              Total Omzet
            </span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--vt-ink)] mt-2 truncate">
            {formatIdr(stats.revenueIdr)}
          </div>
          {stats.revenueUsd > 0 && (
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              + {formatUsd(stats.revenueUsd)}
            </div>
          )}
          <p className="text-[10px] font-mono text-[var(--vt-ink-mute)] mt-1">
            Di luar pesanan dibatalkan
          </p>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-md h-10 bg-[var(--vt-edge-lo-1)] border border-[var(--vt-edge-lo-2)]">
          <TabsTrigger value="orders" className="font-mono text-xs font-bold gap-2">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Daftar Pesanan ({orders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="font-mono text-xs font-bold gap-2">
            <User className="h-3.5 w-3.5" />
            <span>Direktori Pelanggan ({customers.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: KELOLA PESANAN */}
        {/* ======================================================== */}
        <TabsContent value="orders" className="space-y-4 outline-none">
          {/* Filter Bar & Export */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-[var(--vt-edge-lo-1)] border border-[var(--vt-edge-lo-2)] rounded-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap pb-1 md:pb-0">
              <Button
                variant={orderStatusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderStatusFilter("all")}
                className="h-8 text-xs font-mono px-2.5 shrink-0"
              >
                Semua ({orders.length})
              </Button>
              <Button
                variant={orderStatusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderStatusFilter("pending")}
                className={`h-8 text-xs font-mono px-2.5 shrink-0 ${
                  orderStatusFilter !== "pending" && stats.pendingCount > 0
                    ? "text-amber-600 dark:text-amber-400 border-amber-500/40"
                    : ""
                }`}
              >
                Pending ({stats.pendingCount})
              </Button>
              <Button
                variant={orderStatusFilter === "paid" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderStatusFilter("paid")}
                className="h-8 text-xs font-mono px-2.5 shrink-0"
              >
                Dibayar ({orders.filter((o) => o.status === "paid").length})
              </Button>
              <Button
                variant={orderStatusFilter === "processing" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderStatusFilter("processing")}
                className="h-8 text-xs font-mono px-2.5 shrink-0"
              >
                Proses ({orders.filter((o) => o.status === "processing").length})
              </Button>
              <Button
                variant={orderStatusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderStatusFilter("completed")}
                className="h-8 text-xs font-mono px-2.5 shrink-0"
              >
                Selesai ({stats.completedCount})
              </Button>
              <Button
                variant={orderStatusFilter === "cancelled" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderStatusFilter("cancelled")}
                className="h-8 text-xs font-mono px-2.5 shrink-0"
              >
                Batal ({orders.filter((o) => o.status === "cancelled").length})
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--vt-ink-mute)]" />
                <Input
                  type="text"
                  placeholder="Cari invoice, nama, WA..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="pl-8 h-8 text-xs font-mono bg-background"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportOrdersCsv}
                className="h-8 text-xs font-mono gap-1.5 shrink-0"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Ekspor CSV</span>
              </Button>
            </div>
          </div>

          {/* Orders Container: Mobile Cards (<md) + Desktop Table (>=md) */}
          <div className="border border-[var(--vt-edge-lo-2)] rounded-xs bg-[var(--vt-edge-lo-1)] overflow-hidden">
            {/* Mobile Cards View (<md) */}
            <div className="md:hidden divide-y divide-[var(--vt-edge-lo-2)]">
              {isLoading ? (
                <div className="text-center py-12 text-xs font-mono text-[var(--vt-ink-mute)]">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                  Memuat data pesanan...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-xs font-mono text-[var(--vt-ink-mute)]">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Tidak ada pesanan yang sesuai.
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const statusCfg = STATUS_CONFIG[order.status as OrderStatusType] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  const formattedDate = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";
                  const itemsList = Array.isArray(order.items) ? order.items : [];
                  const totalFormatted = renderAmount(order.totalAmount, order.currency);
                  const bankSnippet = storeConfig?.bankAccounts?.map((b) => `• ${b.bankName}: ${b.accountNumber}`).join("\n") || "";

                  return (
                    <div key={`m-${order.id}`} className="p-3 bg-[var(--vt-card)] space-y-2.5 font-mono text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-primary">{order.invoiceNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(order.invoiceNumber, order.id)}
                            className="text-[var(--vt-ink-mute)] hover:text-[var(--vt-ink)] p-0.5"
                          >
                            {copiedInvoice === order.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] h-4.5 px-1.5 font-bold uppercase gap-1", statusCfg.badgeClass)}
                        >
                          <StatusIcon className="h-2.5 w-2.5" />
                          <span>{statusCfg.label}</span>
                        </Badge>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--vt-ink-mute)]">Pelanggan:</span>
                          <span className="font-bold text-[var(--vt-ink)]">{order.customerName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--vt-ink-mute)]">WhatsApp:</span>
                          <a
                            href={`https://wa.me/${normalizeWhatsAppPhone(order.customerPhone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 font-bold hover:underline"
                          >
                            {order.customerPhone}
                          </a>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--vt-ink-mute)]">Total:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{totalFormatted}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--vt-ink-mute)]">Waktu:</span>
                          <span className="text-muted-foreground">{formattedDate}</span>
                        </div>
                      </div>

                      <div className="p-2 rounded bg-muted/40 text-[10px] space-y-0.5">
                        <span className="text-muted-foreground block font-bold">Produk:</span>
                        {itemsList.map((it, idx) => (
                          <div key={idx} className="truncate text-[var(--vt-ink)]">
                            • {it.title} (x{it.quantity})
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailModal(order)}
                          className="flex-1 h-7 text-xs font-mono gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Detail</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-7 text-xs font-mono gap-1 text-emerald-600"
                            >
                              <MessageCircle className="h-3 w-3" />
                              <span>Follow Up WA</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 font-mono text-xs">
                            <DropdownMenuLabel className="text-[11px] text-[var(--vt-ink-mute)]">
                              Template Follow-Up ({order.customerName})
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                const url = buildFollowUpPaymentUrl(order.customerPhone, order.invoiceNumber, order.customerName, totalFormatted, bankSnippet);
                                window.open(url, "_blank");
                              }}
                              className="gap-2 cursor-pointer"
                            >
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                              <span>Ingatkan Pembayaran</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const url = buildFollowUpVerifiedUrl(order.customerPhone, order.invoiceNumber, order.customerName);
                                window.open(url, "_blank");
                              }}
                              className="gap-2 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                              <span>Konfirmasi Diterima</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const accessUrl = `${window.location.origin}/order/${order.invoiceNumber}`;
                                const url = buildFollowUpDeliveryUrl(order.customerPhone, order.invoiceNumber, order.customerName, accessUrl);
                                window.open(url, "_blank");
                              }}
                              className="gap-2 cursor-pointer"
                            >
                              <Truck className="h-3.5 w-3.5 text-indigo-500" />
                              <span>Kirim Akses / Produk</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (>=md) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--vt-edge-hi-2)]">
                  <TableRow>
                    <TableHead className="font-mono text-xs w-[150px]">Invoice</TableHead>
                    <TableHead className="font-mono text-xs w-[140px]">Waktu</TableHead>
                    <TableHead className="font-mono text-xs">Pelanggan</TableHead>
                    <TableHead className="font-mono text-xs">Produk Dipesan</TableHead>
                    <TableHead className="font-mono text-xs text-right">Total &amp; Metode</TableHead>
                    <TableHead className="font-mono text-xs text-center w-[110px]">Status</TableHead>
                    <TableHead className="font-mono text-xs text-right w-[150px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-xs font-mono text-[var(--vt-ink-mute)]">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Memuat data pesanan...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-xs font-mono text-[var(--vt-ink-mute)]">
                        <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Tidak ada pesanan yang sesuai dengan filter atau kata kunci.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                      const statusCfg =
                        STATUS_CONFIG[order.status as OrderStatusType] || STATUS_CONFIG.pending;
                      const StatusIcon = statusCfg.icon;
                      const formattedDate = order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-";

                      const itemsList = Array.isArray(order.items) ? order.items : [];
                      const totalFormatted = renderAmount(order.totalAmount, order.currency);

                      // Bank info for follow-up reminder
                      const bankSnippet =
                        storeConfig?.bankAccounts && storeConfig.bankAccounts.length > 0
                          ? storeConfig.bankAccounts
                              .map(
                                (b) => `• ${b.bankName}: ${b.accountNumber} a.n. ${b.accountHolder}`
                              )
                              .join("\n")
                          : "";

                      return (
                        <TableRow key={order.id} className="hover:bg-[var(--vt-edge-hi-1)]">
                          {/* Invoice Number */}
                          <TableCell className="font-mono text-xs font-bold">
                            <div className="flex items-center gap-1.5">
                              <span className="text-primary">{order.invoiceNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(order.invoiceNumber, order.id)}
                                className="text-[var(--vt-ink-mute)] hover:text-[var(--vt-ink)] p-0.5"
                                title="Salin Invoice"
                              >
                                {copiedInvoice === order.id ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <div className="mt-1">
                              <Link
                                href={`/order/${order.invoiceNumber}`}
                                target="_blank"
                                className="text-[10px] text-[var(--vt-ink-mute)] hover:underline flex items-center gap-0.5"
                              >
                                <span>Lihat Faktur</span>
                                <ArrowUpRight className="h-2.5 w-2.5" />
                              </Link>
                            </div>
                          </TableCell>

                          {/* Created Date */}
                          <TableCell className="font-mono text-[11px] text-[var(--vt-ink-mute)] whitespace-nowrap">
                            {formattedDate}
                          </TableCell>

                          {/* Customer Info */}
                          <TableCell>
                            <div className="font-mono text-xs font-bold text-[var(--vt-ink)]">
                              {order.customerName}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--vt-ink-mute)] mt-0.5">
                              <a
                                href={`https://wa.me/${normalizeWhatsAppPhone(order.customerPhone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                              >
                                <Phone className="h-2.5 w-2.5" />
                                <span>{order.customerPhone}</span>
                              </a>
                            </div>
                            {order.customerEmail && (
                              <div className="text-[10px] font-mono text-[var(--vt-ink-mute)] truncate max-w-[150px]">
                                {order.customerEmail}
                              </div>
                            )}
                            {order.referralCode && (
                              <Badge
                                variant="outline"
                                className="text-[9px] h-3.5 px-1 font-mono text-purple-600 dark:text-purple-400 border-purple-500/30 mt-1"
                              >
                                Ref: {order.referralCode}
                              </Badge>
                            )}
                          </TableCell>

                          {/* Items List */}
                          <TableCell>
                            <div className="space-y-1 max-w-[220px]">
                              {itemsList.slice(0, 2).map((it, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs font-mono truncate text-[var(--vt-ink)]"
                                >
                                  • {it.title}{" "}
                                  <span className="text-[var(--vt-ink-mute)] text-[11px]">
                                    (x{it.quantity})
                                  </span>
                                </div>
                              ))}
                              {itemsList.length > 2 && (
                                <div className="text-[10px] font-mono text-[var(--vt-ink-mute)] italic">
                                  +{itemsList.length - 2} produk lainnya...
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Total & Payment Method */}
                          <TableCell className="text-right">
                            <div className="font-mono text-xs font-bold text-[var(--vt-ink)]">
                              {totalFormatted}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--vt-ink-mute)] mt-0.5">
                              {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                            </div>
                            {order.paymentProofUrl && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] h-3.5 px-1 font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-1"
                              >
                                Ada Bukti Transfer
                              </Badge>
                            )}
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 gap-1 ${statusCfg.badgeClass}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              <span>{statusCfg.label}</span>
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Open Detail Modal */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetailModal(order)}
                                className="h-7 px-2 text-xs font-mono gap-1"
                                title="Lihat Detail & Perbarui Status"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden xl:inline">Detail</span>
                              </Button>

                              {/* Follow-up WhatsApp Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs font-mono gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                                    title="Follow-Up WhatsApp"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span className="hidden xl:inline">WA</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 font-mono text-xs">
                                  <DropdownMenuLabel className="text-[11px] text-[var(--vt-ink-mute)]">
                                    Template Follow-Up ({order.customerName})
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const url = buildFollowUpPaymentUrl(
                                        order.customerPhone,
                                        order.invoiceNumber,
                                        order.customerName,
                                        totalFormatted,
                                        bankSnippet
                                      );
                                      window.open(url, "_blank");
                                    }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Ingatkan Pembayaran</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const url = buildFollowUpVerifiedUrl(
                                        order.customerPhone,
                                        order.invoiceNumber,
                                        order.customerName
                                      );
                                      window.open(url, "_blank");
                                    }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                                    <span>Konfirmasi Diterima</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const accessUrl = `${window.location.origin}/order/${order.invoiceNumber}`;
                                      const url = buildFollowUpDeliveryUrl(
                                        order.customerPhone,
                                        order.invoiceNumber,
                                        order.customerName,
                                        accessUrl
                                      );
                                      window.open(url, "_blank");
                                    }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Truck className="h-3.5 w-3.5 text-indigo-500" />
                                    <span>Kirim Akses / Produk</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const proj =
                                        order.projectUrl || "https://freelanceops.sigitadi.id/";
                                      const url = buildFollowUpFreelanceOpsUrl(
                                        order.customerPhone,
                                        order.invoiceNumber,
                                        order.customerName,
                                        proj
                                      );
                                      window.open(url, "_blank");
                                    }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                                    <span>Undang FreelanceOps</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const url = buildFollowUpCompletionUrl(
                                        order.customerPhone,
                                        order.invoiceNumber,
                                        order.customerName
                                      );
                                      window.open(url, "_blank");
                                    }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Terima Kasih &amp; Selesai</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* Delete Order Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setOrderToDelete(order);
                                  setDeleteAlertOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-[var(--vt-ink-mute)] hover:text-rose-600"
                                title="Hapus Pesanan"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: DIREKTORI PELANGGAN (CRM RETENSI & PROMO) */}
        {/* ======================================================== */}
        <TabsContent value="customers" className="space-y-4 outline-none">
          {/* Customer Search & Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[var(--vt-edge-lo-1)] border border-[var(--vt-edge-lo-2)] rounded-xs">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--vt-ink-mute)]" />
              <Input
                type="text"
                placeholder="Cari nama, WhatsApp, email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-8 h-8 text-xs font-mono bg-background"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCustomersCsv}
              className="h-8 text-xs font-mono gap-1.5 shrink-0"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Ekspor CSV Pelanggan</span>
            </Button>
          </div>

          {/* Customers Table */}
          <div className="border border-[var(--vt-edge-lo-2)] rounded-xs bg-[var(--vt-edge-lo-1)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--vt-edge-hi-2)]">
                  <TableRow>
                    <TableHead className="font-mono text-xs">Nama Pelanggan</TableHead>
                    <TableHead className="font-mono text-xs">Kontak WhatsApp</TableHead>
                    <TableHead className="font-mono text-xs">Email / Alamat</TableHead>
                    <TableHead className="font-mono text-xs text-center">Total Order</TableHead>
                    <TableHead className="font-mono text-xs text-right">Total Belanja (LTV)</TableHead>
                    <TableHead className="font-mono text-xs">Tag / Segmen</TableHead>
                    <TableHead className="font-mono text-xs text-right">Aksi CRM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-xs font-mono text-[var(--vt-ink-mute)]">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Memuat data direktori pelanggan...
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-xs font-mono text-[var(--vt-ink-mute)]">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Belum ada data pelanggan yang tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const tagsList = Array.isArray(cust.tags) ? cust.tags : [];
                      const lastOrderDate = cust.lastOrderAt
                        ? new Date(cust.lastOrderAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-";

                      return (
                        <TableRow key={cust.id} className="hover:bg-[var(--vt-edge-hi-1)]">
                          <TableCell className="font-mono text-xs font-bold text-[var(--vt-ink)]">
                            <div className="flex items-center gap-1.5">
                              <span>{cust.name}</span>
                            </div>
                            <div className="text-[10px] font-mono text-[var(--vt-ink-mute)] font-normal mt-0.5">
                              Terakhir order: {lastOrderDate}
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                            <a
                              href={`https://wa.me/${cust.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{cust.phone}</span>
                            </a>
                          </TableCell>

                          <TableCell className="font-mono text-xs text-[var(--vt-ink-mute)] max-w-[200px] truncate">
                            {cust.email || cust.address || "-"}
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {cust.totalOrders}x
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right font-mono text-xs font-bold text-[var(--vt-ink)]">
                            {formatIdr(cust.totalSpent)}
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {tagsList.length === 0 ? (
                                <span className="text-[10px] font-mono text-[var(--vt-ink-mute)]">-</span>
                              ) : (
                                tagsList.map((tag, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-[9px] h-4 px-1.5 font-mono"
                                  >
                                    {tag}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPromoChat(cust)}
                              className="h-7 text-xs font-mono gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                            >
                              <MessageCircle className="h-3 w-3" />
                              <span>Chat Promo</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* ORDER DETAIL & STATUS UPDATE MODAL */}
      {/* ======================================================== */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base font-bold font-mono">
              <div className="flex items-center gap-2">
                <span>Detail Pesanan:</span>
                <span className="text-primary">{selectedOrder?.invoiceNumber}</span>
              </div>
              {selectedOrder && (
                <Badge
                  variant="outline"
                  className={
                    STATUS_CONFIG[selectedOrder.status as OrderStatusType]?.badgeClass || ""
                  }
                >
                  {STATUS_CONFIG[selectedOrder.status as OrderStatusType]?.label || selectedOrder.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-[var(--vt-ink-mute)]">
              Perbarui status pembayaran, catatan admin, atau sambungkan dengan ruang kerja proyek FreelanceOps.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-2">
              {/* Customer Card */}
              <div className="p-3 bg-[var(--vt-edge-lo-1)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-1.5">
                <div className="text-[11px] font-bold text-[var(--vt-ink)] uppercase tracking-wider flex items-center justify-between">
                  <span>Informasi Pelanggan</span>
                  <a
                    href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-xs lowercase"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>Buka Chat WA</span>
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--vt-ink-mute)]">Nama: </span>
                    <span className="font-bold">{selectedOrder.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--vt-ink-mute)]">WhatsApp: </span>
                    <span className="font-bold">{selectedOrder.customerPhone}</span>
                  </div>
                  {selectedOrder.customerEmail && (
                    <div>
                      <span className="text-[var(--vt-ink-mute)]">Email: </span>
                      <span>{selectedOrder.customerEmail}</span>
                    </div>
                  )}
                  {selectedOrder.referralCode && (
                    <div>
                      <span className="text-[var(--vt-ink-mute)]">Kode Referral: </span>
                      <span className="text-purple-600 font-bold">{selectedOrder.referralCode}</span>
                    </div>
                  )}
                </div>
                {selectedOrder.customerAddress && (
                  <div className="text-xs pt-1 border-t border-[var(--vt-edge-lo-2)]">
                    <span className="text-[var(--vt-ink-mute)]">Alamat: </span>
                    <span>{selectedOrder.customerAddress}</span>
                  </div>
                )}
                {selectedOrder.customerNotes && (
                  <div className="text-xs pt-1 border-t border-[var(--vt-edge-lo-2)] text-amber-700 dark:text-amber-400">
                    <span className="font-bold">Catatan Pembeli: </span>
                    <span>{selectedOrder.customerNotes}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border border-[var(--vt-edge-lo-2)] rounded-xs overflow-hidden">
                <div className="p-2 bg-[var(--vt-edge-hi-2)] text-[11px] font-bold uppercase tracking-wider">
                  Produk Dalam Pesanan
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Produk</TableHead>
                      <TableHead className="text-xs text-center w-16">Qty</TableHead>
                      <TableHead className="text-xs text-right w-24">Harga</TableHead>
                      <TableHead className="text-xs text-right w-28">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(selectedOrder.items) &&
                      selectedOrder.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs font-bold">{it.title}</TableCell>
                          <TableCell className="text-xs text-center">{it.quantity}</TableCell>
                          <TableCell className="text-xs text-right">
                            {renderAmount(it.price, selectedOrder.currency)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold">
                            {renderAmount(it.subtotal, selectedOrder.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="bg-[var(--vt-edge-lo-1)] font-bold">
                      <TableCell colSpan={3} className="text-right text-xs">
                        Total Pembayaran ({selectedOrder.currency}):
                      </TableCell>
                      <TableCell className="text-right text-xs text-primary">
                        {renderAmount(selectedOrder.totalAmount, selectedOrder.currency)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Payment Proof Preview if present */}
              {selectedOrder.paymentProofUrl && (
                <div className="p-3 bg-[var(--vt-edge-lo-1)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      <span>Bukti Pembayaran dari Pembeli</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {editStatus === "pending" && (
                        <button
                          type="button"
                          onClick={() => setEditStatus("paid")}
                          className="vt-btn px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer rounded-xs"
                        >
                          <Check className="h-3 w-3" />
                          <span>Verifikasi & Tandai Lunas</span>
                        </button>
                      )}
                      <a
                        href={selectedOrder.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Buka Gambar Penuh</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-hidden rounded-xs border border-[var(--vt-edge-lo-2)] bg-black/20 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedOrder.paymentProofUrl}
                      alt="Bukti Transfer"
                      className="max-h-48 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold font-mono">Ubah Status Pesanan</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(["pending", "paid", "processing", "completed", "cancelled"] as OrderStatusType[]).map(
                    (st) => {
                      const cfg = STATUS_CONFIG[st];
                      const Icon = cfg.icon;
                      const isSelected = editStatus === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setEditStatus(st)}
                          className={`p-2 rounded-xs border text-xs font-mono font-bold flex flex-col items-center gap-1 transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-[var(--vt-edge-lo-1)] border-[var(--vt-edge-lo-2)] text-[var(--vt-ink)] hover:bg-[var(--vt-edge-hi-1)]"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{cfg.label}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Tautan Pengiriman / Akses Unduhan / Workspace */}
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-700 dark:text-blue-400">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>Tautan Pengiriman / Akses Unduhan / Workspace</span>
                  </div>
                  {editProjectUrl && (
                    <a
                      href={editProjectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>Buka Tautan</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-[var(--vt-ink-mute)]">
                  Masukkan tautan Google Drive, Notion, GitHub repo, file download, atau ruang kerja FreelanceOps:
                </p>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/... atau https://freelanceops.sigitadi.id/..."
                  value={editProjectUrl}
                  onChange={(e) => setEditProjectUrl(e.target.value)}
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold font-mono">
                  Catatan Admin (Nomor Resi / Lisensi Digital / Memo Internal)
                </Label>
                <Textarea
                  placeholder="Contoh: Lisensi dikirim via WA, resi JNE: 12345678, brief sudah didiskusikan..."
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  rows={3}
                  className="text-xs font-mono bg-background"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[var(--vt-edge-lo-2)]">
            {selectedOrder && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="font-mono text-xs gap-1.5 sm:mr-auto"
              >
                <Link href={`/order/${selectedOrder.invoiceNumber}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka Invoice Publik</span>
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailModalOpen(false)}
              className="font-mono text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveOrderStatus}
              disabled={isSaving}
              className="font-mono text-xs gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DELETE ORDER ALERT DIALOG */}
      {/* ======================================================== */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className="font-mono text-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold font-mono flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Hapus Pesanan Ini?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-mono text-[var(--vt-ink-mute)]">
              Pesanan invoice <strong className="text-[var(--vt-ink)]">{orderToDelete?.invoiceNumber}</strong> atas nama{" "}
              <strong className="text-[var(--vt-ink)]">{orderToDelete?.customerName}</strong> akan dihapus permanen dari sistem.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs gap-1.5"
            >
              {isPending ? (
                <span>Menghapus...</span>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Ya, Hapus Pesanan</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
