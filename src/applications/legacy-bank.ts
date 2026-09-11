import type { Capability, Condition, Target } from "../contracts/capability.js";
import type { SurfaceMarkers } from "../surfaces/browser.js";

const role = (role: "heading" | "button" | "link", name: string): Target => ({
  kind: "role",
  frame: "workspace",
  role,
  name,
  rationale: "Exact visible role and name in the unique workspace frame",
});
const field = (caption: string, control: "input" | "select"): Target => ({
  kind: "field",
  frame: "workspace",
  caption,
  control,
  rationale: "Control in the row with the exact adjacent visible caption",
});
const cell = (caption: string): Target => ({
  kind: "cell",
  frame: "workspace",
  caption,
  rationale: "Value cell adjacent to the exact visible caption",
});

export const bankTargets: Record<string, Target> = {
  "search-screen": role("heading", "Member search"),
  "results-screen": role("heading", "Search results"),
  "member-screen": role("heading", "Member overview"),
  "savings-screen": role("heading", "Savings account"),
  "form-screen": role("heading", "New sub-account"),
  "review-screen": role("heading", "Review sub-account"),
  "member-field": field("Member number", "input"),
  "search-members": role("button", "Search members"),
  "open-member": role("link", "Open member"),
  "view-savings": role("link", "View savings"),
  "new-account": role("link", "New sub-account"),
  "account-type-field": field("Account type", "select"),
  "nickname-field": field("Account nickname", "input"),
  "review-account": role("button", "Review account"),
  "open-account": role("button", "Open account"),
  "member-number": cell("Member number"),
  "account-type": cell("Account type"),
  balance: cell("Available balance"),
  currency: cell("Currency"),
  nickname: cell("Account nickname"),
  "preparation-status": cell("Preparation status"),
  "member-not-found": role("heading", "Member not found"),
  "account-not-found": role("heading", "Savings account not found"),
  "validation-rejected": role("heading", "Validation rejected"),
  "permission-denied": role("heading", "Permission denied"),
  "app-unavailable": role("heading", "Application unavailable"),
  "session-expired": role("heading", "Session expired"),
  "service-notice": role("heading", "Service notice"),
  "operator-notice": role("heading", "Operator acknowledgment"),
  "dismiss-notice": role("button", "Dismiss notice"),
  "acknowledge-notice": role("button", "Acknowledge notice"),
  "restore-session": role("button", "Restore demo session"),
};

export const bankRoutes: Record<string, readonly string[]> = {
  "/": ["GET"],
  "/bank.css": ["GET"],
  "/search": ["GET"],
  "/find": ["POST"],
  "/member": ["GET"],
  "/savings": ["GET"],
  "/new": ["GET"],
  "/review": ["POST"],
  "/ack": ["POST"],
  "/restore": ["POST"],
};

export const bankActions: Record<
  string,
  {
    kind: "click" | "fill" | "select" | "read";
    input?: string;
    humanOnly?: boolean;
    effect: "read" | "reversible";
  }
> = {
  "member-field": { kind: "fill", input: "memberId", effect: "reversible" },
  "search-members": { kind: "click", effect: "read" },
  "open-member": { kind: "click", effect: "read" },
  "view-savings": { kind: "click", effect: "read" },
  "new-account": { kind: "click", effect: "reversible" },
  "account-type-field": { kind: "select", input: "accountType", effect: "reversible" },
  "nickname-field": { kind: "fill", input: "nickname", effect: "reversible" },
  "review-account": { kind: "click", effect: "reversible" },
  balance: { kind: "read", effect: "read" },
  currency: { kind: "read", effect: "read" },
  "account-type": { kind: "read", effect: "read" },
  "preparation-status": { kind: "read", effect: "read" },
  "dismiss-notice": { kind: "click", effect: "read" },
  "acknowledge-notice": { kind: "click", humanOnly: true, effect: "read" },
  "restore-session": { kind: "click", humanOnly: true, effect: "read" },
};

export const visible = (target: string): Condition => ({ kind: "visible", target });
export const bankMarkers: SurfaceMarkers = {
  screens: [
    "search-screen",
    "results-screen",
    "member-screen",
    "savings-screen",
    "form-screen",
    "review-screen",
  ],
  states: [
    { target: "member-not-found", state: { kind: "business", code: "MEMBER_NOT_FOUND" } },
    { target: "account-not-found", state: { kind: "business", code: "ACCOUNT_NOT_FOUND" } },
    { target: "validation-rejected", state: { kind: "business", code: "VALIDATION_REJECTED" } },
    { target: "permission-denied", state: { kind: "blocked", code: "PERMISSION_DENIED" } },
    { target: "app-unavailable", state: { kind: "blocked", code: "APP_UNAVAILABLE" } },
    { target: "session-expired", state: { kind: "blocked", code: "SESSION_EXPIRED" } },
    { target: "operator-notice", state: { kind: "blocked", code: "UNEXPECTED_DIALOG" } },
    { target: "service-notice", state: { kind: "recoverable", target: "dismiss-notice" } },
  ],
};
export const bankOutcomes: Capability["outcomes"] = [
  { code: "MEMBER_NOT_FOUND", when: visible("member-not-found") },
  { code: "ACCOUNT_NOT_FOUND", when: visible("account-not-found") },
  { code: "VALIDATION_REJECTED", when: visible("validation-rejected") },
];
export const bankRecovery: Capability["recovery"] = [
  {
    when: visible("service-notice"),
    action: { kind: "click", target: "dismiss-notice" },
    postconditions: [{ kind: "absent", target: "service-notice" }, visible("member-screen")],
    maxAttempts: 1,
  },
];

export type TaskContract = Pick<
  Capability,
  "id" | "description" | "inputs" | "outputs" | "success"
>;
export const taskContracts: Record<"savings" | "review", TaskContract> = {
  savings: {
    id: "read-savings-balance",
    description: "Look up a member and return their verified savings balance",
    inputs: { memberId: { kind: "string", minLength: 1, maxLength: 32, sensitivity: "sensitive" } },
    outputs: {
      availableBalanceMinor: {
        target: "balance",
        parser: "usd-minor",
        allowedValues: [],
        sensitivity: "sensitive",
      },
      currency: {
        target: "currency",
        parser: "currency",
        allowedValues: ["USD"],
        sensitivity: "public",
      },
      accountType: {
        target: "account-type",
        parser: "text",
        allowedValues: ["savings"],
        sensitivity: "public",
      },
    },
    success: [
      visible("savings-screen"),
      { kind: "equalsInput", target: "member-number", input: "memberId" },
      { kind: "equalsLiteral", target: "account-type", value: "savings" },
    ],
  },
  review: {
    id: "prepare-sub-account",
    description: "Prepare a sub-account and stop at the verified review screen",
    inputs: {
      memberId: { kind: "string", minLength: 1, maxLength: 32, sensitivity: "sensitive" },
      accountType: { kind: "enum", values: ["savings", "checking"], sensitivity: "public" },
      nickname: { kind: "string", minLength: 1, maxLength: 40, sensitivity: "sensitive" },
    },
    outputs: {
      preparationStatus: {
        target: "preparation-status",
        parser: "text",
        allowedValues: ["ready-for-review"],
        sensitivity: "public",
      },
    },
    success: [
      visible("review-screen"),
      { kind: "equalsInput", target: "member-number", input: "memberId" },
      { kind: "equalsInput", target: "account-type", input: "accountType" },
      { kind: "equalsInput", target: "nickname", input: "nickname" },
    ],
  },
};
