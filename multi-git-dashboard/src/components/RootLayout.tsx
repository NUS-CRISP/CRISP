import { useRouter } from 'next/router';
import styles from '../styles/root-layout.module.css';
import Sidebar from './Sidebar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pathname } = useRouter();

  const excludedRoutes = ['/auth/signin', '/auth/register'];

  const shouldShowSidebar = !excludedRoutes.includes(pathname);

  return (
    <div className={styles.rootLayout}>
      {shouldShowSidebar && <Sidebar />}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
