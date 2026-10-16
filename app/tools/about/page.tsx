import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Cpu, ArrowLeft, Layers, Terminal } from "lucide-react";
import { appConfig } from "@/lib/app-config";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Hakkında",
  description: `${appConfig.name} platformu hakkında genel bilgiler ve teknik standartlar.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 border-b border-line pb-4">
        <div className="mb-2">
          <Link href={appConfig.basePath}>
            <Button variant="ghost" size="sm" icon={ArrowLeft}>
              Araçlara Dön
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {appConfig.name}
          </h1>
          <span className="rounded border border-line bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold text-ink-muted">
            {appConfig.displayVersion}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Türkiye Finans Katılım Bankası CRM ve Dijital İletişim Operasyonları Araç Kutusu
        </p>
      </header>

      {/* Sections */}
      <div className="space-y-6 text-sm text-ink-muted leading-relaxed">
        <section className="rounded-md border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Cpu aria-hidden="true" className="size-4 text-brand-700" />
            Platform Amacı & İş Bağlamı
          </h2>
          <p className="mt-2 text-ui">
            Türkiye Finans ekipleri, CRM ve dijital kampanya yönetim sistemlerini günlük operasyonel iletişim süreçlerinde yoğun olarak kullanır. 
            İçerikler farklı kaynaklardan (Word, Outlook, Teams, ajanslar, bilet sistemleri) kopyalanarak geldiğinde teknik uyumsuzluklar taşır.
          </p>
          <p className="mt-2 text-ui">
            Akıllı tırnaklar, görünmez Unicode karakterleri, bozuk e-posta sarmalayıcıları ve geçersiz abonelik parametreleri üretim ortamında soru işaretlerine (?) veya hatalı HTML davranışlarına yol açabilir. 
            CRM Tools, içerikleri yayına girmeden önce doğrulamak ve gönderim ve yayın sistemleri için teknik olarak güvenli hale getirmek üzere tasarlanmış dahili bir operasyonel araç kutusudur.
          </p>
        </section>

        <section className="rounded-md border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <ShieldCheck aria-hidden="true" className="size-4 text-brand-700" />
            Gizlilik ve Veri Güvenliği İlkeleri
          </h2>
          <ul className="mt-2 space-y-1.5 text-ui">
            <li className="flex items-start gap-2">
              <span className="font-mono text-brand-700">✓</span>
              <span><strong>Veri Saklanmaz:</strong> Araçlara yapıştırılan kampanya metinleri ve HTML kodları hiçbir veritabanına veya üçüncü taraf sunucuya kaydedilmez.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-brand-700">✓</span>
              <span><strong>İstemci Tarafı Önceliği:</strong> Karakter düzeltme ve HTML dönüştürme işlemleri doğrudan tarayıcınızda çalışır.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-brand-700">✓</span>
              <span><strong>Yerel Bağlantı İncelemesi:</strong> URL’ler sunucuya gönderilmeden ayıklanır ve biçimleri incelenir; hedef sitelere istek gönderilmez.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-brand-700">✓</span>
              <span><strong>Üçüncü Taraf Yapay Zeka Yok:</strong> İçerikler hiçbir harici LLM / yapay zeka servisine aktarılmaz.</span>
            </li>
          </ul>
        </section>

        <section className="rounded-md border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Layers aria-hidden="true" className="size-4 text-brand-700" />
            Genişletilebilir Mimari
          </h2>
          <p className="mt-2 text-ui">
            CRM Tools, tek bir merkezi Araç Kayıt Defteri (Tool Registry) üzerinden yönetilir. 
            Gelecekte eklenecek SMS doğrulayıcı, Push karakter sayacı, Çağrı Merkezi metin editörü ve kampanya QA kontrol listeleri, mevcut navigasyon ve düzen yapısı bozulmadan kategori bazlı olarak entegre edilebilir.
          </p>
        </section>

        <section className="rounded-md border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Terminal aria-hidden="true" className="size-4 text-brand-700" />
            Teknik Yığın
          </h2>
          <p className="mt-2 text-xs font-mono text-ink-subtle">
            Next.js (App Router) · React 19 · TypeScript (Strict) · Tailwind CSS v4 · Sistem Yazı Tipleri
          </p>
        </section>
      </div>
    </div>
  );
}
