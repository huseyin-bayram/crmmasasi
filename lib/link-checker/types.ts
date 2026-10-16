export type LinkClassification =
  | "unchecked"
  | "working" // Çalışıyor (2xx)
  | "working-redirected" // Çalışıyor — Yönlendirildi (3xx -> 2xx)
  | "not-found" // Hedef Sayfa Bulunamadı (404/410)
  | "forbidden" // Erişim Engellendi (403)
  | "server-error" // Sunucu Hatası (5xx)
  | "client-error"
  | "redirect-limit"
  | "redirect-loop"
  | "tls-error"
  | "timeout" // Zaman Aşımı
  | "dns-error" // DNS Hatası
  | "blocked-security" // Güvenlik Nedeniyle Engellendi (SSRF)
  | "invalid-url" // Geçersiz URL
  | "unreachable"; // Kontrol Edilemedi

export type LinkCheckStatus =
  | "not-checked"
  | "pending"
  | "ok"
  | "redirect"
  | "client-error"
  | "server-error"
  | "timeout"
  | "blocked"
  | "network-error";

export interface DetectedLink {
  /** Text exactly as it appears in the source content. */
  raw: string;
  /** Normalized absolute URL that will be checked. */
  url: string;
  /** How many times the same URL appears in the content. */
  occurrences: number;
}

export interface RedirectHop {
  url: string;
  status: number;
}

export interface LinkCheckResult {
  originalUrl: string;
  url: string;
  finalUrl?: string;
  working: boolean;
  classification: LinkClassification;
  initialStatus?: number;
  finalStatus?: number;
  httpStatus?: number;
  status: LinkCheckStatus;
  redirectCount: number;
  redirects: readonly RedirectHop[];
  responseTimeMs?: number;
  errorCode?: string;
  message?: string;
  error?: string;
}
