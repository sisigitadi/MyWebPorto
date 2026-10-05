# SINKRONISASI BANTUAN AI <-> ANALISIS SEO + GEO

Dokumen ini menjelaskan kontrak teknis antara tombol **"Bantuan AI"** di
Redaksi (`/admin/redaksi`) dan tombol **"Analisis SEO"**. Keduanya dulu berjalan
dengan dua mesin aturan terpisah sehingga saling bertentangan. Sekarang
keduanya membaca **satu sumber kebenaran**.

> Ringkasnya: **angka tidak boleh ditulis dua kali, aturan tidak boleh
> dihitung dua kali, dan field tidak boleh dipetakan dua kali.** Kalau salah
> satu diulang, desync kembali muncul.

---

## 1. Peta modul

| Berkas | Peran | Wajib import? |
| --- | --- | --- |
| `src/lib/seo-rules.ts` | Satu-satunya sumber ambang + skop per tipe + blok prompt | Tidak mengimpor modul lain — murni |
| `src/lib/seo-keywords.ts` | `analyzeSeo()` — analyzer SEO + GEO | Mengimpor `seo-rules` |
| `src/lib/seo-remediate.ts` | `remediateDraft()` — perbaikan otomatis draf | Mengimpor `seo-rules` **dan** `seo-keywords` |
| `src/lib/redaksi-meta.ts` | Registry tipe konten + `seoFieldsFor()` pemetaan field | Murni, aman di bundle browser |
| `src/lib/redaksi-draft.ts` | `buildPrompt()` + `applySeoSync()` + jalur provider | Server-only |
| `src/lib/actions.ts` | `analyzeContentSeoAction()` meneruskan `type` | Server-only |

Tidak ada siklus import: `seo-keywords` hanya tahu `seo-rules`, dan
`seo-remediate` boleh tahu keduanya.

---

## 2. Tiga lapis yang harus tetap satu

### 2.1 Satu sumber ambang (`seo-rules.ts`)

`SEO_RULES` (judul, meta, slug, panjang isi, H2, internal link, density,
kalimat) dan `GEO_RULES` (answer-first, sub-judul tanya, fakta berangka,
daftar, panjang paragraf) didefinisikan sekali. Tidak ada angka yang ditulis
ulang di modul lain — termasuk di dalam kalimat prompt.

`seoGeoPromptBlock(lang, scope)` membangun blok prompt **dari konstanta itu**,
sehingga mengubah `SEO_RULES.title.max` otomatis mengubah prompt dan analyzer
bersamaan.

### 2.2 Satu skop per tipe konten (`seoScopeFor(type)`)

Aturan artikel tidak berlaku untuk semua tipe. `SEO_SCOPES` menentukan mana
yang berlaku:

| Tipe | slug | meta | minWords | H2 | internal link | density | GEO |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `article` | ya | ya | 600 | min 1, ideal 3 | 1 | ya | `full` |
| `project` | ya | ya | 600 | min 1, ideal 3 | 1 | ya | `full` |
| `product` | ya | tidak | 250 | min 1, ideal 2 | 0 | ya | `basic` |
| `service` | tidak | tidak | 150 | min 1, ideal 2 | 0 | ya | `basic` |
| `testimonial` | tidak | tidak | 60 | 0 | 0 | tidak | `none` |
| `profile` | tidak | tidak | 120 | 0 | 0 | tidak | `none` |

**`minWords` wajib lebih kecil dari kapasitas field di `validations.ts`.**
`TestimonialSchema` membatasi `content` di 2.000 karakter (~300 kata), jadi
meminta 600 kata membuat model patuh lalu ditolak Zod dengan pesan "tidak
memenuhi format". Aturan yang mustahil dipenuhi bukan aturan, hanya frustrasi.

Tingkat GEO: `full` (answer-first + sub-judul tanya + fakta + daftar),
`basic` (answer-first + paragraf pendek), `none` (tidak dinilai — testimonial
dan bio bukan halaman jawaban).

`analyzeSeo()` tanpa `type` memakai `FULL_SCOPE`, jadi perilakunya sama dengan
sebelum scoping diperkenalkan.

### 2.3 Satu pemetaan field (`seoFieldsFor(type, values)`)

Setiap tipe memakai nama field berbeda: artikel `title`/`slug`/`summary`/`content`,
proyek `title`/`slug`/`summary`/`description`, produk `title`/`slug`/`description`,
testimoni `clientName`/`content`, profil `name`/`bio`.

`seoFieldsFor()` mengembalikan `{ title, slug, meta, body }` dengan `null` untuk
field yang tidak ada pada tipenya. **Composer, server action, dan sinkronisasi
draf WAJIB memakai fungsi ini.** Dulu composer mengirim `values.title` apa
adanya, sehingga setiap testimoni dan profil langsung menampilkan tiga temuan
KRITIS (`title-empty`, `slug-empty`, `meta-empty`) yang mustahil diperbaiki.

---

## 3. Alur "Bantuan AI"

```
draftContentWithAI (server)
  |
  |-- provider gagal / teks kosong --> kerangka lokal  ---+
  |                                                      |
  +-- provider menjawab --> parseDraft (Zod) ------------+--> applySeoSync
                                                              |
                                          remediateDraft (judul, slug, panjang
                                            deskripsi, lead GEO, internal link,
                                            suntik kata kunci)
                                                              |
                                          analyzeSeo  -->  { draft, seoReport }
```

