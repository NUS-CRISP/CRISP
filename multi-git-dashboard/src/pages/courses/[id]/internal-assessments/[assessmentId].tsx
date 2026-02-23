import { Container } from '@mantine/core';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { hasFacultyPermission } from '@/lib/auth/utils';
import InternalAssessmentBaseDetail from '@/components/views/InternalAssessmentBaseDetail';
import PeerReviewAssessmentOverview from '@/components/views/PeerReviewAssessmentOverview';

const InternalAssessmentPage: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId } = router.query as { id: string; assessmentId: string };
  const permission = hasFacultyPermission();

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
        <PeerReviewAssessmentOverview
          courseId={id}
          assessment={assessment}
          hasFacultyPermission={permission}
          onUpdated={fetchAssessment}
          onDeleted={() => {
            // parent decides how to navigate away after delete
            router.push(`/courses/${id}/assessments`);
          }}
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
