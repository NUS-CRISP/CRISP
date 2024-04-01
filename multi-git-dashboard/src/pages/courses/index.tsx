import CourseCard from '@/components/cards/CourseCard';
import { useTutorialContext } from '@/components/tutorial/TutorialContext';
import TutorialPopover from '@/components/tutorial/TutorialPopover';
import WelcomeMessage from '@/components/views/WelcomeMessage';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Box, Button, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Course } from '@shared/types/Course';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CreateCourseForm from '../../components/forms/CreateCourseForm';

const CourseListPage: React.FC = () => {
  const apiRoute = '/api/courses';

  const [opened, { open, close }] = useDisclosure(false);

  const { curTutorialStage, startTutorial } = useTutorialContext();

  const router = useRouter();
  const { query, isReady } = router;
  const isTrial = query.trial === 'true';

  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses();

    return () => {
      window.removeEventListener('beforeunload', () => signOut());
    };
  }, []);

  useEffect(() => {
    if (isReady && isTrial) {
      delete query.trial;
      router.replace({ query }, undefined, { shallow: true });
      window.addEventListener('beforeunload', () => signOut());
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
    <>
      <Modal opened={opened} onClose={close} title="Create Course">
        <CreateCourseForm />
      </Modal>
      <Box pl={20}>
        <h1>Courses</h1>
        {courses.length === 0 ? (
          <p>No courses to show</p>
        ) : (
          <div>
            {courses.map((course, idx) => (
              <TutorialPopover
                key={course._id}
                stage={4}
                position="bottom"
                hideButton
                disabled={idx !== 0 || curTutorialStage !== 4}
              >
                <CourseCard key={course._id} course={course} isTutorial />
              </TutorialPopover>
            ))}
          </div>
        )}
        {hasFacultyPermission() && (
          <div>
            <Button onClick={open} mt={16}>
              Create Course
            </Button>
          </div>
        )}
        {curTutorialStage === 0 && (
          <WelcomeMessage opened={curTutorialStage === 0} />
        )}
      </Box>
    </>
  );
};

export default CourseListPage;
