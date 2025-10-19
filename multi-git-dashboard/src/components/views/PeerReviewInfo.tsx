import {
  Accordion,
  Center,
  Container,
  Loader,
  ScrollArea,
  Group,
  Button,
  Modal,
  Text,
  Notification,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState } from 'react';
import PeerReviewAccordionItem from '../peer-review/PeerReviewAccordianItem';
import PeerReviewTAAccordianItem from '../peer-review/PeerReviewTAAccordianItem';
import DeleteConfirmationModal from '../cards/Modals/DeleteConfirmationModal';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview, PeerReviewInfoDTO } from '@shared/types/PeerReview';
import PeerReviewSettingsForm from '../forms/PeerReviewSettingsForm';
import PeerReviewAssignmentForm from '../forms/PeerReviewAssignmentForm';
import { showNotification } from '@mantine/notifications';

interface PeerReviewInfoProps {
  courseId: string;
  teamSets: TeamSet[];
  peerReview: PeerReview;
  hasFacultyPermission: boolean;
  onUpdate: () => void;
}

enum NotificationType {
  Error = 'Error',
  Success = 'Success',
  Info = 'Info',
  Warning = 'Warning',
}

const NotificationTypeToColorMap: Record<NotificationType, string> = {
  [NotificationType.Error]: 'red',
  [NotificationType.Success]: 'green',
  [NotificationType.Info]: 'blue',
  [NotificationType.Warning]: 'yellow',
};

