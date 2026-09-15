"use client";

/**
 * RetroBot — avatar robot modern (sleek, borderless).
 *
 * Bentuk halus (rounded rect + lingkaran) dengan gradien metalik dan layar
 * wajah gelap bermata cyan bercahaya — bukan pixel-art kotak Win95 lagi.
 * Palet netral + satu aksen cyan agar terbaca di keempat tema OS
 * (retro90s/dark/tokyo/vscode); TIDAK ada border/stroke keras.
 *
 * Animasi (idle/thinking/talking) diatur lewat prop `mood` + keyframes CSS
 * global di globals.css (.rb-bob / .rb-blink / .rb-led / .rb-spin / rb-mouth).
 */

export type RetroBotMood = "idle" | "thinking" | "talking";

interface RetroBotAvatarProps {
  mood?: RetroBotMood;
  className?: string;
  size?: number;
}

export function RetroBotAvatar({
  mood = "idle",
  className = "",
  size = 56,
}: RetroBotAvatarProps) {
  const thinking = mood === "thinking";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`rb-avatar ${className}`}
      role="img"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Metalik tubuh: terang di atas, gelap di bawah (sumber cahaya atas). */}
        <linearGradient id="rb-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2f5f9" />
          <stop offset="45%" stopColor="#c9d1dc" />
          <stop offset="100%" stopColor="#8f98a8" />
        </linearGradient>
        {/* Layar wajah: gelap dalam dengan sedikit cahaya atas (CRT modern). */}
        <linearGradient id="rb-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#232a38" />
          <stop offset="100%" stopColor="#12161f" />
        </linearGradient>
        {/* Mata cyan bercahaya. */}
        <radialGradient id="rb-eye" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#b8fff2" />
          <stop offset="60%" stopColor="#43e8cf" />
          <stop offset="100%" stopColor="#12b6a2" />
        </radialGradient>
        {/* Hip drop shadow lembut (mengambang). */}
        <filter id="rb-shadow" x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#0b0e14" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Bob idle (mengambang naik-turup) diterapkan di sini. */}
      <g className="rb-bob" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        {/* Antena: batang halus + LED ujung berdenyut. */}
        <line x1="32" y1="11.5" x2="32" y2="4.5" stroke="#9aa3b2" strokeWidth="2.2" strokeLinecap="round" />
        <circle
          cx="32"
          cy="3.4"
          r="2.6"
          fill="#43e8cf"
          className={`rb-led ${thinking ? "rb-led-fast" : ""}`}
        />

        <g filter="url(#rb-shadow)">
          {/* Bahu/base */}
          <rect x="17" y="49" width="30" height="11" rx="5.5" fill="url(#rb-body)" />
          {/* Leher */}
          <rect x="27" y="44" width="10" height="6" rx="2.5" fill="#aeb7c5" />
          {/* Kepala */}
          <rect x="12.5" y="10.5" width="39" height="37" rx="12.5" fill="url(#rb-body)" />
          {/* Pod telinga kiri-kanan */}
          <rect x="8.5" y="22" width="5" height="13" rx="2.5" fill="#9aa3b2" />
          <rect x="50.5" y="22" width="5" height="13" rx="2.5" fill="#9aa3b2" />
          {/* Layar wajah (visor gelap) */}
          <rect x="18" y="19.5" width="28" height="22" rx="8" fill="url(#rb-face)" />
          {/* Kilau kaca di pojok atas visor */}
          <rect x="22" y="22" width="9" height="3" rx="1.5" fill="#ffffff" opacity="0.10" />

          {/* Mata: pill cyan berkedip (redup saat thinking). */}
          <g opacity={thinking ? 0.18 : 1}>
            <rect
              x="23.5"
              y="25"
              width="5"
              height="9.5"
              rx="2.5"
              fill="url(#rb-eye)"
              className={thinking ? undefined : "rb-blink"}
            />
            <rect
              x="35.5"
              y="25"
              width="5"
              height="9.5"
              rx="2.5"
              fill="url(#rb-eye)"
              className={thinking ? undefined : "rb-blink"}
            />
          </g>

          {/* Spinner menggantikan mata saat thinking. */}
          {thinking && (
            <>
              <circle
                cx="26"
                cy="29.75"
                r="4.6"
                fill="none"
                stroke="#43e8cf"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeDasharray="16 30"
                className="rb-spin"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
              <circle
                cx="38"
                cy="29.75"
                r="4.6"
                fill="none"
                stroke="#43e8cf"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeDasharray="16 30"
                className="rb-spin"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            </>
          )}

          {/* Mulut: bar status cyan, animasi bicara. */}
          <rect
            x="27.5"
            y="37.5"
            width="9"
            height="2.8"
            rx="1.4"
            fill="#43e8cf"
            opacity={thinking ? 0.25 : 0.85}
            className="rb-mouth"
            style={
              mood === "talking"
                ? { animation: "rb-mouth 0.3s ease-in-out infinite" }
                : undefined
            }
          />
        </g>

        {/* Indikator dada (online) kecil di bawah leher. */}
        <circle cx="32" cy="54.5" r="1.9" fill="#43e8cf" className="rb-led" />
      </g>
    </svg>
  );
}
