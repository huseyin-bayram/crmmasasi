import test from "node:test";
import assert from "node:assert/strict";
import { correctTypography } from "../lib/typo-normalizer";

test("Typo Normalizer: Replaces smart quotes, long dashes, and ellipses", () => {
  const input = `“Türkiye Finans” — Avantajlı finansman… Detaylar ‘burada’.`;
  const result = correctTypography(input);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const { output, totalChanges } = result.value;

  // Smart quotes should be converted
  assert.ok(output.includes("''Türkiye Finans''"), "Curly double quotes should become standard quotes");
  // Long dash should become standard hyphen
  assert.ok(output.includes(" - "), "Em-dash / en-dash should become hyphen-minus");
  // Ellipsis should become three dots
  assert.ok(output.includes("finansman..."), "Single character ellipsis should become three dots");
  // Smart apostrophe
  assert.ok(output.includes("'burada'"), "Curly single quotes should become standard ASCII single quotes");
  assert.ok(totalChanges > 0, "totalChanges should count every normalization");
});

test("Typo Normalizer: Removes invisible unicode characters and zero-width spaces", () => {
  // Input with zero-width space (\u200B), non-breaking space (\u00A0), and byte order mark (\uFEFF)
  const input = "SMS\u200BOnay\u00A0Kodu:\uFEFF123456";
  const result = correctTypography(input);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const { output } = result.value;
  assert.equal(output, "SMSOnay Kodu:123456", "Invisible zero-width characters should be removed and NBSP replaced with regular space");
});

test("Typo Normalizer: Turkish characters are strictly preserved", () => {
  const turkishText = "Açık hesap, çağrı merkezi, ışık hızında işlem, ödüllü şube, gülümseyen yüzler!";
  const result = correctTypography(turkishText);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.output, turkishText, "Turkish characters must never be altered or damaged");
  assert.equal(result.value.totalChanges, 0, "Standard text should produce 0 changes");
});

test("Typo Normalizer: Idempotency check", () => {
  const messy = `“Kampanya”—‘Özel’…\u00A0Detaylar: www.turkiyefinans.com.tr\u200B`;
  const pass1 = correctTypography(messy);
  assert.equal(pass1.ok, true);
  if (!pass1.ok) return;

  const pass2 = correctTypography(pass1.value.output);
  assert.equal(pass2.ok, true);
  if (!pass2.ok) return;

  assert.equal(
    pass2.value.output,
    pass1.value.output,
    "Second pass of typo normalizer must produce identical text to first pass",
  );
  assert.equal(pass2.value.totalChanges, 0, "Second pass must produce 0 additional changes");
});

test("Typo Normalizer: 1. SMS mode converts all Turkish characters to ASCII and fixes typos", () => {
  const input = `“Türkiye Finans”’tan Âlâ Kart ile Çiçek gibi Şans, Günlük Işık ve Ödül! — Kaçırmayın…`;
  const result = correctTypography(input, "sms");

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const { output } = result.value;

  // Verify zero Turkish characters
  assert.ok(!/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/u.test(output), "SMS output must contain zero Turkish characters");
  assert.ok(output.includes("''Turkiye Finans''"), "Curly quotes normalized and Turkish chars converted");
  assert.ok(output.includes("Ala Kart"), "Â converted to A");
  assert.ok(output.includes("Cicek gibi Sans"), "Ç/ç -> C/c, Ş/ş -> S/s");
  assert.ok(output.includes("Gunluk Isik ve Odul!"), "Ü/ü -> U/u, I/ı -> I/i, Ö/ö -> O/o");
  assert.ok(output.includes(" - Kacirmayin..."), "Dash and ellipsis normalized and ğ -> g");
});

test("Typo Normalizer: 2. PUSH mode preserves Turkish characters while fixing typos", () => {
  const input = `“Türkiye Finans”’tan Âlâ Kart ile Çiçek gibi Şans! — Fırsatlar…`;
  const result = correctTypography(input, "push");

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const { output } = result.value;
  // Turkish characters must be preserved
  assert.ok(output.includes("Türkiye Finans"), "Push must preserve Turkish letters");
  assert.ok(output.includes("Âlâ Kart"), "Push must preserve Âlâ");
  assert.ok(output.includes("Çiçek gibi Şans!"), "Push must preserve Ç, Ş");
  // But quotes, dashes, ellipsis must be normalized
  assert.ok(output.includes("''Türkiye Finans''"), "Quotes normalized");
  assert.ok(output.includes(" - Fırsatlar..."), "Dash and ellipsis normalized");
});

test("Typo Normalizer: 3. Mobil Sube mode formats sentence dots with \\n- bullet escape sequence", () => {
  const input = "Ali topu at. Ayşe topu tut. Mahmut topu yakala. Selam sana Selam Mustafa.";
  const expected = "Ali topu at. \\n- Ayşe topu tut. \\n- Mahmut topu yakala. \\n- Selam sana Selam Mustafa.";

  const result = correctTypography(input, "mobil-sube");
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.output, expected, "Mobil Sube must prepend \\n- to the first word after sentence dot");

  // Idempotency check: running again on result produces exact same output
  const pass2 = correctTypography(result.value.output, "mobil-sube");
  assert.equal(pass2.ok, true);
  if (!pass2.ok) return;
  assert.equal(pass2.value.output, expected, "Mobil Sube formatting must be idempotent");

  // Also combines with typo fixes and preserves Turkish
  const combinedInput = `“Ali topu at”. Ayşe topu tut. Mahmut kâr payı yakala.`;
  const combinedRes = correctTypography(combinedInput, "mobil-sube");
  assert.equal(combinedRes.ok, true);
  if (!combinedRes.ok) return;
  assert.ok(combinedRes.value.output.includes("''Ali topu at''. \\n- Ayşe topu tut. \\n- Mahmut kâr payı yakala."));
});

