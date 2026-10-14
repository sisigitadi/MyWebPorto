import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import sharp from "sharp";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL tidak ditemukan di .env.local atau environment variables.");
  process.exit(1);
}

const sql = neon(dbUrl);

async function run() {
  console.log("🚀 Memulai optimasi seluruh media di database ke WebP / SVG...");

  const rows = await sql`SELECT id, name, mime, size, data FROM media`;
  console.log(`📦 Ditemukan ${rows.length} file media di database.`);

  let totalBefore = 0;
  let totalAfter = 0;
  let convertedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const rawBuffer = Buffer.from(row.data);
    const beforeSize = rawBuffer.length;
    totalBefore += beforeSize;

    if (row.mime === "image/svg+xml") {
      console.log(`⏭️  [SVG] ${row.name} dipertahankan sebagai vektor (${(beforeSize / 1024).toFixed(1)} KB)`);
      totalAfter += beforeSize;
      skippedCount++;
      continue;
    }

    try {
      const metadata = await sharp(rawBuffer).metadata();
      let optimizedBuffer;
      let targetMime = "image/webp";

      if (metadata.pages && metadata.pages > 1) {
        // Animated GIF -> animated WebP
        optimizedBuffer = await sharp(rawBuffer, { animated: true })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
      } else {
        // Raster photo/graphic -> WebP quality 82, max 1920px inside
        optimizedBuffer = await sharp(rawBuffer)
          .rotate()
          .resize({
            width: 1920,
            height: 1920,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();
      }

      const afterSize = optimizedBuffer.length;

      if (afterSize < beforeSize || row.mime !== "image/webp") {
        const newName = (row.name || "image").replace(/\.[^/.]+$/, ".webp");
        await sql`
          UPDATE media
          SET data = ${optimizedBuffer}, mime = ${targetMime}, size = ${afterSize}, name = ${newName}
          WHERE id = ${row.id}
        `;
        totalAfter += afterSize;
        convertedCount++;
        const pct = Math.round(((beforeSize - afterSize) / beforeSize) * 100);
        console.log(
          `✅ [WebP] ${row.name} ➔ ${(beforeSize / 1024).toFixed(1)} KB ➔ ${(afterSize / 1024).toFixed(1)} KB (hemat ${pct}%)`
        );
      } else {
        totalAfter += beforeSize;
        skippedCount++;
        console.log(`ℹ️ [Skip] ${row.name} sudah optimal (${(beforeSize / 1024).toFixed(1)} KB)`);
      }
    } catch (err) {
      console.error(`❌ Gagal optimasi ${row.name} (${row.id}):`, err.message);
      totalAfter += beforeSize;
    }
  }

  const savedKb = Math.round((totalBefore - totalAfter) / 1024);
  const savedMb = (savedKb / 1024).toFixed(2);
  const totalSavedPct = totalBefore > 0 ? Math.round(((totalBefore - totalAfter) / totalBefore) * 100) : 0;

  console.log("\n===========================================");
  console.log(`🎉 Selesai! Ringkasan Optimasi Media:`);
  console.log(`- Total Gambar: ${rows.length}`);
  console.log(`- Berhasil Dikonversi: ${convertedCount}`);
  console.log(`- Dilewati (Sudah optimal / SVG): ${skippedCount}`);
  console.log(`- Ukuran Awal: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Ukuran Akhir: ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Total Penghematan Storage: ${savedMb} MB (${totalSavedPct}% hemat!)`);
  console.log("===========================================\n");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
