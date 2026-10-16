import Image from "next/image";
import Link from "next/link";
import { appConfig } from "@/lib/app-config";
import { cn } from "@/lib/cn";

/** Official logo asset, stored locally. Intrinsic size keeps proportions intact. */
const LOGO = { src: "/brand/turkiye-finans-logo.png", width: 1329, height: 513 } as const;
const CRM_LOGO = { src: "/brand/crm-masa-logo.png", width: 1254, height: 1254 } as const;

export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={LOGO.src}
      width={LOGO.width}
      height={LOGO.height}
      alt={appConfig.organization}
      priority={priority}
      unoptimized
      className={cn("h-7 w-auto object-contain", className)}
    />
  );
}

export function CrmLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={CRM_LOGO.src}
      width={CRM_LOGO.width}
      height={CRM_LOGO.height}
      alt="CRM Masa"
      priority={priority}
      unoptimized
      className={cn("object-contain", className || "w-[150px] h-auto")}
    />
  );
}

/** Sidebar header: CRM Masa logo, links to tools home while workspace is hidden. */
export function SidebarBrand() {
  return (
    <div className="shrink-0 border-b border-line px-3 py-3 bg-canvas flex items-center justify-center">
      <Link
        href={appConfig.basePath}
        className="block text-center rounded-sm transition-opacity hover:opacity-90"
        aria-label="CRM Masa"
      >
        <CrmLogo priority className="w-[150px] max-w-full h-auto mx-auto" />
      </Link>
    </div>
  );
}
