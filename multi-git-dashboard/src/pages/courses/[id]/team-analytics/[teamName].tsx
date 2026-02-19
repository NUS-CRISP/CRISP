import Navbar from '@/components/Navbar';
import TeamAnalyticsDetail from '@/components/views/TeamAnalyticsDetail';
import { Course } from '@shared/types/Course';
import { TeamSet } from '@shared/types/TeamSet';
import { Box, Text } from '@mantine/core';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import {
  DateUtils,
  getCurrentWeekGenerator,
  getEndOfWeek,
  weekToDateGenerator,
} from '@/lib/utils';
import dayjs from 'dayjs';

const TeamDetailPage: React.FC = () => {
  const router = useRouter();
  const courseId = router.query.id as string;
  const teamNameParam = router.query.teamName as string;
  const teamName = teamNameParam ? decodeURIComponent(teamNameParam) : '';

  const [course, setCourse] = useState<Course | null>(null);
  const [dateUtils, setDateUtils] = useState<DateUtils | null>(null);
  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'notfound' | 'error'
  >('loading');

  const fetchCourse = useCallback(async () => {
    if (!courseId) return null;
    const res = await fetch(`/api/courses/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch course');
    const data: Course = await res.json();
    return data;
  }, [courseId]);

  const fetchTeamSets = useCallback(async () => {
    if (!courseId) return [];
    const res = await fetch(`/api/courses/${courseId}/project-management`);
    if (!res.ok) return [];
    const data: TeamSet[] = await res.json();
    return data;
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !teamName) return;

    let cancelled = false;

    const load = async () => {
      setStatus('loading');
      try {
        const [courseData, teamSetsData] = await Promise.all([
          fetchCourse(),
          fetchTeamSets(),
        ]);

        if (cancelled) return;
        if (!courseData) {
          setStatus('error');
          return;
        }

        const courseStartDate = dayjs(courseData.startDate);
        const utils: DateUtils = {
          weekToDate: weekToDateGenerator(courseStartDate),
          getCurrentWeek: getCurrentWeekGenerator(courseStartDate),
          getEndOfWeek,
        };

        setCourse(courseData);
        setDateUtils(utils);
        setTeamSets(teamSetsData ?? []);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, teamName, fetchCourse, fetchTeamSets]);

  const pageContent =
    !courseId || !teamName ? (
      <Text>Course or team not specified</Text>
    ) : status === 'loading' ? (
      <TeamAnalyticsDetail courseId={courseId} teamName={teamName} status="loading" />
    ) : status === 'error' || !course || !dateUtils ? (
      <TeamAnalyticsDetail courseId={courseId} teamName={teamName} status="error" />
    ) : (
      <TeamAnalyticsDetail
        courseId={courseId}
        teamName={teamName}
        course={course}
        dateUtils={dateUtils}
        teamSets={teamSets}
        status="ready"
      />
    );

  return (
    <Box style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Navbar />
      <Box style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {pageContent}
      </Box>
    </Box>
  );
};

export default TeamDetailPage;
