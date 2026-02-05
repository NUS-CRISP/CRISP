import { Badge, Card, Group, Text } from '@mantine/core';
import { Course } from '@shared/types/Course';
import Link from 'next/link';
import { forwardRef } from 'react';
import { useTutorialContext } from '../tutorial/TutorialContext';

interface CourseCardProps {
  course: Course;
  isTutorial?: boolean;
  /** When provided and course is a draft, clicking the card calls this instead of navigating. */
  onContinueDraft?: (courseId: string) => void;
}

const CourseCard = forwardRef<HTMLAnchorElement, CourseCardProps>(
  ({ course, isTutorial, onContinueDraft }, ref) => {
    const { nextTutorialStage } = useTutorialContext();
    const isDraft = course.status === 'draft';

    const cardContent = (
      <>
        <Group mt="md" mb="xs" justify="space-between">
          <Text>{course.name}</Text>
          {isDraft && (
            <Badge variant="light" color="gray">
              Draft
            </Badge>
          )}
        </Group>
        <Text size="sm" c="dimmed">
          {course.code}
        </Text>
        <Text size="sm" c="dimmed">
          {course.semester}
        </Text>
        {isDraft && onContinueDraft && (
          <Text size="sm" c="blue" mt="sm" component="span">
            Click to continue creating
          </Text>
        )}
      </>
    );

    if (isDraft && onContinueDraft) {
      return (
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          component="button"
          type="button"
          onClick={() => {
            onContinueDraft(course._id);
            if (isTutorial) nextTutorialStage();
          }}
          style={{
            width: '350px',
            height: '200px',
            marginTop: '6px',
            marginBottom: '6px',
            textAlign: 'left',
            cursor: 'pointer',
          }}
          ref={ref as React.RefObject<HTMLButtonElement>}
        >
          {cardContent}
        </Card>
      );
    }

    return (
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        component={Link}
        href={`/courses/${course._id}/course-overview`}
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
        {cardContent}
      </Card>
    );
  }
);

export default CourseCard;
