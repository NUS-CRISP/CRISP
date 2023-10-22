import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';

import type { AppProps } from 'next/app';
import Head from 'next/head';
import { MantineProvider } from '@mantine/core';
import RootLayout from '@/components/RootLayout';
import { SessionProvider } from 'next-auth/react';

export default function App(props: AppProps) {
  const {
    Component,
    pageProps: { session, ...pageProps },
  } = props;

  return (
    <>
      <Head>
        <title>Page title</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
      </Head>

      <MantineProvider>
        <SessionProvider session={session}>
          <RootLayout>
            <Component {...pageProps} />
          </RootLayout>
        </SessionProvider>
      </MantineProvider>
    </>
  );
}
