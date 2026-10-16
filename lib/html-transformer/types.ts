export type HtmlIssueSeverity = "error" | "warning" | "info";

export interface HtmlChange {
  /** Machine-readable change kind, e.g. "wrapper-removed". */
  kind: string;
  /** User-facing summary, e.g. "3 element temizlendi". */
  label: string;
  count: number;
}

export interface HtmlIssue {
  severity: HtmlIssueSeverity;
  code: string;
  message: string;
  /** 1-based line in the output, when it can be determined. */
  line?: number;
}

export interface HtmlTransformResult {
  output: string;
  changes: readonly HtmlChange[];
  issues: readonly HtmlIssue[];
  stats: {
    inputBytes: number;
    outputBytes: number;
    images: number;
    links: number;
  };
}
