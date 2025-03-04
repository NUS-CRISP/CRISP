import CourseCard from '@/components/cards/CourseCard';
import { useTutorialContext } from '@/components/tutorial/TutorialContext';
import TutorialPopover from '@/components/tutorial/TutorialPopover';
import WelcomeMessage from '@/components/views/WelcomeMessage';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Alert, Box, Button, Modal, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Course } from '@shared/types/Course';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CreateCourseForm from '../../components/forms/CreateCourseForm';

const CourseListPage: React.FC = () => {
  const apiRoute = '/api/courses';
  const permission = hasFacultyPermission();

  const [opened, { open, close }] = useDisclosure(false);

  const { curTutorialStage, startTutorial } = useTutorialContext();

  const router = useRouter();
  const { query, isReady } = router;
  const isTrial = query.trial === 'true';

  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSendTestEmail = async () => {
    setError(null);
    setSuccess(null);

    try {
      // Make a POST request to your testEmail endpoint
      const response = await fetch('/api/notifications/testEmail', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to send test email.');
      }
      setSuccess('Test email sent successfully!');
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred.');
    }
  };

  useEffect(() => {
    fetchCourses();

    return () => {
      window.removeEventListener('beforeunload', () =>
        signOut({ redirect: false })
      );
    };
  }, []);

  useEffect(() => {
    if (isReady && isTrial) {
      delete query.trial;
      router.replace({ query }, undefined, { shallow: true });
      window.addEventListener('beforeunload', () =>
        signOut({ redirect: false })
      );
      startTutorial();
    }
  }, [isReady, isTrial]);

  const fetchCourses = async () => {
    try {
      const response = await fetch(apiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error fetching courses:', response.statusText);
      } else {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  return (
    <ScrollArea
      style={{
        height: '100vh',
        paddingRight: '20px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
      }}
    >
      <Modal opened={opened} onClose={close} title="Course Creation">
        <CreateCourseForm />
      </Modal>
      <Box pl={20}>
        <h1>Courses</h1>
        {courses.length === 0 ? (
          <p>No courses to show</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '15px',
            }}
          >
            {courses.map((course, idx) => (
              <TutorialPopover
                key={course._id}
                stage={4}
                position="bottom"
                hideButton
                disabled={idx !== 0 || curTutorialStage !== 4}
              >
                <CourseCard
                  key={course._id}
                  course={course}
                  isTutorial={idx === 0 && curTutorialStage === 4}
                />
              </TutorialPopover>
            ))}
          </div>
        )}
        {permission && (
          <div>
            <Button onClick={open} mt={16} mb={20}>
              Create Course
            </Button>
          </div>
        )}
        {curTutorialStage === 0 && (
          <WelcomeMessage opened={curTutorialStage === 0} />
        )}
        {/*
          Optional: Display success/error alerts for user feedback
        */}
        {error && (
          <Alert title="Error" color="red" mb="sm">
            {error}
          </Alert>
        )}
        {success && (
          <Alert title="Success" color="green" mb="sm">
            {success}
          </Alert>
        )}

        {/* Button to trigger sending a test email */}
        {permission && (
          <Button onClick={handleSendTestEmail} mt="md">
            Send Test Email
          </Button>
        )}
      </Box>
    </ScrollArea>
  );
};

export default CourseListPage;
