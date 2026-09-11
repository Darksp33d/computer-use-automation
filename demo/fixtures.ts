export const scenarios = [
  "normal",
  "not-found",
  "no-account",
  "validation",
  "permission",
  "notice",
  "intervention",
  "session-expired",
  "slow",
  "unavailable",
  "ambiguous",
  "frame-drift",
  "malformed-balance",
  "wrong-member",
  "wrong-currency",
  "wrong-account-type",
  "native-dialog",
  "delayed-click",
] as const;
export type Scenario = (typeof scenarios)[number];

export const members = {
  A1001: { name: "Alex Morgan", balance: "$12,450.75" },
  B1002: { name: "Taylor Reed", balance: "$8,230.10" },
};

export type Session = {
  memberId: string;
  acknowledged: boolean;
  nickname: string;
  accountType: string;
  createdAt: number;
};
