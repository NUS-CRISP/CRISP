import Overview from '@/components/views/Overview';
import { Container, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Course } from '@shared/types/Course';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const CourseViewPage: React.FC = () => {
  const router = useRouter();
  const { pathname, query } = router;
  const isNewCourse = query.new === 'true';

  const courseId = query.id as string;
  const courseApiRoute = `/api/courses/${courseId}`;

  const [course, setCourse] = useState<Course>();

  useEffect(() => {
    if (isNewCourse) {
      notifications.show({
        title: 'Course created',
        message: 'Course created successfully',
        autoClose: 3000,
        onClose: () =>
          delete query.new &&
          router.replace({ pathname, query }, undefined, { shallow: true }),
      });
    }
  }, [isNewCourse]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(courseApiRoute);
      if (!response.ok) {
        console.error('Error fetching course:', response.statusText);
        return;
      }
      const data = await response.json();
      setCourse(data);
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId, fetchCourse]);

  return (
    <Container
      style={{
        height: 'calc(100dvh - 2 * 20px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {course ? <Overview courseId={courseId} /> : <Loader size="md" />}
    </Container>
  );
};

export default CourseViewPage;
