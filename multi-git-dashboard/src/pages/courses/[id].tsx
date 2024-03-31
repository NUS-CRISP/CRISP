import Overview from '@/components/views/Overview';
import { DateUtils, getCurrentWeekGenerator, getEndOfWeek, weekToDateGenerator } from '@/lib/utils';
import { Container, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Course } from '@shared/types/Course';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

const CourseViewPage: React.FC = () => {
  const router = useRouter();
  const { pathname, query } = router;
  const isNewCourse = query.new === 'true';

  const courseId = query.id as string;
  const courseApiRoute = `/api/courses/${courseId}`;

  const [course, setCourse] = useState<Course>();
  const [dateUtils, setDateUtils] = useState<DateUtils>();

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

  const fetchCourse = useCallback(async () => {
    try {
      const response = await fetch(courseApiRoute);
      if (!response.ok) {
        console.error('Error fetching course:', response.statusText);
        return;
      }
      const course: Course = await response.json();

      const courseStartDate = dayjs(course.startDate);
      const dateUtils = {
        weekToDate: weekToDateGenerator(courseStartDate),
        getCurrentWeek: getCurrentWeekGenerator(courseStartDate),
        getEndOfWeek: getEndOfWeek
      }

      setCourse(course);
      setDateUtils(dateUtils);
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  }, [courseId]);

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
      {course && dateUtils ? <Overview courseId={courseId} dateUtils={dateUtils} /> : <Text>Course not available</Text>}
    </Container>
  );
};

export default CourseViewPage;
