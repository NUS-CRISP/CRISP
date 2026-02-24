import { Container } from '@mantine/core';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import InternalAssessmentBaseDetail from '@/components/views/InternalAssessmentBaseDetail';
import PeerReviewAssessment from '@/components/views/PeerReviewAssessment';

const InternalAssessmentPage: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId } = router.query as { id: string; assessmentId: string };

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
      {assessmentType === 'peer_review' ? (
        <PeerReviewAssessment
          assessment={assessment}
          fetchAssessment={fetchAssessment}
        />
      ) : (
        <InternalAssessmentBaseDetail
          assessment={assessment}
          fetchAssessment={fetchAssessment}
        />
      )}
    </Container>
  );
};

export default InternalAssessmentPage;
