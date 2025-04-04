// UpdateAssessmentInternalForm.tsx

import {
  Box,
  Button,
  Group,
  Notification,
  TextInput,
  Checkbox,
  Tooltip,
} from '@mantine/core';
import { IconHelpCircle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { useState } from 'react';

interface UpdateAssessmentInternalFormProps {
  assessment: InternalAssessment | null;
  onAssessmentUpdated: () => void;
}

const UpdateAssessmentInternalForm: React.FC<
  UpdateAssessmentInternalFormProps
> = ({ assessment, onAssessmentUpdated }) => {
  const apiRoute = `/api/internal-assessments/${assessment?._id}`;

  const form = useForm({
    initialValues: {
      assessmentName: assessment?.assessmentName || '',
      description: assessment?.description || '',
      startDate: assessment?.startDate
        ? new Date(assessment.startDate).toISOString().split('T')[0]
        : '',
      endDate: assessment?.endDate
        ? new Date(assessment.endDate).toISOString().split('T')[0]
        : '',
      maxMarks: assessment?.maxMarks?.toString() || '',
      areSubmissionsEditable: assessment?.areSubmissionsEditable || false,

      // Add the new scaleToMaxMarks field to match the "Create" form
      scaleToMaxMarks:
        typeof assessment?.scaleToMaxMarks === 'boolean'
          ? assessment.scaleToMaxMarks
          : true,
    },
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmitForm = async () => {
    const requestBody: Record<string, string | null | boolean> = {
      assessmentName: form.values.assessmentName,
      description: form.values.description,
      startDate: form.values.startDate || null,
      endDate: form.values.endDate || null,
      maxMarks: form.values.maxMarks ? form.values.maxMarks : null,
      areSubmissionsEditable: form.values.areSubmissionsEditable,

      // Include scaleToMaxMarks in the request
      scaleToMaxMarks: form.values.scaleToMaxMarks,
    };

    try {
      const response = await fetch(apiRoute, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      await response.json();
      onAssessmentUpdated();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(String(error));
      }
    }
  };

  return (
    <Box maw={500} mx="auto" p="md">
      {error && (
        <Notification
          title="Error"
          color="red"
          onClose={() => setError(null)}
          mb="md"
        >
          {error}
        </Notification>
      )}
      <form onSubmit={form.onSubmit(handleSubmitForm)}>
        <TextInput
          withAsterisk
          label="Assessment Name"
          {...form.getInputProps('assessmentName')}
          mb="sm"
        />
        <TextInput
          withAsterisk
          label="Description"
          {...form.getInputProps('description')}
          mb="sm"
        />
        <TextInput
          withAsterisk
          label="Start Date"
          type="date"
          {...form.getInputProps('startDate')}
          mb="sm"
        />
        <TextInput
          label="End Date (Optional)"
          type="date"
          {...form.getInputProps('endDate')}
          mb="sm"
        />
        <TextInput
          label="Maximum Marks (Optional)"
          {...form.getInputProps('maxMarks')}
          mb="sm"
        />

        {/* scaleToMaxMarks with tooltip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: 16,
          }}
        >
          <Checkbox
            label="Scale final scores to max marks"
            checked={form.values.scaleToMaxMarks}
            onChange={event =>
              form.setFieldValue('scaleToMaxMarks', event.currentTarget.checked)
            }
          />
          <Tooltip
            label="If checked, the final submission scores will be scaled so that a perfect score
is equal to the indicated max marks. For example, if questions total 10 marks
but max marks is 20, then scored submissions will double in score. Scaling up and
down are both possible."
            position="right"
            withArrow
            w={260}
            multiline
          >
            <span style={{ cursor: 'pointer', display: 'inline-flex' }}>
              <IconHelpCircle size={18} />
            </span>
          </Tooltip>
        </div>

        <Checkbox
          label="Allow Submissions to be Editable"
          checked={form.values.areSubmissionsEditable}
          onChange={event =>
            form.setFieldValue(
              'areSubmissionsEditable',
              event.currentTarget.checked
            )
          }
          mb="sm"
        />

        <Group my={16}>
          <Button type="submit" style={{ marginTop: '16px' }}>
            Update Assessment
          </Button>
        </Group>
      </form>
    </Box>
  );
};

export default UpdateAssessmentInternalForm;
