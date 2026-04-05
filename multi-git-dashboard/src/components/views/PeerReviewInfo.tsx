import {
  Accordion,
  Center,
  Container,
  Loader,
  Modal,
  Text,
  Notification,
  Group,
  Button,
  Card,
  Stack,
  Badge,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState, useMemo } from 'react';
import PeerReviewAccordionItem from '../peer-review/PeerReviewAccordianItem';
import PeerReviewTAAccordianItem from '../peer-review/PeerReviewTAAccordianItem';
import PeerReviewProgressOverview from '../peer-review/PeerReviewProgressOverview';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview, PeerReviewInfoDTO } from '@shared/types/PeerReview';
import PeerReviewAssignmentForm from '../forms/PeerReviewAssignmentForm';
import StartPeerReviewModal from '../cards/Modals/StartPeerReviewModal';
import ShowUnassignedButton from '../peer-review/ShowUnassignedButton';
import { useRouter } from 'next/router';
import { formatDate } from '../../lib/utils';
import { getMe, hasTAPermission } from '@/lib/auth/utils';

interface PeerReviewInfoProps {
  courseId: string;
  teamSets: TeamSet[];
  peerReview: PeerReview;
  isFaculty: boolean;
  onUpdate: () => void;
}

enum NotificationType {
  Error = 'Error',
  Success = 'Success',
  Info = 'Info',
  Warning = 'Warning',
}

