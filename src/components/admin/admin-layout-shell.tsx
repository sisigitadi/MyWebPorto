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
}

export function AdminLayoutShell({
  children,
  profileAvatar,
  profileName,
}: AdminLayoutShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-40">
        <AdminSidebar
          profileAvatar={profileAvatar}
          profileName={profileName}
        />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-card border-r border-border h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-3 z-20">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <AdminHeader onToggleSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