const PeerReviewInfo: React.FC<PeerReviewInfoProps> = ({
  courseId,
  teamSets,
  peerReview,
  hasFacultyPermission,
  onUpdate,
}) => {
  const baseApiRoute = `/api/peer-review/${courseId}/${peerReview._id}`;
  const assignPeerReviewsApiRoute = `${baseApiRoute}/assign-peer-reviews`;
  const baseManualAssignApiRoute = `${baseApiRoute}/manual-assign`;

  const [status, setStatus] = useState<Status>(Status.Idle);
  const [notification, setNotification] = useState<{
    type: NotificationType;
    value: string;
  } | null>(null);
  const [peerReviewInfo, setPeerReviewInfo] =
    useState<PeerReviewInfoDTO | null>(null);

  const [
    openedSettingsForm,
    { open: openSettingsForm, close: closeSettingsForm },
  ] = useDisclosure(false);
  const [
    openedDeleteModal,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [
    openedAssignmentModal,
    { open: openAssignmentModal, close: closeAssignmentModal },
  ] = useDisclosure(false);

  const fetchPeerReviewInfo = async () => {
    try {
      setStatus(Status.Loading);
      const response = await fetch(baseApiRoute, {
        method: 'GET',
      });
      if (!response.ok) {
        console.error('Error fetching peer review info:', response.statusText);
        return;
      }
      const data: PeerReviewInfoDTO = await response.json();
      setPeerReviewInfo(data);
    } catch (error) {
      setStatus(Status.Error);
      console.error('Error fetching peer review info:', error);
    } finally {
      setStatus(Status.Idle);
    }
  };

  useEffect(() => {
    fetchPeerReviewInfo();
  }, [courseId, peerReview._id]);

  const handleDeletePeerReview = async () => {
    try {
      const response = await fetch(baseApiRoute, {
        method: 'DELETE',
      });
      if (!response.ok) {
        console.error('Error deleting peer review:', response.statusText);
      }
      onUpdate();
      showNotification({
        title: 'Success',
        message: 'Peer review deleted successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error deleting peer review:', error);
    }
  };

  const handleAssignPeerReviews = async (
    numberOfReviews: number,
    allowSameTa: boolean
  ) => {
    try {
      setStatus(Status.Loading);
      const response = await fetch(assignPeerReviewsApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewsPerReviewer: numberOfReviews,
          allowSameTA: allowSameTa,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to assign peer reviews: ', data.message);
        setNotification({ type: NotificationType.Error, value: data.message });
        return;
      }
      fetchPeerReviewInfo(); // Refresh the peer review info to reflect new assignments
      setNotification({
        type: NotificationType.Success,
        value: data.message,
      });
    } catch (error) {
      console.error('Error assigning peer reviews: ', error);
      setNotification({
        type: NotificationType.Error,
        value: 'Error assigning peer reviews: ' + (error as Error).message,
      });
    } finally {
      setStatus(Status.Idle);
    }
  };

  const addManualAssignment = async (
    revieweeId: string,
    reviewerId: string
  ) => {
    try {
      setStatus(Status.Loading);
      const response = await fetch(`${baseManualAssignApiRoute}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ revieweeId, reviewerId }),
      });
      if (!response.ok) {
        console.error('Error adding manual assignment:', response.statusText);
        return;
      }
      fetchPeerReviewInfo(); // Refresh the peer review info to reflect new assignments
    } catch (error) {
      console.error('Error adding manual assignment:', error);
    } finally {
      setStatus(Status.Idle);
    }
  };

  const deleteManualAssignment = async (
    revieweeId: string,
    reviewerId: string
  ) => {
    try {
      setStatus(Status.Loading);
      const response = await fetch(
        `${baseManualAssignApiRoute}/${revieweeId}/${reviewerId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        console.error('Error deleting manual assignment:', response.statusText);
        return;
      }
      fetchPeerReviewInfo(); // Refresh the peer review info to reflect new assignments
    } catch (error) {
      console.error('Error deleting manual assignment:', error);
    } finally {
      setStatus(Status.Idle);
    }
  };

  return (
    <Container pb="lg">
      {notification && (
        <Notification
          title={notification.type}
          color={NotificationTypeToColorMap[notification.type]}
          onClose={() => setNotification(null)}
          mb={12}
        >
          {notification.value}
        </Notification>
      )}
      {hasFacultyPermission && peerReviewInfo && (
        <>
          <Group
            grow
            w="100%"
            mb={12}
            mt={4}
            style={{ display: 'flex', flex: '1' }}
          >
            <Button
              onClick={openSettingsForm}
              color="green"
              variant="light"
              disabled={peerReview.status === 'Completed'}
            >
              Update Settings
            </Button>
            <Button
              color="red"
              variant="light"
              onClick={openDeleteModal}
              disabled={peerReview.status === 'Completed'}
            >
              Delete Peer Review
            </Button>
            <Button
              variant="light"
              color="yellow"
              onClick={openAssignmentModal}
            >
              Assign All Peer Reviews
            </Button>
          </Group>
          <Modal
            opened={openedSettingsForm}
            onClose={closeSettingsForm}
            title="Update Peer Review Settings"
          >
            <PeerReviewSettingsForm
              courseId={courseId}
              peerReview={peerReview}
              teamSets={teamSets}
              onSetUpConfirmed={() => {
                onUpdate();
                fetchPeerReviewInfo();
                closeSettingsForm();
              }}
              onClose={closeSettingsForm}
            />
          </Modal>
          <DeleteConfirmationModal
            opened={openedDeleteModal}
            onClose={closeDeleteModal}
            onCancel={closeDeleteModal}
            onConfirm={() => {
              handleDeletePeerReview();
              onUpdate();
              closeDeleteModal();
            }}
            title="Delete Peer Review?"
            message={`Are you sure you want to delete this ${peerReview.status} Peer Review?`}
          />
          <Modal
            opened={openedAssignmentModal}
            onClose={closeAssignmentModal}
            title="Assign Peer Reviews"
          >
            <PeerReviewAssignmentForm
              minReviewsPerReviewer={peerReview.minReviewsPerReviewer}
              maxReviewsPerReviewer={peerReview.maxReviewsPerReviewer}
              onAssign={handleAssignPeerReviews}
              onClose={closeAssignmentModal}
            />
          </Modal>
        </>
      )}
      {peerReviewInfo && !peerReviewInfo.teams ? (
        <Text>No teams found.</Text>
      ) : status === Status.Loading || !peerReviewInfo ? (
        <Center mt={150}>
          <Loader />
        </Center>
      ) : (
        <ScrollArea.Autosize mah={750} scrollbarSize={8}>
          <Accordion
            defaultValue={
              peerReviewInfo.teams ? [peerReviewInfo.teams[0].teamId] : []
            }
            multiple
            variant="separated"
          >
            {peerReview.TaAssignments && (
              <PeerReviewTAAccordianItem
                teams={peerReviewInfo.teams.map(t => ({
                  value: t.teamId,
                  label: `Team ${t.teamNumber}`,
                }))}
                TAToAssignments={peerReviewInfo.TAAssignments}
                maxReviewsPerReviewer={peerReview.maxReviewsPerReviewer}
                addManualAssignment={addManualAssignment}
                deleteManualAssignment={deleteManualAssignment}
              />
            )}
            {peerReviewInfo.teams.map(team => (
              <PeerReviewAccordionItem
                key={team.teamId}
                currentTeam={team}
                teams={peerReviewInfo.teams.map(t => ({
                  value: t.teamId,
                  label: `Team ${t.teamNumber}`,
                }))}
                reviewerType={peerReviewInfo.reviewerType}
                assignmentOfTeam={peerReviewInfo.assignmentsOfTeam[team.teamId]}
                maxReviewsPerReviewer={peerReview.maxReviewsPerReviewer}
                hasFacultyPermission={hasFacultyPermission}
                addManualAssignment={addManualAssignment}
                deleteManualAssignment={deleteManualAssignment}
              />
            ))}
          </Accordion>
        </ScrollArea.Autosize>
      )}
    </Container>
  );
};

export default PeerReviewInfo;
