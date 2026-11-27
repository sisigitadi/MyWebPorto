/**
 * Pure normalization helpers for array JSONB columns (tolerating double-encoded
 * JSON strings) and Redaksi narrative Markdown cleanup.
 */

const BOILERPLATE_POST_FAQ_HEADINGS = [
  "bagaimana arsitektur sistem menjamin keandalan skala besar",
  "apa saja metrik dampak dan hasil implementasi riil",
];

const FAQ_HEADING_RE =
  /^##\s+.*(?:faq|pertanyaan\s+umum|pertanyaan\s+yang\s+sering|frequently\s+asked|tanya[\s-]jawab)/i;

/**
 * Normalizes a string array field that may arrive as a native `string[]`
 * or as a single/double-encoded JSONB string (e.g. `"[\"Next.js\",\"GSAP\"]"`).
 */
export function normalizeStringArray(val: unknown): string[] {
  let current: unknown = val;

  for (let depth = 0; depth < 3; depth += 1) {
    if (Array.isArray(current)) {
      return current
        .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
        .filter((item) => item.length > 0);
    }
    if (typeof current === "string") {
      const trimmed = current.trim();
      if (!trimmed || trimmed === "[]") return [];
      if (trimmed.startsWith("[") || trimmed.startsWith('"')) {
        try {
          current = JSON.parse(trimmed);
          continue;
        } catch {
          break;
        }
      }
      if (trimmed.includes(",")) {
        return trimmed
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return [trimmed];
    }
    break;
  }

  return [];
}

function normalizeHeadingKey(headingLine: string): string {
  return headingLine
    .replace(/^##\s+/, "")
    .replace(/[?!.:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Strips dangling line-continuation backslashes (`\` before blank lines or EOF),
 * removes duplicate H2 sections, and drops corrupted post-FAQ boilerplate/FAQ blocks.
 * Respects fenced code blocks so shell/code examples are never altered.
 */
export function sanitizeNarrativeMarkdown(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  interface Section {
    heading: string | null;
    lines: string[];
  }

  const sections: Section[] = [{ heading: null, lines: [] }];
  let inCodeFence = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
    }

    if (!inCodeFence && /^##\s+\S/.test(rawLine)) {
      sections.push({ heading: rawLine, lines: [rawLine] });
      continue;
    }

    // Strip dangling trailing backslash at end of prose lines (e.g. `...intervention.\`).
    const cleanedLine = !inCodeFence ? rawLine.replace(/\\+\s*$/, "") : rawLine;
    sections[sections.length - 1].lines.push(cleanedLine);
  }

  const seenHeadings = new Set<string>();
  let seenFaq = false;
  const keptBlocks: string[] = [];

  for (const section of sections) {
    if (!section.heading) {
      const intro = section.lines.join("\n").trim();
      if (intro) keptBlocks.push(intro);
      continue;
    }

    const key = normalizeHeadingKey(section.heading);
    const isFaq = FAQ_HEADING_RE.test(section.heading);

    if (seenHeadings.has(key)) {
      continue;
    }
    if (seenFaq) {
      if (isFaq) continue;
      if (BOILERPLATE_POST_FAQ_HEADINGS.some((b) => key.includes(b))) {
        continue;
      }
    }

    seenHeadings.add(key);
    if (isFaq) {
      seenFaq = true;
    }

    const text = section.lines.join("\n").trim();
    if (text) keptBlocks.push(text);
  }

  return keptBlocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
