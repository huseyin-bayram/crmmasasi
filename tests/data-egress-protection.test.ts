import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { checkLinks, MAX_URLS_PER_REQUEST } from "../lib/link-checker";
import { GET, POST } from "../app/api/check-links/route";
import { GET as aliasGET, POST as aliasPOST } from "../app/tools/api/check-links/route";
import { createHtmlPreviewDocument, sanitizePreviewHtml } from "../lib/html-preview";
import nextConfig from "../next.config";

test("URL inspection and retired endpoints never make network requests", async (context) => {
  const network = context.mock.method(globalThis, "fetch", () => {
    throw new Error("Network requests are forbidden");
  });
  const result = await checkLinks([
    "https://example.test/private?customer=123",
    "http://127.0.0.1/",
    "javascript:alert(1)",
    "not a URL",
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.map((item) => item.classification), [
    "unchecked", "unchecked", "invalid-url", "invalid-url",
  ]);
  for (const item of result.value) {
    assert.equal(item.working, false);
    assert.equal(item.httpStatus, undefined);
    assert.equal(item.finalUrl, undefined);
    assert.deepEqual(item.redirects, []);
  }
  const unreadableRequest = new Proxy({}, {
    get() { throw new Error("Retired endpoints must not read request data"); },
  });
  for (const handler of [GET, POST, aliasGET, aliasPOST]) {
    const response = Reflect.apply(handler, undefined, [unreadableRequest]);
    assert.equal(response.status, 410);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(network.mock.callCount(), 0);
});

test("local URL inspection handles empty input and enforces its limit", async () => {
  assert.deepEqual(await checkLinks([]), { ok: true, value: [] });
  const result = await checkLinks(Array(MAX_URLS_PER_REQUEST + 1).fill("https://example.test"));
  assert.equal(result.ok, false);
});

test("inline preview keeps content but removes executable and network-bearing markup", () => {
  const result = sanitizePreviewHtml(`
    <Page1><p class="text-xs" onclick="alert(1)">İçerik &amp; metin</p></Page1>
    <script>alert(1)</script><style>body{background:url(https://example.test)}</style>
    <img src="https://example.test/pixel" srcset="/leak?secret=1 2x" onerror="alert(1)">
    <a href="https://example.test" ping="/leak" target="_blank">Bağlantı</a>
    <iframe src="/leak"></iframe><meta http-equiv="refresh" content="0;url=https://example.test">
    <form action="/leak"><input name="secret"></form><svg><image href="/leak"></image></svg>
    <p title='&quot; onclick=&quot;alert(1)'>Güvenli alıntı</p>
  `);
  assert.ok(result.includes("İçerik &amp; metin"));
  assert.ok(result.includes('<a>Bağlantı</a>'));
  assert.ok(result.includes('title="&quot; onclick=&quot;alert(1)"'));
  assert.doesNotMatch(result, /<(?:script|style|iframe|meta|form|input|svg)\b/i);
  assert.doesNotMatch(result, /\s(?:src|srcset|href|ping|target|onerror)\s*=/i);
  assert.doesNotMatch(result, /https:\/\/example\.test|\/leak/);
});

test("email preview restricts resources and preserves only embedded raster images", () => {
  const document = createHtmlPreviewDocument(`
    <style>p{color:red;background:url(https://example.test)}</style>
    <p style="font-weight:bold">Önizleme</p>
    <img src="data:image/png;base64,aGVsbG8=">
    <img src="data:image/svg+xml;base64,PHN2Zz4=">
    <img src="/leak"><base href="https://example.test">
  `);
  assert.ok(document.includes("default-src 'none'"));
  assert.ok(document.includes("script-src 'none'"));
  assert.ok(document.includes("img-src data:"));
  assert.ok(document.includes('style="font-weight:bold"'));
  assert.ok(document.includes('src="data:image/png;base64,aGVsbG8="'));
  assert.doesNotMatch(document, /<base|src="\/leak"|data:image\/svg/);
  const source = readFileSync(path.join(__dirname, "../components/tools/html-editor-workspace.tsx"), "utf8");
  assert.ok(source.includes('sandbox=""'));
  assert.ok(source.includes("createHtmlPreviewDocument(output)"));
});

test("application headers block external connections without blocking same-origin navigation", async () => {
  const entries = await nextConfig.headers!();
  const headers = entries.find((entry) => entry.source === "/:path*")!.headers;
  const policy = headers.find((header) => header.key === "Content-Security-Policy")!.value;
  for (const directive of ["connect-src 'self'", "form-action 'none'", "object-src 'none'", "base-uri 'none'"]) {
    assert.ok(policy.includes(directive));
  }
  assert.ok(headers.some((header) => header.key === "Referrer-Policy" && header.value === "no-referrer"));
});

test("application source contains no explicit network clients or remote font imports", () => {
  function inspect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (/\.(?:ts|tsx)$/.test(file)) {
        const source = readFileSync(file, "utf8");
        assert.doesNotMatch(source, /\bfetch\s*\(|\bXMLHttpRequest\b|\.sendBeacon\s*\(|\bnew\s+(?:WebSocket|EventSource)\s*\(|next\/font\/google/, file);
      }
    }
  }
  for (const directory of ["app", "components", "lib"]) inspect(path.join(__dirname, "..", directory));
});
