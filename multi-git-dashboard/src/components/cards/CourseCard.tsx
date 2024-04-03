import { Card, Group, Text } from '@mantine/core';
import { Course } from '@shared/types/Course';
import Link from 'next/link';
import { forwardRef } from 'react';
import { useTutorialContext } from '../tutorial/TutorialContext';

interface CourseCardProps {
  course: Course;
  isTutorial?: boolean;
}

const CourseCard = forwardRef<HTMLAnchorElement, CourseCardProps>(
  ({ course, isTutorial }, ref) => {
    const { nextTutorialStage } = useTutorialContext();

    return (
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        component={Link}
        href={`/courses/${course._id}`}
        onClick={() => isTutorial && nextTutorialStage()}
        style={{
          width: '350px',
          height: '200px',
          marginTop: '6px',
          marginBottom: '6px',
          textDecoration: 'none',
        }}
        ref={ref}
      >
        <Group mt="md" mb="xs">
          <Text>{course.name}</Text>
        </Group>

        <Text size="sm" c="dimmed">
          {course.code}
        </Text>
        <Text size="sm" c="dimmed">
          {course.semester}
        </Text>
      </Card>
    );
  }
);

export default CourseCard;
