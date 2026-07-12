import { Outlet } from "react-router-dom";
import { FloatingControls } from "./FloatingControls";
import { useAppearance } from "@/hooks/useAppearance";
import { usePublicConfig } from "@/hooks/usePublicConfig";

export function AppShell() {
  useAppearance();
  const { data: config } = usePublicConfig();
  const ts = config?.theme_settings as any;
  const wallpaperUrl = ts?.wallpaperMode === 'custom_url' ? ts?.wallpaperUrl 
    : ts?.wallpaperMode === 'custom_upload' ? ts?.wallpaperData 
    : ts?.wallpaperMode === 'bing' ? 'https://api.dujin.org/bing/1920.php'
    : null;
  const wallpaperOpacity = (ts?.wallpaperOpacity ?? 20) / 100;

  return (
    <div className={`relative flex min-h-screen flex-col ${wallpaperUrl ? "has-wallpaper" : ""}`}>
      {wallpaperUrl && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: `url(${wallpaperUrl})`, opacity: wallpaperOpacity }}
        />
      )}
      <FloatingControls />
      <main className="relative z-10 flex-1 px-3 pb-8 pt-5 sm:px-5 md:px-6 lg:px-8 lg:pt-6">
        <div className="mx-auto w-full max-w-[1720px]">
          <Outlet />
        </div>
      </main>
      <footer className="relative z-10 site-footer">
        <div className="site-footer-inner flex flex-col items-center gap-1">
          <p>Powered by Komari Monitor.</p>
          <p className="opacity-60">Themed by <a href="https://github.com/km-hl/komari-theme-aura" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-white transition-colors">Aura</a></p>
        </div>
      </footer>
    </div>
  );
}
