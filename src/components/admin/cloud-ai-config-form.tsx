"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cloud, KeyRound, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { listCloudModelsAction, saveCloudAIConfigAction } from "@/lib/actions";
import type { AdminCloudAIView, CloudProvider } from "@/lib/cloud-ai-config";

const PROMPT_PLACEHOLDER = [
  "Contoh (opsional — hapus jika ingin pakai default):",
  "",
  "Kamu adalah Sigit_Bot, asisten AI untuk portofolio Sigit Adi Irianto (MyWebPorto).",
  "Cara menjawab:",
  "- Selalu ramah, to the point, dan gunakan Bahasa Indonesia kecuali pengunjung bertanya dalam bahasa Inggris.",
  "- Fokus pada: profil & pengalaman Sigit, layanan (web development, AI/automation), proyek unggulan, artikel teknis, dan cara menghubungi.",
  "- Boleh menjawab pertanyaan teknologi umum (Next.js, React, TypeScript, AI, DevOps) dengan contoh singkat.",
  "- Sebutkan nama aplikasi/halaman yang sedang dibuka pengunjung bila relevan.",
  "- Jika tidak tahu, arahkan ke kontak resmi (email/WA) di bagian Kontak.",
  "- Jangan mengarangui harga pasti; untuk penawaran selalu rujuk ke halaman kontak.",
].join("\n");

interface CloudAIConfigFormProps {
  /** Config efektif yang sudah di-mask di server (key tidak pernah mentah). */
  initial: AdminCloudAIView;
}

const PROVIDERS: { value: CloudProvider; label: string; hint: string }[] = [
  {
    value: "off",
    label: "OFF — 100% lokal (TF-IDF)",
    hint: "Default. Nol egress, tidak butuh key, jawaban tetap masuk akal untuk pertanyaan katalog.",
  },
  {
    value: "gemini",
    label: "Gemini (Google AI Studio)",
    hint: 'Dipakai hanya jika confidence jawaban lokal rendah. Dapatkan key di aistudio.google.com (gratis).',
  },
  {
    value: "openai",
    label: "OpenAI-compatible (OpenAI / DeepSeek / Groq / Ollama…)",
    hint: "Endpoint /v1/chat/completions apapun. Isi Base URL & Model sesuai penyedia.",
  },
];

/**
 * Form pengaturan Cloud AI untuk /admin/system.
 *
 * Sebelumnya satu-satunya cara mengaktifkan Gemini/OpenAI adalah menyetel env di
 * Vercel lalu redeploy. Form ini menyimpan konfigurasi di tabel `settings`
 * (server-only), menimpa env per-field — jadi admin bisa ganti provider/model/
 * key tanpa menyentuh deployment.
 *
 * Keamanan: key TIDAK PERNAH dikembalikan ke browser. Server hanya mengirim
 * versi di-mask (maskKey). Field key dikosongkan saat submit = "pertahankan key
 * yang ada", agar admin bisa ganti model tanpa mengetik ulang rahasia.
 */
