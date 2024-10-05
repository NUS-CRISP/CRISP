import AssessmentsInfo from '@/components/views/AssessmentsInfo';
import { Container } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { hasFacultyPermission } from '@/lib/auth/utils';

const AssessmentListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };

  const assessmentsApiRoute = `/api/courses/${id}/assessments`;
  const internalAssessmentsApiRoute = `/api/courses/${id}/internal-assessments`;
  const courseTeamSetNamesApiRoute = `/api/courses/${id}/teamsets/names`;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [internalAssessments, setInternalAssessments] = useState<InternalAssessment[]>([]);
  const [teamSetNames, setTeamSetNames] = useState<string[]>([]);
  const permission = hasFacultyPermission();

  const onUpdate = () => {
    fetchAssessments();
    fetchInternalAssessments();
    fetchTeamSetNames();
  };

  useEffect(() => {
    if (router.isReady) {
      fetchAssessments();
      fetchInternalAssessments();
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
        console.error('Error fetching internal assessments:', response.statusText);
      } else {
        const data: InternalAssessment[] = await response.json();
        console.log('Internal Assessments:', data);

        if (permission) {
          setInternalAssessments(data);
        } else {
          const releasedAssessments = data.filter((assessment) => assessment.isReleased);
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
        const data: string[] = await response.json();
        setTeamSetNames(data);
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
        teamSetNames={teamSetNames}
        onUpdate={onUpdate}
      />
    </Container>
  );
};

export default AssessmentListPage;
