import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/actions";

// Route segment config
export const runtime = "nodejs";

// Image metadata
export const alt = "MyWebPorto Open Graph Image";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const profile = await getProfile();

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(to right, #0f172a, #1e293b)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "#fff",
          padding: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "24px",
            padding: "60px",
            background: "rgba(0, 0, 0, 0.4)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              width: "160px",
              height: "160px",
              borderRadius: "80px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              marginBottom: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "72px",
              fontWeight: 800,
              color: "#ffffff",
              border: "4px solid rgba(255, 255, 255, 0.2)",
              boxShadow: "0 12px 24px rgba(59, 130, 246, 0.4)",
            }}
          >
            {profile.name.charAt(0)}
          </div>
          
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 800,
              margin: "0 0 16px 0",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            {profile.name}
          </h1>
          <p
            style={{
              fontSize: "32px",
              fontWeight: 400,
              color: "#94a3b8",
              margin: 0,
              textAlign: "center",
              maxWidth: "800px",
            }}
          >
            {profile.headline || "Web Developer & Content Creator"}
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
