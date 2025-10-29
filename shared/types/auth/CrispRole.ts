export const CRISP_ROLE = {
  Admin: "admin",
  TrialUser: "trial_user",
  Faculty: "faculty",
  Normal: "normal",
} as const;

export type CrispRole = (typeof CRISP_ROLE)[keyof typeof CRISP_ROLE];
