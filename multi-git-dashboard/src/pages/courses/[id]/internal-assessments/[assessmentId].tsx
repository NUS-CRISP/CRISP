import { Center, Container } from '@mantine/core';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import InternalAssessmentBaseDetail from '@/components/views/InternalAssessmentBaseDetail';
import PeerReviewAssessment from '@/components/views/PeerReviewAssessment';
import { hasFacultyPermission, hasTAPermission } from '@/lib/auth/utils';

const InternalAssessmentPage: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };
  const isFaculty = hasFacultyPermission();
  const isTA = hasTAPermission(id);

  const assessmentsApiRoute = useMemo(
    () => (assessmentId ? `/api/internal-assessments/${assessmentId}` : ''),
    [assessmentId]
  );

  const [assessment, setAssessment] = useState<InternalAssessment | null>(null);

  const fetchAssessment = useCallback(async () => {
    if (!assessmentsApiRoute) return;

    const response = await fetch(assessmentsApiRoute, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('Error fetching assessment:', response.statusText);
      alert('Failed to load assessment data. Please try again.');
      return;
    }

    const data: InternalAssessment = await response.json();
    setAssessment(data);
  }, [assessmentsApiRoute]);

  useEffect(() => {
    if (router.isReady) fetchAssessment();
  }, [router.isReady, fetchAssessment]);

  const assessmentType = (assessment as any)?.assessmentType ?? 'standard';

  return (
    <Container>
      {assessmentType === 'peer_review' && (isFaculty || isTA) ? (
        <PeerReviewAssessment
          assessment={assessment}
          fetchAssessment={fetchAssessment}
          isFaculty={isFaculty}
          isTA={isTA}
        />
      ) : isFaculty ? (
        <InternalAssessmentBaseDetail
          assessment={assessment}
          fetchAssessment={fetchAssessment}
          isFaculty={isFaculty}
        />
      ) : (
        <Center>You do not have permission to view this assessment.</Center>
      )}
    </Container>
  );
};

export default InternalAssessmentPage;
