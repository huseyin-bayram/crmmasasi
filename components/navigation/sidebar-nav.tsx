"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Info, LayoutGrid, CheckSquare, CalendarCheck, FolderKanban, Zap } from "lucide-react";
import { appConfig } from "@/lib/app-config";
import { getToolGroups } from "@/lib/tools/navigation";
import { cn } from "@/lib/cn";
import { ToolIcon } from "@/components/tools/tool-icon";
import { BrandLogo } from "@/components/navigation/brand";

interface NavItemProps {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onNavigate?: () => void;
}

function NavItem({ href, label, icon, active, onNavigate }: NavItemProps) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-8 items-center gap-2.5 rounded px-2.5 text-ui transition-colors focus-visible:-outline-offset-2",
          active
            ? "bg-brand-50 font-semibold text-brand-900 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-brand [&_svg]:text-brand-700"
            : "text-ink-muted hover:bg-black/[0.04] hover:text-ink",
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}

/**
 * Sidebar navigation including ÇALIŞMA ALANI and Tool Registry.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = getToolGroups();
  const iconClass = "size-4 shrink-0";

  return (
    <nav aria-label="Ana menü" className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {/* ÇALIŞMA ALANI */}
        <div className="mb-5">
          <h2
            id="nav-group-workspace"
            className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase"
          >
            Çalışma Alanı
          </h2>
          <ul aria-labelledby="nav-group-workspace" className="space-y-px">
            <NavItem
              href="/workspace/my-work"
              label="Benim İşlerim"
              icon={<CheckSquare aria-hidden="true" className={iconClass} strokeWidth={1.75} />}
              active={pathname === "/workspace/my-work"}
              onNavigate={onNavigate}
            />
            <NavItem
              href="/workspace/daily-brief"
              label="Günlük Toplantı Takip"
              icon={<CalendarCheck aria-hidden="true" className={iconClass} strokeWidth={1.75} />}
              active={pathname === "/workspace/daily-brief"}
              onNavigate={onNavigate}
            />
            <NavItem
              href="/workspace"
              label="Genel Bakış"
              icon={<FolderKanban aria-hidden="true" className={iconClass} strokeWidth={1.75} />}
              active={pathname === "/workspace"}
              onNavigate={onNavigate}
            />
          </ul>
        </div>

        {/* ONGOING & REALTIME */}
        <div className="mb-5">
          <h2
            id="nav-group-ongoing-realtime"
            className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase"
          >
            Ongoing &amp; Real-time
          </h2>
          <ul aria-labelledby="nav-group-ongoing-realtime" className="space-y-px">
            <NavItem
              href="/ongoing-realtime"
              label="Senaryo Yönetimi"
              icon={<Zap aria-hidden="true" className={iconClass} strokeWidth={1.75} />}
              active={pathname === "/ongoing-realtime" || pathname.startsWith("/ongoing-realtime/")}
              onNavigate={onNavigate}
            />
          </ul>
        </div>

        {/* ARAÇLAR */}
        <div>
          <h2
            id="nav-group-tools-header"
            className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase"
          >
            Araçlar
          </h2>
          <ul aria-labelledby="nav-group-tools-header" className="space-y-px">
            <NavItem
              href={appConfig.basePath}
              label="Tüm araçlar"
              icon={<LayoutGrid aria-hidden="true" className={iconClass} strokeWidth={1.75} />}
              active={pathname === appConfig.basePath}
              onNavigate={onNavigate}
            />
          </ul>
        </div>

        {groups.map((group) => (
          <div key={group.id} className="mt-5">
            <h2
              id={`nav-group-${group.id}`}
              className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase"
            >
              {group.label}
            </h2>
            <ul aria-labelledby={`nav-group-${group.id}`} className="space-y-px">
              {group.tools.map((tool) => (
                <NavItem
                  key={tool.id}
                  href={tool.path}
                  label={tool.name}
                  icon={<ToolIcon name={tool.icon} className={iconClass} />}
                  active={pathname === tool.path || pathname.startsWith(`${tool.path}/`)}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-line px-2 py-3">
        <ul>
          <NavItem
            href={`${appConfig.basePath}/about`}
            label="Hakkında"
            icon={<Info aria-hidden="true" className={iconClass} strokeWidth={1.75} />}
            active={pathname === `${appConfig.basePath}/about`}
            onNavigate={onNavigate}
          />
        </ul>
        <div className="mt-3 pt-3 border-t border-line/60 px-2 flex flex-col items-start text-left gap-1.5">
          <BrandLogo className="h-7 w-auto object-contain" />
          <p className="text-[11px] text-ink-subtle">
            {appConfig.name} {appConfig.displayVersion}
          </p>
        </div>
      </div>
    </nav>
  );
}
