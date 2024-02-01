import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';

import RootLayout from '@/components/RootLayout';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';

export default function App(props: AppProps) {
  const {
    Component,
    pageProps: { session, ...pageProps },
  } = props;

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
