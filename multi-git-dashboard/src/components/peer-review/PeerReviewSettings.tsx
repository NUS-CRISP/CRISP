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

interface PeerReviewSettingsProps {
  peerReview: PeerReview;
  teamSetName: string;
  hasFacultyPermission: boolean;
  onClickUpdate: () => void;
  onClickDelete: () => void;
  onClickAssign: () => void;
}

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const PeerReviewSettings: React.FC<PeerReviewSettingsProps> = ({
  peerReview,
  teamSetName,
  hasFacultyPermission,
  onClickUpdate,
  onClickDelete,
  onClickAssign,
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
          <Badge
            color={
              status === 'Closed'
                ? 'green'
                : status === 'Active'
                  ? 'yellow'
                  : 'violet'
            }
          >
            {status}
          </Badge>
          <Badge variant="outline">Reviewer Type: {reviewerType}</Badge>
          {hasFacultyPermission && (
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

          {hasFacultyPermission && (
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
          {hasFacultyPermission && (
            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Max. Reviews / Reviewer
              </Text>
              <Text fz="sm">{maxReviewsPerReviewer ?? '—'}</Text>
            </Stack>
          )}
        </Stack>
        {hasFacultyPermission && (
          <Stack mt="sm">
            <Button
              onClick={onClickUpdate}
              color="green"
              variant="light"
              disabled={status === 'Closed'}
            >
              Update Settings
            </Button>
            <Button
              color="red"
              variant="light"
              onClick={onClickDelete}
              disabled={status === 'Closed'}
            >
              Delete Peer Review
            </Button>
            <Button
              color="yellow"
              variant="light"
              onClick={onClickAssign}
              disabled={status === 'Closed'}
            >
              Assign All Peer Reviews
            </Button>
          </Stack>
        )}
      </SimpleGrid>
    </Card>
  );
};

export default PeerReviewSettings;
