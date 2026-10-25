import { ImageResponse } from "next/og";
import {
  OG_IMAGE_SIZE,
  OG_IMAGE_CONTENT_TYPE,
  renderSectionOgElement,
} from "@/lib/og-section-renderer";

export const runtime = "nodejs";
export const alt = "Sigit Adi Irianto: Portofolio & Workstation";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default async function Image() {
  const element = await renderSectionOgElement({ section: "profil" });
  return new ImageResponse(element, { ...size });
}
