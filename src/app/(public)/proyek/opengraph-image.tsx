import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Katalog Proyek & Portofolio — Sigit Web Porto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SHELL = {
  bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  wrap: { background: "rgba(59,130,246,0.15)", border: "2px solid rgba(59,130,246,0.4)", color: "#93c5fd" },
};

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ background: SHELL.bg, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#f8fafc", padding: "48px", position: "relative", overflow: "hidden", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(59,130,246,0.12) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ ...SHELL.wrap, borderRadius: "8px", padding: "8px 16px", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", letterSpacing: "1px" }}>SIGITOS // PROJECTS</div>
          <div style={{ fontSize: "22px", fontFamily: "monospace", color: "#64748b", fontWeight: 600 }}>sigitadi.id</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "40px", position: "relative", flex: 1 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "18px" }}>
            <h1 style={{ fontSize: "52px", fontWeight: 800, margin: 0, lineHeight: 1.15, color: "#f1f5f9" }}>Katalog Proyek &amp; Portofolio Karya Digital</h1>
            <p style={{ fontSize: "26px", fontWeight: 400, color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>Eksplorasi solusi digital untuk bisnis, komunitas, dan institusi pendidikan.</p>
          </div>
          <div style={{ width: 320, height: 320, borderRadius: "24px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "4px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "140px", fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: "0 12px 40px rgba(59,130,246,0.4)" }}>P</div>
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: "22px", fontFamily: "monospace", color: "#94a3b8", fontWeight: 600 }}>Full-Stack Developer &bull; AI Automation &bull; Cloud Architecture</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
