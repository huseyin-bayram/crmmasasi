import type { LinkCheckResult, LinkClassification, LinkCheckStatus } from "./types";
import { MAX_URLS_PER_REQUEST } from "./constants";

export const MAX_REPORT_BYTES = 1_000_000;

const classifications = new Set<LinkClassification>([
  "working", "working-redirected", "not-found", "forbidden", "server-error",
  "client-error", "redirect-limit", "redirect-loop", "tls-error", "timeout",
  "dns-error", "blocked-security", "invalid-url", "unreachable",
]);
const statuses = new Set<LinkCheckStatus>([
  "ok", "redirect", "client-error", "server-error", "timeout", "blocked", "network-error",
]);

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Geçersiz rapor yapısı.");
  return value as Record<string, unknown>;
}

function text(value: unknown, limit = 8192): string {
  if (typeof value !== "string" || !value || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("Geçersiz rapor metni.");
  }
  return value;
}

function httpStatus(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || Number(value) < 100 || Number(value) > 599) throw new Error("Geçersiz HTTP durumu.");
  return value as number;
}

export function createLocalCheckInput(urls: readonly string[]): string {
  if (!urls.length || urls.length > MAX_URLS_PER_REQUEST) throw new Error("1–50 bağlantı seçin.");
  return JSON.stringify({ version: 1, urls: [...new Set(urls)] }, null, 2);
}

export function parseLocalReport(source: string, allowedUrls: readonly string[]): LinkCheckResult[] {
  if (new TextEncoder().encode(source).length > MAX_REPORT_BYTES) throw new Error("Rapor en fazla 1 MB olabilir.");
  const report = object(JSON.parse(source));
  if (report.version !== 1 || report.source !== "local-python" || !Array.isArray(report.results)
    || !report.results.length || report.results.length > MAX_URLS_PER_REQUEST) {
    throw new Error("Yerel Python scriptinin oluşturduğu raporu seçin.");
  }
  const allowed = new Set(allowedUrls);
  const seen = new Set<string>();
  return report.results.map((value): LinkCheckResult => {
    const entry = object(value);
    const url = text(entry.url);
    if (!allowed.has(url) || seen.has(url) || entry.originalUrl !== url) throw new Error("Rapor mevcut metindeki bağlantılarla eşleşmiyor.");
    seen.add(url);
    const classification = text(entry.classification) as LinkClassification;
    const status = text(entry.status) as LinkCheckStatus;
    if (!classifications.has(classification) || !statuses.has(status) || typeof entry.working !== "boolean") {
      throw new Error("Geçersiz rapor sonucu.");
    }
    if (!Array.isArray(entry.redirects) || entry.redirects.length > 5 || entry.redirectCount !== entry.redirects.length) {
      throw new Error("Geçersiz yönlendirme zinciri.");
    }
    const redirects = entry.redirects.map((value) => {
      const hop = object(value);
      const status = httpStatus(hop.status);
      if (!status || ![301, 302, 303, 307, 308].includes(status)) throw new Error("Geçersiz yönlendirme kodu.");
      return { url: text(hop.url), status };
    });
    if (!Number.isInteger(entry.responseTimeMs) || Number(entry.responseTimeMs) < 0 || Number(entry.responseTimeMs) > 3_600_000) {
      throw new Error("Geçersiz yanıt süresi.");
    }
    const finalStatus = httpStatus(entry.finalStatus);
    const working = classification === "working" || classification === "working-redirected";
    if (entry.working !== working || (working && (status !== "ok" || !finalStatus || finalStatus < 200 || finalStatus >= 300))) {
      throw new Error("Tutarsız rapor sonucu.");
    }
    return {
      originalUrl: url, url, classification, status, working, redirects,
      redirectCount: redirects.length,
      initialStatus: httpStatus(entry.initialStatus), finalStatus,
      finalUrl: entry.finalUrl === undefined ? undefined : text(entry.finalUrl),
      responseTimeMs: entry.responseTimeMs as number,
      message: entry.message === undefined ? undefined : text(entry.message, 2048),
      error: entry.error === undefined ? undefined : text(entry.error, 2048),
      errorCode: entry.errorCode === undefined ? undefined : text(entry.errorCode, 100),
    };
  });
}
