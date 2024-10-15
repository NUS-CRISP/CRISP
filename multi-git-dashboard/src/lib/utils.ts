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
