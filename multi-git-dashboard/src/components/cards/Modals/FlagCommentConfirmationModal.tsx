import { Modal, Text, Group, Button, Textarea, Stack } from '@mantine/core';
import { useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';

interface FlagCommentConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const MIN_LEN = 10;
const MAX_LEN = 500;

const FlagCommentConfirmationModal: React.FC<
  FlagCommentConfirmationModalProps
> = ({ opened, onClose, onConfirm, onCancel, title, message }) => {
  const [flagReason, setFlagReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [debouncedFlagReason] = useDebouncedValue(flagReason, 500);

  const canSubmit = debouncedFlagReason.trim().length >= MIN_LEN;
  const trimmedLen = debouncedFlagReason.trim().length;
  const showError =
    touched && debouncedFlagReason.length > 0 && trimmedLen < MIN_LEN;

  const handleClose = () => {
    setFlagReason('');
    onClose();
  };

  const handleCancel = () => {
    setFlagReason('');
    onCancel();
  };

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(flagReason.trim());
    setFlagReason('');
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={title || 'Confirm Flagging?'}
      centered
      size="lg"
    >
      <Text size="sm" c="dimmed" mb="sm">
        Add a reason for review.
      </Text>

      <Textarea
        placeholder="E.g. inappropriate language, etc."
        value={flagReason}
        onChange={e => setFlagReason(e.currentTarget.value)}
        onBlur={() => setTouched(true)}
        autosize
        minRows={4}
        maxRows={4}
        maxLength={MAX_LEN}
        error={
          showError ? `Please enter at least ${MIN_LEN} characters.` : undefined
        }
      />

      <Group justify="space-between" mt="sm">
        <Text size="xs" c="dimmed" ml={2}>
          {flagReason.trim().length}/{MAX_LEN}
        </Text>

        <Group gap="xs">
          <Button color="orange" onClick={handleConfirm} disabled={!canSubmit}>
            Flag
          </Button>
          <Button variant="light" color="gray" onClick={handleCancel}>
            Cancel
          </Button>
        </Group>
      </Group>
    </Modal>
  );
};

export default FlagCommentConfirmationModal;
