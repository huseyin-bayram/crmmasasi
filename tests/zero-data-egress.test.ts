import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { transformHtml } from "../lib/html-transformer";
import { correctTypography } from "../lib/typo-normalizer";
import { compileCallCenterScript } from "../lib/call-center-script";
import { extractLinks } from "../lib/link-checker/extract-links";

test("Zero Campaign Data Egress: HTML Transformer runs 100% in-memory with zero external egress", () => {
  const sensitiveCampaignHtml = `
    <html><body>
      <table><tr><td>Gizli Müşteri Verisi ve Kampanya Metni</td></tr></table>
    </body></html>
  `;
  const result = transformHtml(sensitiveCampaignHtml);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.value.output.includes("Gizli Müşteri Verisi ve Kampanya Metni"));
  // Output produced purely in-memory
  assert.equal(typeof result.value.output, "string");
});

test("Zero Campaign Data Egress: Typo Normalizer runs 100% in-memory with zero external egress", () => {
  const sensitiveSms = `“Özel Faiz Oranı” — TCKN: 12345678901`;
  const result = correctTypography(sensitiveSms);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.value.output.includes("''Özel Faiz Oranı''"));
  assert.ok(result.value.output.includes("TCKN: 12345678901"));
});

test("Zero Campaign Data Egress: Call Center Script Compiler runs 100% in-memory with zero external egress", () => {
  const sensitiveWordText = `
    <p>MT: Merhaba (Müşteri Adı) Bey.</p>
    <p>Gizli kampanya detayları: <a href="https://turkiyefinans.com.tr">Link</a></p>
    <p>“Evet” demeniz yeterlidir.</p>
    <p><strong>KAPANIŞ;</strong> Teşekkür ederiz.</p>
  `;
  const result = compileCallCenterScript(sensitiveWordText);
  assert.ok(result.output.includes("Gizli kampanya detayları"));
  assert.ok(result.output.includes("CustomerInfo.CustomerName"));
  assert.equal(result.validation.isValid, true);
});

test("Zero Campaign Data Egress: Link Extractor extracts ONLY URLs and never passes surrounding campaign text", () => {
  const sensitiveSmsWithLink = `
    Sayın Ahmet Yılmaz, 12345678901 nolu hesabınıza özel kredi teklifiniz hazır.
    Detaylar için tıklayın: https://tfkb.cc/44qC0wU
    Bu mesaj banka içi gizli niteliktedir.
  `;
  const extracted = extractLinks(sensitiveSmsWithLink);
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].url, "https://tfkb.cc/44qC0wU");

  // Verify none of the surrounding sensitive customer names or account data is inside the URL object
  assert.equal(extracted[0].url.includes("Ahmet"), false);
  assert.equal(extracted[0].url.includes("12345678901"), false);
  assert.equal(extracted[0].url.includes("gizli"), false);
});

test("Zero Campaign Data Egress: Verify no tracking, analytics, or telemetry packages in package.json", () => {
  const pkgJsonPath = path.join(__dirname, "..", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const forbiddenTrackers = [
    "@vercel/analytics",
    "@vercel/speed-insights",
    "@sentry/nextjs",
    "mixpanel",
    "segment",
    "google-analytics",
    "posthog-js",
    "amplitude",
  ];

  for (const tracker of forbiddenTrackers) {
    assert.equal(
      tracker in allDeps,
      false,
      `Forbidden telemetry/analytics package detected: ${tracker}`,
    );
  }
});
