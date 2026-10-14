"use client";

import React, { useState } from "react";
import { Share2 } from "lucide-react";
import { ContentShareModal } from "./content-share-modal";
import { useTranslation } from "@/lib/i18n";

export interface ShareButtonProps {
  title: string;
  url: string;
  summary?: string;
  thumbnailUrl?: string;
  badge?: string;
  buttonText?: string;
  iconOnly?: boolean;
  className?: string;
  size?: "sm" | "icon" | "default";
}

export function ShareButton({
  title,
  url,
  summary,
  thumbnailUrl,
  badge,
  buttonText,
  iconOnly = false,
  className = "",
  size = "sm",
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useTranslation();
  const isEn = language === "en";

  const defaultText = buttonText || (isEn ? "Share" : "Bagikan");

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none ${
          size === "icon"
            ? "h-8 w-8 min-h-[36px] min-w-[36px] rounded-xs text-muted-foreground hover:text-foreground hover:bg-muted/60"
            : size === "sm"
            ? "h-7 min-h-[32px] px-2.5 rounded-xs text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/60"
            : "h-9 min-h-[44px] px-3 rounded-xs text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border"
        } ${className}`}
        title={isEn ? `Share ${title}` : `Bagikan ${title}`}
        aria-label={isEn ? `Share ${title}` : `Bagikan ${title}`}
      >
        <Share2 className="h-3.5 w-3.5 text-primary shrink-0" />
        {!iconOnly && <span>{defaultText}</span>}
      </button>

      {isOpen && (
        <ContentShareModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={title}
          url={url}
          summary={summary}
          thumbnailUrl={thumbnailUrl}
          badge={badge}
          isEn={isEn}
        />
      )}
    </>
  );
}
