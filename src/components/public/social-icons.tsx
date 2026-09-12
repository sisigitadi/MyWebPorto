import React from "react";
import {
  Send,
  Music2,
  MessageCircle,
  Hash,
  Radio,
  Globe,
} from "lucide-react";
import type { ProfileData } from "@/lib/dummy-data";

type IconProps = { className?: string };

function GithubIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function InstagramIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function XIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.1 8.1L23.2 22h-6.6l-5.2-6.8L5.5 22H2.4l7.6-8.7L1.5 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.1 3.9H5.1L17.7 20z" />
    </svg>
  );
}

function YoutubeIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

function FacebookIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function MediumIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.35a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.4 9.4 0 0 1 6.67 2.77 9.37 9.37 0 0 1 2.76 6.66c0 5.2-4.23 9.43-9.44 9.43zm7.76-17.2A10.87 10.87 0 0 0 12.05 1C6.07 1 1.2 5.87 1.2 11.85c0 1.91.5 3.77 1.45 5.42L1.1 23l5.87-1.54c1.58.86 3.36 1.32 5.18 1.32h.01c5.98 0 10.85-4.87 10.85-10.85 0-2.9-1.13-5.63-3.2-7.68z" />
    </svg>
  );
}

type SocialKey =
  | "github"
  | "linkedin"
  | "instagram"
  | "twitter"
  | "portfolio"
  | "telegram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "discord"
  | "slack"
  | "reddit"
  | "medium";

const ICONS: Record<SocialKey, (className?: string) => React.ReactNode> = {
  github: (c) => <GithubIcon className={c || "h-3.5 w-3.5"} />,
  linkedin: (c) => <LinkedinIcon className={c || "h-3.5 w-3.5"} />,
  instagram: (c) => <InstagramIcon className={c || "h-3.5 w-3.5"} />,
  twitter: (c) => <XIcon className={c || "h-3.5 w-3.5"} />,
  portfolio: (c) => <Globe className={c || "h-3.5 w-3.5"} />,
  telegram: (c) => <Send className={c || "h-3.5 w-3.5"} />,
  tiktok: (c) => <Music2 className={c || "h-3.5 w-3.5"} />,
  youtube: (c) => <YoutubeIcon className={c || "h-3.5 w-3.5"} />,
  facebook: (c) => <FacebookIcon className={c || "h-3.5 w-3.5"} />,
  discord: (c) => <MessageCircle className={c || "h-3.5 w-3.5"} />,
  slack: (c) => <Hash className={c || "h-3.5 w-3.5"} />,
  reddit: (c) => <Radio className={c || "h-3.5 w-3.5"} />,
  medium: (c) => <MediumIcon className={c || "h-3.5 w-3.5"} />,
};

const SOCIAL_ORDER: Array<{ key: SocialKey; label: string }> = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X (Twitter)" },
  { key: "medium", label: "Medium" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "telegram", label: "Telegram" },
  { key: "facebook", label: "Facebook" },
  { key: "discord", label: "Discord" },
  { key: "slack", label: "Slack" },
  { key: "reddit", label: "Reddit" },
  { key: "portfolio", label: "Portofolio" },
];

export function getSocialIcon(key: string, className?: string): React.ReactNode {
  const renderer = ICONS[key as SocialKey];
  if (!renderer) return <Globe className={className || "h-3.5 w-3.5"} />;
  return renderer(className);
}

export function buildSocialLinks(profile: ProfileData): Array<{
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}> {
  const links: Array<{ key: string; label: string; href: string; icon: React.ReactNode }> = [];

  if (profile.phone) {
    const cleanPhone = profile.phone.replace(/\D/g, "");
    links.push({
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/${cleanPhone}`,
      icon: <WhatsAppIcon />,
    });
  }

  for (const meta of SOCIAL_ORDER) {
    const href = profile.socialLinks?.[meta.key];
    if (href && href.trim()) {
      links.push({
        key: meta.key,
        label: meta.label,
        href: href.trim(),
        icon: ICONS[meta.key](),
      });
    }
  }

  return links;
}
