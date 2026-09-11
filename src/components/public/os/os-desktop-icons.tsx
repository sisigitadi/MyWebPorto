"use client";

import React from "react";
import { FolderGit2, Briefcase, Package, Mail, Terminal, FileText } from "lucide-react";

export function OSDesktopIcons() {
  const icons = [
    {
      id: "projects",
      appId: "proyek",
      href: "#proyek",
      label: "Proyek.exe",
      icon: <FolderGit2 className="h-5 w-5 text-[#3a2a00]" />,
    },
    {
      id: "services",
      appId: "layanan",
      href: "#layanan",
      label: "Layanan.dll",
      icon: <Briefcase className="h-5 w-5 text-[#3a2a00]" />,
    },
    {
      id: "store",
      appId: "toko",
      href: "#produk",
      label: "Store.zip",
      icon: <Package className="h-5 w-5 text-[#3a2a00]" />,
    },
    {
      id: "articles",
      appId: "artikel",
      href: "#artikel",
      label: "Artikel.doc",
      icon: <FileText className="h-5 w-5 text-[#3a2a00]" />,
    },
    {
      id: "terminal",
      appId: "terminal",
      href: "#hero",
      label: "Terminal.bat",
      icon: <Terminal className="h-5 w-5 text-[#3a2a00]" />,
    },
    {
      id: "contact",
      appId: "kontak",
      href: "#kontak",
      label: "Mail_Sigit.com",
      icon: <Mail className="h-5 w-5 text-[#3a2a00]" />,
    },
  ];

  return (
    <div className="hidden lg:flex flex-col gap-5 py-4 select-none z-10">
      {icons.map((item) => (
        <a
          key={item.id}
          href={item.href}
          onClick={(e) => {
            if (item.appId && typeof window !== "undefined") {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent("switch-os-app", { detail: item.appId })
              );
            }
          }}
          className="vt-icon group focus:outline-none"
          title={`Buka ${item.label}`}
        >
          <div className="vt-icon-glyph group-hover:scale-105 transition-transform">
            {item.icon}
          </div>
          <span className="vt-icon-label font-mono font-bold tracking-tight text-white group-hover:text-white transition-colors">
            {item.label}
          </span>
        </a>
      ))}
    </div>
  );
}
