import React, { useState } from 'react';
import {
  Notification,
  Text,
  Radio,
  Center,
  Loader,
  Button,
  Group,
  Select,
  Modal,
  Switch,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';

interface PeerReviewAssignmentFormProps {
  courseId: string;
  peerReviewId: string;
  minReviewsPerReviewer: number;
  maxReviewsPerReviewer: number;
  onAssign: () => void;
  onClose: () => void;
}

const PeerReviewAssignmentForm: React.FC<PeerReviewAssignmentFormProps> = ({
  courseId,
  peerReviewId,
  minReviewsPerReviewer,
  maxReviewsPerReviewer,
  onAssign,
  onClose,
}) => {
  const [
    openedConfirmForm,
    { open: openConfirmForm, close: closeConfirmForm },
  ] = useDisclosure(false);

  const assignPeerReviewsApiRoute = `/api/peer-review/${courseId}/${peerReviewId}/assign-peer-reviews`;
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      reviewsPerReviewer: Math.max(minReviewsPerReviewer, 1),
      allowSameTA: false,
    },
    validate: {
      reviewsPerReviewer: value => {
        const num = Number(value);
        if (
          isNaN(num) ||
          !Number.isInteger(num) ||
          num < minReviewsPerReviewer
        ) {
          return `Number of reviews must be an integer greater than or equal to ${minReviewsPerReviewer}`;
        } else if (num > maxReviewsPerReviewer) {
          return `Number of reviews cannot exceed ${maxReviewsPerReviewer}`;
        }
      },
    },
  });

  const rangeOptions = (min: number, max: number) => {
    min = Math.max(1, min);
    return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => {
      const v = String(min + i);
      return { value: v, label: v };
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await fetch(assignPeerReviewsApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.values),
      });

      const data = await response.json();
      closeConfirmForm();
      if (!response.ok) {
        console.error('Failed to assign peer reviews: ', response.statusText);
        setError(data.message || 'Something went wrong');
        return;
      }
      onAssign();
      showNotification({
        title: 'Peer Reviews Assigned',
        message: 'Peer reviews assigned successfully.',
        color: 'green',
      });
    } catch (error) {
      console.error('Error assigning peer reviews: ', error);
      setError((error as Error).message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center mt="md">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <>
      {error && (
        <Notification
          title="Failed to assign peer reviews"
          color="red"
          onClose={() => setError(null)}
          mb="md"
        >
          {error}
        </Notification>
      )}
      <form onSubmit={form.onSubmit(openConfirmForm)}>
        <Group>
          <Text fw={600} fz="14px">
            Allow Same TA for Reviewee and Reviewer?
          </Text>
          <Switch
            checked={form.values.allowSameTA}
            onChange={e =>
              form.setFieldValue('allowSameTA', e.currentTarget.checked)
            }
          />
        </Group>

        <Text
          style={{
            fontWeight: '600',
            fontSize: '14px',
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Number of Reviews to Assign
        </Text>
        <Select
          placeholder="Select a Team Set"
          data={rangeOptions(minReviewsPerReviewer, maxReviewsPerReviewer)}
          value={form.values.reviewsPerReviewer.toString()}
          onChange={val => form.setFieldValue('numberOfReviews', Number(val))}
          searchable
          error={form.errors.numberOfReviews}
        />
        <Text size="xs" c="dimmed" mt="xs" mb="md">
          *You can update the maximum number of reviews in the settings.
        </Text>

        <Group justify="flex-end" gap="xs">
          <Button type="submit" color="yellow">
            Assign
          </Button>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
        </Group>

        <Modal
          opened={openedConfirmForm}
          onClose={closeConfirmForm}
          title="Confirm Assign?"
          centered
        >
          <Text size="sm" c="dimmed" mb="md">
            Are you sure you want to assign peer reviews? <br />
            Existing assignments (if any) will be deleted and new assignments
            will be made.
          </Text>
          <Group justify="flex-end">
            <Button color="blue" onClick={handleSubmit}>
              Confirm Assign
            </Button>
            <Button variant="default" onClick={closeConfirmForm}>
              Cancel
            </Button>
          </Group>
        </Modal>
      </form>
    </>
  );
};

export default PeerReviewAssignmentForm;
