import test from "node:test";
import assert from "node:assert/strict";
import { transformHtml } from "../lib/html-transformer";
import { UNSUBSCRIBE_VARIABLE } from "../lib/html-transformer/constants";

test("HTML Transformer: Strips document wrappers and starts directly with content", () => {
  const rawHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>E-posta Başlığı</title>
  <meta name="viewport" content="width=device-width">
</head>
<body style="margin: 0; padding: 0;">
  <table width="600" border="0" cellpadding="0" cellspacing="0" align="center">
    <tr>
      <td>İçerik</td>
    </tr>
  </table>
</body>
</html>`;

  const result = transformHtml(rawHtml);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const output = result.value.output;

  // Document wrappers must be completely absent
  assert.equal(output.includes("<!DOCTYPE"), false, "Doctype should be removed");
  assert.equal(output.includes("<html"), false, "<html> tag should be removed");
  assert.equal(output.includes("<head"), false, "<head> tag should be removed");
  assert.equal(output.includes("<title"), false, "<title> tag should be removed");
  assert.equal(output.includes("<meta"), false, "<meta> tag should be removed");
  assert.equal(output.includes("<body"), false, "<body> tag should be removed");

  // Output must start with table structure
  assert.ok(output.trim().startsWith("<table"), "Output should start directly with <table>");
  assert.ok(output.includes("<td"), "Table cell must be preserved");
});

test("HTML Transformer: Attributes serialized with single quotes and inner quotes escaped", () => {
  const raw = `<table width="100%" class="main-table" title="Türkiye'nin En İyisi"><tr><td>Test</td></tr></table>`;
  const result = transformHtml(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const output = result.value.output;
  // All attributes must use single quotes: attr='...'
  assert.ok(output.includes("width='100%'"), "Attributes must be serialized with single quotes");
  assert.ok(output.includes("class='main-table'"), "Attributes must be serialized with single quotes");
  // Inner single quote in "Türkiye'nin" must be escaped to &#39;
  assert.ok(output.includes("Türkiye&#39;nin"), "Inner single quotes in attributes must be escaped to &#39;");
});

test("HTML Transformer: Unsubscribe URL transformation to literal EVAM variable", () => {
  const raw = `<table width="600"><tr><td>
    <a href="http://tracking.turkiyefinans.com.tr/Tracking/EmailTracking/CampaignUnsubscribe.aspx?client=123">Abonelikten Ayrıl</a>
  </td></tr></table>`;

  const result = transformHtml(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const output = result.value.output;

  // Must contain literal <PV:Eposta_Istemeyenler>
  assert.ok(
    output.includes(`href='${UNSUBSCRIBE_VARIABLE}'`),
    `Link must be transformed to href='${UNSUBSCRIBE_VARIABLE}'`,
  );

  // Must NOT be HTML entity encoded
  assert.equal(output.includes("&lt;PV:"), false, "EVAM variable must not be entity encoded");
  assert.equal(output.includes("%3CPV:"), false, "EVAM variable must not be URL encoded");
});

test("HTML Transformer: Preserves 1x1 tracking pixels, image maps, and Outlook MSO comments", () => {
  const raw = `<table width="600">
    <tr>
      <td>
        <!-- Standard comment to remove -->
        <!--[if mso]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false">
        <![endif]-->
        <img src="https://tracking.turkiyefinans.com.tr/pixel.gif" width="1" height="1" alt="">
        <map name="menumap">
          <area shape="rect" coords="0,0,100,50" href="https://turkiyefinans.com.tr" alt="Anasayfa" />
        </map>
        <!--[if mso]>
          </v:rect>
        <![endif]-->
      </td>
    </tr>
  </table>`;

  const result = transformHtml(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const output = result.value.output;

  // Standard comment must be removed
  assert.equal(output.includes("Standard comment to remove"), false, "Generic comments should be removed");

  // Outlook MSO comments must be preserved verbatim
  assert.ok(output.includes("<!--[if mso]>"), "Outlook MSO conditional comments must be preserved");
  assert.ok(output.includes("<![endif]-->"), "Outlook MSO conditional end comments must be preserved");

  // 1x1 pixel must be preserved
  assert.ok(output.includes("width='1'"), "1x1 pixel width must be preserved");
  assert.ok(output.includes("height='1'"), "1x1 pixel height must be preserved");

  // Map and area must be preserved
  assert.ok(output.includes("<map"), "<map> element must be preserved");
  assert.ok(output.includes("<area"), "<area> element must be preserved");
});

test("HTML Transformer: Cleans empty <h1>, malformed attributes, and security hazards", () => {
  const raw = `<table width="600">
    <tr>
      <td>
        <h1 style="color: #333; font-size: 24px;"></h1>
        <script>alert('xss');</script>
        <div onclick="doBadThing()">Tıkla</div>
        <td height="78px;">Spacer</td>
      </td>
    </tr>
  </table>`;

  const result = transformHtml(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const output = result.value.output;

  // Empty h1 should be removed
  assert.equal(output.includes("<h1"), false, "Empty <h1> should be cleaned");

  // Script and onclick must be stripped
  assert.equal(output.includes("<script"), false, "<script> must be stripped");
  assert.equal(output.includes("alert('xss')"), false, "Script content must be stripped");
  assert.equal(output.includes("onclick"), false, "onclick handler must be stripped");

  // Malformed presentational attribute with px/semicolon should be cleaned
  assert.equal(output.includes("height='78px;'"), false, "Malformed height attribute must be cleaned");
});

test("HTML Transformer: Turkish characters are strictly preserved", () => {
  const turkishText = "Özel Fırsat: Türkiye Finans Çiftçi Kart ile Bağ-Kur ve Gübre Alımlarında Sıfır Faiz";
  const raw = `<table width="600"><tr><td>${turkishText}</td></tr></table>`;

  const result = transformHtml(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(result.value.output.includes(turkishText), "Turkish text should remain intact without mojibake");
});

test("HTML Transformer: Idempotency check", () => {
  const raw = `<!DOCTYPE html><html><body><table width="600" cellpadding="0" cellspacing="0"><tr><td>
    <p>Merhaba Dünya</p>
    <a href="http://tracking.turkiyefinans.com.tr/Tracking/EmailTracking/CampaignUnsubscribe.aspx">Ayrıl</a>
  </td></tr></table></body></html>`;

  const pass1 = transformHtml(raw);
  assert.equal(pass1.ok, true);
  if (!pass1.ok) return;

  const pass2 = transformHtml(pass1.value.output);
  assert.equal(pass2.ok, true);
  if (!pass2.ok) return;

  assert.equal(
    pass2.value.output,
    pass1.value.output,
    "Transforming already transformed HTML must yield identical output (idempotency)",
  );
});
