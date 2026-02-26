import TeamsOverview from '@/components/views/TeamAnalytics';
import { Course } from '@shared/types/Course';
import { TeamData } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import { Box, Text } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const TeamAnalyticsPage: React.FC = () => {
  const router = useRouter();
  const courseId = router.query.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [status, setStatus] = useState<Status>(Status.Loading);

  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
      setStatus(Status.Loading);
      try {
        const [courseRes, teamRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/github/course/${courseId}`),
        ]);

        if (!courseRes.ok) throw new Error('Failed to fetch course');
        if (!teamRes.ok) throw new Error('Failed to fetch team data');

        const [courseData, teamDataList] = await Promise.all([
          courseRes.json() as Promise<Course>,
          teamRes.json() as Promise<TeamData[]>,
        ]);

        setCourse(courseData);
        setTeamDatas(teamDataList);
        setStatus(Status.Idle);
      } catch (error) {
        console.error(error);
        setStatus(Status.Error);
      }
    };

    fetchData();
  }, [courseId]);

  if (!courseId) {
    return <Text>Course not available</Text>;
  }

  return (
    <Box style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Box style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <TeamsOverview
          courseId={courseId}
          course={course}
          teamDatas={teamDatas}
          status={status}
        />
      </Box>
    </Box>
  );
};

export default TeamAnalyticsPage;
