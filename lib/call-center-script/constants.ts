/**
 * Centralized immutable constants for the Call Center Script Editor and EVAM compilation.
 * Rules 15, 17, 18, 53.
 */

export const EVAM_PAGE_TAGS = {
  page1: "<Page1>",
  page2: "<Page2>",
  approvePage: "<ApprovePage>",
} as const;

export const EVAM_CUSTOMER_FIELDS = {
  name: '"+ &eec.CustomerInfo.CustomerName+"',
  age: '" + &eec.CustomerInfo.Age + "',
  gender: '" + &eec.CustomerInfo.Gender + "',
  birthPlace: '" + &eec.CustomerInfo.BirthPlace + "',
  identificationNumber: '" + &eec.CustomerInfo.IdentificationNumber +"',
} as const;

/**
 * Standard Customer Header Block displayed at the very top of Call Center scripts.
 */
export const STANDARD_CUSTOMER_HEADER =
  '<strong>Musteri Adi:  "+ &eec.CustomerInfo.CustomerName+" - Yas:  " + &eec.CustomerInfo.Age + " - Cinsiyet:  " + &eec.CustomerInfo.Gender + " - Dogum Yeri:  " + &eec.CustomerInfo.BirthPlace + " - TCKN:  " + &eec.CustomerInfo.IdentificationNumber +"';

/**
 * Standard Türkiye Finans Call Center Opening Template (Rule 18).
 * Legacy EVAM-compatible hybrid markup that must be preserved byte-for-byte.
 */
export const STANDARD_CALL_CENTER_TEMPLATE =
  '<strong>Musteri Adi:  "+ &eec.CustomerInfo.CustomerName+" - Yas:  " + &eec.CustomerInfo.Age + " - Cinsiyet:  " + &eec.CustomerInfo.Gender + " - Dogum Yeri:  " + &eec.CustomerInfo.BirthPlace + " - TCKN:  " + &eec.CustomerInfo.IdentificationNumber +"<Page1><p><strong><p>MT: Günaydın/İyi günler "+ &eec.CustomerInfo.CustomerName+"  Hanım / Bey ile görüşebilir miyim? Türkiye Finans Katılım Bankası Anonim Şirketi\'nden arıyorum.</p><p> </p><p> Değişiklik talebiniz olursa Türkiye Finans mobil/internet şube veya Müşteri İletişim Merkezimizden tercihinizi değiştirebilirsiniz. (Zorunlu). Görüşmelerimiz kalite standartları gereği kayıt altına alınıyor. (Zorunlu) </p><p>İsmim ?..</p><p>Güvenle görüşebilmemiz için Türkiye Finans Mobil uygulamanıza bildirim gönderdik, dilerseniz kontrol edebilirsiniz.</p><Page2>';

/**
 * Allowed HTML tags in output (Rule 8).
 */
export const ALLOWED_HTML_TAGS = new Set([
  "p",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "br",
]);
