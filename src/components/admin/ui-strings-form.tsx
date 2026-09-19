"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages, Loader2, Save, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { saveUIStringsAction, translateFieldAction } from "@/lib/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  EDITABLE_KEYS,
  UI_STRING_LANGS,
  type StringKey,
  type UIStringsOverlay,
} from "@/lib/ui-strings-meta";
import { translations } from "@/lib/translations";
import type { Language } from "@/lib/i18n";

interface UIStringsFormProps {
  /** Overlay dari DB (sudah diresolve server-side). */
  initial: UIStringsOverlay;
}

type Rows = Record<StringKey, { id: string; en: string }>;

// EDITABLE_KEYS dideklarasikan `as const satisfies readonly EditableKeyDef[]`,
// jadi tipenya menyempit jadi union literal — sebagian member tidak punya
// `hint` dan akses def.hint/def.key ditolak compiler. Alias tipe longgar ini
// hanya untuk iterasi form (key dikeraskan jadi StringKey); validasi nilai
// tetap 100% di sisi server (saveUIStrings: allowlist + panjang + sanitasi).
type EditableDef = {
  key: StringKey;
  label: string;
  group: string;
  maxLength: number;
  hint?: string;
};
const EDITABLE_DEFS: readonly EditableDef[] = EDITABLE_KEYS;

/** Teks efektif saat ini: overlay DB bila ada, kalau tidak default kode. */
function buildRows(overlay: UIStringsOverlay): Rows {
  const rows = {} as Rows;
  for (const def of EDITABLE_DEFS) {
    const defk = def.key;
    rows[defk] = {
      id: overlay.id[defk] ?? defaultFor(def.key, "id"),
      en: overlay.en[defk] ?? defaultFor(def.key, "en"),
    };
  }
  return rows;
}

function defaultFor(key: string, lang: Language): string {
  // Translations adalah interface (tanpa index signature), jadi cast ke
  // Record<string, string> harus lewat unknown; lihat task-5-report.md.
  const table = translations[lang] as unknown as Record<string, string>;
  return table[key] ?? "";
}

/**
 * Form untuk /admin/strings: edit 22 teks marketing × 2 bahasa.
 *
 * State selalu menampilkan teks EFEKTIF (DB atau default), jadi admin melihat
 * kondisi sebenarnya. Kembali ke default = kosongkan kolom (value kosong tidak
 * disimpan → overlay hilang → default kode dipakai). Submit menyalin state ke
 * server action, yang memvalidasi ulang (verifyAdmin + allowlist + panjang +
 * sanitasi) — manipulasi client tidak pernah menerobos.
 */
