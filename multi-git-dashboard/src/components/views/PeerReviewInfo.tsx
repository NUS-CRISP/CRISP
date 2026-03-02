import {
  Accordion,
  Center,
  Container,
  Loader,
  ScrollArea,
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
import { useDisclosure } from '@mantine/hooks';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState, useMemo } from 'react';
import PeerReviewAccordionItem from '../peer-review/PeerReviewAccordianItem';
import PeerReviewTAAccordianItem from '../peer-review/PeerReviewTAAccordianItem';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview, PeerReviewInfoDTO } from '@shared/types/PeerReview';
import PeerReviewAssignmentForm from '../forms/PeerReviewAssignmentForm';
import { useRouter } from 'next/router';
import { formatDate } from '../../lib/utils';
import { hasTAPermission } from '@/lib/auth/utils';

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
  if (status === 'Closed') return 'green';
  if (status === 'Active') return 'yellow';
  return 'violet';
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
  
  const teamSetName = teamSets.find(ts => ts._id === peerReview.teamSetId)?.name || 'Unknown Team Set';
  const goToAssessmentManagement = () => router.push(`/courses/${courseId}/internal-assessments/${peerReview.internalAssessmentId}`);

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
      
      <Card withBorder radius="md" p="lg" my="md" style={{ backgroundColor: '#2b2b2b' }}>
        <Group justify="space-between" align="flex-start" mb="xs">
          <Stack gap={2}>
            <Text fw={800} fz="xl">
              {peerReview.title}
            </Text>
            <Text c="dimmed" fz="sm">
              {peerReview.description || '—'}
            </Text>
          </Stack>

          <Group gap="xs">
            {isFaculty && (
              <>
                { peerReview.taAssignments ? (
                    <Badge variant="light" color="teal">
                      TA Reviews Enabled
                    </Badge>
                  ) : (
                    <Badge variant="light" color="red">
                      TA Reviews Disabled
                    </Badge>
                  )
                }
                <Badge variant="light">Reviewer Type: {peerReview.reviewerType}</Badge>
              </>
            )}
            <Badge variant="light" color={statusColor(peerReview.status)}>{peerReview.status}</Badge>
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
                {formatDate(peerReview.startDate)} → {formatDate(peerReview.endDate)}
              </Text>
            </Stack>

            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Reviews / Reviewer
              </Text>
              <Text fz="sm">
                {peerReview.minReviewsPerReviewer} – {peerReview.maxReviewsPerReviewer}
              </Text>
            </Stack>
          </Group>

          {isFaculty && (
            <Group gap="sm" mt="md">
              <Button
                color="yellow"
                variant="light"
                onClick={openAssignmentForm}
                disabled={peerReview.status === 'Closed'}
              >
                Assign All Peer Reviews
              </Button>

              <Button variant="light" color="blue" onClick={goToAssessmentManagement}>
                Manage in Assessments
              </Button>
            </Group>
          )}
        </Group>
      </Card>
      
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
      )}
      {peerReviewInfo && !peerReviewInfo.teams ? (
        <Text>No teams found.</Text>
      ) : status === Status.Loading || !peerReviewInfo ? (
        <Center mt={150}>
          <Loader />
        </Center>
      ) : isFaculty || isTA || peerReview.status === 'Active' ? (
        <ScrollArea.Autosize mah={750} scrollbarSize={8}>
          <Accordion
            defaultValue={['teaching-assistants']}
            value={opened}
            onChange={setOpened}
            multiple
            variant="separated"
          >
            {peerReview.taAssignments && (
              <PeerReviewTAAccordianItem
                teams={peerReviewInfo.teams.map(t => ({
                  value: t.teamId,
                  TA: t.TA,
                  label: `Team ${t.teamNumber}`,
                }))}
                TAToAssignments={peerReviewInfo.TAAssignments}
                isFaculty={isFaculty}
                addManualAssignment={addManualAssignment}
                deleteManualAssignment={deleteManualAssignment}
              />
            )}
            {peerReviewInfo.teams.map(team => (
              <>
                <PeerReviewAccordionItem
                  key={team.teamId}
                  currentTeam={team}
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
                  isFaculty={isFaculty}
                  addManualAssignment={addManualAssignment}
                  deleteManualAssignment={deleteManualAssignment}
                />
              </>
            ))}
          </Accordion>
        </ScrollArea.Autosize>
      ) : (
        <Card withBorder radius="md" p="lg" my="md">
          <Text c="dimmed" ta="center">
            Peer review assignments will be available when the review period begins.
          </Text>
        </Card>
      )}
    </Container>
  );
};

export default PeerReviewInfo;
