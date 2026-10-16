import test from "node:test";
import assert from "node:assert/strict";
import { extractLinks } from "../lib/link-checker/extract-links";
import { getTool, getVisibleTools } from "../lib/tools/registry";
import { getToolGroups } from "../lib/tools/navigation";

test("Link Checker is available in the tool list and navigation without server data transfer", () => {
  const tool = getTool("link-checker");
  assert.equal(tool.status, "available");
  assert.equal(tool.dataHandling, "client");
  assert.equal(tool.path, "/tools/link-checker");
  assert.ok(getVisibleTools().some((entry) => entry.id === tool.id));
  assert.ok(getToolGroups().some((group) => group.tools.some((entry) => entry.id === tool.id)));
});

test("Link Extractor: extracts and normalizes various URL formats", () => {
  const text = `
    Sayın Müşterimiz,
    Link 1: https://bit.ly/example. Cümlenin sonu.
    Link 2: (https://tfkb.cc/44qC0wU) parantez içi.
    Link 3: tfkb.cc/shortBareLink bare link formatı.
    Link 4: www.turkiyefinans.com.tr/kampanyalar standart web adresi.
    Link 5: https://www.turkiyefinans.com.tr/kampanyalar?id=123&ref=sms#detay query ve fragment.
    Yinelenen: https://bit.ly/example tekrar geçti.
  `;

  const links = extractLinks(text);
  assert.ok(links.length >= 5, `Expected at least 5 links, got ${links.length}`);

  // Test trailing punctuation stripping
  const bitly = links.find((l) => l.url === "https://bit.ly/example");
  assert.ok(bitly, "https://bit.ly/example should be found without trailing period");
  assert.equal(bitly?.occurrences, 2, "Duplicate occurrence should be counted as 2");

  // Test parens stripping
  const tfkbShort = links.find((l) => l.url === "https://tfkb.cc/44qC0wU");
  assert.ok(tfkbShort, "https://tfkb.cc/44qC0wU should be extracted without parentheses");

  // Test bare short link extraction
  const bareShort = links.find((l) => l.url === "https://tfkb.cc/shortBareLink");
  assert.ok(bareShort, "Bare short link tfkb.cc/... should have https:// prepended");

  // Test www extraction
  const wwwLink = links.find((l) => l.url === "https://www.turkiyefinans.com.tr/kampanyalar");
  assert.ok(wwwLink, "www.turkiyefinans.com.tr should be extracted with https:// prefix");

  // Test query and hash preservation
  const fullLink = links.find((l) => l.url.includes("query ve fragment") === false && l.url.includes("id=123&ref=sms#detay"));
  assert.ok(fullLink, "URL query string and fragment must be fully preserved");
});