export function UIStringsForm({ initial }: UIStringsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Rows>(() => buildRows(initial));
  const [error, setError] = useState("");

  const baseline = buildRows(initial);
  const isDirty = JSON.stringify(rows) !== JSON.stringify(baseline);

  // Guard "belum disimpan" (sama dengan 6 form admin lain). sessionKey memakai
  // isi initial, bukan object-nya: prop initial selalu dibuat baru tiap render,
  // tapi isinya stabil selama mengetik (yang berubah rows, bukan initial) —
  // jadi baseline tidak ter-reset di tengah pengetikan. Setelah Simpan sukses,
  // router.refresh() mengirim initial yang isinya sudah berisi teks disimpan:
  // stringify berubah → baseline ter-reset → dirty kembali false (menutup
  // jendela "isDirty usang" antara simpan dan selesainya refresh).
  useUnsavedChanges(JSON.stringify(initial), rows);

  const handleChange = (key: StringKey, lang: "id" | "en", value: string): void => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], [lang]: value } }));
  };

  const resetAll = (): void => {
    setRows(baseline);
    setError("");
  };

  const resetKey = (key: StringKey): void => {
    setRows((prev) => ({
      ...prev,
      [key]: { id: defaultFor(key, "id"), en: defaultFor(key, "en") },
    }));
  };

  const translateKey = async (key: StringKey): Promise<void> => {
    const idText = rows[key].id;
    if (!idText.trim()) {
      toast.error("Isi teks Indonesian dulu sebelum menerjemahkan.");
      return;
    }
    const res = await translateFieldAction(idText, "id", "en");
    if (res.success) {
      handleChange(key, "en", res.text);
      toast.success("Terjemahan English diisi.", { description: res.text.slice(0, 80) });
    } else {
      toast.error("Gagal menerjemahkan.", { description: res.error });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const payload: UIStringsOverlay = { id: {}, en: {} };
      for (const def of EDITABLE_DEFS) {
        const k = def.key;
        // Hanya kirim slot yang BERBEDA dari default kode. Kolom form selalu
        // menampilkan teks efektif (buildRows mengisi default saat kolom DB
        // kosong) — bila semuanya dikirim, simpanan pertama akan menulis
        // seluruh default kode ke DB, sehingga perbaikan default di
        // translations.ts tak pernah sampai ke pengunjung. Slot yang sama
        // dengan default dikosongkan → overlay hilang → default dipakai.
        if (rows[k].id !== defaultFor(k, "id")) payload.id[k] = rows[k].id;
        if (rows[k].en !== defaultFor(k, "en")) payload.en[k] = rows[k].en;
      }
      const res = await saveUIStringsAction(payload);
      if (res.ok) {
        setRows(buildRows(res.strings));
        toast.success("Teks UI disimpan.", {
          description: "Tampilan publik langsung diperbarui untuk kedua bahasa.",
        });
        router.refresh();
      } else {
        setError(res.error);
        toast.error("Gagal menyimpan teks UI.", { description: res.error });
      }
    });
  };

  const groups = [...new Set(EDITABLE_DEFS.map((k) => k.group))];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {groups.map((group) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {group}
          </h3>
          {EDITABLE_DEFS.filter((k) => k.group === group).map((def) => {
            const k = def.key;
            const row = rows[k];
            const overridden =
              baseline[k].id !== row.id || baseline[k].en !== row.en;
            return (
              <div
                key={k}
                className="grid grid-cols-1 md:grid-cols-2 gap-2 border-2 rounded-md p-3 transition-colors"
                style={{ borderColor: overridden ? "var(--primary)" : "var(--border)" }}
              >
                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold">{def.label}</span>
                    {def.hint && (
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {def.hint}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => resetKey(k)}
                    disabled={pending}
                    className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                    title="Kedua kolom kembali ke teks default"
                  >
                    <RotateCcw className="h-3 w-3" /> Default
                  </button>
                </div>
                {UI_STRING_LANGS.map((lang) => (
                  <div key={lang} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase text-muted-foreground">
                        {lang === "id" ? "Indonesia" : "English"}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          row[lang].length > def.maxLength
                            ? "text-destructive"
                            : row[lang].length > def.maxLength * 0.8
                            ? "text-amber-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {row[lang].length}/{def.maxLength}
                      </span>
                    </div>
                    <Textarea
                      value={row[lang]}
                      onChange={(e) => handleChange(k, lang, e.target.value)}
                      disabled={pending}
                      rows={def.maxLength > 100 ? 3 : 2}
                      className="text-sm resize-y"
                      aria-label={`${def.label} — ${lang === "id" ? "Indonesia" : "English"}`}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => translateKey(k)}
                    disabled={pending}
                    className="h-7 text-[11px]"
                  >
                    <Sparkles className="h-3 w-3" /> Terjemahkan ID → EN
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Teks
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={resetAll}
          disabled={pending || !isDirty}
          className="h-9"
        >
          Batal Perubahan
        </Button>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Languages className="h-3 w-3" />
          {isDirty
            ? "Ada perubahan yang belum disimpan."
            : `${EDITABLE_KEYS.length} teks · 2 bahasa.`}
        </span>
      </div>
    </form>
  );
}
