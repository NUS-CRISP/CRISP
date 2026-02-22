import CourseSettingsNavbar from '@/components/CourseSettingsNavbar';
import TimelineInfo from '@/components/views/TimelineInfo';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Box, Container } from '@mantine/core';
import { Milestone, Sprint } from '@shared/types/Course';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const TimelineListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };

  const apiRoute = `/api/courses/${id}/timeline`;

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);

  const permission = hasFacultyPermission();

  const onUpdate = () => {
    fetchTimeline();
  };

  useEffect(() => {
    if (router.isReady) {
      fetchTimeline();
    }
  }, [router.isReady]);

  const fetchTimeline = async () => {
    try {
      const response = await fetch(apiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error fetching timeline:', response.statusText);
      } else {
        const data = await response.json();
        const { milestones, sprints } = data;
        setMilestones(milestones);
        setSprints(sprints);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  return (
    <Box style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <CourseSettingsNavbar />
      <Box style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <Container>
          {id && (
            <TimelineInfo
              courseId={id}
              milestones={milestones}
              sprints={sprints}
              hasFacultyPermission={permission}
              onUpdate={onUpdate}
            />
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default TimelineListPage;
