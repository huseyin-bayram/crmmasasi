"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { appConfig } from "@/lib/app-config";
import { BrandLogo, SidebarBrand, CrmLogo } from "@/components/navigation/brand";
import { SidebarNav } from "@/components/navigation/sidebar-nav";

/**
 * Application frame for everything under /tools.
 *  - ≥1024px: persistent 232px sidebar.
 *  - <1024px: compact top bar + navigation in a native modal <dialog>
 *    (built-in focus trapping, Esc to close, inert background).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const openMenu = () => dialogRef.current?.showModal();
  const closeMenu = () => dialogRef.current?.close();

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:border focus:border-line focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
      >
        İçeriğe geç
      </a>

      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-canvas lg:flex">
        <SidebarBrand />
        <SidebarNav />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas px-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={openMenu}
            aria-label="Menüyü aç"
            aria-haspopup="dialog"
            aria-controls="mobile-navigation"
            className="flex size-9 items-center justify-center rounded text-ink-muted hover:bg-black/[0.05] hover:text-ink transition-colors"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <Link href="/workspace" className="flex items-center gap-2">
            <CrmLogo className="size-8 object-contain" />
            <span className="text-sm font-bold tracking-tight text-ink">CRM Masa</span>
          </Link>
        </div>
        <BrandLogo className="h-5 w-auto" />
      </header>

      <dialog
        id="mobile-navigation"
        ref={dialogRef}
        aria-label="Ana menü"
        onClose={() => menuButtonRef.current?.focus()}
        onClick={(event) => {
          // Click on the backdrop (the dialog element itself) closes the menu.
          if (event.target === event.currentTarget) closeMenu();
        }}
        className="m-0 h-dvh max-h-none w-[272px] max-w-[85vw] border-r border-line bg-canvas p-0 text-ink backdrop:bg-black/40 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="relative border-b border-line">
            <div className="p-3 pr-10 flex items-center justify-center">
              <Link href="/workspace" onClick={closeMenu} className="block text-center">
                <CrmLogo priority className="w-[140px] max-w-full h-auto mx-auto" />
              </Link>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Menüyü kapat"
              className="absolute top-3 right-2.5 z-10 flex size-8 items-center justify-center rounded text-ink-muted hover:bg-black/[0.05] hover:text-ink transition-colors"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <SidebarNav onNavigate={closeMenu} />
        </div>
      </dialog>

      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
