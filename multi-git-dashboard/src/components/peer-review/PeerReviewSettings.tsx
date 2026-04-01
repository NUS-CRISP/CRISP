import {
  Group,
  Card,
  Text,
  Badge,
  Divider,
  SimpleGrid,
  Stack,
  Button,
} from '@mantine/core';
import { PeerReview } from '@shared/types/PeerReview';
import { formatDate } from '../../lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/router';
import StartPeerReviewModal from '../cards/Modals/StartPeerReviewModal';

interface PeerReviewSettingsProps {
  peerReview: PeerReview;
  courseId?: string;
  teamSetName: string;
  isFaculty: boolean;
  isGradingPhase?: boolean;
  isAssessmentClosed?: boolean;
  onClickUpdate: () => void;
  onClickDelete: () => void;
  onClickCloseAssessment?: () => void;
  onStartPeerReview?: () => void;
}

const PeerReviewSettings: React.FC<PeerReviewSettingsProps> = ({
  peerReview,
  courseId,
  teamSetName,
  isFaculty,
  isGradingPhase = false,
  isAssessmentClosed = false,
  onClickUpdate,
  onClickDelete,
  onClickCloseAssessment,
  onStartPeerReview,
}) => {
  const router = useRouter();
  const [openedStartModal, setOpenedStartModal] = useState(false);
  const {
    description,
    startDate,
    endDate,
    reviewerType,
    taAssignments,
    maxReviewsPerReviewer,
    commitOrTag,
    status,
  } = peerReview;

  const statusLabel = isAssessmentClosed
    ? 'Closed'
    : isGradingPhase
      ? 'Grading'
      : status;

  const statusColor =
    statusLabel === 'Closed'
      ? 'red'
      : statusLabel === 'Active'
        ? 'green'
        : statusLabel === 'Grading'
          ? 'violet'
          : 'yellow';

  return (
    <Card withBorder radius="md" p="lg" my="md">
      <Group justify="space-between" mb="xs">
        <Stack gap={2}>
          <Text fw={600} fz="sm">
            Peer Review Settings
          </Text>
        </Stack>

        <Group gap="xs">
          <Badge color={statusColor}>{statusLabel}</Badge>
          <Badge variant="light">Reviewer Type: {reviewerType}</Badge>
          {commitOrTag && (
            <Badge
              variant="light"
              color="blue"
              title="Repository version for review"
            >
              Commit/Tag: {commitOrTag}
            </Badge>
          )}
          {isFaculty && (
            <Badge variant="light" color={taAssignments ? 'teal' : 'red'}>
              TA Reviews: {taAssignments ? 'Enabled' : 'Disabled'}
            </Badge>
          )}
        </Group>
      </Group>

      {description && (
        <>
          <Text fz="sm" mb="xs">
            {description}
          </Text>
          <Divider my="xs" />
        </>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <Stack>
          <Stack gap={2}>
            <Text fz="xs" c="dimmed">
              Start date
            </Text>
            <Text fz="sm">{formatDate(startDate)}</Text>
          </Stack>

          {isFaculty && (
            <>
              <Stack gap={2}>
                <Text fz="xs" c="dimmed">
                  Team set
                </Text>
                <Text fz="sm">{teamSetName}</Text>
              </Stack>
            </>
          )}
        </Stack>
        <Stack>
          <Stack gap={2}>
            <Text fz="xs" c="dimmed">
              End date
            </Text>
            <Text fz="sm">{formatDate(endDate)}</Text>
          </Stack>
          {isFaculty && (
            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Max. Reviews / Reviewer
              </Text>
              <Text fz="sm">{maxReviewsPerReviewer ?? '—'}</Text>
            </Stack>
          )}
        </Stack>
        {isFaculty && (
          <Stack mt="sm">
            {peerReview.status === 'Upcoming' && courseId && (
              <>
                <Button color="green" onClick={() => setOpenedStartModal(true)}>
                  Start Peer Review Now
                </Button>
                <StartPeerReviewModal
                  opened={openedStartModal}
                  onClose={() => setOpenedStartModal(false)}
                  onConfirm={async () => {
                    onStartPeerReview?.();
                    setOpenedStartModal(false);
                  }}
                  peerReviewId={peerReview._id}
                  courseId={courseId}
                />
              </>
            )}
            {courseId && (
              <Button
                color="yellow"
                variant="light"
                onClick={() => router.push(`/courses/${courseId}/peer-review`)}
              >
                {peerReview.status === 'Upcoming'
                  ? 'Assign Peer Reviews'
                  : 'View Peer Review'}
              </Button>
            )}
            <Button onClick={onClickUpdate} color="green" variant="light">
              Update Settings
            </Button>
            <Button
              color="red"
              variant="light"
              onClick={onClickDelete}
              disabled={statusLabel === 'Closed' || isGradingPhase}
            >
              Delete Peer Review
            </Button>
            {isGradingPhase &&
              !isAssessmentClosed &&
              onClickCloseAssessment && (
                <Button
                  color="violet"
                  variant="light"
                  onClick={onClickCloseAssessment}
                >
                  Close Assessment
                </Button>
              )}
          </Stack>
        )}
      </SimpleGrid>
    </Card>
  );
};

export default PeerReviewSettings;
