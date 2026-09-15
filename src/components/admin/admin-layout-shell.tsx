"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutShellProps {
  children: React.ReactNode;
  profileAvatar?: string;
  profileName?: string;
  dbConnected?: boolean;
}

export function AdminLayoutShell({
  children,
  profileAvatar,
  profileName,
  dbConnected,
}: AdminLayoutShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex desktop-wallpaper text-[var(--vt-ink)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[var(--vt-chrome)] border-r-2 border-[var(--vt-edge-lo-2)]">
        <AdminSidebar
          profileAvatar={profileAvatar}
          profileName={profileName}
        />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-[var(--vt-chrome)] border-r-2 border-[var(--vt-edge-lo-2)] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="absolute top-3 right-3 z-20">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--vt-ink)] hover:bg-[var(--vt-edge-hi-2)]"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Tutup Menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AdminSidebar
              profileAvatar={profileAvatar}
              profileName={profileName}
              onItemClick={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:min-h-0">
        <AdminHeader onToggleSidebar={() => setMobileSidebarOpen(true)} dbConnected={dbConnected} />
        <main className="flex-1 lg:min-h-0 lg:overflow-y-auto vt-scrollbar p-2.5 sm:p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <div className="vt-window">
              <div className="vt-paper-inset p-3.5 sm:p-5 md:p-6">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
