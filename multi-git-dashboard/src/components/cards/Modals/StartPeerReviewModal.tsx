import {
  Modal,
  Button,
  Group,
  Stack,
  Text,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';

interface StartPeerReviewModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  peerReviewId: string;
  courseId: string;
}

const StartPeerReviewModal: React.FC<StartPeerReviewModalProps> = ({
  opened,
  onClose,
  onConfirm,
  peerReviewId,
  courseId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unassignedInfo, setUnassignedInfo] = useState<{
    unassignedCount: number;
    hasUnassigned: boolean;
  } | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  // Fetch unassigned reviewers info when modal opens
  useEffect(() => {
    if (opened) {
      fetchUnassignedInfo();
    }
  }, [opened]);

  const fetchUnassignedInfo = async () => {
    try {
      setFetchingInfo(true);
      const response = await fetch(
        `/api/peer-review/${courseId}/${peerReviewId}/unassigned-reviewers`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        console.error('Error fetching unassigned info:', response.statusText);
        return;
      }

      const data = await response.json();
      setUnassignedInfo(data);
    } catch (err) {
      console.error('Error fetching unassigned reviewers:', err);
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleStartPeerReview = async () => {
    try {
      setLoading(true);
      setError(null);
      await onConfirm();
    } catch (err) {
      setError((err as Error).message || 'Failed to start peer review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={'Start Peer Review'}
      centered
      size="md"
    >
      <Stack gap="md">
        {fetchingInfo ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (
          <>
            <Text>
              Are you sure you want to start this peer review now? This will set
              the review period to begin immediately.
            </Text>

            {unassignedInfo?.hasUnassigned && (
              <Alert
                icon={<IconAlertCircle />}
                title="There are still unassigned reviewers"
                color="yellow"
              >
                There are <strong>{unassignedInfo.unassignedCount}</strong>{' '}
                reviewer(s) who have not been assigned any submissions yet. You
                may want to assign them before starting.
              </Alert>
            )}

            {error && (
              <Alert title="Error" color="red">
                {error}
              </Alert>
            )}
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={onClose}
            disabled={loading || fetchingInfo}
          >
            Cancel
          </Button>
          <Button
            color="green"
            onClick={handleStartPeerReview}
            loading={loading}
            disabled={fetchingInfo}
          >
            Start Peer Review
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default StartPeerReviewModal;
