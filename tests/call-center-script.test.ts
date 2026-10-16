import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseDocx,
  compileCallCenterScript,
  insertStandardTemplate,
  insertApprovePageTag,
  normalizeScriptTypography,
  minifyScript,
  validateScript,
  convertPlainTextToHtml,
  hasHtmlMarkup,
  EVAM_CUSTOMER_FIELDS,
} from "../lib/call-center-script";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "call-center-script.docx");

test("Call Center Script Editor: Golden Fixture DOCX parsing and end-to-end compilation", async () => {
  // Read real Word document fixture
  const fileBuffer = fs.readFileSync(FIXTURE_PATH);
  assert.ok(fileBuffer.length > 0, "Fixture docx must exist and not be empty");

  // 1. Client-side DOCX parsing
  const parsed = await parseDocx(fileBuffer);
  assert.ok(parsed.html.length > 100, "Parsed HTML must contain document content");

  // Verify Turkish special characters in fixture are preserved
  assert.ok(parsed.html.includes("Âlâ") || parsed.html.includes("Ala"), "Âlâ must be present");
  assert.ok(parsed.html.includes("Türkiye Finans"), "Türkiye Finans must be present");

  // 2. End-to-end compilation
  const result = compileCallCenterScript(parsed.html, {
    autoInsertTemplate: true,
    autoInsertApprovePage: true,
    normalizeTypography: true,
    minify: true,
  });

  const { output, validation } = result;

  // 3. Page Tags verification
  assert.equal(validation.pageTags.page1.count, 1, "<Page1> must appear exactly once");
  assert.equal(validation.pageTags.page2.count, 1, "<Page2> must appear exactly once");
  assert.equal(validation.pageTags.approvePage.count, 1, "<ApprovePage> must appear exactly once");
  assert.equal(validation.pageTags.orderValid, true, "Tag order must be Page1 -> Page2 -> ApprovePage");

  // 4. Standard Customer Header & Template verification
  assert.ok(
    output.startsWith('<strong>Musteri Adi:  "+ &eec.CustomerInfo.CustomerName+"'),
    "Output must start with the standard customer header block",
  );
  assert.ok(
    output.includes("<Page1><p><strong><p>MT: Günaydın/İyi günler"),
    "Output must contain standard MT opening",
  );
  assert.ok(
    output.includes("<Page2>"),
    "Output must contain Page2 transition",
  );

  // 5. ApprovePage placement verification
  assert.ok(
    output.includes("<ApprovePage><p><strong>KAPANIŞ;</strong>") ||
      output.includes("<ApprovePage><p><strong>KAPANIŞ") ||
      output.includes("<ApprovePage><p>KAPANIŞ") ||
      output.includes("<ApprovePage><strong>KAPANIŞ"),
    "<ApprovePage> must be placed immediately before the closing section",
  );

  // 6. EVAM Attribute Single-Quotes vs Dynamic Double-Quotes verification
  // HTML attributes must NOT use double quotes
  assert.equal(
    validation.doubleQuoteAttributeCount,
    0,
    "All HTML attributes must use single quotes (no double quotes)",
  );

  // All <a> tags must use href='...'
  const hrefDoubleQuotes = output.match(/href="[^"]*"/g);
  assert.equal(hrefDoubleQuotes, null, "No href attribute may use double quotes");

  // Dynamic EVAM variables must retain genuine double quotes
  assert.ok(
    output.includes('"+ &eec.CustomerInfo.CustomerName+"'),
    "CustomerName must retain exact double quotes",
  );

  // 7. Typography normalization verification
  assert.ok(!output.includes("“"), "Smart open quote must be normalized");
  assert.ok(!output.includes("”"), "Smart close quote must be normalized");
  assert.ok(!output.includes("—"), "Em dash must be normalized to hyphen");

  // 8. Overall Validation
  assert.equal(validation.isValid, true, "Golden fixture output must pass 100% EVAM validation");
});

test("Call Center Script Editor: Idempotency check", () => {
  const sample = `
    <p>MT: Günaydın (Müşteri Adı) Bey.</p>
    <p>Kampanya detayları: <a href="https://turkiyefinans.com.tr">Link</a></p>
    <p>“Evet” demeniz yeterlidir.</p>
    <p><strong>KAPANIŞ;</strong> Teşekkür ederiz.</p>
  `;

  const run1 = compileCallCenterScript(sample);
  const run2 = compileCallCenterScript(run1.output);

  assert.equal(run1.output, run2.output, "Compilation must be completely idempotent");
  assert.equal(run2.validation.pageTags.page1.count, 1, "Page1 must not be duplicated on second run");
  assert.equal(run2.validation.pageTags.page2.count, 1, "Page2 must not be duplicated on second run");
  assert.equal(run2.validation.pageTags.approvePage.count, 1, "ApprovePage must not be duplicated on second run");
});

