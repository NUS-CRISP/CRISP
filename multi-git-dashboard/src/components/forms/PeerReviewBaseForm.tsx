import {
  Button,
  TextInput,
  Textarea,
  Text,
  Radio,
  Group,
  Select,
  Notification,
  Center,
  Loader,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMemo, useRef, useEffect, useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { ReviewerType } from '@shared/types/PeerReview';
import { TeamSet } from '@shared/types/TeamSet';

export interface PeerReviewBaseFormValues {
  assessmentName: string;
  description: string;
  startDate: string;
  endDate: string;
  teamSetId: string;
  reviewerType: ReviewerType;
  taAssignments: boolean;
  maxReviews: string | number;
  commitOrTag: string;

  // Assessment-linked fields
  maxMarks: string | number;
  scaleToMaxMarks: boolean;

  // Grading window (optional)
  gradingStartDate?: string;
  gradingEndDate?: string;
}

interface PeerReviewBaseFormProps {
  courseId: string | string[] | undefined;
  teamSets: TeamSet[];
  mode: 'create' | 'update';
  initialValues?: Partial<PeerReviewBaseFormValues>;
  submitLabel: string;
  cancelLabel?: string;
  onCancel?: () => void;

  // Called with normalized payload (numbers parsed)
  onSubmit: (payload: NormalizedPeerReviewBasePayload) => Promise<void>;

  // Optional: show loading controlled by parent
  externalLoading?: boolean;

  // Optional: lock peer-review configuration fields (except title, description, end date)
  lockReviewConfig?: boolean;
}

export type NormalizedPeerReviewBasePayload = {
  assessmentName: string;
  description: string;
  startDate: string;
  endDate: string;
  teamSetId: string;
  reviewerType: ReviewerType;
  taAssignments: boolean;
  maxReviews: number;
  commitOrTag: string;
  maxMarks: number;
  scaleToMaxMarks: boolean;
  gradingStartDate?: string | null;
  gradingEndDate?: string | null;
};

const PeerReviewBaseForm: React.FC<PeerReviewBaseFormProps> = ({
  teamSets,
  mode,
  initialValues,
  submitLabel,
  cancelLabel = 'Cancel',
  onCancel,
  onSubmit,
  externalLoading,
  lockReviewConfig = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaults: PeerReviewBaseFormValues = {
    assessmentName: '',
    description: '',
    startDate: '',
    endDate: '',
    teamSetId: '',
    reviewerType: 'Individual',
    taAssignments: false,
    maxReviews: 1,
    commitOrTag: '',
    maxMarks: 10,
    scaleToMaxMarks: true,
    gradingStartDate: '',
    gradingEndDate: '',
  };

  const mergedInitial = useMemo(
    () => ({ ...defaults, ...(initialValues ?? {}) }),
    [initialValues]
  );

  const form = useForm<PeerReviewBaseFormValues>({
    initialValues: mergedInitial,
    validate: {
      assessmentName: v => (v ? null : 'Title is required'),
      description: v => (v ? null : 'Description is required'),
      startDate: v => (!v ? 'Start date is required' : null),
      endDate: v => {
        if (!v) return 'End date is required';
        if (
          form.values.startDate &&
          new Date(v) <= new Date(form.values.startDate)
        )
          return 'End date must be after start date';
        return null;
      },
      teamSetId: v => (!v ? 'Please select a Team Set' : null),
      maxReviews: v => {
        const num = typeof v === 'number' ? v : Number(v);
        if (!Number.isInteger(num) || num < 1)
          return 'Maximum reviews must be a positive integer';
        return null;
      },
      maxMarks: v => {
        const num = typeof v === 'number' ? v : Number(v);
        if (Number.isNaN(num) || num < 0)
          return 'Max marks must be 0 or greater';
        return null;
      },
      gradingEndDate: v => {
        if (!v) return null;
        if (
          form.values.gradingStartDate &&
          new Date(v) <= new Date(form.values.gradingStartDate)
        )
          return 'Grading end date must be after grading start date';
        return null;
      },
    },
  });

  // Store original values to compare on submit and avoid unnecessary API calls when nothing changed
  type Normalized = NormalizedPeerReviewBasePayload;
  const originalValuesRef = useRef<Normalized | null>(null);

  const normalize = (values: PeerReviewBaseFormValues): Normalized => ({
    assessmentName: values.assessmentName.trim(),
    description: values.description.trim(),
    startDate: values.startDate,
    endDate: values.endDate,

    teamSetId: values.teamSetId,
    reviewerType: values.reviewerType,

    taAssignments: Boolean(values.taAssignments),

    maxReviews: Number(values.maxReviews ?? 1),
    commitOrTag: values.commitOrTag.trim(),

    maxMarks: Number(values.maxMarks ?? 0),
    scaleToMaxMarks: Boolean(values.scaleToMaxMarks),

    gradingStartDate: values.gradingStartDate ? values.gradingStartDate : null,
    gradingEndDate: values.gradingEndDate ? values.gradingEndDate : null,
  });

  useEffect(() => {
    form.setValues(mergedInitial);
    originalValuesRef.current = normalize(mergedInitial);
  }, [mergedInitial]);

  const handleSubmit = async () => {
    setError(null);
    const payload = normalize(form.values);

    try {
      setLoading(true);
      await onSubmit(payload);
      originalValuesRef.current = payload;

      showNotification({
        title:
          mode === 'create' ? 'Peer Review Created' : 'Peer Review Updated',
        message:
          mode === 'create' ? 'Created successfully.' : 'Updated successfully.',
        color: 'green',
      });
    } catch (e) {
      setError((e as Error).message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const isBusy = externalLoading ?? loading;

  if (isBusy) {
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
          title="Request failed"
          color="red"
          onClose={() => setError(null)}
          mb="md"
        >
          {error}
        </Notification>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Peer Review Title"
          {...form.getInputProps('assessmentName')}
          mb="xs"
        />
        <Textarea
          withAsterisk
          label="Description"
          {...form.getInputProps('description')}
          mb="xs"
        />

        <TextInput
          withAsterisk
          label="Start Date"
          {...form.getInputProps('startDate')}
          type="date"
          disabled={lockReviewConfig}
          mb="xs"
        />
        <TextInput
          withAsterisk
          label="End Date"
          {...form.getInputProps('endDate')}
          type="date"
          mb="xs"
        />
        
        <TextInput
          mt="md"
          mb="xs"
          label="Repository Commit or Tag"
          placeholder="e.g., v1.0, main, abc123"
          description="Specify a commit hash or tag to use for reviews. Leave empty to use the latest version."
          {...form.getInputProps('commitOrTag')}
        />

        <Text fw={600} fz="sm" mt="md" mb="xs">
          Team Set for this Peer Review
        </Text>
        <Select
          placeholder="Select a Team Set"
          data={teamSets.map(ts => ({ value: ts._id, label: ts.name }))}
          value={form.values.teamSetId}
          onChange={val => form.setFieldValue('teamSetId', val || '')}
          searchable
          disabled={lockReviewConfig}
          nothingFoundMessage="No results found"
          error={form.errors.teamSetId}
        />

        <Text fw={600} fz="sm" mt="md" mb="xs">
          Reviewer Type
        </Text>
        <Radio.Group
          value={form.values.reviewerType}
          onChange={value =>
            form.setFieldValue('reviewerType', value as ReviewerType)
          }
          ml="4px"
          readOnly={lockReviewConfig}
        >
          <Group>
            <Radio label="Team" value="Team" />
            <Radio label="Individual" value="Individual" />
          </Group>
        </Radio.Group>

        <Text fw={600} fz="sm" mt="md" mb="xs">
          Assign Peer Reviews to Teaching Assistants?
        </Text>
        <Radio.Group
          value={form.values.taAssignments ? 'yes' : 'no'}
          onChange={val => form.setFieldValue('taAssignments', val === 'yes')}
          ml="4px"
          readOnly={lockReviewConfig}
        >
          <Group gap="28px">
            <Radio label="Yes" value="yes" />
            <Radio label="No" value="no" />
          </Group>
        </Radio.Group>
        

        <TextInput
          withAsterisk
          mt="md"
          label="Maximum Reviews per Reviewer"
          {...form.getInputProps('maxReviews')}
          type="number"
          disabled={lockReviewConfig}
          mb="xs"
        />

        <Text fz="xl" fw={600} mt="xl" mb="xs">
          Assessment Settings
        </Text>
        <Divider mb="md" />
        <TextInput
          withAsterisk
          label="Maximum Marks (0 if ungraded)"
          {...form.getInputProps('maxMarks')}
          type="number"
          mb="xs"
        />
        <Radio.Group
          value={form.values.scaleToMaxMarks ? 'yes' : 'no'}
          onChange={v => form.setFieldValue('scaleToMaxMarks', v === 'yes')}
          my="sm"
          ml="4px"
        >
          <Group>
            <Radio label="Scale to max marks" value="yes" />
            <Radio label="Do not scale" value="no" />
          </Group>
        </Radio.Group>

        <TextInput
          label="Grading Start Date"
          {...form.getInputProps('gradingStartDate')}
          type="date"
          mb="xs"
        />
        <TextInput
          label="Grading End Date"
          {...form.getInputProps('gradingEndDate')}
          type="date"
          mb="xs"
        />

        <Group justify="flex-start" mt="md" pb="md" gap="xs">
          <Button type="submit">{submitLabel}</Button>
          {onCancel && (
            <Button variant="default" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
        </Group>
      </form>
    </>
  );
};

export default PeerReviewBaseForm;
