import { useRouter } from 'next/router';
import styles from '../styles/root-layout.module.css';
import Navbar from './Navbar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { pathname } = router;

  const excludedRoutes = ['/auth/signin', '/auth/register'];
  const shouldShowSidebar = !excludedRoutes.includes(pathname);

  return (
    <div className={styles.rootLayout}>
      {shouldShowSidebar && <Navbar />}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
