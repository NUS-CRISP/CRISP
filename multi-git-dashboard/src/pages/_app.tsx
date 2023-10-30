import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';

import RootLayout from '@/components/RootLayout';
import { MantineProvider } from '@mantine/core';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';

export default function App(props: AppProps) {
  const {
    Component,
    pageProps: { session, ...pageProps },
  } = props;

  return (
    <SessionProvider session={session}>
      <MantineProvider>
        <RootLayout>
          <Component {...pageProps} />
        </RootLayout>
      </MantineProvider>
    </SessionProvider>
  );
}
