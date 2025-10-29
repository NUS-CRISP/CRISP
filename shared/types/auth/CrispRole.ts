const CrispRole = {
  Admin: 'admin',
  TrialUser: 'Trial User',
  Faculty: 'Faculty',
  Normal: 'Normal'
} as const;

export type CrispRoleType = (typeof CrispRole)[keyof typeof CrispRole];

export default CrispRole;
