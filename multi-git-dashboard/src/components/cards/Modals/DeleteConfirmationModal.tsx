import { Modal, Text, Group, Button } from '@mantine/core';

interface DeleteConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  opened,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title || 'Confirm Deletion?'}
      centered
    >
      <Text size="sm" c="dimmed" mb="md">
        {message && (
          <>
            {message}
            <br />
          </>
        )}
        This action cannot be undone.
      </Text>
      <Group justify="flex-end">
        <Button color="red" onClick={onConfirm}>
          Delete
        </Button>
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
      </Group>
    </Modal>
  );
};

export default DeleteConfirmationModal;
