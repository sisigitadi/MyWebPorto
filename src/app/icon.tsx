import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

// Image metadata
export const size = {
  width: 64,
  height: 64,
};
export const contentType = "image/png";

// Image generation with official Cyber-Shield SA logo
export default async function Icon() {
  try {
    const iconPath = path.join(process.cwd(), "public", "icons", "icon-192.png");
    if (fs.existsSync(iconPath)) {
      const iconBuffer = fs.readFileSync(iconPath);
      const base64 = `data:image/png;base64,${iconBuffer.toString("base64")}`;
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#0a0f1e",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={base64} width={64} height={64} style={{ objectFit: "cover" }} alt="SA" />
          </div>
        ),
        {
          ...size,
        }
      );
    }
  } catch {
    // Fallback if filesystem read fails
  }

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 28,
          background: "#0a0f1e",
          color: "#38bdf8",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "12px",
          fontWeight: 800,
          border: "2px solid #38bdf8",
        }}
      >
        SA
      </div>
    ),
    {
      ...size,
    }
  );
}
