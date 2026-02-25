import {
  Modal,
  Text,
  Group,
  Button,
  NumberInput,
  Textarea,
  Stack,
  Badge,
} from '@mantine/core';
import type { PeerReviewMyGradingTaskDTO } from '@shared/types/PeerReviewAssessment';

type Props = {
  opened: boolean;
  onClose: () => void;
  maxMarks: number;
  task: PeerReviewMyGradingTaskDTO | null;
  score: number | '';
  feedback: string;
  onChangeScore: (v: number | '') => void;
  onChangeFeedback: (v: string) => void;
  onSave: () => Promise<void>;
  onSubmit: () => Promise<void>;
  saving?: boolean;
};

const PeerReviewGradeSubmissionModal: React.FC<Props> = ({
  opened,
  onClose,
  maxMarks,
  task,
  score,
  feedback,
  onChangeScore,
  onChangeFeedback,
  onSave,
  onSubmit,
  saving = false,
}) => {
  const disabled = task?.status === 'Completed';
  const canSubmit = !disabled && score !== '' && typeof score === 'number';

  return (
    <Modal opened={opened} onClose={onClose} title="Grade Submission" centered size="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Enter a score and optional feedback.
          </Text>
          {task && <Badge variant="light">{task.status}</Badge>}
        </Group>

        <NumberInput
          label={`Score (0 - ${maxMarks})`}
          value={score}
          onChange={(v) => {
            if (typeof v === 'number') onChangeScore(v);
            else if (v === '') onChangeScore('');
            else {
              const n = Number(v);
              onChangeScore(Number.isFinite(n) ? n : '');
            }
          }}
          min={0}
          max={maxMarks}
          step={0.5}
          disabled={disabled}
        />

        <Textarea
          label="Feedback (optional)"
          value={feedback}
          onChange={e => onChangeFeedback(e.currentTarget.value)}
          minRows={4}
          disabled={disabled}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>

          <Button
            variant="light"
            disabled={!canSubmit}
            loading={saving}
            onClick={onSave}
          >
            Save Draft
          </Button>

          <Button
            disabled={!canSubmit}
            loading={saving}
            onClick={onSubmit}
          >
            Submit Grade
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default PeerReviewGradeSubmissionModal;
