import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

function isTranslationErrorPayload(text) {
  if (!text) return false;
  const upper = text.toUpperCase();
  return (
    upper.includes("QUERY LENGTH LIMIT EXCEEDED") ||
    upper.includes("MAX ALLOWED QUERY") ||
    upper.includes("MYMEMORY WARNING") ||
    upper.includes("INVALID TARGET LANGUAGE") ||
    upper.includes("YOU HAVE USED ALL AVAILABLE") ||
    upper.includes("DAILY LIMIT EXCEEDED") ||
    upper.includes("IS NOT A VALID LANGPAIR")
  );
}

const GEMINI_PRO_CLEAN_EN = `Google Gemini Pro premium access for a full 18 months to boost your research, coding, and writing productivity without limitations. Smart solutions powered by the most advanced AI models with maximum cost efficiency.

Key Features & Benefits:

Advanced Model Access: Support for high-level reasoning, code analysis, and complex text data processing.

Wide Context Window: Able to read, summarize, and process long documents at once.

Long Duration 18 Months: More economical and practical without the hassle of re-subscribing every month.

Quick Activation & Complete Guide: Ready to use straight away for professional or study needs.`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL found. Skipping DB healing.');
    return;
  }

  const sql = neon(process.env.DATABASE_URL);

  // 1. Repair Gemini Pro 18 Bulan product specifically
  await sql.query(
    `UPDATE products 
     SET description_en = $1, title_en = $2 
     WHERE id = 'cdc65e19-706a-4328-97f0-675137411ed8' OR title ILIKE '%Gemini Pro 18 Bulan%'`,
    [GEMINI_PRO_CLEAN_EN, 'Gemini Pro 18 Months']
  );
  console.log('Gemini Pro 18 Bulan description_en updated to clean translation.');

  // 2. Scan and clean all other tables
  const tables = [
    { name: 'products', fields: ['title_en', 'description_en'] },
    { name: 'services', fields: ['title_en', 'description_en'] },
    { name: 'projects', fields: ['title_en', 'summary_en', 'description_en'] },
    { name: 'articles', fields: ['title_en', 'summary_en', 'content_en'] },
    { name: 'testimonials', fields: ['client_role_en', 'content_en'] },
    { name: 'profiles', fields: ['headline_en', 'bio_en'] },
  ];

  for (const t of tables) {
    try {
      const rows = await sql.query(`SELECT id, ${t.fields.join(', ')} FROM ${t.name}`);
      for (const row of rows) {
        for (const f of t.fields) {
          const val = row[f];
          if (typeof val === 'string' && isTranslationErrorPayload(val)) {
            console.log(`Cleaning error payload in ${t.name}.${f} for row ${row.id}`);
            await sql.query(`UPDATE ${t.name} SET ${f} = NULL WHERE id = $1`, [row.id]);
          }
        }
      }
    } catch (err) {
      console.warn(`Table ${t.name} scan error (might not exist):`, err.message);
    }
  }

  console.log('Database translation healing completed.');
}

main().catch(console.error);
