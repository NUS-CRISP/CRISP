import { useRouter } from 'next/router';
import styles from '../styles/root-layout.module.css';
import Sidebar from './Sidebar';
import CourseNavBar from './CourseNavBar';
import { useEffect, useState } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { pathname } = router;
  const [courseCode, setCourseCode] = useState('');

  const excludedRoutes = ['/auth/signin', '/auth/register'];
  const isCourseRoute = pathname.includes('/courses/[id]');

  const shouldShowSidebar = !excludedRoutes.includes(pathname);

  const courseId = isCourseRoute ? (router.query.id as string) : null;

  useEffect(() => {
    const fetchCourse = async () => {
      if (courseId) {
        try {
          const response = await fetch(`/api/courses/${courseId}/code`);
          const data = await response.json();
          setCourseCode(data); // Set the fetched course data in state
        } catch (error) {
          console.error('Failed to fetch course data:', error);
        }
      }
    };

    if (isCourseRoute) {
      fetchCourse();
    }
  }, [courseId, isCourseRoute]);

  return (
    <div className={styles.rootLayout}>
      {shouldShowSidebar && <Sidebar />}
      {isCourseRoute && courseId && (
        <CourseNavBar courseId={courseId} courseCode={courseCode} />
      )}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
