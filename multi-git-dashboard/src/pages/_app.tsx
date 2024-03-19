import '@mantine/carousel/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';

import RootLayout from '@/components/RootLayout';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { SessionProvider } from 'next-auth/react';
import { AppProps } from 'next/app';

import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);

/* Date functions */

export const START_DATE = dayjs('2024-01-15');
export const BREAK_START_WEEK = 6;
export const BREAK_DURATION_WEEKS = 1;

export const weekToDates = (week: number) => {
  let date = START_DATE.add(week, 'week');
  if (week >= BREAK_START_WEEK) {
    date = date.add(BREAK_DURATION_WEEKS, 'week');
  }
  return date;
};

export const calculateCurrentWeek = () => {
  const today = dayjs();
  const weeksSinceStart = Math.ceil(today.diff(START_DATE, 'week', true));
  const adjustedWeeks =
    weeksSinceStart >= BREAK_START_WEEK
      ? weeksSinceStart - BREAK_DURATION_WEEKS
      : weeksSinceStart;
  return adjustedWeeks;
};

export const endOfWeek = (date: dayjs.Dayjs) =>
  date.isoWeekday(7).hour(23).minute(59).second(59).millisecond(999);

/* End date functions */

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <MantineProvider defaultColorScheme="auto">
        <Notifications />
        <RootLayout>
          <Component {...pageProps} />
        </RootLayout>
      </MantineProvider>
    </SessionProvider>
  );
}