test("Call Center Script Editor: Structural minification preserves <p> </p> spacers", () => {
  const input = `<p>Paragraf 1</p><p> </p><p>Paragraf 2</p>`;
  const minified = minifyScript(input);

  assert.ok(
    minified.includes("<p> </p>"),
    "Minification must strictly preserve <p> </p> vertical paragraph spacers",
  );
});

test("Call Center Script Editor: Validator detects missing tags and invalid order", () => {
  // Missing all tags
  const noTags = "<p>Basit metin</p>";
  const v1 = validateScript(noTags);
  assert.equal(v1.isValid, false);
  assert.equal(v1.pageTags.page1.count, 0);

  // Invalid tag order: Page2 before Page1
  const wrongOrder = "<Page2><p>Teklif</p><Page1><p>Açılış</p><ApprovePage><p>Kapanış</p>";
  const v2 = validateScript(wrongOrder);
  assert.equal(v2.isValid, false);
  assert.equal(v2.pageTags.orderValid, false);

  // Double quotes in attribute
  const badAttrs = '<Page1><p>A</p><Page2><p><a href="https://test.com">Link</a></p><ApprovePage><p>Kapanış</p>';
  const v3 = validateScript(badAttrs);
  assert.equal(v3.doubleQuoteAttributeCount, 1);
  assert.equal(v3.checklist.find((c) => c.id === "quotes")?.status, "fail");
});

test("Call Center Script Editor: parseDocx provides rawText without HTML tags", async () => {
  const fileBuffer = fs.readFileSync(FIXTURE_PATH);
  const parsed = await parseDocx(fileBuffer);

  assert.ok(parsed.rawText.length > 50, "rawText must not be empty");
  assert.ok(!parsed.rawText.includes("<p>"), "rawText must not contain <p> tags");
  assert.ok(!parsed.rawText.includes("<strong>"), "rawText must not contain <strong> tags");
  assert.ok(parsed.rawText.includes("AÇILIŞ:"), "rawText must contain document content");
});

test("Call Center Script Editor: convertPlainTextToHtml converts plain text into semantic HTML and spacers", () => {
  const plainText = `AÇILIŞ:
Temsilci: Merhaba (Müşteri Adı) Hanım.

Kampanya Detayı:
• %0 faizli nakit avans
• 12 aya varan vade

KAPANIŞ;
Teşekkür ederiz.`;

  const html = convertPlainTextToHtml(plainText);

  assert.ok(html.includes("<p><strong>AÇILIŞ:</strong></p>"), "Header must be wrapped in strong");
  assert.ok(html.includes("<p><strong>Temsilci:</strong> Merhaba (Müşteri Adı) Hanım.</p>"), "Dialogue prefix must be strong");
  assert.ok(html.includes("<p> </p>"), "Empty lines must convert to <p> </p> spacers");
  assert.ok(html.includes("<ul><li>%0 faizli nakit avans</li><li>12 aya varan vade</li></ul>"), "Bullets must convert to <ul><li>");
  assert.ok(html.includes("<p><strong>KAPANIŞ;</strong></p>"), "Kapanış must be wrapped in strong");
});

test("Call Center Script Editor: End-to-end compilation with copy-pasted plain text input", () => {
  const plainText = `Temsilci: Merhaba [Müşteri Adı] Bey.
Türkiye Finans'tan arıyorum.

Kampanya Avantajları:
• Masrafsız finansman
• Uygun kâr payı

KAPANIŞ;
İyi günler dileriz.`;

  const result = compileCallCenterScript(plainText);

  assert.equal(result.validation.isValid, true, "Compiled plain text must pass 100% EVAM validation");
  assert.equal(result.validation.pageTags.allMandatoryPresent, true, "All mandatory page tags must be present");
  assert.ok(result.output.includes("<Page1>"), "Page1 must be present");
  assert.ok(result.output.includes("<Page2>"), "Page2 must be present");
  assert.ok(result.output.includes("<ApprovePage>"), "ApprovePage must be present");
  assert.ok(result.output.includes("<p> </p>"), "<p> </p> spacers must be preserved");
  assert.ok(result.output.includes("<ul><li>Masrafsız finansman</li><li>Uygun kâr payı</li></ul>"), "Lists must be converted");
  assert.ok(result.output.includes('"+ &eec.CustomerInfo.CustomerName+"'), "Customer name placeholder must be converted");
});

