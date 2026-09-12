"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImageLocal } from "@/lib/local-upload";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, label = "Unggah Gambar (Lokal)", className = "" }: ImageUploadProps) {
  const [isUploading, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_SIZE_MB = 20;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Ukuran file terlalu besar. Maksimum ${MAX_SIZE_MB} MB.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await uploadImageLocal(formData);
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
    <div className={`space-y-3 ${className}`}>
      {value && (
        <div className="relative h-32 w-full max-w-sm rounded-md overflow-hidden border border-border">
          <Image
            src={value}
            alt="Uploaded Preview"
            fill
            className="object-contain bg-muted/30"
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif,image/bmp"
          onChange={handleFileChange}
          className="hidden"
          id={`local-upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? "Mengunggah..." : label}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => onChange("")}
            className="h-9 text-xs text-muted-foreground hover:text-destructive"
          >
            Hapus
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Pilih file gambar dari perangkat Anda. Maksimum {MAX_SIZE_MB} MB.
      </p>
      {uploadError && (
        <p className="text-[11px] text-destructive">{uploadError}</p>
      )}
    </div>
  );
}
