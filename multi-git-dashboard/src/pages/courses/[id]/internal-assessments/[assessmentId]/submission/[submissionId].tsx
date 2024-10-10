// pages/courses/[id]/assessments/[assessmentId]/submission/[submissionId].tsx

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Submission } from '@shared/types/Submission';
import { showNotification } from '@mantine/notifications';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import TakeAssessment from '../take';
import { hasFacultyPermission } from '@/lib/auth/utils';

const ViewSubmissionPage: React.FC = () => {
  const router = useRouter();
  const { assessmentId, submissionId } = router.query as {
    id: string;
    assessmentId: string;
    submissionId: string;
  };

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [assessment, setAssessment] = useState<InternalAssessment | null>(null);
  const permission = hasFacultyPermission();

  useEffect(() => {
    if (router.isReady) {
      // Fetch the submission
      fetch(`/api/submissions/${submissionId}`)
        .then((res) => res.json())
        .then((data: Submission) => {
          setSubmission(data);
        })
        .catch((error) => {
          console.error('Error fetching submission:', error);
          showNotification({
            title: 'Error',
            message: 'Failed to load submission.',
            color: 'red',
          });
        });

      // Fetch the assessment
      fetch(`/api/internal-assessments/${assessmentId}`)
        .then((res) => res.json())
        .then((data: InternalAssessment) => {
          setAssessment(data);
        })
        .catch((error) => {
          console.error('Error fetching assessment:', error);
        });
    }
  }, [router.isReady, submissionId, assessmentId]);

  if (!submission || !assessment) {
    return <div>Loading...</div>;
  }

  // Check if the assessment allows editing
  const canEdit = assessment.areSubmissionsEditable || submission.isDraft || permission;

  return (
    <TakeAssessment
      inputAssessment={assessment}
      existingSubmission={submission}
      canEdit={canEdit}
    />
  );
};

export default ViewSubmissionPage;
