import AssessmentsInfo from '@/components/views/AssessmentsInfo';
import { Container } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { InternalAssessment } from '@shared/types/InternalAssessment'; // Import InternalAssessment type
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const AssessmentListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };

  const assessmentsApiRoute = `/api/courses/${id}/assessments`;
  const internalAssessmentsApiRoute = `/api/courses/${id}/internal-assessments`; // New API route
  const courseTeamSetNamesApiRoute = `/api/courses/${id}/teamsets/names`;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [internalAssessments, setInternalAssessments] = useState<InternalAssessment[]>([]); // New state
  const [teamSetNames, setTeamSetNames] = useState<string[]>([]);

  const onUpdate = () => {
    fetchAssessments();
    fetchInternalAssessments(); // Fetch internal assessments on update
    fetchTeamSetNames();
  };

  useEffect(() => {
    if (router.isReady) {
      fetchAssessments();
      fetchInternalAssessments(); // Fetch internal assessments on mount
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
        console.log(data);
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
        const data = await response.json();
        console.log(data);
        setInternalAssessments(data);
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
        internalAssessments={internalAssessments} // Pass internal assessments
        teamSetNames={teamSetNames}
        onUpdate={onUpdate}
      />
    </Container>
  );
};

export default AssessmentListPage;
