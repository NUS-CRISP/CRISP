import {
  Accordion,
  Center,
  Container,
  Loader,
  ScrollArea,
  Modal,
  Text,
  Notification,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState, useMemo } from 'react';
import PeerReviewSettings from '../peer-review/PeerReviewSettings';
import PeerReviewAccordionItem from '../peer-review/PeerReviewAccordianItem';
import PeerReviewTAAccordianItem from '../peer-review/PeerReviewTAAccordianItem';
import DeleteConfirmationModal from '../cards/Modals/DeleteConfirmationModal';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview, PeerReviewInfoDTO } from '@shared/types/PeerReview';
import PeerReviewSettingsForm from '../forms/PeerReviewSettingsForm';
import PeerReviewAssignmentForm from '../forms/PeerReviewAssignmentForm';
import { showNotification } from '@mantine/notifications';
import { hasCoursePermission } from '@/lib/auth/utils';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';

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

const usePersistedAccordion = (key: string, validValues: string[]) => {
  const [opened, setOpened] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(saved)
        ? saved.filter(v => validValues.includes(v))
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(opened));
  }, [key, opened]);

  useEffect(() => {
    setOpened(prev => prev.filter(v => validValues.includes(v)));
  }, [validValues]);

  return [opened, setOpened] as const;
};

const PeerReviewInfo: React.FC<PeerReviewInfoProps> = ({
  courseId,
  teamSets,
  peerReview,
  hasFacultyPermission,
  onUpdate,
}) => {
  const baseApiRoute = `/api/peer-review/${courseId}/${peerReview._id}`;
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
    openedAssignmentForm,
    { open: openAssignmentForm, close: closeAssignmentForm },
  ] = useDisclosure(false);

  const isTAOrFaculty = hasCoursePermission(
    courseId,
    COURSE_ROLE.Faculty,
    COURSE_ROLE.TA
  );

  // Fetch Peer Review Info
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
    setNotification(null);
  }, [courseId, peerReview._id]);

  // Persist Accordion State
  const values = useMemo(() => {
    const items = peerReviewInfo?.teams.map(t => t.teamId) || [];
    if (peerReview.taAssignments) items.push('teaching-assistants');
    return items;
  }, [peerReviewInfo]);
  const [opened, setOpened] = usePersistedAccordion(
    'peer-review-accordion',
    values
  );

  // Handlers
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

  const addManualAssignment = async (
    revieweeId: string,
    reviewerId: string,
    isTA: boolean = false
  ) => {
    try {
      setStatus(Status.Loading);
      const response = await fetch(baseManualAssignApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ revieweeId, reviewerId, isTA }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to add manual assignment:', response.statusText);
        setNotification({
          type: NotificationType.Error,
          value: 'Failed to add manual assignment: ' + data.message,
        });
        return;
      }
      fetchPeerReviewInfo(); // Refresh the peer review info to reflect new assignments
    } catch (error) {
      console.error('Failed to add manual assignment:', error);
      setNotification({
        type: NotificationType.Error,
        value: 'Failed to add manual assignment: ' + (error as Error).message,
      });
    } finally {
      setStatus(Status.Idle);
    }
  };

  const deleteManualAssignment = async (
    revieweeId: string,
    reviewerId: string,
    isTA: boolean = false
  ) => {
    try {
      setStatus(Status.Loading);
      const response = await fetch(
        `${baseManualAssignApiRoute}/${revieweeId}/${reviewerId}` +
          `?isTA=${isTA}`,
        {
          method: 'DELETE',
        }
      );
      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to delete manual assignment:', data.message);
        setNotification({
          type: NotificationType.Error,
          value: 'Failed to delete manual assignment: ' + data.message,
        });
        return;
      }
      fetchPeerReviewInfo(); // Refresh the peer review info to reflect new assignments
    } catch (error) {
      console.error('Failed to delete manual assignment:', error);
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
      <PeerReviewSettings
        peerReview={peerReview}
        teamSetName={
          teamSets.find(ts => ts._id === peerReview.teamSetId)?.name ||
          'Unknown Team Set'
        }
        hasFacultyPermission={hasFacultyPermission}
        onClickUpdate={openSettingsForm}
        onClickDelete={openDeleteModal}
        onClickAssign={openAssignmentForm}
      />
      {hasFacultyPermission && (
        <>
          <Modal
            opened={openedSettingsForm}
            onClose={closeSettingsForm}
            title="Update Peer Review Settings"
            centered
          >
            <PeerReviewSettingsForm
              courseId={courseId}
              peerReview={peerReview}
              teamSets={teamSets}
              onSubmit={() => {
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
            opened={openedAssignmentForm}
            onClose={closeAssignmentForm}
            title="Assign Peer Reviews"
            centered
          >
            <PeerReviewAssignmentForm
              courseId={courseId}
              peerReviewId={peerReview._id}
              reviewerType={peerReview.reviewerType}
              taAssignmentsEnabled={!!peerReview.taAssignments}
              minReviewsPerReviewer={peerReview.minReviewsPerReviewer}
              maxReviewsPerReviewer={peerReview.maxReviewsPerReviewer}
              onAssign={() => {
                onUpdate();
                fetchPeerReviewInfo();
                closeAssignmentForm();
              }}
              onClose={closeAssignmentForm}
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
            defaultValue={['teaching-assistants']}
            value={opened}
            onChange={setOpened}
            multiple
            variant="separated"
          >
            {isTAOrFaculty && peerReview.taAssignments && (
              <PeerReviewTAAccordianItem
                teams={peerReviewInfo.teams.map(t => ({
                  value: t.teamId,
                  TA: t.TA,
                  label: `Team ${t.teamNumber}`,
                }))}
                TAToAssignments={peerReviewInfo.TAAssignments}
                hasFacultyPermission={hasFacultyPermission}
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
                  TA: t.TA,
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
