const Role = {
  Admin: 'admin',
  Faculty: 'Faculty member',
  TA: 'Teaching assistant',
  Student: 'Student',
  TrialUser: 'Trial User'
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export default Role;
