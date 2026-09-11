export const failureCodes = [
  "INVALID_ARTIFACT",
  "INVALID_INPUT",
  "GOAL_UNSUPPORTED",
  "POLICY_DENIED",
  "TARGET_MISSING",
  "TARGET_AMBIGUOUS",
  "CHECKPOINT_FAILED",
  "OUTPUT_INVALID",
  "APP_UNAVAILABLE",
  "PERMISSION_DENIED",
  "SESSION_EXPIRED",
  "UNEXPECTED_DIALOG",
  "UNSUPPORTED_BINDING",
  "UNCERTAIN_EFFECT",
  "STALE_CONTROL",
  "CONTROL_CONFLICT",
  "INTERVENTION_EXPIRED",
  "MODEL_REFUSED",
  "MODEL_INVALID",
  "MODEL_UNAVAILABLE",
  "BUDGET_EXCEEDED",
  "NO_PROGRESS",
  "EVIDENCE_UNAVAILABLE",
  "SESSION_LOST",
  "CANCELED",
  "INTERNAL_ERROR",
] as const;
export type FailureCode = (typeof failureCodes)[number];

export class RunError extends Error {
  constructor(readonly code: FailureCode) {
    super(code);
    this.name = "RunError";
  }
}

export function failureCode(error: unknown): FailureCode {
  return error instanceof RunError ? error.code : "INTERNAL_ERROR";
}
