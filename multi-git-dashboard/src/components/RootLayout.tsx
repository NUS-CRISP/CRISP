import { useRouter } from 'next/router';
import Sidebar from './Sidebar';
import styles from '../styles/root-layout.module.css';

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
      {shouldShowSidebar && <Sidebar />}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
