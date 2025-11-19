import CourseCard from '@/components/cards/CourseCard';
import { useTutorialContext } from '@/components/tutorial/TutorialContext';
import TutorialPopover from '@/components/tutorial/TutorialPopover';
import WelcomeMessage from '@/components/views/WelcomeMessage';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Box, Button, Modal, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Course } from '@shared/types/Course';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CreateCourseForm from '../../components/forms/CreateCourseForm';
import ProfileDropdown from '@/components/ProfileDropdown';

const CourseListPage: React.FC = () => {
  const apiRoute = '/api/courses';
  const permission = hasFacultyPermission();

  const [opened, { open, close }] = useDisclosure(false);

  const { curTutorialStage, startTutorial } = useTutorialContext();

  const router = useRouter();
  const { query, isReady } = router;
  const isTrial = query.trial === 'true';

  const [courses, setCourses] = useState<Course[]>([]);

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
        paddingTop: '8px',
        paddingRight: '20px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
      }}
    >
      <Modal opened={opened} onClose={close} title="Course Creation">
        <CreateCourseForm />
      </Modal>
      <Box pl={20}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '8px',
          }}
        >
          <h1 style={{ margin: 0 }}>Courses</h1>
          <div
            style={{
              marginLeft: 'auto',
              width: 'fit-content',
            }}
          >
            <ProfileDropdown />
          </div>
        </div>
        {courses.length === 0 ? (
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#374151',
              minHeight: '220px',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 8px' }}>No courses yet</h2>
              <p style={{ margin: '0 0 16px', color: '#6b7280' }}>
                You haven’t been added to any courses. Once you’re enrolled,
                they’ll show up here.
              </p>
              {permission && (
                <Button onClick={open} variant="filled">
                  Create a course
                </Button>
              )}
            </div>
          </Box>
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
      </Box>
    </ScrollArea>
  );
};

export default CourseListPage;
