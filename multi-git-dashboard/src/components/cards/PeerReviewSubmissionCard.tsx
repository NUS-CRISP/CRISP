import React from 'react';
import { Badge, Button, Card, Group, Stack, Text, Anchor } from '@mantine/core';
import { IconExternalLink, IconPencil, IconEye } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { PeerReviewSubmissionListItemDTO } from '@shared/types/PeerReviewAssessment';

const formatDateTime = (value?: Date | string) => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const statusColor = (status: string) => {
  if (status === 'Submitted') return 'green';
  if (status === 'Draft') return 'yellow';
  return 'gray';
};

interface Props {
  courseId: string;
  assessmentId: string;
  item: PeerReviewSubmissionListItemDTO;
  maxMarks: number;
  canGrade: boolean;
  onAfterAction?: () => void;
}

const PeerReviewSubmissionCard: React.FC<Props> = ({
  courseId,
  assessmentId,
  item,
  canGrade,
}) => {
  const router = useRouter();

  const reviewerLabel =
    item.reviewer.kind === 'User'
      ? item.reviewer.name
      : `Team ${item.reviewer.teamNumber}`;

  const gradersLabel =
    item.grading!.count === 0
      ? 'Not Assigned'
      : item.grading?.graders.map(g => g.name).join(', ');

  const openGradingView = () => {
    router.push(
      `/courses/${courseId}/internal-assessments/${assessmentId}/peer-review/${item.peerReviewSubmissionId}`
    );
  };

  return (
    <Card withBorder shadow="sm" radius="md" p="md" mr="xs">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <Text fw={600}>
              Reviewer: {reviewerLabel} ({item.reviewerKind})
            </Text>
            <Badge color={statusColor(item.status)}>
              {item.status === "NotStarted" ? "Not Started" : item.status}
            </Badge>
          </Group>

          <Text fz="sm" c="dimmed">
            Reviewee: Team {item.revieweeTeam.teamNumber}
          </Text>

          <Group gap="xs">
            <Text fz="sm" c="dimmed">
              Repo:
            </Text>
            {item.repo.repoUrl ? (
              <Anchor
                href={item.repo.repoUrl}
                target="_blank"
                rel="noreferrer"
                fz="sm"
              >
                {item.repo.repoName || item.repo.repoUrl}{' '}
                <IconExternalLink size={14} />
              </Anchor>
            ) : (
              <Text fz="sm" c="dimmed">
                —
              </Text>
            )}
          </Group>

          <Text fz="sm" c="dimmed">
            Last activity: {formatDateTime(item.lastActivityAt)}
          </Text>
        </Stack>

        <Stack gap={6} align="flex-end">
          <Badge variant="light">
            Grade: {item.grading.completedCount}/{item.grading.count}
          </Badge>
          <Text fz="xs" c="dimmed" style={{ maxWidth: 260, textAlign: 'right' }}>
            Graders: {gradersLabel}
          </Text>
          {item.grading.lastGradedAt && (
            <Text fz="xs" c="dimmed">
              Last graded: {formatDateTime(item.grading.lastGradedAt)}
            </Text>
          )}
        </Stack>
      </Group>

      <Group justify="flex-end" mt="md">
        <Button
          variant="light"
          size="sm"
          leftSection={canGrade ? <IconPencil size={16} /> : <IconEye size={16} />}
          onClick={openGradingView}
        >
          {canGrade ? 'Grade / View' : 'View'}
        </Button>
      </Group>
    </Card>
  );
};

export default PeerReviewSubmissionCard;