const statusColor = (status: string) => {
  if (status === 'Closed') return 'red';
  if (status === 'Active') return 'green';
  return 'yellow';
};

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
  isFaculty,
  onUpdate,
}) => {
  const router = useRouter();
  const isTA = hasTAPermission(courseId);
  const [me, setMe] = useState<{
    userId: string;
    userCourseRole: string;
  } | null>(null);
  useEffect(() => {
    (async () => {
      const userData = await getMe(courseId);
      if (userData) setMe(userData);
    })();
  }, [courseId]);

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
    openedAssignmentForm,
    { open: openAssignmentForm, close: closeAssignmentForm },
  ] = useDisclosure(false);

  const [openedStartModal, { open: openStartModal, close: closeStartModal }] =
    useDisclosure(false);

  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  const teamSetName =
    teamSets.find(ts => ts._id === peerReview.teamSetId)?.name ||
    'Unknown Team Set';
  const goToAssessmentManagement = () =>
    router.push(
      `/courses/${courseId}/internal-assessments/${peerReview.internalAssessmentId}`
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

  const myTAReviewerAssignmentIds = useMemo(() => {
    if (!isTA || !me?.userId || !peerReviewInfo?.TAAssignments)
      return [] as string[];
    const mine = peerReviewInfo.TAAssignments[me.userId];
    if (!mine?.assignedReviews) return [] as string[];
    return mine.assignedReviews.map(a => a.assignment._id);
  }, [isTA, me?.userId, peerReviewInfo?.TAAssignments]);

  // Handlers
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
        notifications.show({
          title: 'Error',
          message: 'Failed to add manual assignment: ' + data.message,
          color: 'red',
          autoClose: 3000,
        });
        return;
      }

      // Get the reviewee team name for the notification
      const revieweeTeam = peerReviewInfo?.teams.find(
        t => t.teamId === revieweeId
      );
      const revieweeLabel = revieweeTeam
        ? `Team ${revieweeTeam.teamNumber}`
        : revieweeId;

      notifications.show({
        title: 'Success',
        message: `${revieweeLabel} assigned successfully`,
        color: 'green',
        autoClose: 3000,
      });

      fetchPeerReviewInfo(); // Refresh the peer review info to reflect new assignments
    } catch (error) {
      console.error('Failed to add manual assignment:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to add manual assignment: ' + (error as Error).message,
        color: 'red',
        autoClose: 3000,
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
        notifications.show({
          title: 'Error',
          message: 'Failed to delete manual assignment: ' + data.message,
          color: 'red',
          autoClose: 3000,
        });
        return;
      }
      notifications.show({
        title: 'Success',
        message: 'Reviewer removed successfully',
        color: 'green',
        autoClose: 3000,
      });
      fetchPeerReviewInfo(); // Refresh the peer review info to reflect new assignments
    } catch (error) {
      console.error('Failed to delete manual assignment:', error);
      notifications.show({
        title: 'Error',
        message:
          'Failed to delete manual assignment: ' + (error as Error).message,
        color: 'red',
        autoClose: 3000,
      });
    } finally {
      setStatus(Status.Idle);
    }
  };

  const handleStartPeerReview = async () => {
    try {
      const response = await fetch(`${baseApiRoute}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to start peer review');
      }

      setNotification({
        type: NotificationType.Success,
        value: 'Peer review started successfully!',
      });
      closeStartModal();
      onUpdate(); // Refresh parent data
    } catch (error) {
      console.error('Failed to start peer review:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to start peer review: ' + (error as Error).message,
        color: 'red',
        autoClose: 3000,
      });
    }
  };

  return (
    <Container mb="lg">
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
      <Card withBorder radius="md" p="lg" my="md">
        <Group justify="space-between" align="flex-start" mb="xs">
          <Stack gap={2}>
            <Text fw={800} fz="xl">
              {peerReview.title}
            </Text>
            <Text c="dimmed" fz="sm">
              {peerReview.description || '—'}
            </Text>
          </Stack>

          <Group gap="xs" mt={6}>
            <Badge color={statusColor(peerReview.status)}>
              Review Period: {peerReview.status}
            </Badge>
            {isFaculty &&
              (peerReview.taAssignments ? (
                <Badge variant="light" color="teal">
                  TA Reviews Enabled
                </Badge>
              ) : (
                <Badge variant="light" color="red">
                  TA Reviews Disabled
                </Badge>
              ))}
            <Badge variant="light">
              Reviewer Type: {peerReview.reviewerType}
            </Badge>
          </Group>
        </Group>

        <Divider my="sm" />

        <Group justify="space-between" align="flex-end" mt="sm">
          <Group gap="xl">
            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Team Set
              </Text>
              <Text fz="sm">{teamSetName}</Text>
            </Stack>

            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Review Window
              </Text>
              <Text fz="sm">
                {formatDate(peerReview.startDate)} →{' '}
                {formatDate(peerReview.endDate)}
              </Text>
            </Stack>

            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Max. Reviews / Reviewer
              </Text>
              <Text fz="sm">{peerReview.maxReviewsPerReviewer}</Text>
            </Stack>
          </Group>

          {isFaculty && (
            <Group gap="sm" mt="md">
              {peerReview.status === 'Upcoming' && (
                <Button color="green" onClick={openStartModal}>
                  Start Peer Review Now
                </Button>
              )}

              <Button
                color="yellow"
                variant="light"
                onClick={openAssignmentForm}
                disabled={peerReview.status === 'Closed'}
              >
                Assign Peer Reviews
              </Button>

              <ShowUnassignedButton
                peerReviewId={peerReview._id}
                courseId={courseId}
                onFilterChange={setShowUnassignedOnly}
              />
            </Group>
          )}
          {(isFaculty || isTA) && (
            <Button
              variant="light"
              color="blue"
              onClick={goToAssessmentManagement}
            >
              {isFaculty ? 'Manage Assessment' : 'Grade Reviews'}
            </Button>
          )}
        </Group>
      </Card>

      {peerReviewInfo && !peerReviewInfo.teams ? (
        <Text>No teams found.</Text>
      ) : status === Status.Loading || !peerReviewInfo ? (
        <Center mt={150}>
          <Loader />
        </Center>
      ) : isFaculty || peerReview.status === 'Active' ? (
        <>
          <Accordion
            defaultValue={['teaching-assistants']}
            value={opened}
            onChange={setOpened}
            multiple
            variant="separated"
            mb="lg"
          >
            {(isFaculty || isTA) && (
              <Accordion.Item value="progress">
                <Accordion.Control>
                  <Text fw={600}>Progress Overview</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <PeerReviewProgressOverview
                    courseId={courseId}
                    peerReviewId={peerReview._id}
                    enabled={isFaculty || isTA}
                    showGrading={false}
                  />
                </Accordion.Panel>
              </Accordion.Item>
            )}
            {(isFaculty || isTA) && peerReview.taAssignments && (
              <PeerReviewTAAccordianItem
                teams={peerReviewInfo.teams.map(t => ({
                  value: t.teamId,
                  TA: t.TA,
                  label: `Team ${t.teamNumber}`,
                }))}
                TAToAssignments={peerReviewInfo.TAAssignments}
                showUnassignedOnly={showUnassignedOnly}
                isFaculty={isFaculty}
                addManualAssignment={addManualAssignment}
                deleteManualAssignment={deleteManualAssignment}
              />
            )}

            <Divider my="lg" />

            {peerReviewInfo.teams
              .filter(team => {
                if (!showUnassignedOnly) return true;

                // When filtering for unassigned, only show teams with unassigned reviewers
                if (peerReviewInfo.reviewerType === 'Individual') {
                  // For Individual type, check if any team member has no assignments
                  return team.members.some(
                    member => member.assignedReviews.length === 0
                  );
                } else if (peerReviewInfo.reviewerType === 'Team') {
                  // For Team type, check if the team has no assigned reviewers (teams)
                  const teamAssignments =
                    peerReviewInfo.assignmentsOfTeam[team.teamId];
                  return (
                    !teamAssignments ||
                    teamAssignments.reviewers.teams.length === 0
                  );
                }
                return true;
              })
              .map(team => (
                <PeerReviewAccordionItem
                  key={team.teamId}
                  currentTeam={team}
                  currentUserId={me?.userId}
                  taReviewerAssignmentIds={myTAReviewerAssignmentIds}
                  teams={peerReviewInfo.teams.map(t => ({
                    value: t.teamId,
                    TA: t.TA,
                    label: `Team ${t.teamNumber}`,
                  }))}
                  reviewerType={peerReviewInfo.reviewerType}
                  assignmentOfTeam={
                    peerReviewInfo.assignmentsOfTeam[team.teamId]
                  }
                  maxReviewsPerReviewer={peerReview.maxReviewsPerReviewer}
                  showUnassignedOnly={showUnassignedOnly}
                  isFaculty={isFaculty}
                  isTA={isTA}
                  addManualAssignment={addManualAssignment}
                  deleteManualAssignment={deleteManualAssignment}
                />
              ))}
          </Accordion>
        </>
      ) : (
        <Card withBorder radius="md" p="lg" my="md">
          <Text c="dimmed" ta="center">
            {peerReview.status === 'Closed'
              ? 'This peer review is closed.'
              : 'Peer review assignments will be available when the review period begins.'}
          </Text>
        </Card>
      )}

      {isFaculty && (
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
            maxReviewsPerReviewer={peerReview.maxReviewsPerReviewer}
            onAssign={() => {
              onUpdate();
              fetchPeerReviewInfo();
              closeAssignmentForm();
            }}
            onClose={closeAssignmentForm}
          />
        </Modal>
      )}

      {isFaculty && (
        <StartPeerReviewModal
          opened={openedStartModal}
          onClose={closeStartModal}
          onConfirm={handleStartPeerReview}
          peerReviewId={peerReview._id}
          courseId={courseId}
        />
      )}
    </Container>
  );
};

export default PeerReviewInfo;
