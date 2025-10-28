import PROverview from '@/components/views/PROverview';
import {
  DateUtils,
  getCurrentWeekGenerator,
  getEndOfWeek,
  weekToDateGenerator,
} from '@/lib/utils';
import { Container, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Course } from '@shared/types/Course';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { TeamSet } from '@shared/types/TeamSet';

const CourseViewPage: React.FC = () => {
  const router = useRouter();
  const { pathname, query } = router;
  const isNewCourse = query.new === 'true';

  const courseId = query.id as string;
  const courseApiRoute = `/api/courses/${courseId}`;

  const [course, setCourse] = useState<Course>();
  const [dateUtils, setDateUtils] = useState<DateUtils>();

  const { id } = router.query as {
    id: string;
  };
  const teamReviewApiRoute = `/api/courses/${id}/teamsets `;
  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);

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
        getEndOfWeek: getEndOfWeek,
      };

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

  const fetchTeamSets = async () => {
    try {
      const response = await fetch(teamReviewApiRoute);
      if (!response.ok) {
        console.error('Error fetching Team Sets:', response.statusText);
        return;
      }
      const data = await response.json();
      setTeamSets(data);
    } catch (error) {
      console.error('Error fetching Team Sets:', error);
    }
  };

  const onUpdate = () => {
    fetchTeamSets();
  };

  useEffect(() => {
    if (router.isReady) {
      fetchTeamSets();
    }
  }, [router.isReady]);

  return (
    <Container
      style={{
        height: 'calc(100dvh - 20px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {course && dateUtils ? (
        <PROverview
          courseId={courseId}
          dateUtils={dateUtils}
          teamSets={teamSets}
          onUpdate={onUpdate}
        />
      ) : (
        <Text>Course not available</Text>
      )}
    </Container>
  );
};

export default CourseViewPage;
