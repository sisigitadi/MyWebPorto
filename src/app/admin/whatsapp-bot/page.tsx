"use client";

import { useState, useEffect, useTransition } from "react";
import {
  MessageSquare,
  QrCode,
  BookOpen,
  Send,
  RefreshCw,
  Power,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Database,
  Plus,
  Trash2,
  Edit2,
  Save,
  Zap,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { WABotState, WABotConfig, WAKnowledgeFAQ, WAChatLogItem } from "@/lib/whatsapp-bot/wa-types";

export default function WhatsAppBotAdminPage() {
  const [activeTab, setActiveTab] = useState("connection");
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<WABotState>({
    status: "DISCONNECTED",
    qrCodeDataUrl: null,
    connectedPhone: null,
    connectedPushName: null,
    lastActive: null,
    error: null,
    battery: null,
    messagesCount: { incoming: 0, replied: 0 },
  });
  const [config, setConfig] = useState<WABotConfig>({
    enabled: true,
    autoReply: true,
    botName: "Sigit AI Assistant",
    personaPrompt: "",
    businessSOP: "",
    adminExclusions: [],
    delaySeconds: 2,
    faqs: [],
  });
  const [logs, setLogs] = useState<WAChatLogItem[]>([]);
  const [knowledgeSummary, setKnowledgeSummary] = useState({
    productsCount: 0,
    servicesCount: 0,
    projectsCount: 0,
    bankAccountsCount: 0,
    faqsCount: 0,
  });

  // Action Pending
  const [isActionPending, startAction] = useTransition();

  // FAQ Modal State
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<WAKnowledgeFAQ | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState<WAKnowledgeFAQ["category"]>("umum");

  // Simulator State
  const [simulateQuery, setSimulateQuery] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<
    {
      q: string;
      a: string;
      source: string;
      model: string;
      latency: number;
    }[]
  >([]);

  // Fetch status & config
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/whatsapp-bot/status");
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setLogs(data.logs || []);
        if (data.knowledgeSummary) setKnowledgeSummary(data.knowledgeSummary);
        if (data.config) setConfig(data.config);
      }
    } catch (err) {
      console.error("[whatsapp-bot-page] Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStatus();
    }, 0);
    // Auto-refresh interval (polling for QR update & status)
    const interval = setInterval(fetchStatus, 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Handle Control Action
  const handleControlAction = (action: "start" | "stop" | "restart" | "logout" | "clear_logs") => {
    startAction(async () => {
      try {
        const res = await fetch("/api/admin/whatsapp-bot/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Aksi berhasil diproses!");
          fetchStatus();
        } else {
          toast.error(data.error || "Gagal memproses aksi.");
        }
      } catch (err) {
        toast.error("Terjadi kesalahan jaringan.");
      }
    });
  };

  // Handle Save Knowledge / Config
  const handleSaveConfig = async () => {
    startAction(async () => {
      try {
        const res = await fetch("/api/admin/whatsapp-bot/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Pengaturan & Knowledge Hub berhasil disimpan!");
          setConfig(data.config);
        } else {
          toast.error(data.error || "Gagal menyimpan.");
        }
      } catch (err) {
        toast.error("Terjadi kesalahan saat menyimpan.");
      }
    });
  };

  // Handle FAQ Save
  const handleSaveFAQ = () => {
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      toast.error("Pertanyaan dan jawaban wajib diisi!");
      return;
    }

    let updatedFaqs = [...config.faqs];
    if (editingFaq) {
      updatedFaqs = updatedFaqs.map((f) =>
        f.id === editingFaq.id
          ? {
              ...f,
              question: faqQuestion.trim(),
              answer: faqAnswer.trim(),
              category: faqCategory,
              updatedAt: new Date().toISOString(),
            }
          : f
      );
    } else {
      const newFaq: WAKnowledgeFAQ = {
        id: `faq-${Date.now()}`,
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        category: faqCategory,
        enabled: true,
        updatedAt: new Date().toISOString(),
      };
      updatedFaqs.unshift(newFaq);
    }

    const newConfig = { ...config, faqs: updatedFaqs };
    setConfig(newConfig);
    setFaqModalOpen(false);
    setEditingFaq(null);
    setFaqQuestion("");
    setFaqAnswer("");

    // Auto-save
    fetch("/api/admin/whatsapp-bot/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    }).then(() => toast.success("FAQ berhasil diperbarui!"));
  };

  const handleDeleteFAQ = (id: string) => {
    const updated = config.faqs.filter((f) => f.id !== id);
    const newConfig = { ...config, faqs: updated };
    setConfig(newConfig);

    fetch("/api/admin/whatsapp-bot/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    }).then(() => toast.success("FAQ dihapus."));
  };

  const handleToggleFAQ = (id: string) => {
    const updated = config.faqs.map((f) =>
      f.id === id ? { ...f, enabled: !f.enabled } : f
    );
    const newConfig = { ...config, faqs: updated };
    setConfig(newConfig);

    fetch("/api/admin/whatsapp-bot/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    });
  };

  // Run Simulator
  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulateQuery.trim()) return;

    const query = simulateQuery.trim();
    setSimulateQuery("");
    setIsSimulating(true);

    try {
      const res = await fetch("/api/admin/whatsapp-bot/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();
      if (data.success) {
        setSimulationHistory((prev) => [
          ...prev,
          {
            q: query,
            a: data.reply,
            source: data.source,
            model: data.modelUsed,
            latency: data.latencyMs,
          },
        ]);
      } else {
        toast.error(data.error || "Simulasi gagal.");
      }
    } catch {
      toast.error("Gagal terhubung ke engine AI.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[var(--vt-ink)] flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-emerald-500" />
              <span>Bot WhatsApp AI &amp; Knowledge Hub</span>
            </h1>
            <Badge
              variant="outline"
              className={`font-mono text-[10px] uppercase font-bold ${
                state.status === "CONNECTED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : state.status === "QR_READY"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse"
                  : state.status === "CONNECTING"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
              }`}
            >
              {state.status === "CONNECTED"
                ? "● Online & Terhubung"
                : state.status === "QR_READY"
                ? "▲ Siap Scan QR"
                : state.status === "CONNECTING"
                ? "◌ Menghubungkan..."
                : "■ Terputus"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Asisten otomatis WhatsApp resmi berbasis data produk, layanan, rekening, dan SOP bisnis Anda 24/7.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading || isActionPending}
            className="text-xs gap-1.5 h-8 font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>

          {state.status === "CONNECTED" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleControlAction("stop")}
              disabled={isActionPending}
              className="text-xs gap-1.5 h-8 font-mono"
            >
              <Power className="h-3.5 w-3.5" />
              <span>Hentikan Bot</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => handleControlAction("start")}
              disabled={isActionPending}
              className="text-xs gap-1.5 h-8 font-mono bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Mulai &amp; Scan QR</span>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[var(--vt-card)] p-1 border border-border h-auto flex flex-wrap gap-1">
          <TabsTrigger value="connection" className="text-xs font-mono gap-1.5 py-1.5">
            <QrCode className="h-3.5 w-3.5" />
            <span>Koneksi &amp; QR Code</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs font-mono gap-1.5 py-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Knowledge Hub &amp; FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs font-mono gap-1.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Simulator Chat AI</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs font-mono gap-1.5 py-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Log Aktivitas Chat ({logs.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: KONEKSI & SCAN QR CODE                                              */}
        {/* ========================================================================= */}
        <TabsContent value="connection" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kartu Status Koneksi */}
            <Card className="md:col-span-1 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold font-mono">Status Perangkat</CardTitle>
                <CardDescription className="text-xs">
                  Informasi koneksi WhatsApp Web aktif.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-md bg-[var(--vt-card)] border border-border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Nomor HP:</span>
                    <span className="font-bold text-[var(--vt-ink)]">
                      {state.connectedPhone || "Belum terhubung"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Profil WA:</span>
                    <span className="font-bold text-[var(--vt-ink)]">
                      {state.connectedPushName || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pesan Diterima:</span>
                    <span className="font-bold text-blue-500">
                      {state.messagesCount.incoming} pesan
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pesan Dibalas:</span>
                    <span className="font-bold text-emerald-500">
                      {state.messagesCount.replied} balasan
                    </span>
                  </div>
                  {state.error && (
                    <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px]">
                      {state.error}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-2 rounded bg-[var(--vt-card)] border border-border">
                    <span className="text-xs">Auto-Reply 24/7</span>
                    <input
                      type="checkbox"
                      checked={config.autoReply}
                      onChange={(e) => {
                        const newCfg = { ...config, autoReply: e.target.checked };
                        setConfig(newCfg);
                        fetch("/api/admin/whatsapp-bot/knowledge", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(newCfg),
                        }).then(() => toast.success("Status Auto-Reply diperbarui!"));
                      }}
                      className="h-4 w-4 accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleControlAction("restart")}
                      disabled={isActionPending}
                      className="w-full text-xs font-mono h-8"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Restart
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleControlAction("logout")}
                      disabled={isActionPending}
                      className="w-full text-xs font-mono h-8"
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      Logout
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Area QR Code Scanner */}
            <Card className="md:col-span-2 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold font-mono">
                  {state.status === "CONNECTED"
                    ? "WhatsApp Web Terhubung"
                    : state.status === "QR_READY"
                    ? "Scan Kode QR WhatsApp"
                    : "Mulai Sesi WhatsApp"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {state.status === "CONNECTED"
                    ? "Bot aktif membalas pertanyaan pelanggan secara otomatis."
                    : "Buka WhatsApp di ponsel Anda > Setelan > Perangkat Tertaut > Tautkan Perangkat."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                {state.status === "CONNECTED" ? (
                  <div className="py-6 space-y-4 max-w-lg mx-auto">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--vt-ink)]">
                        WhatsApp Bot Aktif Melayani
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                        Nomor *{state.connectedPhone}* siap menjawab pertanyaan pelanggan tentang katalog produk, harga, nomor rekening, dan status pesanan.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-left text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
                        <Sparkles className="h-4 w-4" />
                        <span>Panduan Pengujian Chat Bot:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                        <li>
                          <strong className="text-[var(--vt-ink)]">Gunakan nomor WA lain:</strong> Jangan mengetes dengan mengirim pesan ke nomor sendiri dari HP bot (WhatsApp menandai pesan dari nomor sendiri sebagai <code className="bg-muted px-1 rounded">fromMe</code> sehingga sengaja diabaikan agar tidak looping).
                        </li>
                        <li>
                          <strong className="text-[var(--vt-ink)]">Coba Simulator Chat AI:</strong> Anda dapat menguji respon bot secara instan di tab <strong className="text-[var(--vt-ink)]">&ldquo;Simulator Chat AI&rdquo;</strong> di atas tanpa memerlukan HP kedua.
                        </li>
                        <li>
                          <strong className="text-[var(--vt-ink)]">Server Wajib Tetap Berjalan:</strong> Pastikan terminal development (<code className="bg-muted px-1 rounded">npm run dev</code>) atau server Node.js tetap aktif di latar belakang untuk mempertahankan koneksi socket WhatsApp.
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : state.status === "QR_READY" && state.qrCodeDataUrl ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-white rounded-lg shadow-md inline-block border-2 border-primary/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={state.qrCodeDataUrl}
                        alt="WhatsApp QR Code"
                        className="w-64 h-64 object-contain"
                      />
                    </div>
                    <div className="text-xs font-mono text-muted-foreground space-y-1">
                      <p className="font-bold text-[var(--vt-ink)]">Petunjuk Penautan:</p>
                      <p>1. Buka aplikasi WhatsApp di HP Anda.</p>
                      <p>2. Ketuk Menu (tiga titik) atau Setelan &gt; Perangkat Tertaut.</p>
                      <p>3. Ketuk &ldquo;Tautkan Perangkat&rdquo; dan arahkan kamera ke QR Code di atas.</p>
                    </div>
                  </div>
                ) : state.status === "CONNECTING" ? (
                  <div className="py-12 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-xs font-mono text-muted-foreground">
                      Menginisialisasi socket Baileys WhatsApp... Mohon tunggu kode QR muncul.
                    </p>
                  </div>
                ) : (
                  <div className="py-12 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground">
                      <QrCode className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--vt-ink)]">
                        Bot WhatsApp Sedang Tidak Terhubung
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Klik tombol di bawah ini untuk memulai socket dan menampilkan QR Code untuk dipindai.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleControlAction("start")}
                      disabled={isActionPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      <span>Mulai &amp; Tampilkan QR Code</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: KNOWLEDGE HUB & FAQ                                                 */}
        {/* ========================================================================= */}
        <TabsContent value="knowledge" className="space-y-6">
          {/* Ringkasan Sinkronisasi Data Web Live */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
            <div className="p-3 rounded-md bg-[var(--vt-card)] border border-border">
              <span className="text-[10px] text-muted-foreground block">Produk Terbit</span>
              <span className="text-lg font-bold text-emerald-500">
                {knowledgeSummary.productsCount} Item
              </span>
            </div>
            <div className="p-3 rounded-md bg-[var(--vt-card)] border border-border">
              <span className="text-[10px] text-muted-foreground block">Layanan Jasa</span>
              <span className="text-lg font-bold text-blue-500">
                {knowledgeSummary.servicesCount} Jasa
              </span>
            </div>
            <div className="p-3 rounded-md bg-[var(--vt-card)] border border-border">
              <span className="text-[10px] text-muted-foreground block">Rekening Bank</span>
              <span className="text-lg font-bold text-amber-500">
                {knowledgeSummary.bankAccountsCount} Akun
              </span>
            </div>
            <div className="p-3 rounded-md bg-[var(--vt-card)] border border-border">
              <span className="text-[10px] text-muted-foreground block">Proyek Portofolio</span>
              <span className="text-lg font-bold text-purple-500">
                {knowledgeSummary.projectsCount} Proyek
              </span>
            </div>
            <div className="p-3 rounded-md bg-[var(--vt-card)] border border-border">
              <span className="text-[10px] text-muted-foreground block">FAQ Kustom</span>
              <span className="text-lg font-bold text-pink-500">
                {config.faqs.length} FAQ
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Persona & SOP */}
            <div className="space-y-4">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold font-mono">
                    Persona &amp; Instruksi Karakter Bot
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tentukan nama dan gaya bahasa asisten AI saat membalas WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 font-mono text-xs">
                  <div>
                    <Label className="text-xs mb-1 block">Nama Bot WhatsApp</Label>
                    <Input
                      value={config.botName}
                      onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                      placeholder="Sigit AI Assistant"
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Instruksi Persona &amp; Batasan</Label>
                    <Textarea
                      rows={5}
                      value={config.personaPrompt}
                      onChange={(e) => setConfig({ ...config, personaPrompt: e.target.value })}
                      placeholder="Contoh: Bersikaplah ramah, jangan mengarang nomor rekening selain yang ada di database..."
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Jeda Mengetik (Detik)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={config.delaySeconds}
                      onChange={(e) =>
                        setConfig({ ...config, delaySeconds: parseInt(e.target.value) || 2 })
                      }
                      className="text-xs font-mono w-24"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold font-mono">
                    SOP Bisnis &amp; Kebijakan Operasional
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Catatan bebas seputar jam kerja, kebijakan revisi, garansi, atau diskon.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 font-mono text-xs">
                  <Textarea
                    rows={5}
                    value={config.businessSOP}
                    onChange={(e) => setConfig({ ...config, businessSOP: e.target.value })}
                    placeholder="Contoh: Jam operasional 08.00-21.00 WIB. Garansi 30 hari bug gratis..."
                    className="text-xs font-mono"
                  />
                  <Button
                    onClick={handleSaveConfig}
                    disabled={isActionPending}
                    className="w-full text-xs font-mono gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Simpan Pengaturan Knowledge</span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Kelola FAQ Kustom */}
            <Card className="border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold font-mono">
                    Daftar Tanya Jawab (FAQ Kustom)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pertanyaan yang sering diajukan pelanggan akan langsung dijawab dengan data ini.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingFaq(null);
                    setFaqQuestion("");
                    setFaqAnswer("");
                    setFaqCategory("umum");
                    setFaqModalOpen(true);
                  }}
                  className="text-xs font-mono gap-1 h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah FAQ</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {config.faqs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground font-mono">
                    Belum ada FAQ kustom. Klik tombol &ldquo;Tambah FAQ&rdquo; di atas.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 vt-scrollbar">
                    {config.faqs.map((faq) => (
                      <div
                        key={faq.id}
                        className={`p-3 rounded-md border text-xs font-mono transition-all ${
                          faq.enabled
                            ? "bg-[var(--vt-card)] border-border"
                            : "bg-muted/40 border-border/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[9px] uppercase px-1">
                                {faq.category}
                              </Badge>
                              <span className="font-bold text-[var(--vt-ink)] truncate">
                                {faq.question}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                              {faq.answer}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleFAQ(faq.id)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                faq.enabled
                                  ? "bg-emerald-500/20 text-emerald-600"
                                  : "bg-gray-500/20 text-gray-500"
                              }`}
                            >
                              {faq.enabled ? "Aktif" : "Mati"}
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingFaq(faq);
                                setFaqQuestion(faq.question);
                                setFaqAnswer(faq.answer);
                                setFaqCategory(faq.category);
                                setFaqModalOpen(true);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteFAQ(faq.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: SIMULATOR CHAT AI                                                   */}
        {/* ========================================================================= */}
        <TabsContent value="simulator" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold font-mono">
                Uji Coba Simulator Jawaban AI
              </CardTitle>
              <CardDescription className="text-xs">
                Ketikkan pertanyaan seperti pelanggan di WhatsApp untuk memverifikasi apakah jawaban AI sesuai dengan data produk, jasa, harga, atau SOP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chat Thread */}
              <div className="h-80 overflow-y-auto p-4 rounded-md bg-[var(--vt-card)] border border-border space-y-3 font-mono text-xs vt-scrollbar">
                {simulationHistory.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <p className="font-bold">Simulator Siap Digunakan</p>
                    <p className="text-[11px] mt-1">
                      Coba tanyakan: &ldquo;Berapa harga produk starter pack?&rdquo;, &ldquo;Bisa transfer ke rekening apa?&rdquo;, atau &ldquo;Cek order INV-20261013-2820&rdquo;
                    </p>
                  </div>
                ) : (
                  simulationHistory.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      {/* User Bubble */}
                      <div className="flex justify-end">
                        <div className="max-w-[80%] p-2.5 rounded-lg bg-primary text-primary-foreground text-xs shadow-xs">
                          {item.q}
                        </div>
                      </div>

                      {/* Bot Bubble */}
                      <div className="flex justify-start">
                        <div className="max-w-[85%] p-3 rounded-lg bg-[var(--vt-paper)] border border-border text-[var(--vt-ink)] text-xs space-y-2 shadow-xs">
                          <p className="whitespace-pre-line leading-relaxed">{item.a}</p>
                          <div className="flex items-center gap-2 pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {item.source}
                            </Badge>
                            <span>Model: {item.model}</span>
                            <span>• Latensi: {item.latency}ms</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSimulate} className="flex gap-2">
                <Input
                  value={simulateQuery}
                  onChange={(e) => setSimulateQuery(e.target.value)}
                  placeholder="Ketik pertanyaan untuk menguji respons bot WhatsApp..."
                  className="text-xs font-mono bg-[var(--vt-paper)]"
                  disabled={isSimulating}
                />
                <Button
                  type="submit"
                  disabled={isSimulating || !simulateQuery.trim()}
                  className="font-mono text-xs gap-1.5 px-4"
                >
                  {isSimulating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Kirim</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: LOG AKTIVITAS CHAT                                                  */}
        {/* ========================================================================= */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold font-mono">
                  Riwayat Chat Masuk &amp; Respon Bot
                </CardTitle>
                <CardDescription className="text-xs">
                  Pencatatan transparan untuk semua pesan yang diterima dan dibalas otomatis.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleControlAction("clear_logs")}
                disabled={logs.length === 0 || isActionPending}
                className="text-xs font-mono gap-1 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Bersihkan Log</span>
              </Button>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-xs font-mono text-muted-foreground">
                  Belum ada log pesan WhatsApp yang tercatat.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 vt-scrollbar">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-md bg-[var(--vt-card)] border border-border text-xs font-mono space-y-2"
                    >
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--vt-ink)]">
                            {log.senderName} ({log.senderPhone})
                          </span>
                          <Badge variant="outline" className="text-[9px] uppercase">
                            {log.source}
                          </Badge>
                        </div>
                        <span>{new Date(log.timestamp).toLocaleString("id-ID")}</span>
                      </div>

                      <div className="p-2 rounded bg-muted/40 text-[var(--vt-ink)]">
                        <span className="text-[10px] text-muted-foreground block font-bold mb-0.5">
                          Pesan Masuk:
                        </span>
                        {log.message}
                      </div>

                      {log.reply && (
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold mb-0.5">
                            Balasan Bot ({log.modelUsed || "AI Engine"}):
                          </span>
                          <p className="whitespace-pre-line">{log.reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Dialog Tambah / Edit FAQ */}
      <Dialog open={faqModalOpen} onOpenChange={setFaqModalOpen}>
        <DialogContent className="max-w-md font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingFaq ? "Edit Tanya Jawab (FAQ)" : "Tambah FAQ Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pertanyaan ini akan dikenali oleh Bot WhatsApp dan dijawab secara akurat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Kategori</Label>
              <select
                value={faqCategory}
                onChange={(e) =>
                  setFaqCategory(e.target.value as WAKnowledgeFAQ["category"])
                }
                className="w-full p-2 bg-[var(--vt-paper)] border border-border rounded-xs text-xs"
              >
                <option value="umum">Umum</option>
                <option value="produk">Produk &amp; Katalog</option>
                <option value="jasa">Jasa &amp; Layanan</option>
                <option value="pembayaran">Pembayaran &amp; Rekening</option>
                <option value="garansi">Garansi &amp; Support</option>
              </select>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Pertanyaan *</Label>
              <Input
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
                placeholder="Contoh: Apakah ada garansi untuk website?"
                className="text-xs bg-[var(--vt-paper)]"
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">Jawaban Resmi *</Label>
              <Textarea
                rows={4}
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                placeholder="Tuliskan jawaban yang akan dikirimkan bot ke customer..."
                className="text-xs bg-[var(--vt-paper)]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFaqModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveFAQ} className="text-xs">
              Simpan FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
