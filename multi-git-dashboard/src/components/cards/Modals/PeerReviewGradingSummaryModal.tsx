import {
  Modal,
  Stack,
  Card,
  Group,
  Text,
  Badge,
  ScrollArea,
} from '@mantine/core';
import type { PeerReviewGradingTaskSummaryDTO } from '@shared/types/PeerReviewAssessment';

type PeerReviewGradingSummaryModalProps = {
  opened: boolean;
  onClose: () => void;
  maxMarks: number;
  tasks: PeerReviewGradingTaskSummaryDTO[];
  isFaculty: boolean;
};

const statusColor: Record<string, string> = {
  Assigned: 'yellow',
  InProgress: 'blue',
  Completed: 'green',
};

const PeerReviewGradingSummaryModal: React.FC<
  PeerReviewGradingSummaryModalProps
> = ({ opened, onClose, maxMarks, tasks, isFaculty }) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Grading Summary"
      centered
      size="lg"
    >
      <ScrollArea.Autosize mah="65vh" type="auto" scrollbarSize={8}>
        <Stack gap="xs" mr="xs">
          {tasks.length === 0 ? (
            <Text c="dimmed" size="sm">
              No grading summary available yet.
            </Text>
          ) : (
            tasks.map(task => (
              <Card key={task._id} withBorder>
                <Group justify="space-between" align="flex-start" mb="xs">
                  <Stack gap={2}>
                    <Text fw={600} size="sm">
                      {isFaculty ? task.grader.name : 'Your Grade'}
                    </Text>
                    {isFaculty && (
                      <Text size="xs" c="dimmed">
                        Grader ID: {task.grader.id}
                      </Text>
                    )}
                  </Stack>
                  <Badge
                    variant="light"
                    color={statusColor[task.status] || 'gray'}
                  >
                    {task.status === 'InProgress' ? 'In Progress' : task.status}
                  </Badge>
                </Group>

                <Group gap="xl" mb="xs">
                  <Text size="sm">
                    <Text span fw={600}>
                      Score:
                    </Text>{' '}
                    {typeof task.score === 'number'
                      ? `${task.score} / ${maxMarks}`
                      : 'N/A'}
                  </Text>
                </Group>

                <Text size="sm" fw={600} mb={4}>
                  Feedback
                </Text>
                <Text size="sm" c={task.feedback ? undefined : 'dimmed'}>
                  {task.feedback?.trim() || 'No feedback provided.'}
                </Text>
              </Card>
            ))
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
};

export default PeerReviewGradingSummaryModal;
