import type { EngineResult } from "@/lib/tools/engine";
import type { LinkCheckResult } from "./types";
import { ALLOWED_PROTOCOLS, MAX_URLS_PER_REQUEST } from "./constants";

export * from "./types";
export * from "./constants";
export { extractLinks } from "./extract-links";

export async function checkLinks(
  urls: readonly string[],
): Promise<EngineResult<readonly LinkCheckResult[]>> {
  if (urls.length > MAX_URLS_PER_REQUEST) {
    return {
      ok: false,
      error: {
        code: "INPUT_TOO_LARGE",
        message: "Tek seferde en fazla " + MAX_URLS_PER_REQUEST + " bağlantı incelenebilir.",
      },
    };
  }

  return {
    ok: true,
    value: urls.map((url): LinkCheckResult => {
      let valid = false;
      try {
        const parsed = new URL(url);
        valid = ALLOWED_PROTOCOLS.some((protocol) => protocol === parsed.protocol);
      } catch {
        valid = false;
      }

      return {
        originalUrl: url,
        url,
        working: false,
        classification: valid ? "unchecked" : "invalid-url",
        status: "not-checked",
        redirectCount: 0,
        redirects: [],
        message: valid
          ? "URL biçimi geçerli. Ağ isteği gönderilmedi; erişilebilirlik, HTTP durumu ve yönlendirmeler kontrol edilmedi."
          : "Geçerli bir HTTP veya HTTPS adresi değil.",
      };
    }),
  };
}
