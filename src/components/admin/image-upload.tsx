"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { uploadImageToBunny } from "@/lib/bunny-upload";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = "Upload Gambar ke Bunny CDN" }: ImageUploadProps) {
  const [isUploading, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await uploadImageToBunny(formData);
      if (res.success && res.url) {
        onChange(res.url);
      } else {
        setUploadError(res.error || "Gagal mengunggah gambar.");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
          id={`bunny-upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {isUploading ? "Mengunggah..." : label}
        </Button>
        {value && (
          <span className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={value}>
            {value.slice(-25)}
          </span>
        )}
      </div>
      {uploadError && (
        <p className="text-[11px] text-destructive">{uploadError}</p>
      )}
    </div>
  );
}
