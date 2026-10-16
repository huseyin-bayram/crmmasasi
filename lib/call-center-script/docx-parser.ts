import mammoth from "mammoth";

export interface DocxParseResult {
  html: string;
  rawText: string;
  messages: string[];
}

/**
 * Parses a DOCX File or ArrayBuffer client-side into clean HTML using Mammoth.
 * Runs 100% in the user's browser or test environment (Privacy Rule 3).
 */
interface MammothConvertOptions {
  buffer?: Buffer;
  arrayBuffer?: ArrayBuffer;
  styleMap?: string[];
  includeDefaultStyleMap?: boolean;
}

export async function parseDocx(
  input: ArrayBuffer | Uint8Array | Blob | File | Buffer,
): Promise<DocxParseResult> {
  let mammothInput: MammothConvertOptions;

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
    mammothInput = { buffer: input };
  } else if (input instanceof ArrayBuffer) {
    mammothInput = { arrayBuffer: input };
  } else if (input instanceof Uint8Array) {
    const ab = input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength,
    ) as ArrayBuffer;
    mammothInput = { arrayBuffer: ab };
  } else if (typeof (input as Blob).arrayBuffer === "function") {
    const ab = await (input as Blob).arrayBuffer();
    mammothInput = { arrayBuffer: ab };
  } else {
    throw new Error("Geçersiz DOCX veri formatı. ArrayBuffer veya File bekleniyor.");
  }

  const options: MammothConvertOptions = {
    ...mammothInput,
    styleMap: [
      "b => strong",
      "i => em",
      "u => u",
      "p[style-name='Heading 1'] => p > strong:fresh",
      "p[style-name='Heading 2'] => p > strong:fresh",
      "p[style-name='Heading 3'] => p > strong:fresh",
      "p[style-name='Title'] => p > strong:fresh",
      "r[style-name='Strong'] => strong",
    ],
    includeDefaultStyleMap: true,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (mammoth as any).convertToHtml(options);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawResult = await (mammoth as any).extractRawText(options);

  return {
    html: result.value || "",
    rawText: rawResult.value || "",
    messages: (result.messages || []).map((m: { message: string }) => m.message),
  };
}
