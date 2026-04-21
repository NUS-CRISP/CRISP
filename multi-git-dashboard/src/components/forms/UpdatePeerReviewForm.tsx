// UpdatePeerReviewAssessmentForm.tsx
import { useState, useRef } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
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
  lockReviewConfig?: boolean;
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

    maxReviews: peerReview.maxReviewsPerReviewer ?? 1,

    commitOrTag: peerReview.commitOrTag ?? '',

    maxMarks: assessment.maxMarks ?? 0,
    scaleToMaxMarks: Boolean(assessment.scaleToMaxMarks),

    gradingStartDate: peerReview.gradingStartDate
      ? new Date(peerReview.gradingStartDate).toISOString().slice(0, 10)
      : '',
    gradingEndDate: peerReview.gradingEndDate
      ? new Date(peerReview.gradingEndDate).toISOString().slice(0, 10)
      : '',
  };
}

const hasStructuralChanges = (
  peerReview: PeerReview,
  payload: NormalizedPeerReviewBasePayload
): boolean =>
  String(peerReview.teamSetId) !== String(payload.teamSetId) ||
  peerReview.reviewerType !== payload.reviewerType ||
  Boolean(peerReview.taAssignments) !== payload.taAssignments ||
  (peerReview.maxReviewsPerReviewer ?? 1) !== payload.maxReviews ||
  (peerReview.commitOrTag ?? '') !== (payload.commitOrTag ?? '');

const UpdatePeerReviewForm: React.FC<UpdatePeerReviewFormProps> = ({
  courseId,
  teamSets,
  peerReview,
  internalAssessment,
  lockReviewConfig = false,
  onUpdated,
  onClose,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingPayload = useRef<NormalizedPeerReviewBasePayload | null>(null);

  const performSubmit = async (payload: NormalizedPeerReviewBasePayload) => {
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

  const handleSubmit = async (payload: NormalizedPeerReviewBasePayload) => {
    if (!lockReviewConfig && hasStructuralChanges(peerReview, payload)) {
      pendingPayload.current = payload;
      setConfirmOpen(true);
      throw new Error('__SUBMIT_INTERCEPTED__');
    }
    await performSubmit(payload);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    if (pendingPayload.current) {
      await performSubmit(pendingPayload.current);
      pendingPayload.current = null;
      notifications.show({
        title: 'Peer Review Updated',
        message: 'Updated successfully.',
        color: 'green',
      });
    }
  };

  return (
    <>
      <PeerReviewBaseForm
        courseId={courseId}
        teamSets={teamSets}
        mode="update"
        initialValues={toInitialValues(peerReview, internalAssessment)}
        lockReviewConfig={lockReviewConfig}
        submitLabel="Update Peer Review"
        onCancel={onClose}
        onSubmit={handleSubmit}
      />

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset Assignments?"
        centered
        size="sm"
      >
        <Text fz="sm" mb="lg">
          You have changed one or more structural settings (team set, reviewer
          type, TA assignments, max reviews, or commit/tag).
          <br />
          <br />
          Saving will <strong>delete all existing assignments</strong>.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button color="orange" onClick={handleConfirm}>
            Reset & Save
          </Button>
          <Button variant="default" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default UpdatePeerReviewForm;
