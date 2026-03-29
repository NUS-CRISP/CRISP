import {
  Center,
  Container,
  Group,
  Loader,
  Modal,
  Notification,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview } from '@shared/types/PeerReview';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import DeleteConfirmationModal from '../cards/Modals/DeleteConfirmationModal';
import UpdatePeerReviewForm from '../forms/UpdatePeerReviewForm';
import PeerReviewSettings from '../peer-review/PeerReviewSettings';
import PeerReviewProgressOverview from '../peer-review/PeerReviewProgressOverview';
import PeerReviewAssessmentDetail from './PeerReviewAssessmentDetail';

interface PeerReviewAssessmentOverviewProps {
  courseId: string;
  assessment: InternalAssessment | null;
  isFaculty: boolean;
  isTA?: boolean;
  onUpdated: () => void;
  onDeleted: () => void;
}

const PeerReviewAssessmentOverview: React.FC<
  PeerReviewAssessmentOverviewProps
> = ({
  courseId,
  assessment,
  isFaculty,
  isTA = false,
  onUpdated,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [peerReview, setPeerReview] = useState<PeerReview | null>(null);
  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);

  const [
    openedUpdateModal,
    { open: openUpdateModal, close: closeUpdateModal },
  ] = useDisclosure(false);

  const [
    openedDeleteModal,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const prRes = await fetch(
        `/api/peer-review-assessments/${courseId}/${assessment?._id}`,
        { method: 'GET' }
      );
      const prBody = await prRes.json();
      if (!prRes.ok) throw new Error(prBody?.message ?? prRes.statusText);

      const teamSets = await fetch(`/api/courses/${courseId}/teamsets`, {
        method: 'GET',
      });
      const teamSetsBody = await teamSets.json();
      if (!teamSets.ok)
        throw new Error(teamSetsBody?.message ?? teamSets.statusText);

      setTeamSets(teamSetsBody);
      setPeerReview(prBody);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load peer review assessment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId, assessment?._id]);

  const handleDelete = async () => {
    try {
      const res = await fetch(
        `/api/peer-review-assessments/${courseId}/${assessment?._id}/peer-review`,
        { method: 'DELETE' }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? res.statusText);

      closeDeleteModal();
      notifications.show({
        title: 'Peer Review Deleted',
        message: 'Deleted successfully.',
        color: 'green',
        autoClose: 3000,
      });
      onDeleted();
    } catch (e) {
      setError((e as Error).message ?? 'Failed to delete');
    }
  };

  const toDateInput = (value: Date | string | null | undefined) => {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
  };

  const handleCloseAssessment = async () => {
    if (!assessment || !peerReview) return;

    const today = new Date().toISOString().slice(0, 10);

    try {
      setError(null);
      const payload = {
        assessmentName: peerReview.title,
        description: peerReview.description,
        startDate: toDateInput(peerReview.startDate),
        endDate: toDateInput(peerReview.endDate),
        teamSetId: peerReview.teamSetId,
        reviewerType: peerReview.reviewerType,
        taAssignments: !!peerReview.taAssignments,
        maxReviews: peerReview.maxReviewsPerReviewer,
        maxMarks: assessment.maxMarks ?? 0,
        scaleToMaxMarks: !!assessment.scaleToMaxMarks,
        gradingStartDate: toDateInput(peerReview.gradingStartDate) || null,
        gradingEndDate: today,
      };

      const res = await fetch(
        `/api/peer-review-assessments/${courseId}/${assessment._id}/peer-review`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? res.statusText);

      notifications.show({
        title: 'Assessment Closed',
        message: 'Grading has been closed for this peer review assessment.',
        color: 'green',
        autoClose: 3000,
      });

      await fetchData();
      onUpdated();
    } catch (e) {
      setError((e as Error).message ?? 'Failed to close assessment');
    }
  };

  if (loading) {
    return (
      <Center mt={150}>
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Container>
        <Notification
          color="red"
          title="Error"
          onClose={() => setError(null)}
          mb="md"
        >
          {error}
        </Notification>
      </Container>
    );
  }

  if (!assessment || !peerReview) {
    return (
      <Container>
        <Text>No peer review assessment found.</Text>
      </Container>
    );
  }

  const teamSetName =
    teamSets.find(ts => ts._id === peerReview.teamSetId)?.name ||
    'Unknown Team Set';

  const now = new Date();
  const reviewEndAt = new Date(peerReview.endDate);
  const assessmentEndAt = assessment.endDate
    ? new Date(assessment.endDate)
    : null;
  const isReviewClosed = now > reviewEndAt;
  const isAssessmentClosed = !!(assessmentEndAt && now >= assessmentEndAt);
  const isGradingPhase = isReviewClosed && !isAssessmentClosed;

  return (
    <Container pb="lg" pt="6px">
      <Group justify="space-between" align="flex-start" mt="lg" mb="md">
        <div>
          <Text fw={700} fz="xl">
            {assessment.assessmentName}
          </Text>
          <Text c="dimmed" fz="sm">
            Peer Review Assessment
          </Text>
        </div>
      </Group>

      <ScrollArea.Autosize
        mah="calc(100vh - 220px)"
        scrollbarSize={8}
        offsetScrollbars
        pb="lg"
      >
        <Stack gap={0} mr="xs" mb="sm" pb="md">
          <PeerReviewProgressOverview
            courseId={courseId}
            peerReviewId={peerReview._id}
            enabled={isFaculty || isTA}
            showGrading={isFaculty}
          />
          <PeerReviewSettings
            peerReview={peerReview}
            courseId={courseId}
            teamSetName={teamSetName}
            isFaculty={isFaculty}
            isGradingPhase={isGradingPhase}
            isAssessmentClosed={isAssessmentClosed}
            onClickUpdate={openUpdateModal}
            onClickDelete={openDeleteModal}
            onClickCloseAssessment={handleCloseAssessment}
            onStartPeerReview={onUpdated}
          />
          <PeerReviewAssessmentDetail assessment={assessment} />
        </Stack>
      </ScrollArea.Autosize>

      <Modal
        opened={openedUpdateModal}
        onClose={closeUpdateModal}
        title="Update Peer Review Assessment"
        centered
        size="lg"
      >
        <UpdatePeerReviewForm
          courseId={courseId}
          teamSets={teamSets}
          peerReview={peerReview}
          internalAssessment={assessment}
          lockReviewConfig={isReviewClosed}
          onUpdated={() => {
            closeUpdateModal();
            fetchData();
            onUpdated();
          }}
          onClose={closeUpdateModal}
        />
      </Modal>

      <DeleteConfirmationModal
        opened={openedDeleteModal}
        onClose={closeDeleteModal}
        onCancel={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Peer Review Assessment?"
        message="This will delete the peer review run and its linked assessment data (assignments, submissions, grading tasks, and results)."
      />
    </Container>
  );
};

export default PeerReviewAssessmentOverview;
