// The inconsistent naming format is irritating but we will need to run migrations
// to fix the naming format. 
export const CRISP_ROLE = {
  Admin: "admin",
  TrialUser: "Trial User",
  Faculty: "Faculty",
  Normal: "Normal",
} as const;

export type CrispRole = (typeof CRISP_ROLE)[keyof typeof CRISP_ROLE];
