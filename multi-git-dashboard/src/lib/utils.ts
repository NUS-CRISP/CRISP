import { useTutorialContext } from '@/components/tutorial/TutorialContext';
import { rgba } from '@mantine/core';
import dayjs, { Dayjs } from 'dayjs';

/* Date utils */

export interface DateUtils {
  weekToDate: (week: number) => Dayjs;
  getCurrentWeek: () => number;
  getEndOfWeek: (date: Dayjs) => Dayjs;
}

const BREAK_START_WEEK = 6;
const BREAK_DURATION_WEEKS = 1;

export const weekToDateGenerator =
  (courseStartDate: Dayjs) => (week: number) => {
    let date = courseStartDate.add(week, 'week');
    if (week >= BREAK_START_WEEK) {
      date = date.add(BREAK_DURATION_WEEKS, 'week');
    }
    return date;
  };

export const getCurrentWeekGenerator = (courseStartDate: Dayjs) => () => {
  const today = dayjs();
  const weeksSinceStart = Math.ceil(today.diff(courseStartDate, 'week', true));
  const adjustedWeeks =
    weeksSinceStart >= BREAK_START_WEEK
      ? weeksSinceStart - BREAK_DURATION_WEEKS
      : weeksSinceStart;
  return adjustedWeeks;
};

export const getEndOfWeek = (date: Dayjs) =>
  date.isoWeekday(7).hour(23).minute(59).second(59).millisecond(999);

/* String Utils */
export const capitalize = <T extends string>(s: T) =>
  (s[0].toUpperCase() + s.slice(1)) as Capitalize<typeof s>;

export const startCase = (s: string) => {
  const result = s.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

/* Metrics Utils */
export const convertRating = (rating: string) => {
  switch (rating) {
    case '1.0':
      return 'A';
    case '2.0':
      return 'B';
    case '3.0':
      return 'C';
    case '4.0':
      return 'D';
    case '5.0':
      return 'E';
    case '6.0':
      return 'F';
    default:
      return rating;
  }
};

export const convertPercentage = (percentage: string) => {
  if (percentage === 'N/A') return percentage;
  return `${percentage}%`;
};

export const getQualityGateLevel = (qualityGateDetails: string) => {
  const data = JSON.parse(qualityGateDetails);
  return data.level;
};

/* Misc */
export const getTutorialHighlightColor = (stage: number) => {
  const { curTutorialStage } = useTutorialContext();
  return curTutorialStage === stage ? rgba('gray', 0.05) : undefined;
};

/* Constants */

export const tutorialContents = [
  'Welcome to CRISP!',
  'This is the navbar. Navigate through the application using these links.',
  'Access your courses here.',
  'Manage your account and access help here.',
  'Click on a course to view its details.',
  'This is the course overview page. On the left, you can access various views.',
  'You are currently on the overview page. Here, you can see a statistical overview of the course.',
  'Here you can see the statistical breakdown of a single team.',
  'This is the analytics view. Here you can scroll through a list of visualizations to see how this team is performing.',
  'This is the PR view. Here you can see the PRs submitted by this each team member, and the details of each PR. You can also filter PRs by various criteria.',
  'You can drag the slider to change the week range of the analytics and PR views.',
];

interface MetricExplanations {
  [key: string]: string;
}
export const metricExplanations: MetricExplanations = {
  complexity:
    'Calculated based on the number of paths through the code. Whenever the control flow of a function splits, the complexity counter gets incremented by one. Each function has a minimum complexity of 1. This calculation varies slightly by language because keywords and functionalities do.',
  cognitive_complexity: "How hard it is to understand the code's control flow.",
  branch_coverage:
    "On each line of code containing some boolean expressions, the condition coverage simply answers the following question: 'Has each boolean expression been evaluated both to true and false?'. This is the density of possible conditions in flow control structures that have been followed during unit tests execution.",
  coverage:
    'It is a mix of Line coverage and Condition coverage. Its goal is to provide an even more accurate answer to the following question: How much of the source code has been covered by the unit tests?',
  line_coverage:
    'On a given line of code, Line coverage simply answers the following question: Has this line of code been executed during the execution of the unit tests? It is the density of covered lines by unit tests.',
  tests: 'Number of unit tests.',
  uncovered_conditions:
    'Number of conditions which are not covered by unit tests.',
  uncovered_lines:
    'Number of lines of code which are not covered by unit tests.',
  test_execution_time: 'Time required to execute all the unit tests.',
  test_errors: 'Number of unit tests that have failed.',
  test_failures:
    'Number of unit tests that have failed with an unexpected exception.',
  test_success_density:
    'Test success density = (Unit tests - (Unit test errors + Unit test failures)) / Unit tests * 100',
  skipped_tests: 'Number of skipped unit tests.',
  duplicated_blocks: 'Number of duplicated blocks of lines.',
  duplicated_files: 'Number of files involved in duplications.',
  duplicated_lines: 'Number of lines involved in duplications.',
  duplicated_lines_density: 'Duplicated lines / lines * 100',
  code_smells: 'Total count of Code Smell issues.',
  sqale_index:
    'Effort to fix all Code Smells. The measure is stored in minutes in the database. An 8-hour day is assumed when values are shown in days. Uses SQALE Index.',
  sqale_debt_ratio:
    'Ratio between the cost to develop the software and the cost to fix it. The Technical Debt Ratio formula is: Remediation cost / Development cost.',
  sqale_rating:
    'Rating given to your project related to the value of your Technical Debt Ratio.',

  alert_status:
    'State of the Quality Gate associated to your Project. Possible values are: ERROR, OK. Your new code will be clean if: New code has 0 issues, All new security hotspots are reviewed, Coverage is greater than or equal to 80.0%, Duplicated Lines (%) is less than or equal to 3.0%',
  quality_gate_details:
    'For all the conditions of your Quality Gate, you know which condition is failing and which is not.',
  bugs: 'Number of bug issues.',
  reliability_rating:
    'A= 0 Bugs, B= at least 1 Minor Bug, C= at least 1 Major Bug, D= at least 1 Critical Bug, E= at least 1 Blocker Bug',
  reliability_remediation_effort:
    'Effort to fix all bug issues. The measure is stored in minutes in the DB. An 8-hour day is assumed when values are shown in days.',
  vulnerabilities: 'Number of vulnerability issues.',
  security_rating:
    'A= 0 Vulnerabilities, B= at least 1 Minor Vulnerability, C= at least 1 Major Vulnerability, D= at least 1 Critical Vulnerability, E= at least 1 Blocker Vulnerability',
  security_remediation_effort:
    'Effort to fix all vulnerability issues. The measure is stored in minutes in the DB. An 8-hour day is assumed when values are shown in days.',
  security_hotspots: 'Number of Security Hotspots.',
  classes:
    'Number of classes (including nested classes, interfaces, enums, and annotations).',
  comment_lines:
    'Number of lines containing either comment or commented-out code.',
  comment_lines_density:
    'Comment lines / (Lines of code + Comment lines) * 100',
  files: 'Number of files.',
  lines: 'Number of physical lines (number of carriage returns).',
  ncloc:
    'Number of physical lines that contain at least one character which is neither a whitespace nor a tabulation nor part of a comment.',
  functions:
    'Number of functions. Depending on the language, a function is either a function or a method or a paragraph.',
  statements: 'Number of statements.',
};
