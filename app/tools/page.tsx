import type { Metadata } from "next";
import { ShieldCheck, Keyboard, Sparkles } from "lucide-react";
import { appConfig } from "@/lib/app-config";
import { ToolLauncher } from "@/components/tools/tool-launcher";
import { Kbd } from "@/components/ui/kbd";

export const metadata: Metadata = {
  title: "Araçlar",
  description: appConfig.description,
};

export default function ToolsIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Compact Page Header */}
      <header className="mb-6 border-b border-line pb-5">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {appConfig.name}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
          {appConfig.description}
        </p>
      </header>

      {/* Primary Tool Launcher (Derived from Registry) */}
      <div className="mb-8">
        <ToolLauncher />
      </div>

      {/* Operational Principles & Ergonomics */}
      <section
        aria-label="Operasyonel İlkeler"
        className="grid grid-cols-1 gap-4 border-t border-line pt-6 text-ui md:grid-cols-3"
      >
        <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface p-3.5">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand-700"
            strokeWidth={2}
          />
          <div>
            <h2 className="font-semibold text-ink">Gizlilik & Yerel İşlem</h2>
            <p className="mt-1 text-xs leading-normal text-ink-muted">
              Kampanya metinleri ve HTML e-postalar sunucuda saklanmaz. Dönüşümler doğrudan tarayıcınızda gerçekleşir.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface p-3.5">
          <Keyboard
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand-700"
            strokeWidth={2}
          />
          <div>
            <h2 className="font-semibold text-ink">Hızlı Klavye Kısayolları</h2>
            <p className="mt-1 text-xs leading-normal text-ink-muted">
              Tüm araçlarda ana işlemi çalıştırmak için <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> kullanabilirsiniz.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface p-3.5">
          <Sparkles
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand-700"
            strokeWidth={2}
          />
          <div>
            <h2 className="font-semibold text-ink">Teknik Standartlar</h2>
            <p className="mt-1 text-xs leading-normal text-ink-muted">
              Akıllı tırnaklar, görünmez Unicode boşluklar ve geçersiz abonelik parametreleri yayına gitmeden temizlenir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
