/** Personalization variable for the e-mail unsubscribe link. */
export const UNSUBSCRIBE_VARIABLE = "<PV:Eposta_Istemeyenler>";

/** Upload limit for HTML files. Typical campaign e-mails are well below this. */
export const MAX_HTML_FILE_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_HTML_EXTENSIONS = [".html", ".htm"] as const;

/**
 * URL patterns that indicate an unsubscribe or opt-out action in campaign emails.
 */
export const UNSUBSCRIBE_URL_PATTERNS: readonly RegExp[] = [
  /CampaignUnsubscribe/i,
  /unsubscribe/i,
  /tracking\.turkiyefinans\.com\.tr.*CampaignUnsubscribe/i,
  /Tracking\/EmailTracking\/CampaignUnsubscribe/i,
  /optout|opt-out/i,
  /eposta[-_]istemiyorum/i,
  /abonelikten[-_]cik/i,
  /bultenden[-_]ayril/i,
  /cikis/i,
];

/**
 * Text keywords inside <a> tags indicating unsubscribe action in Turkish emails.
 */
export const UNSUBSCRIBE_TEXT_PATTERNS: readonly RegExp[] = [
  /almak\s*istemiyorsanız/i,
  /iletilerini\s*almak\s*istemiyorsanız/i,
  /kampanya[,\s]+bilgilendirme\s*ve\s*tanıtım/i,
  /abonelikten\s*çık/i,
  /üyelikten\s*ayrıl/i,
  /listeden\s*ayrıl/i,
  /e-?posta\s*almak\s*istemiyorsanız/i,
  /bültenden\s*ayrıl/i,
];

/**
 * HTML void elements that must be serialized as self-closing (e.g. <img ... />, <br />).
 */
export const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Tags that must be removed for security in e-mail campaign templates.
 */
export const UNSAFE_TAGS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "select",
  "button",
]);

/**
 * Presentational attributes on tables, cells, etc. that should not have CSS 'px;' syntax.
 */
export const PRESENTATIONAL_ATTRIBUTES = new Set([
  "height",
  "width",
  "cellpadding",
  "cellspacing",
  "border",
  "colspan",
  "rowspan",
]);

/**
 * Rules the transformer applies, shown to the user before a run so the
 * behaviour is predictable (recognition over recall). Conservative by design:
 * layout, tables, image maps, tracking pixels and URLs are always preserved.
 */
export const HTML_TRANSFORM_RULES: readonly string[] = [
  "Gereksiz <html>, <head>, <body> sarmalayıcıları kaldırılır",
  "Gereksiz/boş <h1> başlıkları ve anlamsız boş elementler temizlenir",
  "Tüm HTML nitelikleri standart tek tırnak (single quote) ile normalize edilir",
  "Geçersiz presentation nitelikleri (örn. height='78px;') temizlenir",
  "Eksik görsel alt='' nitelikleri eklenir (1x1 pikseller ve haritalar korunur)",
  `Abonelikten çıkış bağlantısı ${UNSUBSCRIBE_VARIABLE} olarak güncellenir`,
  "Zararlı script, form, iframe ve inline event işleyicileri temizlenir",
  "Outlook/MSO koşullu yorumları korunur, genel yorumlar temizlenir",
  "Gereksiz boşluklar ve satır sonları silinerek HTML minify (kompakt) edilir",
];

export const HTML_VALIDATION_CHECKS: readonly string[] = [
  "Yerel görsel referansları (./image, C:\\, file://, göreli yol)",
  "Göreli bağlantı referansları (./detail.html)",
  "Kapanmamış veya bozuk etiketler",
  "Kaçışlı parametre değişkenleri (&lt;PV:…&gt;)",
  "Riskli yapılar: script, form, iframe, inline event handlers",
  "Doğrulanamayan potansiyel abonelik bağlantıları",
];
