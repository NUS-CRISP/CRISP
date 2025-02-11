import { EXCLUDE_AUTH_REGEX } from '@/middleware';
import styles from '@styles/root-layout.module.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import { TutorialContextProvider } from './tutorial/TutorialContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const showSidebar =
    router.pathname !== '/' && EXCLUDE_AUTH_REGEX.test(router.pathname);

  const initTutorialStage = -1; // default to -1 to disable tutorial

  return (
    <TutorialContextProvider init={initTutorialStage}>
      <div className={styles.rootLayout}>
        <Head>
          <link rel="shortcut icon" href="/favicon.png" />
        </Head>
        {showSidebar && <Navbar />}
        <div className={styles.content}>{children}</div>
      </div>
    </TutorialContextProvider>
  );
}
