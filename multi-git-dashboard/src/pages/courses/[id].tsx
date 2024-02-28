import Overview from '@/components/views/Overview';
import TeamSetsInfo from '@/components/views/TeamSetsInfo';
import TimelineInfo from '@/components/views/TimelineInfo';
import { Container, Loader, Tabs } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Course, Milestone, Sprint } from '@shared/types/Course';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

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

  const fetchCourse = useCallback(async () => {
    try {
      const response = await fetch(courseApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error('Error fetching course:', response.statusText);
        return;
      }
      const data: Course = await response.json();
      if (data.milestones) {
        data.milestones = data.milestones.map((milestone: Milestone) => ({
          ...milestone,
          dateline: new Date(milestone.dateline),
        }));
      }
      if (data.sprints) {
        data.sprints = data.sprints.map((sprint: Sprint) => ({
          ...sprint,
          startDate: new Date(sprint.startDate),
          endDate: new Date(sprint.endDate),
        }));
      }
      setCourse(data);
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId, fetchCourse]);

  const handleUpdate = () => {
    fetchCourse();
  };

  return (
    <Container
      style={{
        height: 'calc(100dvh - 2 * 20px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {course ? (
        <Tabs
          defaultValue="overview"
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <Tabs.List
            style={{ display: 'flex', justifyContent: 'space-evenly' }}
          >
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="teams">Teams</Tabs.Tab>
            <Tabs.Tab value="timeline">Timeline</Tabs.Tab>
          </Tabs.List>
          <div style={{ overflow: 'auto', flexGrow: 1 }}>
            <Tabs.Panel value="overview">
              <Overview course={course} />
            </Tabs.Panel>
            <Tabs.Panel value="teams">
              <div>
                <TeamSetsInfo course={course} onUpdate={handleUpdate} />
              </div>
            </Tabs.Panel>
            <Tabs.Panel value="timeline">
              <div>
                <TimelineInfo course={course} onUpdate={handleUpdate} />
              </div>
            </Tabs.Panel>
          </div>
        </Tabs>
      ) : (
        <Loader size="md" />
      )}
    </Container>
  );
};

export default CourseViewPage;
