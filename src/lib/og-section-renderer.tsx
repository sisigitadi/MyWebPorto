import React from "react";
import { getProfile, getTestimonials } from "@/lib/actions";
import { resolveOgMeta } from "@/lib/seo-config";
import { resolveOgImageSrc } from "@/lib/og-image";
import { AppId, getAppShareMeta } from "@/lib/os-apps-meta";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_CONTENT_TYPE = "image/png";

export interface SectionOgOptions {
  section: AppId | string;
  lang?: "id" | "en";
  title?: string;
  subtitle?: string;
  badge?: string;
}

export async function renderSectionOgElement(options: SectionOgOptions) {
  const lang = options.lang === "en" ? "en" : "id";
  const profile = await getProfile();
  const sectionKey = (options.section || "profil").toLowerCase();

  // Metadata dasar section
  const meta = getAppShareMeta(sectionKey as AppId, lang, profile.name);

  // Ambil override SEO global dari database jika pada bagian profil/home
  const ogConfig = sectionKey === "profil"
    ? await resolveOgMeta({
        name: profile.name,
        headline: profile.headline,
        bio: profile.bio,
      })
    : null;

  const displayTitle = options.title || (sectionKey === "profil" ? ogConfig?.title : meta.title) || profile.name;
  const displaySubtitle = options.subtitle || (sectionKey === "profil" ? ogConfig?.description : meta.summary) || profile.headline || "";
  const displayBadge = options.badge || `SIGITOS // ${meta.badge || sectionKey.toUpperCase()}`;

  // Avatar resolution untuk profil dan author chip
  const overrideImage = ogConfig && ogConfig.imageUrl !== "/opengraph-image" ? ogConfig.imageUrl : undefined;
  const resolvedAvatar = await resolveOgImageSrc(overrideImage || profile.avatarUrl || "/uploads/profile-avatar.jpg");
  const avatarSrc = resolvedAvatar?.src;
  const initial = (profile.name.charAt(0) || "S").toUpperCase();

  // Testimonial client avatar resolution (jika pada bagian testimoni)
  let clientAvatarSrc: string | null = null;
  let clientInitial = "K";
  let clientName = "Hendra Pratama";
  let clientRole = "CEO // Tech Enterprise";
  let testimonialQuote = "Kualitas pengerjaan luar biasa rapi, arsitektur kokoh, dan komunikasi sangat cepat serta solutif.";

  if (sectionKey === "testimoni") {
    try {
      const testimonials = await getTestimonials();
      const featured = testimonials.find((t) => t.published && t.avatarUrl) || testimonials[0];
      if (featured) {
        clientName = featured.clientName;
        clientRole = featured.clientRole;
        testimonialQuote = featured.content.length > 120 ? featured.content.slice(0, 117) + "..." : featured.content;
        clientInitial = (featured.clientName.charAt(0) || "K").toUpperCase();
        if (featured.avatarUrl) {
          const resolvedClient = await resolveOgImageSrc(featured.avatarUrl);
          clientAvatarSrc = resolvedClient?.src || null;
        }
      }
    } catch (e) {
      console.warn("Gagal memuat avatar testimoni untuk OG:", e);
    }
  }

  // Rendering visual sisi kanan berdasarkan bagian spesifik
  const renderSectionVisual = () => {
    switch (sectionKey) {
      case "profil":
        return (
          <div
            style={{
              width: "340px",
              height: "340px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt=""
                width={300}
                height={300}
                style={{
                  borderRadius: "28px",
                  border: "4px solid rgba(59, 130, 246, 0.4)",
                  objectFit: "cover",
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "300px",
                  height: "300px",
                  borderRadius: "28px",
                  background: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
                  border: "4px solid rgba(59, 130, 246, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "130px",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                {initial}
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(15, 23, 42, 0.95)",
                border: "2px solid rgba(16, 185, 129, 0.5)",
                borderRadius: "20px",
                padding: "6px 16px",
                fontSize: "14px",
                fontFamily: "monospace",
                color: "#6ee7b7",
                fontWeight: 700,
              }}
            >
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "flex" }} />
              <span>ONLINE // VERIFIED</span>
            </div>
          </div>
        );

      case "layanan":
        return (
          <div
            style={{
              width: "380px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                background: "rgba(30, 41, 59, 0.85)",
                border: "2px solid rgba(59, 130, 246, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", color: "#60a5fa", fontSize: "14px", fontWeight: 700, fontFamily: "monospace" }}>[01] FULL-STACK WEB</div>
              <div style={{ display: "flex", color: "#e2e8f0", fontSize: "16px", fontWeight: 700 }}>Next.js 15 • React • TypeScript</div>
              <div style={{ display: "flex", color: "#94a3b8", fontSize: "12px" }}>High-performance web applications</div>
            </div>
            <div
              style={{
                background: "rgba(30, 41, 59, 0.85)",
                border: "2px solid rgba(139, 92, 246, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", color: "#c084fc", fontSize: "14px", fontWeight: 700, fontFamily: "monospace" }}>[02] AI &amp; AGENT SYSTEMS</div>
              <div style={{ display: "flex", color: "#e2e8f0", fontSize: "16px", fontWeight: 700 }}>LLM Integration • RAG • Automation</div>
              <div style={{ display: "flex", color: "#94a3b8", fontSize: "12px" }}>Intelligent workflows &amp; assistant bots</div>
            </div>
            <div
              style={{
                background: "rgba(30, 41, 59, 0.85)",
                border: "2px solid rgba(16, 185, 129, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", color: "#34d399", fontSize: "14px", fontWeight: 700, fontFamily: "monospace" }}>[03] CLOUD &amp; SECURITY</div>
              <div style={{ display: "flex", color: "#e2e8f0", fontSize: "16px", fontWeight: 700 }}>System Hardening • PostgreSQL • CI/CD</div>
              <div style={{ display: "flex", color: "#94a3b8", fontSize: "12px" }}>Scalable &amp; bulletproof infrastructure</div>
            </div>
          </div>
        );

      case "proyek":
        return (
          <div
            style={{
              width: "380px",
              background: "#090d16",
              border: "2px solid rgba(59, 130, 246, 0.5)",
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                background: "#1e293b",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "flex" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#eab308", display: "flex" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "flex" }} />
              </div>
              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#94a3b8" }}>projects_catalog.tsx</span>
            </div>
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                fontFamily: "monospace",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", color: "#38bdf8" }}>{"const featuredStack = ["}</div>
              <div style={{ display: "flex", paddingLeft: "16px", color: "#a5f3fc" }}>{'"Next.js 15 App Router",'}</div>
              <div style={{ display: "flex", paddingLeft: "16px", color: "#a5f3fc" }}>{'"AI / Machine Learning",'}</div>
              <div style={{ display: "flex", paddingLeft: "16px", color: "#a5f3fc" }}>{'"Cybersecurity Shield",'}</div>
              <div style={{ display: "flex", paddingLeft: "16px", color: "#a5f3fc" }}>{'"PostgreSQL & Drizzle",'}</div>
              <div style={{ display: "flex", color: "#38bdf8" }}>{"];"}</div>
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "8px",
                  color: "#6ee7b7",
                  fontSize: "12px",
                  display: "flex",
                }}
              >
                {"> Status: 100% Production Ready"}
              </div>
            </div>
          </div>
        );

      case "toko":
        return (
          <div
            style={{
              width: "380px",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))",
              border: "2px solid rgba(245, 158, 11, 0.5)",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.5)", borderRadius: "6px", padding: "4px 10px", color: "#fcd34d", fontSize: "12px", fontFamily: "monospace", fontWeight: 700 }}>
                DIGITAL REPO
              </div>
              <div style={{ display: "flex", color: "#10b981", fontSize: "12px", fontFamily: "monospace", fontWeight: 700 }}>INSTANT ACCESS</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", fontSize: "20px", fontWeight: 800, color: "#f8fafc" }}>Source Code &amp; Templates</div>
              <div style={{ display: "flex", fontSize: "13px", color: "#94a3b8" }}>Clean architecture, complete documentation, and commercial license ready.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "monospace", fontSize: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0" }}>
                <span style={{ color: "#f59e0b" }}>•</span>
                <span>Next.js Production Boilerplates</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0" }}>
                <span style={{ color: "#f59e0b" }}>•</span>
                <span>Retro OS Desktop Component Library</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0" }}>
                <span style={{ color: "#f59e0b" }}>•</span>
                <span>WhatsApp &amp; Midtrans Integrated</span>
              </div>
            </div>
          </div>
        );

      case "artikel":
        return (
          <div
            style={{
              width: "380px",
              background: "#0f172a",
              border: "2px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "6px", padding: "4px 10px", color: "#38bdf8", fontSize: "12px", fontFamily: "monospace", fontWeight: 700 }}>
                DOC // INSIGHTS
              </div>
              <span style={{ color: "#94a3b8", fontSize: "12px", fontFamily: "monospace" }}>ENGINEERING LOG</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", fontSize: "18px", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 }}>
                Panduan Arsitektur &amp; Praktik Terbaik Software
              </div>
              <div style={{ display: "flex", fontSize: "13px", color: "#94a3b8", lineHeight: 1.4 }}>
                Ulasan teknis seputar Next.js, keamanan sistem, integrasi AI modern, dan rekayasa cloud.
              </div>
            </div>

            {/* Author Byline Row with Avatar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 12px",
                background: "rgba(30, 41, 59, 0.75)",
                borderRadius: "10px",
                border: "1px solid rgba(56, 189, 248, 0.25)",
              }}
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt=""
                  width={42}
                  height={42}
                  style={{
                    borderRadius: "50%",
                    border: "2px solid #38bdf8",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "#0369a1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {initial}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                  {profile.name}
                </div>
                <div style={{ display: "flex", fontSize: "11px", color: "#7dd3fc", fontFamily: "monospace" }}>
                  Author // Software Architect
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {["Architecture", "Next.js", "Security", "AI Systems"].map((tag) => (
                <div key={tag} style={{ display: "flex", background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px", padding: "3px 8px", fontSize: "11px", color: "#cbd5e1", fontFamily: "monospace" }}>
                  #{tag}
                </div>
              ))}
            </div>
          </div>
        );

      case "terminal":
        return (
          <div
            style={{
              width: "380px",
              background: "#021206",
              border: "2px solid #22c55e",
              borderRadius: "14px",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontFamily: "monospace",
              boxShadow: "0 0 30px rgba(34, 197, 94, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(34, 197, 94, 0.3)", paddingBottom: "8px" }}>
              <span style={{ color: "#86efac", fontSize: "12px" }}>SIGITOS_CLI v3.2.0</span>
              <span style={{ color: "#22c55e", fontSize: "12px" }}>CRT // VT-100</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#4ade80" }}>
              <div style={{ display: "flex" }}>$ system --status</div>
              <div style={{ display: "flex", color: "#86efac" }}>{"> Kernel: SigitOS Linux x86_64"}</div>
              <div style={{ display: "flex", color: "#86efac" }}>{"> AI Engine: Integrated LLM Ready"}</div>
              <div style={{ display: "flex", color: "#86efac" }}>{"> Shell: Interactive Retro Bash"}</div>
              <div style={{ display: "flex" }}>$ explore --all</div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#bbf7d0", marginTop: "4px" }}>
                <span>sigit@workstation:~$</span>
                <div style={{ width: "8px", height: "14px", background: "#4ade80", display: "flex" }} />
              </div>
            </div>
          </div>
        );

      case "testimoni":
        return (
          <div
            style={{
              width: "380px",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))",
              border: "2px solid rgba(234, 179, 8, 0.4)",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", color: "#facc15", fontSize: "18px", letterSpacing: "2px" }}>★★★★★</div>
              <div style={{ display: "flex", background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: "6px", padding: "3px 8px", color: "#fde047", fontSize: "11px", fontFamily: "monospace", fontWeight: 700 }}>
                5.0 / 5.0 RATING
              </div>
            </div>
            <div style={{ display: "flex", fontStyle: "italic", fontSize: "14px", color: "#e2e8f0", lineHeight: 1.5 }}>
              &quot;{testimonialQuote}&quot;
            </div>

            {/* Client Avatar & Verified Row */}
            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {clientAvatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={clientAvatarSrc}
                    alt=""
                    width={42}
                    height={42}
                    style={{
                      borderRadius: "50%",
                      border: "2px solid #facc15",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "#854d0e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#fef08a",
                    }}
                  >
                    {clientInitial}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                    {clientName}
                  </div>
                  <div style={{ display: "flex", fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                    {clientRole}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", fontSize: "10px", color: "#4ade80", fontFamily: "monospace", fontWeight: 700, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "4px", padding: "2px 6px" }}>
                VERIFIED
              </div>
            </div>
          </div>
        );

      case "kontak":
        return (
          <div
            style={{
              width: "380px",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))",
              border: "2px solid rgba(99, 102, 241, 0.5)",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)", borderRadius: "6px", padding: "4px 10px", color: "#a5b4fc", fontSize: "12px", fontFamily: "monospace", fontWeight: 700 }}>
                CONNECT // DIRECT
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "flex" }} />
                <span style={{ color: "#34d399", fontSize: "12px", fontFamily: "monospace" }}>&lt; 24h Response</span>
              </div>
            </div>

            {/* Profil Avatar Card di Kontak */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                background: "rgba(15, 23, 42, 0.65)",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(99, 102, 241, 0.3)",
              }}
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt=""
                  width={68}
                  height={68}
                  style={{
                    borderRadius: "14px",
                    border: "2px solid rgba(99, 102, 241, 0.7)",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "68px",
                    height: "68px",
                    borderRadius: "14px",
                    background: "#312e81",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    fontWeight: 800,
                    color: "#ffffff",
                  }}
                >
                  {initial}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ display: "flex", fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>
                  {profile.name}
                </div>
                <div style={{ display: "flex", fontSize: "12px", color: "#a5b4fc", fontFamily: "monospace", fontWeight: 600 }}>
                  Available for Hire // Remote
                </div>
                <div style={{ display: "flex", fontSize: "11px", color: "#94a3b8" }}>
                  {profile.location || "Jakarta, Indonesia"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>Saluran Komunikasi Cepat</div>
              <div style={{ display: "flex", fontSize: "12px", color: "#94a3b8" }}>Konsultasi arsitektur sistem, AI, dan kolaborasi proyek.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "monospace", fontSize: "12px" }}>
              <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", padding: "7px 12px", borderRadius: "8px", color: "#cbd5e1" }}>
                • Email: {profile.email || "x@sigitadi.id"}
              </div>
              <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", padding: "7px 12px", borderRadius: "8px", color: "#cbd5e1" }}>
                • WhatsApp &amp; Telegram: Direct Fast Chat
              </div>
            </div>
          </div>
        );

      case "order":
        return (
          <div
            style={{
              width: "380px",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))",
              border: "2px solid rgba(16, 185, 129, 0.5)",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "6px", padding: "4px 10px", color: "#6ee7b7", fontSize: "12px", fontFamily: "monospace", fontWeight: 700 }}>
                RECEIPT // VERIFIED
              </div>
              <div style={{ display: "flex", color: "#10b981", fontSize: "12px", fontFamily: "monospace", fontWeight: 700 }}>ORDER TRACKER</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", fontSize: "18px", fontWeight: 800, color: "#f8fafc" }}>Status &amp; Rincian Pesanan</div>
              <div style={{ display: "flex", fontSize: "13px", color: "#94a3b8" }}>Pelacakan status pembayaran, nomor resi pengiriman, dan verifikasi faktur resmi.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "monospace", fontSize: "12px" }}>
              <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", padding: "7px 12px", borderRadius: "8px", color: "#cbd5e1" }}>
                • Sistem Order: WhatsApp &amp; Transfer Bank
              </div>
              <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", padding: "7px 12px", borderRadius: "8px", color: "#6ee7b7" }}>
                • Status: Terenkripsi &amp; Terverifikasi
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #090d16 0%, #0f172a 45%, #1e293b 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#f8fafc",
        padding: "48px 56px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
    >
      {/* Background Tech Grid Dot Pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(59, 130, 246, 0.15) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
          display: "flex",
        }}
      />

      {/* Top Bar: Section Badge on Left, Author Chip on Right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div
          style={{
            background: "rgba(59, 130, 246, 0.15)",
            border: "2px solid rgba(59, 130, 246, 0.4)",
            borderRadius: "8px",
            padding: "8px 18px",
            fontSize: "20px",
            fontWeight: 800,
            fontFamily: "monospace",
            letterSpacing: "1.5px",
            color: "#93c5fd",
            display: "flex",
          }}
        >
          {displayBadge}
        </div>

        {/* Author Chip: Mini-avatar & Creator Domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            borderRadius: "40px",
            padding: "4px 14px 4px 6px",
          }}
        >
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              width={38}
              height={38}
              style={{
                borderRadius: "50%",
                border: "2px solid #3b82f6",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", lineHeight: 1.2 }}>
              {profile.name}
            </span>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#60a5fa", fontWeight: 600 }}>
              sigitadi.id
            </span>
          </div>
        </div>
      </div>

      {/* Middle Body: Text Info on Left, Dedicated Graphic on Right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "40px",
          position: "relative",
          flex: 1,
          marginTop: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: "680px",
          }}
        >
          <h1
            style={{
              fontSize: displayTitle.length > 45 ? "42px" : "50px",
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.15,
              color: "#f8fafc",
              letterSpacing: "-0.5px",
              display: "flex",
            }}
          >
            {displayTitle.length > 70 ? displayTitle.slice(0, 67) + "..." : displayTitle}
          </h1>
          <p
            style={{
              fontSize: "22px",
              fontWeight: 400,
              color: "#94a3b8",
              margin: 0,
              lineHeight: 1.45,
              display: "flex",
            }}
          >
            {displaySubtitle.length > 130 ? displaySubtitle.slice(0, 127) + "..." : displaySubtitle}
          </p>
        </div>

        {renderSectionVisual()}
      </div>

      {/* Bottom Bar: System Indicators & Tech Stack */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          paddingTop: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981", display: "flex" }} />
          <span style={{ fontSize: "18px", fontFamily: "monospace", color: "#94a3b8", fontWeight: 600 }}>
            Artificial Intelligence • Cybersecurity • Systems Architecture
          </span>
        </div>
        <div style={{ fontSize: "16px", fontFamily: "monospace", color: "#64748b", display: "flex" }}>
          SigitOS // Workstation
        </div>
      </div>
    </div>
  );
}
