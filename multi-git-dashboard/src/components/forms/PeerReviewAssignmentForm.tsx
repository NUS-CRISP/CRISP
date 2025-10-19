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
} from '@mantine/core';
import { useForm } from '@mantine/form';

interface PeerReviewAssignmentFormProps {
  minReviewsPerReviewer: number;
  maxReviewsPerReviewer: number;
  onAssign: (numberOfReviews: number, allowSameTa: boolean) => void;
  onClose: () => void;
}

const PeerReviewAssignmentForm: React.FC<PeerReviewAssignmentFormProps> = ({
  minReviewsPerReviewer,
  maxReviewsPerReviewer,
  onAssign,
  onClose,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm({
    initialValues: {
      numberOfReviews: Math.max(minReviewsPerReviewer, 1),
      allowSameTa: false,
    },
    validate: {
      numberOfReviews: value => {
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

  const handleSubmit = () => {
    setLoading(true);
    setError(null);

    onAssign(form.values.numberOfReviews, form.values.allowSameTa);

    setLoading(false);
    onClose();
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
      <form
        onSubmit={form.onSubmit(() =>
          onAssign(form.values.numberOfReviews, form.values.allowSameTa)
        )}
      >
        <Text
          style={{
            fontWeight: '600',
            fontSize: '14px',
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Allow Reviewee and Reviewer to have the same TA?
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
            value={form.values.allowSameTa ? 'yes' : 'no'}
            onChange={val => form.setFieldValue('allowSameTa', val === 'yes')}
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
          value={form.values.numberOfReviews.toString()}
          onChange={val => form.setFieldValue('numberOfReviews', Number(val))}
          searchable
          error={form.errors.numberOfReviews}
        />
        <Text size="xs" c="dimmed" mt="xs" mb="md">
          *You can update the maximum number of reviews in the settings.
        </Text>

        <Group justify="flex-end" gap="xs">
          <Button color="yellow" onClick={handleSubmit}>
            Confirm Assign
          </Button>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
        </Group>
      </form>
    </>
  );
};

export default PeerReviewAssignmentForm;
