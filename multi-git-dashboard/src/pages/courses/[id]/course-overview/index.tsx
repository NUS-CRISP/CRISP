import CourseOverview from '@/components/views/CourseOverview';
import { Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const CourseViewPage: React.FC = () => {
  const router = useRouter();
  const { pathname, query } = router;
  const isNewCourse = query.new === 'true';

  const courseId = query.id as string;

  useEffect(() => {
    if (isNewCourse) {
      notifications.show({
        title: 'Course created',
        message: 'Course created successfully',
        autoClose: 3000,
        onOpen: () =>
          delete query.new &&
          router.replace({ pathname, query }, undefined, { shallow: true }),
      });
    }
  }, [isNewCourse]);

  if (!courseId) return <Text>Course not available</Text>;

  return <CourseOverview courseId={courseId} />;
};

export default CourseViewPage;
