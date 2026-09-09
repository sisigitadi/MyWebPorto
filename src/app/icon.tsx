import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/actions";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default async function Icon() {
  const profile = await getProfile();
  
  // Use initials for favicon if no avatar, or just a nice letter
  const initial = profile?.name ? profile.name.charAt(0).toUpperCase() : "M";

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "#000",
          color: "#fff",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          fontWeight: 800,
        }}
      >
        {initial}
      </div>
    ),
    {
      ...size,
    }
  );
}
