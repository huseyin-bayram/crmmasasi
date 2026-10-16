import { STANDARD_CALL_CENTER_TEMPLATE, EVAM_PAGE_TAGS } from "./constants";

export interface TemplateInsertResult {
  output: string;
  templateInserted: boolean;
  redundantGreetingRemoved: boolean;
}

/**
 * Checks if the content already has the standard template or its key header tokens.
 */
export function hasStandardTemplate(content: string): boolean {
  return (
    content.includes(EVAM_PAGE_TAGS.page1) &&
    content.includes("Musteri Adi:") &&
    content.includes("CustomerInfo.CustomerName")
  );
}

/**
 * Inserts the standard Türkiye Finans Call Center template into the script (Rules 18, 19).
 * Idempotent: If the standard template is already present, does not duplicate.
 * Intelligently removes redundant opening greetings from the source content.
 */
export function insertStandardTemplate(content: string): TemplateInsertResult {
  const trimmed = content.trim();

  // If already contains the standard template, do not insert again
  if (hasStandardTemplate(trimmed)) {
    return {
      output: trimmed,
      templateInserted: false,
      redundantGreetingRemoved: false,
    };
  }

  let body = trimmed;
  let redundantGreetingRemoved = false;

  // Patterns for redundant representative openings in Word documents
  // e.g. <p>MT: Günaydın...</p>, <p>Temsilci: Merhaba...</p>, etc.
  const greetingPatterns = [
    /<p>(?:<strong>)?(?:MT|Temsilci|Müşteri Temsilcisi)[\s\S]*?(?:görüşebilir miyim\?|arıyorum\.)(?:<\/strong>)?<\/p>/i,
    /<p>[\s\S]*?Değişiklik talebiniz olursa[\s\S]*?kayıt altına alınıyor\.[\s\S]*?<\/p>/i,
    /<p>İsmim \?\.\.<\/p>/i,
    /<p>Güvenle görüşebilmemiz için[\s\S]*?kontrol edebilirsiniz\.<\/p>/i,
  ];

  for (const pattern of greetingPatterns) {
    if (pattern.test(body)) {
      body = body.replace(pattern, "");
      redundantGreetingRemoved = true;
    }
  }

  // Also remove redundant customer header if it was partially present
  body = body.replace(/<p><strong>Musteri Adi:[\s\S]*?TCKN:[\s\S]*?<\/strong><\/p>/gi, "");
  body = body.replace(/<strong>Musteri Adi:[\s\S]*?TCKN:[\s\S]*?<\/strong>/gi, "");

  // Clean any leading empty paragraphs at the junction
  body = body.replace(/^(?:<p>\s*<\/p>)+/, "");

  const output = `${STANDARD_CALL_CENTER_TEMPLATE}${body}`;

  return {
    output,
    templateInserted: true,
    redundantGreetingRemoved,
  };
}
