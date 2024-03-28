import { EXCLUDE_AUTH_REGEX } from '@/middleware';
import styles from '@styles/root-layout.module.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from './Navbar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const showSidebar = router.pathname !== '/' && EXCLUDE_AUTH_REGEX.test(router.pathname);

  return (
    <div className={styles.rootLayout}>
      <Head>
        <link rel="shortcut icon" href="/favicon.png" />
      </Head>
      {showSidebar && <Navbar />}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
