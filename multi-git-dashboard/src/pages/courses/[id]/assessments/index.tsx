import AssessmentsInfo from '@/components/views/AssessmentsInfo';
import { Container } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const AssessmentListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };
  const assessmentsApiRoute = `/api/courses/${id}/assessments`;
  const courseTeamSetNamesApiRoute = `/api/courses/${id}/teamsets/names`;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [teamSetNames, setTeamSetNames] = useState<string[]>([]);

  const onUpdate = () => {
    fetchAssessments();
    fetchTeamSetNames();
  };

  useEffect(() => {
    if (router.isReady) {
        fetchAssessments();
        fetchTeamSetNames();
    }
  }, [router.isReady]);

  const fetchAssessments = async () => {
    try {
      const response = await fetch(assessmentsApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error fetching assessments:', response.statusText);
      } else {
        const data = await response.json();
        setAssessments(data);
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    }
  };

  const fetchTeamSetNames = async () => {
    try {
      const response = await fetch(courseTeamSetNamesApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error fetching team set names:', response.statusText);
      } else {
        const data = await response.json();
        setTeamSetNames(data);
      }
    } catch (error) {
      console.error('Error fetching team set names:', error);
    }
  };

  return (
    <Container>
      <AssessmentsInfo
        courseId={id}
        assessments={assessments}
        teamSetNames={teamSetNames}
        onUpdate={onUpdate}
      />
    </Container>
  );
};

export default AssessmentListPage;
