import { ImageResponse } from "next/og";
import {
  OG_IMAGE_SIZE,
  OG_IMAGE_CONTENT_TYPE,
  renderSectionOgElement,
} from "@/lib/og-section-renderer";

export const runtime = "nodejs";
export const alt = "Artikel & Wawasan Rekayasa Teknologi: Sigit Adi Irianto";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default async function Image() {
  const element = await renderSectionOgElement({ section: "artikel" });
  return new ImageResponse(element, { ...size });
}
