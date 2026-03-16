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

interface PeerReviewSettingsProps {
  peerReview: PeerReview;
  teamSetName: string;
  isFaculty: boolean;
  isGradingPhase?: boolean;
  isAssessmentClosed?: boolean;
  onClickUpdate: () => void;
  onClickDelete: () => void;
  onClickCloseAssessment?: () => void;
}

const PeerReviewSettings: React.FC<PeerReviewSettingsProps> = ({
  peerReview,
  teamSetName,
  isFaculty,
  isGradingPhase = false,
  isAssessmentClosed = false,
  onClickUpdate,
  onClickDelete,
  onClickCloseAssessment,
}) => {
  const {
    description,
    startDate,
    endDate,
    reviewerType,
    taAssignments,
    minReviewsPerReviewer,
    maxReviewsPerReviewer,
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
    <Card
      withBorder
      radius="md"
      p="lg"
      mb="md"
      style={{ backgroundColor: '#2b2b2b' }}
    >
      <Group justify="space-between" mb="xs">
        <Stack gap={2}>
          <Text fw={600} fz="sm">
            Peer Review Settings
          </Text>
        </Stack>

        <Group gap="xs">
          <Badge color={statusColor}>{statusLabel}</Badge>
          <Badge variant="light">Reviewer Type: {reviewerType}</Badge>
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
                  Min. Reviews / Reviewer
                </Text>
                <Text fz="sm">{minReviewsPerReviewer ?? '—'}</Text>
              </Stack>
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