`applySeoSync` adalah **satu-satunya** titik yang mengubah draf menjadi
`DraftResult`. Kenapa satu titik, bukan dua: sebelumnya `applySeoSync` hanya
dipanggil pada jalur kerangka lokal, sedangkan jalur jawaban model langsung
mengembalikan hasil `parseDraft` apa adanya — sehingga tombol "Bantuan AI"
tidak pernah memperbaiki apa pun. Satu titik keluar membuat jalur yang
melewati sinkronisasi mustahil ditulis tanpa terlihat.

Isi `seoReport`:

| Field | Arti |
| --- | --- |
| `applied` | Perbaikan otomatis yang benar-benar dijalankan (Bahasa Indonesia) |
| `remaining` | **Temuan `analyzeSeo` apa adanya**, urut kritis → perhatian → peluang |
| `usedFallback` | `true` bila yang dimuat adalah kerangka lokal, bukan hasil AI |
| `providerError` | Alasan provider gagal dalam Bahasa Indonesia (bila ada) |
| `score` / `geoScore` | Angka analyzer yang sama persis dengan panel Analisis SEO |

`remaining` sengaja **bukan** daftar karangan modul sendiri. Dulu
`seo-remediate.ts` punya penghitung kata, density, dan H2 dengan tokenizer
berbeda, sehingga "sisa masalah" yang tampil di composer bisa berbeda dari
temuan di panel. Sekarang keduanya memanggil `analyzeSeo` yang sama.

### Apa yang tidak boleh diperbaiki otomatis

Remediator **tidak pernah** mengarang fakta, angka, atau URL. Yang boleh:
memotong kelebihan, membersihkan sisa teks model, menyusun ulang struktur yang
sudah ada, dan menambah kalimat penyata isi yang jujur (mis. "Ulasan ini
mencakup konteks, contoh penerapan, dan langkah yang bisa langsung diikuti").

Tautan internal hanya boleh memakai path dari daftar halaman terbit yang
diberikan server action. Tanpa daftar itu, tidak ada tautan yang ditambahkan —
dan itu dilaporkan di `remaining`, bukan disembunyikan.

---

## 4. Aturan yang sedang mengikat

Kalau salah satu ini dilanggar, desync akan muncul lagi:

1. **Jangan menulis angka ambang di luar `seo-rules.ts`.** Kalau butuh
   ambang baru, tambahkan ke `SEO_RULES`/`GEO_RULES` atau ke skop tipenya.
2. **Jangan menambah mesin aturan di remediator.** Pakai `analyzeSeo`; kalau
   perlu metrik, pakai metrik yang sudah ada di `SeoMetrics`.
3. **Jangan menambah jalur keluar dari `draftContentWithAI`** yang mengembalikan
   draf tanpa `applySeoSync`.
4. **Jangan memetakan field sendiri.** Pakai `seoFieldsFor()`; kalau tipenya
   punya field baru, tambahkan ke `redaksi-meta.ts`.
5. **Jangan memberi tahu analyzer `values.title`** untuk tipe yang memakai
   `clientName`/`name` — itu memunculkan temuan palsu.
6. **Jangan menaikkan `minWords` di atas kapasitas field** di
   `validations.ts`.
7. **Teruskan `type` ke `analyzeSeo()`.** Tanpa itu analyzer memakai skop
   artikel dan menagih field yang memang tidak ada.
8. **Kata kunci untuk disuntik ke deskripsi diambil dari `pickPrimaryKeyword`**,
   algoritma yang sama dengan analyzer. Kalau remediator menebak sendiri,
   "sudah diberi kata kunci" bisa tetap ditolak temuan `meta-keyword`.

---

## 5. Menambah tipe konten baru

1. Tambahkan entri ke `REDAKSI_TYPES` di `src/lib/redaksi-meta.ts` (`bodyField`,
   `titleField`, `listField`, `requiresImage`).
2. Tambahkan skop ke `SEO_SCOPES` di `src/lib/seo-rules.ts`, dengan `minWords`
   di bawah kapasitas field barunya di `validations.ts`.
3. Tambahkan field ke `COMPOSER_FIELDS` di `src/components/admin/redaksi-composer.tsx`.
4. Prompt, analyzer, dan remediator langsung ikut mengikuti — tidak ada tempat
   lain yang perlu disentuh.

---

## 6. Test yang menjaga kontrak

| Berkas test | Yang dijaga |
| --- | --- |
| `tests/seo-rules.test.ts` | Angka di prompt == angka analyzer; detektor GEO; `remediateDraft` tidak mengarang |
| `tests/seo-scope.test.ts` | Aturan per tipe (prompt, analyzer, laporan); pemetaan field tunggal; `remaining` == temuan analyzer |
| `tests/redaksi-draft.test.ts` | `applySeoSync` memperbaiki draf dan skornya cocok dengan analisis manual; `buildPrompt` hanya meminta yang berlaku |

Semua modul yang diuji murni (tanpa network, tanpa database), jadi kontrak ini
dijalankan di setiap `npm test` — bukan hanya saat ada insiden.

Untuk menguji perubahan aturan, tambah test-nya di `tests/seo-scope.test.ts`:
kontrak yang tidak punya test akan bocor kembali tanpa terdeteksi.
