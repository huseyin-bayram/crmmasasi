import type { CampaignChannel } from "./types";

export const REQUIRED_FIELDS = [
  "cmsCode",
  "campaignName",
  "channel",
  "startDate",
  "owner",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

/**
 * Flexible alias dictionary for Excel header matching.
 * Case-insensitive, whitespace-insensitive.
 */
export const COLUMN_ALIASES: Record<string, string[]> = {
  cmsCode: [
    "cms kodu",
    "cms kodu ",
    "cms_kodu",
    "cms kod",
    "cms",
    "pega no",
    "pega talep no",
    "talep no",
    "talep numarası",
    "talep kodu",
  ],
  campaignName: [
    "kampanya adı",
    "kampanya adi",
    "kampanya",
    "talep adı",
    "talep adi",
    "iş adı",
    "is adi",
  ],
  channel: [
    "kanal",
    "iletişim kanalı",
    "iletisim kanali",
    "gönderim kanalı",
    "gonderim kanali",
    "kanal adı",
  ],
  startDate: [
    "kampanya başlangıç tarihi",
    "kampanya baslangic tarihi",
    "başlangıç tarihi",
    "baslangic tarihi",
    "başlangıç",
    "baslangic",
    "start date",
    "tarih",
    "gönderim tarihi",
  ],
  endDate: [
    "kampanya bitiş tarihi",
    "kampanya bitis tarihi",
    "bitiş tarihi",
    "bitis tarihi",
    "bitiş",
    "bitis",
    "end date",
  ],
  content: [
    "kampanya içeriği",
    "kampanya icerigi",
    "içerik",
    "icerik",
    "metin",
    "sms metni",
    "push metni",
    "e-posta metni",
  ],
  targetAudience: [
    "hedef kitle detayı",
    "hedef kitle detayi",
    "hedef kitle",
    "hedef kitle kriteri",
    "kitle",
    "segment",
  ],
  requestingUnit: [
    "talep eden iş birimi",
    "talep eden is birimi",
    "talep sahibi birim",
    "talep eden birim",
    "iş birimi",
    "is birimi",
    "birim",
    "departman",
    "bölüm",
  ],
  requester: [
    "iş birimi sorumlusu",
    "is birimi sorumlusu",
    "talep sahibi",
    "talep eden",
    "ilgili kişi",
    "ilgili kisi",
    "talepçi",
  ],
  owner: [
    "sorumlu",
    "crm sorumlusu",
    "kampanya sorumlusu",
    "operatör",
    "atanan",
  ],
  sourceStatus: [
    "statü",
    "statu",
    "durum",
    "status",
    "son durum",
  ],
  note: [
    "açıklama",
    "aciklama",
    "not",
    "notlar",
    "operasyon notu",
    "engel",
    "engel durumu",
  ],
  pegaStatus: [
    "pega statüs",
    "pega status",
    "pega statu",
    "pega durumu",
  ],
  campaignPurpose: [
    "kampanya amacı",
    "kampanya amaci",
    "amaç",
    "amac",
  ],
  campaignProduct: [
    "kampanya ürünü",
    "kampanya urunu",
    "ürün",
    "urun",
  ],
  cardCampaignCode: [
    "kart kampanya kodu",
    "kart kampanya kod",
    "kampanya kodu",
  ],
  advantagePackageNo: [
    "avantaj paket numarası",
    "avantaj paket numarasi",
    "avantaj paket no",
    "paket no",
  ],
};

/**
 * Safely converts Turkish text to lowercase and strips combining diacritical marks.
 * Solves the JavaScript `İ` / `i̇` (\u0130 -> \u0069\u0307) bug where
 * "İptal".toLowerCase().includes("iptal") returns false.
 */
export function normalizeTurkishText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/i̇/g, "i")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalizes raw channel strings into known CampaignChannel categories.
 */
export function normalizeChannel(raw: string): CampaignChannel {
  if (!raw) return "Diğer";
  const lower = normalizeTurkishText(raw);

  if (lower.includes("sms")) return "SMS";
  if (lower.includes("push")) return "PUSH";
  if (lower.includes("eposta") || lower.includes("e-posta") || lower.includes("mail"))
    return "E-posta";
  if (lower.includes("mobil") || lower.includes("bildirim"))
    return "Mobil Bildirim";
  if (lower.includes("şube") || lower.includes("sube")) return "Şube";
  if (lower.includes("atm")) return "ATM";
  if (
    lower.includes("çağrı") ||
    lower.includes("cagri") ||
    lower.includes("call center") ||
    lower.includes("merkezi") ||
    lower.includes("inbound") ||
    lower.includes("inboound")
  )
    return "Çağrı Merkezi";
  if (lower.includes("web") || lower.includes("pop-up") || lower.includes("popup"))
    return "Web Pop-up";
  if (lower.includes("internet") || lower.includes("i̇nternet") || lower.includes("web"))
    return "İnternet";
  if (lower.includes("ivn")) return "IVN";

  return "Diğer";
}

/**
 * Positive blocker patterns (Amendment 4).
 * Requires explicit blocking/waiting phrases, NOT bare keywords.
 */
export const POSITIVE_BLOCKER_PATTERNS = [
  /\bpega\b[\s\S]*?\b(?:bekleniyor|gelmedi|açılmadı|girilmedi|yok|bekliyor)\b/i,
  /\b(?:talep|talep no)\b[\s\S]*?\b(?:açılmadı|bekleniyor|yok|girilmedi)\b/i,
  /\bgörsel\b[\s\S]*?\b(?:bekleniyor|revizede|onaylanmadı|yok|hazır değil)\b/i,
  /\biş birimi\b[\s\S]*?\b(?:bekleniyor|onayı bekleniyor|dönüş bekleniyor)\b/i,
  /\b(?:onay|yasal onay|hukuk onayı|uyum onayı)\b[\s\S]*?\bbekleniyor\b/i,
  /\b(?:hukuk|uyum)\b[\s\S]*?\b(?:onayında|beklemede|bekleniyor)\b/i,
  /\bhedef kitle\b[\s\S]*?\b(?:çalışılıyor|bekleniyor|gelmedi|hazır değil)\b/i,
  /\brevizede\b/i,
  /\baskıya alındı\b/i,
  /\bertelendi\b/i,
  /\bbeklemede\b/i,
  /\bengel\b/i,
];

/**
 * Resolution signals (Amendment 4).
 * If a note contains words indicating the issue was resolved, it is NOT blocked.
 */
export const RESOLVED_SIGNALS = [
  /\b(?:geldi|ulaştı|alındı|iletildi)\b/i,
  /\b(?:tamamlandı|yapıldı|bitti)\b/i,
  /\b(?:onaylandı|onay verildi)\b/i,
  /\b(?:çözüldü|sorun giderildi)\b/i,
  /\b(?:hazır|yüklendi)\b/i,
];
