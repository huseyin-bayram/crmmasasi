/**
 * Shared contracts between tool engines (pure logic in lib/*) and the UI.
 * Engines never throw for expected failures; they return an EngineResult.
 */

export type ToolRunState =
  | "idle"
  | "processing"
  | "success"
  | "warning"
  | "error"
  | "info";

export type FeedbackTone = "success" | "warning" | "error" | "info";

export type EngineErrorCode =
  | "ENGINE_NOT_AVAILABLE"
  | "EMPTY_INPUT"
  | "INPUT_TOO_LARGE"
  | "INVALID_INPUT"
  | "SERVER_ERROR"
  | "NETWORK_ERROR";

export interface EngineError {
  code: EngineErrorCode;
  /** What happened — specific, user-facing, Turkish. */
  message: string;
  /** What the user can do next. */
  hint?: string;
}

export type EngineResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: EngineError };

export function engineNotAvailable(actionLabel: string): {
  ok: false;
  error: EngineError;
} {
  return {
    ok: false,
    error: {
      code: "ENGINE_NOT_AVAILABLE",
      message: `${actionLabel} motoru bu sürümde henüz etkin değil.`,
      hint: "Girdiğiniz içerik değiştirilmedi ve ekranda korunuyor.",
    },
  };
}
