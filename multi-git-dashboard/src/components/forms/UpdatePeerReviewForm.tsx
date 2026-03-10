// UpdatePeerReviewAssessmentForm.tsx
import PeerReviewBaseForm, {
  NormalizedPeerReviewBasePayload,
  PeerReviewBaseFormValues,
} from './PeerReviewBaseForm';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview } from '@shared/types/PeerReview';
import { InternalAssessment } from '@shared/types/InternalAssessment';

interface UpdatePeerReviewFormProps {
  courseId: string | string[] | undefined;
  teamSets: TeamSet[];
  peerReview: PeerReview;
  internalAssessment: InternalAssessment;
  onUpdated: () => void;
  onClose?: () => void;
}

function toInitialValues(
  peerReview: PeerReview,
  assessment: InternalAssessment
): Partial<PeerReviewBaseFormValues> {
  return {
    assessmentName: peerReview.title ?? '',
    description: peerReview.description ?? '',
    startDate: new Date(peerReview.startDate).toISOString().slice(0, 10),
    endDate: new Date(peerReview.endDate).toISOString().slice(0, 10),

    teamSetId: peerReview.teamSetId,
    reviewerType: peerReview.reviewerType,

    taAssignments: Boolean(peerReview.taAssignments),

    minReviews: peerReview.minReviewsPerReviewer ?? 0,
    maxReviews: peerReview.maxReviewsPerReviewer ?? 1,

    maxMarks: assessment.maxMarks ?? 0,
    scaleToMaxMarks: Boolean(assessment.scaleToMaxMarks),

    gradingStartDate: peerReview.gradingStartDate
      ? new Date(peerReview.gradingStartDate)
          .toISOString()
          .slice(0, 10)
      : '',
    gradingEndDate: peerReview.gradingEndDate
      ? new Date(peerReview.gradingEndDate).toISOString().slice(0, 10)
      : '',
  };
}

const UpdatePeerReviewForm: React.FC<UpdatePeerReviewFormProps> = ({
  courseId,
  teamSets,
  peerReview,
  internalAssessment,
  onUpdated,
  onClose,
}) => {
  const submit = async (payload: NormalizedPeerReviewBasePayload) => {
    const res = await fetch(
      `/api/peer-review-assessments/${courseId}/${internalAssessment._id}/peer-review`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const body = await res.json();
    if (!res.ok) throw new Error(body?.message ?? res.statusText);

    onUpdated();
    onClose?.();
  };

  return (
    <PeerReviewBaseForm
      courseId={courseId}
      teamSets={teamSets}
      mode="update"
      initialValues={toInitialValues(peerReview, internalAssessment)}
      submitLabel="Update Peer Review"
      onCancel={onClose}
      onSubmit={submit}
    />
  );
};

export default UpdatePeerReviewForm;
