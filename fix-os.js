const fs = require('fs');

function fixDesktopManager() {
  const filePath = 'src/components/public/os/os-desktop-manager.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace switchApp
  const oldSwitchApp = `  const switchApp = React.useCallback((id: AppId) => {
    setActiveApp(id);
    setIsMinimized(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);`;

  const newSwitchApp = `  const switchApp = React.useCallback((id: AppId, updateUrl = true) => {
    setActiveApp(id);
    setIsMinimized(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    if (updateUrl && typeof window !== "undefined") {
      const hash = id === "profil" ? "" : "#" + id;
      const newUrl = window.location.pathname + hash;
      if (window.location.hash !== hash) {
        window.history.replaceState(null, "", newUrl || window.location.pathname);
      }
    }
  }, []);`;

  content = content.replace(oldSwitchApp, newSwitchApp);

  // Replace event listener section
  const oldEventSection = `    window.addEventListener("switch-os-app", handleSwitchAppEvent as EventListener);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("switch-os-app", handleSwitchAppEvent as EventListener);
    };`;

  const newEventSection = `    window.addEventListener("switch-os-app", handleSwitchAppEvent as EventListener);

    // Sync from initial URL hash on mount or hash change (for direct share links)
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      const aliasMap: Record<string, AppId> = {
        profil: "profil",
        profile: "profil",
        hero: "profil",
        about: "profil",
        layanan: "layanan",
        services: "layanan",
        proyek: "proyek",
        projects: "proyek",
        toko: "toko",
        produk: "toko",
        store: "toko",
        products: "toko",
        testimoni: "testimoni",
        testimonials: "testimoni",
        reviews: "testimoni",
        artikel: "artikel",
        articles: "artikel",
        blog: "artikel",
        kontak: "kontak",
        contact: "kontak",
        terminal: "terminal",
      };

      if (hash && aliasMap[hash]) {
        switchApp(aliasMap[hash], false);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("switch-os-app", handleSwitchAppEvent as EventListener);
      window.removeEventListener("hashchange", handleHashChange);
    };`;

  content = content.replace(oldEventSection, newEventSection);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed os-desktop-manager.tsx');
}

fixDesktopManager();
