export type TypoRuleId =
  | "smart-apostrophe"
  | "smart-quote"
  | "long-dash"
  | "ellipsis"
  | "non-breaking-space"
  | "invisible"
  | "turkish-ascii"
  | "sentence-bullet";

export type TypoChannelMode = "sms" | "push" | "mobil-sube";

export interface TypoCorrectionOptions {
  channel?: TypoChannelMode;
}

export interface TypoChange {
  rule: TypoRuleId;
  count: number;
}

export interface TypoCorrectionResult {
  output: string;
  totalChanges: number;
  changes: readonly TypoChange[];
  channel: TypoChannelMode;
  channelOutputs: {
    sms: string;
    push: string;
    "mobil-sube": string;
  };
}

