import {
  Button,
  Center,
  Container,
  Group,
  Loader,
  Modal,
  Notification,
  Text,
  Card,
  Stack,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview } from '@shared/types/PeerReview';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import DeleteConfirmationModal from '../cards/Modals/DeleteConfirmationModal';
import UpdatePeerReviewForm from '../forms/UpdatePeerReviewForm';
import PeerReviewSettings from '../peer-review/PeerReviewSettings';
import { formatDate } from '../../lib/utils';

interface PeerReviewAssessmentOverviewProps {
  courseId: string;
  assessment: InternalAssessment | null;
  hasFacultyPermission: boolean;
  onUpdated: () => void;
  onDeleted: () => void;
}

const PeerReviewAssessmentOverview: React.FC<PeerReviewAssessmentOverviewProps> = ({
  courseId,
  assessment,
  hasFacultyPermission,
  onUpdated,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [peerReview, setPeerReview] = useState<PeerReview | null>(null);
  
  // Temp fetch of team sets here, will shift up to parent later
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
        `/api/peer-review/${courseId}/${assessment?._id}`,
        { method: 'GET' }
      );
      const prBody = await prRes.json();
      if (!prRes.ok) throw new Error(prBody?.message ?? prRes.statusText);
      
      const teamSets = await fetch(
        `/api/courses/${courseId}/teamsets`,
        { method: 'GET' }
      );
      const teamSetsBody = await teamSets.json();
      if (!teamSets.ok) throw new Error(teamSetsBody?.message ?? teamSets.statusText);

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
        `/api/internal-assessments/${assessment?._id}/peer-review`,
        { method: 'DELETE' }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? res.statusText);

      closeDeleteModal();
      onDeleted();
    } catch (e) {
      setError((e as Error).message ?? 'Failed to delete');
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

  return (
    <Container pb="lg">
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

      <PeerReviewSettings
        peerReview={peerReview}
        teamSetName={teamSetName}
        hasFacultyPermission={hasFacultyPermission}
        onClickUpdate={openUpdateModal}
        onClickDelete={openDeleteModal}
      />

      <Card withBorder radius="md" p="lg">
        <Stack gap="xs">
          <Text fw={600} fz="sm">
            Assessment Details
          </Text>
          <Divider />

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Max Marks
              </Text>
              <Text fz="sm">{assessment.maxMarks}</Text>

              <Text fz="xs" c="dimmed" mt="sm">
                Scale to max marks
              </Text>
              <Text fz="sm">{assessment.scaleToMaxMarks ? 'Yes' : 'No'}</Text>
            </Stack>

            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Assessment Start
              </Text>
              <Text fz="sm">{formatDate(assessment.startDate)}</Text>

              <Text fz="xs" c="dimmed" mt="sm">
                Assessment End
              </Text>
              <Text fz="sm">{formatDate(assessment.endDate)}</Text>
            </Stack>

            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Release Status
              </Text>
              <Text fz="sm">{assessment.isReleased ? 'Released' : 'Not released'}</Text>

              <Text fz="xs" c="dimmed" mt="sm">
                Release Number
              </Text>
              <Text fz="sm">{assessment.releaseNumber}</Text>
            </Stack>
          </SimpleGrid>
        </Stack>
      </Card>

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
}

export default PeerReviewAssessmentOverview;
