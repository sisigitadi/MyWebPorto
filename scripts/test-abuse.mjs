// 25 request cepat ke /api/retrobot → harus 429 + Retry-After setelah kuota
const results = [];
for (let i = 1; i <= 25; i++) {
  const res = await fetch("http://localhost:3000/api/retrobot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "siapa pemilik web ini?", lang: "id" }),
  });
  results.push({ i, status: res.status, retryAfter: res.headers.get("retry-after") });
}
const codes = {};
for (const r of results) codes[r.status] = (codes[r.status] || 0) + 1;
console.log("status codes:", codes);
const first429 = results.find((r) => r.status === 429);
console.log("429 pertama:", first429 || "TIDAK ADA (gagal)");
console.log("Retry-After header:", first429?.retryAfter || "-");

// Body berukuran berlebih → 413/400, bukan 500
const big = await fetch("http://localhost:3000/api/retrobot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "x".repeat(20000) }),
});
console.log("oversized body:", big.status);

// Body rusak → 400
const bad = await fetch("http://localhost:3000/api/retrobot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{not json",
});
console.log("malformed body:", bad.status);
