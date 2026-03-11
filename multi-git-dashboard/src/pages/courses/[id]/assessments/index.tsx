import AssessmentsInfo from '@/components/views/AssessmentsInfo';
import { Container } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { hasTAPermission, hasFacultyPermission } from '@/lib/auth/utils';
import { TeamSet } from '@shared/types/TeamSet';

const AssessmentListPage: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();
  const { id } = router.query as {
    id: string;
  };

  const assessmentsApiRoute = `/api/courses/${id}/assessments`;
  const internalAssessmentsApiRoute = `/api/courses/${id}/internal-assessments`;
  const courseTeamSetNamesApiRoute = `/api/courses/${id}/teamsets`;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [internalAssessments, setInternalAssessments] = useState<
    InternalAssessment[]
  >([]);
  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);
  const isFaculty = hasFacultyPermission();
  const isTA = hasTAPermission(id);

  const onUpdate = () => {
    fetchAssessments();
    fetchInternalAssessments();
    fetchTeamSetNames();
  };

  useEffect(() => {
    if (router.isReady && status !== 'loading') {
      fetchAssessments();
      fetchInternalAssessments();
      fetchTeamSetNames();
    }
  }, [router.isReady, status, id]);

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
        const data: Assessment[] = await response.json();
        setAssessments(data);
        console.log('Assessments:', data);
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    }
  };

  // New function to fetch internal assessments
  const fetchInternalAssessments = async () => {
    try {
      const response = await fetch(internalAssessmentsApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(
          'Error fetching internal assessments:',
          response.statusText
        );
      } else {
        const data: InternalAssessment[] = await response.json();
        console.log('Internal Assessments:', data);

        if (isFaculty || isTA) {
          setInternalAssessments(data);
        } else {
          const releasedAssessments = data.filter(
            assessment => assessment.isReleased
          );
          setInternalAssessments(releasedAssessments);
        }
      }
    } catch (error) {
      console.error('Error fetching internal assessments:', error);
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
        const data: TeamSet[] = await response.json();
        setTeamSets(data);
        console.log('Team Set Names:', data);
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
        internalAssessments={internalAssessments}
        teamSets={teamSets}
        onUpdate={onUpdate}
      />
    </Container>
  );
};

export default AssessmentListPage;
