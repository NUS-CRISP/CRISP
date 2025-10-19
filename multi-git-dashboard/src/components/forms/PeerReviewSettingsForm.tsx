import {
  Button,
  TextInput,
  Textarea,
  Text,
  Radio,
  Notification,
  Center,
  Loader,
  Modal,
  Group,
  Select,
} from '@mantine/core';
import { PeerReview, ReviewerType } from '@shared/types/PeerReview';
import { TeamSet } from '@shared/types/TeamSet';
import { useForm } from '@mantine/form';
import { useState, useEffect, useRef, useMemo } from 'react';
import { showNotification } from '@mantine/notifications';

interface PeerReviewSettingsFormProps {
  courseId: string | string[] | undefined;
  peerReview: PeerReview | null;
  teamSets: TeamSet[];
  onSetUpConfirmed: () => void;
  onClose: () => void;
}

interface FormValues {
  assessmentName: string;
  description: string;
  startDate: string;
  endDate: string;
  reviewerType: ReviewerType;
  TaAssignments: boolean;
  minReviews: number;
  maxReviews: number;
  teamSetId: string;
}

const PeerReviewSettingsForm: React.FC<PeerReviewSettingsFormProps> = ({
  courseId,
  peerReview,
  teamSets,
  onSetUpConfirmed,
  onClose,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);

  // API Routes
  const createApiRoute = `/api/peer-review/${courseId}/peer-reviews`;
  const updatePeerReviewRoute = peerReview
    ? `/api/peer-review/${courseId}/${peerReview._id}`
    : '';

  // Check if editing existing peer review or creating new [change to get status]
  const isEditing = Boolean(peerReview);
  const toFormValues = (pr: PeerReview | null) => ({
    assessmentName: pr?.title ?? '',
    description: pr?.description ?? '',
    startDate: pr?.startDate
      ? new Date(pr.startDate).toISOString().slice(0, 10)
      : '',
    endDate: pr?.endDate ? new Date(pr.endDate).toISOString().slice(0, 10) : '',
    reviewerType: pr?.reviewerType ?? 'Individual',
    TaAssignments: Boolean(pr?.TaAssignments ?? false),
    minReviews: pr?.minReviewsPerReviewer ?? 0,
    maxReviews: pr?.maxReviewsPerReviewer ?? 1,
    teamSetId: pr?.teamSetId ?? '',
  });

  const initial = useMemo(() => toFormValues(peerReview), [peerReview]);

  // Create form with initial values and validation rules
  const form = useForm<FormValues>({
    initialValues: initial,
    validate: {
      assessmentName: value => (value ? null : 'Assessment name is required'),
      description: value => (value ? null : 'Description is required'),
      startDate: value => {
        if (!value) return 'Start date is required';
        if (
          form.values.endDate &&
          new Date(value) >= new Date(form.values.endDate)
        ) {
          return 'Start date must be before end date';
        }
      },
      endDate: value => {
        if (!value) return 'End date is required';
        if (
          form.values.startDate &&
          new Date(value) <= new Date(form.values.startDate)
        ) {
          return 'End date must be after start date';
        }
        // Add check to ensure end date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today
        if (new Date(value) < today) {
          return 'End date cannot be in the past';
        }
        return null;
      },
      minReviews: value => {
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num) || num < 0) {
          return 'Minimum reviews must be a non-negative integer';
        } else if (
          form.values.maxReviews &&
          num > Number(form.values.maxReviews)
        ) {
          return 'Minimum reviews cannot exceed maximum reviews';
        }
        return null;
      },
      maxReviews: value => {
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num) || num < 1) {
          return 'Maximum reviews must be a positive integer';
        } else if (
          form.values.minReviews &&
          num < Number(form.values.minReviews)
        ) {
          return 'Maximum reviews cannot be less than minimum reviews';
        }
        return null;
      },
      teamSetId: value => (!value ? 'Please select a Team Set' : null),
    },
  });

  // Helper Functions
  const normalize = (values: typeof form.values) => ({
    assessmentName: values.assessmentName.trim() ?? '',
    description: values.description.trim() ?? '',
    startDate: values.startDate || '',
    endDate: values.endDate || '',
    reviewerType: values.reviewerType,
    TaAssignments: Boolean(values.TaAssignments),
    minReviews: Number(values.minReviews ?? 0),
    maxReviews: Number(values.maxReviews ?? 1),
    teamSetId: values.teamSetId || '',
  });

  const checkIdentical = (
    obj1: typeof form.values,
    obj2: typeof form.values
  ) => {
    return JSON.stringify(normalize(obj1)) === JSON.stringify(normalize(obj2));
  };

  type Normalized = ReturnType<typeof normalize>;
  const originalValuesRef = useRef<null | Normalized>(null);

  useEffect(() => {
    const next = toFormValues(peerReview);
    form.setValues(next);
    originalValuesRef.current = normalize(next);
  }, [peerReview]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(
        isEditing ? updatePeerReviewRoute : createApiRoute,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.values),
        }
      );

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message || response.statusText);
      }
      if (!isEditing) form.reset();
      originalValuesRef.current = normalize(form.values);
      setOpenConfirmModal(false);
      onSetUpConfirmed();
    } catch (error) {
      console.error('Error submitting peer review settings:', error);
      setError(
        'Failed to submit peer review settings: ' + (error as Error).message
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmSubmit = async () => {
    if (!isEditing) return handleSubmit();
    const originalValues = originalValuesRef.current;
    if (!originalValues || !checkIdentical(originalValues, form.values)) {
      setOpenConfirmModal(true);
    } else {
      showNotification({
        title: 'No Changes Detected',
        message: 'No changes were made to the peer review settings.',
        color: 'yellow',
      });
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
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <form onSubmit={form.onSubmit(confirmSubmit)}>
        <TextInput
          withAsterisk
          label="Peer Review Title"
          {...form.getInputProps('assessmentName')}
        />

        <Textarea
          withAsterisk
          label="Description"
          {...form.getInputProps('description')}
        />

        <TextInput
          withAsterisk
          label="Start Date"
          {...form.getInputProps('startDate')}
          placeholder="YYYY-MM-DD"
          type="date"
        />

        <TextInput
          withAsterisk
          label="End Date"
          {...form.getInputProps('endDate')}
          placeholder="YYYY-MM-DD"
          type="date"
        />

        <Text
          style={{
            fontWeight: '600',
            fontSize: '14px',
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Team Set for this Peer Review
        </Text>
        <Select
          placeholder="Select a Team Set"
          data={teamSets.map(ts => ({ value: ts._id, label: ts.name }))}
          value={form.values.teamSetId}
          onChange={val => form.setFieldValue('teamSetId', val || '')}
          searchable
          nothingFoundMessage="No results found"
          error={form.errors.teamSetId}
        />

        <Text
          style={{
            fontWeight: '600',
            fontSize: '14px',
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Reviewer Type
        </Text>
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'row',
            gap: '15px',
          }}
        >
          <Radio.Group
            value={form.values.reviewerType}
            onChange={value =>
              form.setFieldValue('reviewerType', value as ReviewerType)
            }
          >
            <div style={{ display: 'flex', gap: '20px' }}>
              <Radio
                label="Team"
                value="Team"
                styles={{ radio: { cursor: 'pointer' } }}
              />
              <Radio
                label="Individual"
                value="Individual"
                styles={{ radio: { cursor: 'pointer' } }}
              />
            </div>
          </Radio.Group>
        </div>

        <Text
          style={{
            fontWeight: '600',
            fontSize: '14px',
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Assign Peer Reviews to Teaching Assistants?
        </Text>
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'row',
            gap: '15px',
          }}
        >
          <Radio.Group
            value={form.values.TaAssignments ? 'yes' : 'no'}
            onChange={val => form.setFieldValue('TaAssignments', val === 'yes')}
          >
            <div style={{ display: 'flex', gap: '32px' }}>
              <Radio
                label="Yes"
                value="yes"
                styles={{ radio: { cursor: 'pointer' } }}
              />
              <Radio
                label="No"
                value="no"
                styles={{ radio: { cursor: 'pointer' } }}
              />
            </div>
          </Radio.Group>
        </div>

        <TextInput
          withAsterisk
          label="Minimum Reviews per Reviewer"
          {...form.getInputProps('minReviews')}
          placeholder="Enter min reviews"
          type="number"
        />

        <TextInput
          withAsterisk
          label="Maximum Reviews per Reviewer"
          {...form.getInputProps('maxReviews')}
          placeholder="Enter max reviews"
          type="number"
        />

        <Group justify="flex-start" mt="sm" gap="xs">
          <Button
            type="submit"
            color={isEditing ? 'green' : 'blue'}
            variant={isEditing ? '' : ''}
          >
            {isEditing ? 'Update Settings' : 'Create Peer Review'}
          </Button>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
        </Group>

        <Modal
          opened={openConfirmModal}
          onClose={() => setOpenConfirmModal(false)}
          title="Confirm Update?"
          centered
        >
          <Text size="sm" c="dimmed" mb="md">
            Are you sure you want to update the peer review settings? <br />
            Existing assignments and configurations may be affected.
          </Text>
          <Group justify="flex-end">
            <Button color="blue" onClick={handleSubmit}>
              Confirm Update
            </Button>
            <Button
              variant="default"
              onClick={() => setOpenConfirmModal(false)}
            >
              Cancel
            </Button>
          </Group>
        </Modal>
      </form>
    </>
  );
};

export default PeerReviewSettingsForm;
