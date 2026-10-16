import type { EngineResult } from "@/lib/tools/engine";
import { formatBytes } from "@/lib/text-stats";
import { ACCEPTED_HTML_EXTENSIONS, MAX_HTML_FILE_BYTES } from "./constants";

export interface LoadedHtmlFile {
  name: string;
  size: number;
  text: string;
}

/**
 * Decodes HTML bytes preserving Turkish characters.
 * Handles UTF-8 BOM, declared <meta charset="..."> (e.g. windows-1254, iso-8859-9),
 * and automatically detects/falls back between UTF-8 and Windows-1254 without corrupting
 * Turkish letters (ş, ğ, ı, ö, ü, ç, Ş, Ğ, İ, Ö, Ü, Ç).
 */
export function decodeHtmlBytes(bytes: Uint8Array): string {
  // 1. Check UTF-8 BOM (0xEF, 0xBB, 0xBF)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  // 2. Sample the beginning of the file (up to 4096 bytes) as ASCII to inspect <meta> charset
  const sampleLength = Math.min(bytes.length, 4096);
  let asciiHead = "";
  for (let i = 0; i < sampleLength; i++) {
    asciiHead += String.fromCharCode(bytes[i]);
  }

  const charsetMetaMatch =
    asciiHead.match(/<meta[^>]+charset\s*=\s*["']?([a-zA-Z0-9_-]+)/i) ||
    asciiHead.match(/<meta[^>]+http-equiv\s*=\s*["']?content-type["']?[^>]*content\s*=\s*["'][^"']*charset=([a-zA-Z0-9_-]+)/i) ||
    asciiHead.match(/charset=([a-zA-Z0-9_-]+)/i);

  const declaredCharset = charsetMetaMatch ? charsetMetaMatch[1].toLowerCase().trim() : null;

  // If Turkish charset is explicitly declared
  if (
    declaredCharset &&
    (declaredCharset.includes("1254") ||
      declaredCharset.includes("8859-9") ||
      declaredCharset.includes("latin5") ||
      declaredCharset.includes("turkish"))
  ) {
    try {
      return new TextDecoder("windows-1254").decode(bytes);
    } catch {
      // Fall through to auto-detection
    }
  }

  // 3. Try UTF-8 with fatal: true
  // In Windows-1254 Turkish files, single bytes (0xFE for ş, 0xFD for ı, 0xF0 for ğ)
  // are invalid UTF-8 sequences. TextDecoder with fatal: true will throw.
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    const decoded = utf8Decoder.decode(bytes);
    if (!decoded.includes("\uFFFD")) {
      return decoded;
    }
  } catch {
    // Not valid UTF-8, proceed to windows-1254
  }

  // 4. Try windows-1254
  try {
    const win1254Decoder = new TextDecoder("windows-1254");
    const decodedWin = win1254Decoder.decode(bytes);
    if (!decodedWin.includes("\uFFFD")) {
      return decodedWin;
    }
  } catch {
    // Fall through to utf-8 fallback
  }

  // 5. Fallback to standard utf-8
  return new TextDecoder("utf-8").decode(bytes);
}

/**
 * Reads an uploaded HTML file locally in the browser. Nothing is uploaded
 * to a server. Returns specific, actionable errors.
 */
export async function readHtmlFile(file: File): Promise<EngineResult<LoadedHtmlFile>> {
  const lowerName = file.name.toLowerCase();
  if (!ACCEPTED_HTML_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: `"${file.name}" bir HTML dosyası değil.`,
        hint: "Yalnızca .html veya .htm uzantılı dosyalar yüklenebilir.",
      },
    };
  }

  if (file.size > MAX_HTML_FILE_BYTES) {
    return {
      ok: false,
      error: {
        code: "INPUT_TOO_LARGE",
        message: `"${file.name}" çok büyük (${formatBytes(file.size)}).`,
        hint: `En fazla ${formatBytes(MAX_HTML_FILE_BYTES)} boyutunda dosya yüklenebilir. Görseller dosyaya gömülüyse (base64) bunları URL ile değiştirin.`,
      },
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = decodeHtmlBytes(bytes);

    if (!text.trim()) {
      return {
        ok: false,
        error: {
          code: "EMPTY_INPUT",
          message: `"${file.name}" boş.`,
          hint: "Dosyanın içeriğini kontrol edip tekrar yükleyin.",
        },
      };
    }
    return { ok: true, value: { name: file.name, size: file.size, text } };
  } catch {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: `"${file.name}" okunamadı.`,
        hint: "Dosya başka bir uygulamada açık olabilir. Kapatıp tekrar deneyin veya içeriği kopyalayıp yapıştırın.",
      },
    };
  }
}