export function CloudAIConfigForm({ initial }: CloudAIConfigFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState<CloudProvider>(initial.provider);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial.model);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [systemPrompt, setSystemPrompt] = useState(initial.systemPrompt || "");
  const [answerStyle, setAnswerStyle] = useState<AdminCloudAIView["answerStyle"]>(
    initial.answerStyle || "concise"
  );
  const [error, setError] = useState("");

  // Auto-fetch daftar model dari provider.
  const [models, setModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelError, setModelError] = useState("");

  const providerMeta = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0];
  const isOpenAI = provider === "openai";
  // Tampilkan hint "kosongkan untuk tetap" hanya bila sudah ada key tersimpan.
  const keyPlaceholder = initial.hasKey
    ? `${initial.maskedKey} — kosongkan untuk tetap`
    : "AIza… / sk-…";

  /**
   * Ambi daftar model dari provider memakai key & base URL yang sedang di form
   * (bila kosong, server memakai yang tersimpan). Berhasil → pilih model
   * pertama yang cocok / model saat ini bila masih ada di daftar.
   */
  const handleFetchModels = () => {
    setModelError("");
    startTransition(async () => {
      setFetchingModels(true);
      try {
        const res = await listCloudModelsAction(
          provider,
          apiKey.trim(),
          isOpenAI ? baseUrl.trim() : ""
        );
        if (res.ok) {
          setModels(res.models);
          // Pertahankan pilihan admin bila masih tersedia; jika tidak, ambil
          // model pertama yang paling relevan (flash/mini hemat bila ada).
          const current = model.trim().toLowerCase();
          const stillThere = res.models.find((m) => m.toLowerCase() === current);
          if (!stillThere) {
            const preferred =
              res.models.find((m) => /flash|mini|lite|small|haiku/i.test(m)) ||
              res.models[0];
            setModel(preferred);
          }
          toast.success(`${res.models.length} model ditemukan.`, {
            description: provider === "gemini" ? "Google AI Studio" : baseUrl.trim() || "OpenAI-compatible",
          });
        } else {
          setModelError(res.error);
          toast.error("Gagal mengambil daftar model.", { description: res.error });
        }
      } finally {
        setFetchingModels(false);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await saveCloudAIConfigAction({
        provider,
        // String kosong diterjemahkan server sebagai "jangan ubah key" — lihat
        // saveCloudAIConfig(). Tidak pernah mengirim key yang sudah di-mask.
        apiKey: apiKey.trim(),
        model: model.trim(),
        baseUrl: isOpenAI ? baseUrl.trim() : "",
        systemPrompt,
        answerStyle,
      });
      if (res.ok) {
        toast.success("Pengaturan Cloud AI disimpan.", {
          description: `Provider: ${provider === "off" ? "OFF (lokal)" : provider}${provider !== "off" ? ` · ${model.trim() || "model default"}` : ""}`,
        });
        setApiKey("");
        // Segarkan data server (maskedKey & status integrasi) tanpa full reload.
        router.refresh();
      } else {
        setError(res.error);
        toast.error("Gagal menyimpan pengaturan Cloud AI.", { description: res.error });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cloud-ai-provider">Provider</Label>
        <Select value={provider} onValueChange={(v) => setProvider(v as CloudProvider)}>
          <SelectTrigger id="cloud-ai-provider">
            <SelectValue placeholder="Pilih provider" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">{providerMeta.hint}</p>
      </div>

      {provider !== "off" && (
        <div className="space-y-1.5">
          <Label htmlFor="cloud-ai-key" className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> API Key
          </Label>
          <Input
            id="cloud-ai-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={keyPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            {initial.hasKey
              ? "Key tersimpan di server. Kosongkan field ini untuk mempertahankannya; isi untuk mengganti."
              : "Disimpan hanya di tabel settings (server), tidak pernah dikirim balik ke browser."}
          </p>
        </div>
      )}

      {provider !== "off" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cloud-ai-model">Model</Label>
            {models.length > 0 ? (
              // Daftar model berhasil diambil → pilih dari dropdown (tetap
              // bisa diketik manual lewat fallback input di bawah).
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="cloud-ai-model">
                  <SelectValue placeholder="Pilih model" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {models.map((m) => (
                    <SelectItem key={m} value={m} className="font-mono text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="cloud-ai-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={isOpenAI ? "gpt-4o-mini" : "gemini-2.5-flash"}
                spellCheck={false}
                className="font-mono"
              />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchModels}
                disabled={fetchingModels || pending}
                className="h-7 text-[11px] gap-1.5"
              >
                {fetchingModels ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Ambil Daftar Model
              </Button>
              {models.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModels([])}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  ketik manual
                </button>
              )}
            </div>
            {modelError ? (
              <p className="text-[11px] text-destructive">{modelError}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {models.length > 0
                  ? `${models.length} model ditemukan. Pilih dari daftar, atau "ketik manual".`
                  : isOpenAI
                  ? "Isi Base URL di samping lalu tekan Ambil Daftar Model."
                  : "Tekan Ambil Daftar Model setelah API Key terisi."}
              </p>
            )}
          </div>
          {isOpenAI && (
            <div className="space-y-1.5">
              <Label htmlFor="cloud-ai-base-url">Base URL</Label>
              <Input
                id="cloud-ai-base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                spellCheck={false}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Tanpa trailing slash. Untuk Ollama lokal: http://localhost:11434/v1.
              </p>
            </div>
          )}
        </div>
      )}

      {provider !== "off" && (
        <div className="space-y-1.5">
          <Label htmlFor="cloud-ai-style">Gaya Jawaban</Label>
          <Select value={answerStyle} onValueChange={(v) => setAnswerStyle(v as AdminCloudAIView["answerStyle"])}>
            <SelectTrigger id="cloud-ai-style">
              <SelectValue placeholder="Pilih gaya jawaban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">Ringkas (maks 5 kalimat) — default</SelectItem>
              <SelectItem value="detailed">Detail (3-6 paragraf/poin)</SelectItem>
              <SelectItem value="friendly">Ramah &amp; hangat</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Mengatur panjang &amp; nada jawaban Sigit_Bot (terminal &amp; RetroBot).
          </p>
        </div>
      )}

      {provider !== "off" && (
        <div className="space-y-1.5">
          <Label htmlFor="cloud-ai-prompt" className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Prompt &amp; Cara Menjawab (Sigit_Bot)
          </Label>
          <Textarea
            id="cloud-ai-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={PROMPT_PLACEHOLDER}
            rows={6}
            spellCheck={false}
            className="font-mono text-xs resize-y"
            maxLength={2000}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Konteks tambahan untuk Sigit_Bot: cara menjawab, fokus topik, persona.
              Katalog publik (keahlian/proyek/layanan/artikel) selalu disisipkan
              otomatis; kosongkan untuk pakai persona default.
            </p>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {systemPrompt.length}/2000
            </span>
          </div>
        </div>
      )}

      {initial.source === "env" && (initial.model || initial.baseUrl) && provider !== "off" && (
        <p className="text-[11px] text-muted-foreground border-l-2 border-border pl-3">
          Nilai saat ini berasal dari environment variable. Menekan Simpan akan
          menimpanya di tabel settings (env tetap ada, tapi settings dipakai lebih
          dulu).
        </p>
      )}

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
          Simpan Pengaturan
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Perubahan langsung aktif untuk Sigit_Bot &amp; terminal — tanpa redeploy.
        </span>
      </div>
    </form>
  );
}
