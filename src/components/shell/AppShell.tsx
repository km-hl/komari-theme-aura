import { Outlet } from "react-router-dom";
import { FloatingControls } from "./FloatingControls";
import { useAppearance } from "@/hooks/useAppearance";

export function AppShell() {
  useAppearance();
  return (
    <div className="relative flex min-h-screen flex-col">
      <FloatingControls />
      <main className="flex-1 px-3 pb-8 pt-5 sm:px-5 md:px-6 lg:px-8 lg:pt-6">
        <div className="mx-auto w-full max-w-[1720px]">
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner flex flex-col items-center gap-1">
          <p>Powered by Komari Monitor.</p>
          <p className="opacity-60">Themed by <a href="https://github.com/km-hl/komari-theme-aura" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-white transition-colors">Aura</a></p>
        </div>
      </footer>
    </div>
  );
}
