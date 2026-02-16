import { Badge, Box, Card, Text, Title } from '@mantine/core';
import { Course } from '@shared/types/Course';
import Link from 'next/link';
import { forwardRef } from 'react';
import { useTutorialContext } from '../tutorial/TutorialContext';

interface CourseCardProps {
  course: Course;
  isTutorial?: boolean;
  onContinueDraft?: (courseId: string) => void;
}

const CourseCard = forwardRef<HTMLAnchorElement, CourseCardProps>(
  ({ course, isTutorial, onContinueDraft }, ref) => {
    const { nextTutorialStage } = useTutorialContext();
    const isDraft = course.status === 'draft';

    const cardContent = (
      <>
        <Box
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            marginBottom: 'var(--mantine-spacing-md)',
          }}
        >
          <Text size="md" fw={600} c="dimmed" tt="uppercase">
            {course.semester}
          </Text>
          {isDraft && (
            <Badge variant="light" color="yellow" size="sm">
              DRAFT
            </Badge>
          )}
        </Box>

        <Title order={2} mb="sm" lineClamp={2}>
          {course.code}
        </Title>

        <Text size="md" c="dimmed" mb="md">
          {course.name}
        </Text>

        {isDraft && onContinueDraft && (
          <Text
            size="sm"
            c="blue.4"
            fw={500}
            mt="auto"
            style={{ opacity: 0.9 }}
          >
            Click to continue creating →
          </Text>
        )}
      </>
    );

    const cardStyles = {
      width: '350px',
      minHeight: '200px',
      display: 'flex',
      flexDirection: 'column' as const,
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 'var(--mantine-shadow-md)',
      },
    };

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
            ...cardStyles,
            alignItems: 'flex-start',
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
        href={`/courses/${course._id}`}
        onClick={() => isTutorial && nextTutorialStage()}
        style={{ ...cardStyles, textDecoration: 'none' }}
        ref={ref}
      >
        {cardContent}
      </Card>
    );
  }
);

CourseCard.displayName = 'CourseCard';

export default CourseCard;
