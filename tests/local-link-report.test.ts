import test from "node:test";
import assert from "node:assert/strict";
import { createLocalCheckInput, parseLocalReport, MAX_REPORT_BYTES } from "../lib/link-checker/local-report";

const url = "https://example.test/private?customer=123";
function report(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ version: 1, source: "local-python", results: [{
    url, originalUrl: url, finalUrl: "https://example.test/final", working: true,
    classification: "working-redirected", status: "ok", initialStatus: 302, finalStatus: 200,
    redirectCount: 1, redirects: [{ url, status: 302 }], responseTimeMs: 30, ...overrides,
  }] });
}

test("local export contains only deduplicated URLs and enforces limits", () => {
  assert.deepEqual(JSON.parse(createLocalCheckInput([url, url])), { version: 1, urls: [url] });
  assert.throws(() => createLocalCheckInput([]));
  assert.throws(() => createLocalCheckInput(Array(51).fill(url)));
});

test("report parsing is local, preserves chains and excludes unknown properties", (context) => {
  const network = context.mock.method(globalThis, "fetch", () => { throw new Error("No network"); });
  const results = parseLocalReport(report({ secretExtra: "discard" }), [url]);
  assert.equal(results[0].initialStatus, 302);
  assert.equal(results[0].finalStatus, 200);
  assert.equal(results[0].redirects.length, 1);
  assert.equal("secretExtra" in results[0], false);
  assert.equal(network.mock.callCount(), 0);
});

test("reports reject mismatches, duplicates, oversized files and invalid schemas", () => {
  assert.throws(() => parseLocalReport(report(), ["https://other.test/"]));
  assert.throws(() => parseLocalReport("x".repeat(MAX_REPORT_BYTES + 1), [url]));
  assert.throws(() => parseLocalReport('{"version":1,"source":"remote","results":[]}', [url]));
  const duplicate = JSON.parse(report());
  duplicate.results.push(duplicate.results[0]);
  assert.throws(() => parseLocalReport(JSON.stringify(duplicate), [url]));
  for (const override of [
    { redirectCount: 2 }, { redirects: Array(6).fill({ url, status: 302 }), redirectCount: 6 },
    { finalStatus: 999 }, { finalStatus: 500 }, { working: false }, { classification: "forged" },
    { responseTimeMs: -1 }, { status: "forged" }, { message: "unsafe\u0000text" },
  ]) assert.throws(() => parseLocalReport(report(override), [url]));
});

test("failure and redirect-limit reports remain failures", () => {
  const results = parseLocalReport(report({ working: false, classification: "redirect-limit", status: "network-error", finalStatus: 302, errorCode: "REDIRECT_LIMIT" }), [url]);
  assert.equal(results[0].working, false);
  assert.equal(results[0].classification, "redirect-limit");
});
