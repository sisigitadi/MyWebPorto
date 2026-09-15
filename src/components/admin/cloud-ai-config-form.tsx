"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cloud, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { saveCloudAIConfigAction } from "@/lib/actions";
import type { AdminCloudAIView, CloudProvider } from "@/lib/cloud-ai-config";

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
  const [error, setError] = useState("");

  const providerMeta = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0];
  const isOpenAI = provider === "openai";
  // Tampilkan hint "kosongkan untuk tetap" hanya bila sudah ada key tersimpan.
  const keyPlaceholder = initial.hasKey
    ? `${initial.maskedKey} — kosongkan untuk tetap`
    : "AIza… / sk-…";

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
            <Input
              id="cloud-ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={isOpenAI ? "gpt-4o-mini" : "gemini-2.5-flash"}
              spellCheck={false}
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              {isOpenAI
                ? "Sesuai penyedia Base URL di bawah (mis. deepseek-chat, llama-3.3-70b)."
                : "Lihat daftar model di aistudio.google.com."}
            </p>
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
