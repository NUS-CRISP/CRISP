import {
  EXCLUDE_AUTH_REGEX,
  EXCLUDE_PEER_REVIEW_GRADING_CONSOLE_REGEX,
  EXCLUDE_PEER_REVIEW_REVIEWER_CONSOLE_REGEX,
} from '@/middleware';
import styles from '@styles/root-layout.module.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import TopBar from './Topbar';
import { TutorialContextProvider } from './tutorial/TutorialContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const showTopBar =
    router.pathname !== '/' &&
    EXCLUDE_AUTH_REGEX.test(router.pathname) &&
    EXCLUDE_PEER_REVIEW_REVIEWER_CONSOLE_REGEX.test(router.pathname) &&
    EXCLUDE_PEER_REVIEW_GRADING_CONSOLE_REGEX.test(router.pathname) &&
    router.pathname !== '/user-guide' &&
    router.pathname !== '/dev-guide';

  const initTutorialStage = -1; // default to -1 to disable tutorial

  return (
    <TutorialContextProvider init={initTutorialStage}>
      <div className={styles.rootLayout}>
        {showTopBar && <TopBar />}
        <Head>
          <link rel="shortcut icon" href="/favicon.png" />
        </Head>
        <div className={styles.content}>{children}</div>
      </div>
    </TutorialContextProvider>
  );
}
