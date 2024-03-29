import dayjs, { Dayjs } from 'dayjs';

/* Date utils */

export interface DateUtils {
  weekToDate: (week: number) => Dayjs;
  getCurrentWeek: () => number;
  getEndOfWeek: (date: Dayjs) => Dayjs;
}

const BREAK_START_WEEK = 6;
const BREAK_DURATION_WEEKS = 1;

export const weekToDateGenerator = (courseStartDate: Dayjs) => (week: number) => {
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

export const capitalize = <T extends string>(s: T) =>
  (s[0].toUpperCase() + s.slice(1)) as Capitalize<typeof s>;

export const startCase = (s: string) => {
  const result = s.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};
