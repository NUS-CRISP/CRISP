import React, { useState } from 'react';
import { Badge, Button, Card, Group, Stack, Text, Anchor, ActionIcon, Menu, Loader } from '@mantine/core';
import { IconExternalLink, IconPencil, IconEye, IconUserPlus, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
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
  isFaculty: boolean;
  onAfterAction?: () => void;
}

const PeerReviewSubmissionCard: React.FC<Props> = ({
  courseId,
  assessmentId,
  item,
  canGrade,
  isFaculty,
  onAfterAction,
}) => {
  const router = useRouter();
  const [assigningGrader, setAssigningGrader] = useState(false);
  const [unassigningGrader, setUnassigningGrader] = useState<string | null>(null);
  const [availableTAs, setAvailableTAs] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingTAs, setLoadingTAs] = useState(false);

  const fetchTAs = async () => {
    setLoadingTAs(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/people`);
      if (!res.ok) throw new Error('Failed to fetch TAs');
      const data = await res.json();
      const tas = (data.TAs || []).map((ta: any) => ({ id: ta._id, name: ta.name }));
      setAvailableTAs(tas);
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load TAs',
        color: 'red',
      });
    } finally {
      setLoadingTAs(false);
    }
  };

  const handleAssignGrader = async (graderId: string) => {
    setAssigningGrader(true);
    try {
      const res = await fetch(
        `/api/peer-review-assessments/${courseId}/${assessmentId}/submissions/${item.peerReviewSubmissionId}/assign-grader`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graderId }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to assign grader');
      }

      notifications.show({
        title: 'Success',
        message: 'Grader assigned successfully',
        color: 'green',
      });

      onAfterAction?.();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: (err as Error).message,
        color: 'red',
      });
    } finally {
      setAssigningGrader(false);
    }
  };

  const handleUnassignGrader = async (graderId: string) => {
    setUnassigningGrader(graderId);
    try {
      const res = await fetch(
        `/api/peer-review-assessments/${courseId}/${assessmentId}/submissions/${item.peerReviewSubmissionId}/graders/${graderId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to unassign grader');
      }

      notifications.show({
        title: 'Success',
        message: 'Grader unassigned successfully',
        color: 'green',
      });

      onAfterAction?.();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: (err as Error).message,
        color: 'red',
      });
    } finally {
      setUnassigningGrader(null);
    }
  };

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
    <Card withBorder shadow="sm" radius="md" p="md">
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
          {isFaculty && item.grading.graders.length > 0 ? (
            <Stack gap={4} align="flex-end">
              <Text fz="xs" c="dimmed">Graders:</Text>
              {item.grading.graders.map(grader => (
                <Group key={grader.id} gap={4}>
                  <Text fz="xs">{grader.name}</Text>
                  <ActionIcon
                    size="xs"
                    color="red"
                    variant="subtle"
                    onClick={() => handleUnassignGrader(grader.id)}
                    loading={unassigningGrader === grader.id}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text fz="xs" c="dimmed" style={{ maxWidth: 260, textAlign: 'right' }}>
              Graders: {gradersLabel}
            </Text>
          )}
          {item.grading.lastGradedAt && (
            <Text fz="xs" c="dimmed">
              Last graded: {formatDateTime(item.grading.lastGradedAt)}
            </Text>
          )}
        </Stack>
      </Group>

      <Group justify="flex-end" mt="md">
        {isFaculty && (
          <Menu
            position="bottom-end"
            withinPortal
            onOpen={fetchTAs}
          >
            <Menu.Target>
              <Button
                variant="subtle"
                size="sm"
                leftSection={<IconUserPlus size={16} />}
                loading={assigningGrader || loadingTAs}
              >
                Assign Grader
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {loadingTAs ? (
                <Menu.Item disabled>
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text fz="sm">Loading TAs...</Text>
                  </Group>
                </Menu.Item>
              ) : availableTAs.length === 0 ? (
                <Menu.Item disabled>No TAs available</Menu.Item>
              ) : (
                availableTAs
                  .filter(ta => !item.grading.graders.some(g => g.id === ta.id))
                  .map(ta => (
                    <Menu.Item
                      key={ta.id}
                      onClick={() => handleAssignGrader(ta.id)}
                    >
                      {ta.name}
                    </Menu.Item>
                  ))
              )}
              {availableTAs.length > 0 &&
                availableTAs.every(ta => item.grading.graders.some(g => g.id === ta.id)) && (
                  <Menu.Item disabled>All TAs already assigned</Menu.Item>
                )}
            </Menu.Dropdown>
          </Menu>
        )}
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
