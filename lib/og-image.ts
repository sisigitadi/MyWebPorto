import React from "react";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

interface CreateOgImageOptions {
  title: string;
  subtitle?: string;
  badge: string;
  imageUrl?: string;
  initial?: string;
}

export function createOgImage({
  title,
  subtitle,
  badge,
  imageUrl,
  initial = "S",
}: CreateOgImageOptions): ImageResponse {
  const safeTitle = title.length > 70 ? title.slice(0, 67) + "..." : title;
  const safeSubtitle = subtitle
    ? subtitle.length > 90
      ? subtitle.slice(0, 87) + "..."
      : subtitle
    : "";

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: "#f8fafc",
          padding: "48px",
          position: "relative",
          overflow: "hidden",
        },
      },
      // decorative grid
      React.createElement("div", {
        style: {
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(59,130,246,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        },
      }),
      // top row: badge + domain
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(59,130,246,0.15)",
              border: "2px solid rgba(59,130,246,0.4)",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "20px",
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "1px",
              color: "#93c5fd",
            },
          },
          `SIGITOS // ${badge}`
        ),
        React.createElement(
          "div",
          { style: { fontSize: "22px", fontFamily: "monospace", color: "#64748b", fontWeight: 600 } },
          "sigitadi.id"
        )
      ),
      // center content
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "40px",
            position: "relative",
            flex: 1,
          },
        },
        React.createElement(
          "div",
          { style: { flex: 1, display: "flex", flexDirection: "column", gap: "18px" } },
          React.createElement(
            "h1",
            {
              style: {
                fontSize: "52px",
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.15,
                color: "#f1f5f9",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              },
            },
            safeTitle
          ),
          safeSubtitle
            ? React.createElement(
                "p",
                {
                  style: {
                    fontSize: "26px",
                    fontWeight: 400,
                    color: "#94a3b8",
                    margin: 0,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  },
                },
                safeSubtitle
              )
            : null
        ),
        imageUrl
          ? React.createElement("img", {
              src: imageUrl,
              alt: "",
              width: 320,
              height: 320,
              style: {
                borderRadius: "24px",
                border: "4px solid rgba(255,255,255,0.15)",
                objectFit: "cover",
                flexShrink: 0,
                boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              },
            })
          : React.createElement(
              "div",
              {
                style: {
                  width: 320,
                  height: 320,
                  borderRadius: "24px",
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  border: "4px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "140px",
                  fontWeight: 800,
                  color: "#ffffff",
                  flexShrink: 0,
                  boxShadow: "0 12px 40px rgba(59,130,246,0.4)",
                },
              },
              initial
            )
      ),
      // bottom tagline
      React.createElement(
        "div",
        { style: { position: "relative", display: "flex", alignItems: "center", gap: "10px" } },
        React.createElement("div", {
          style: { width: "14px", height: "14px", borderRadius: "50%", background: "#10b981" },
        }),
        React.createElement(
          "span",
          { style: { fontSize: "22px", fontFamily: "monospace", color: "#94a3b8", fontWeight: 600 } },
          "Full-Stack Developer \u2022 AI Automation \u2022 Cloud Architecture"
        )
      )
    ),
    {
      ...OG_SIZE,
    }
  );
}
