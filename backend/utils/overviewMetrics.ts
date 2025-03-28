export const OVERVIEW_METRICS = [
  'complexity',
  'duplicated_lines_density',
  'coverage',
  'security_rating',
  'reliability_rating',
  'sqale_rating',
  'alert_status',
  'bugs_per_commit',
  'lines_per_commit',
  'code_smells_per_commit',
  'bugs_per_pr',
  'lines_per_pr',
  'code_smells_per_pr',
];

export const OVERVIEW_WEIGHTS = {
  COMPLEXITY: 0.104,
  DUPLICATED_LINES_DENSITY: 0.115,
  COVERAGE: 0.09,
  SECURITY_RATING: 0.09,
  SQALE_RATING: 0.09,
  RELIABILITY_RATING: 0.101,
  ALERT_STATUS: 0.001,
  BUGS_PER_COMMIT: 0.057,
  LINES_PER_COMMIT: 0.075,
  CODE_SMELLS_PER_COMMIT: 0.108,
  BUGS_PER_PR: 0.021,
  LINES_PER_PR: 0.02,
  CODE_SMELLS_PER_PR: 0.099,
};

export const getRatingsMapping = (rating: number) => {
  switch (rating) {
    case 1.0:
      return 1.0;
    case 2.0:
      return 0.8;
    case 3.0:
      return 0.6;
    case 4.0:
      return 0.4;
    case 5.0:
      return 0.2;
    default:
      return 0.0;
  }
};
