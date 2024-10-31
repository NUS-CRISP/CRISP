// UpdateAssessmentInternalForm.tsx

import {
  Box,
  Button,
  Group,
  Notification,
  TextInput,
  Checkbox,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { InternalAssessment } from '@shared/types/InternalAssessment'; // Import InternalAssessment type
import { useState } from 'react';

interface UpdateAssessmentInternalFormProps {
  assessment: InternalAssessment | null; // Use InternalAssessment type
  onAssessmentUpdated: () => void;
}

const UpdateAssessmentInternalForm: React.FC<
  UpdateAssessmentInternalFormProps
> = ({ assessment, onAssessmentUpdated }) => {
  const apiRoute = `/api/internal-assessments/${assessment?._id}`; // Update the API route for internal assessments

  const form = useForm({
    initialValues: {
      assessmentName: assessment?.assessmentName || '',
      description: assessment?.description || '',
      startDate: assessment?.startDate
        ? new Date(assessment.startDate).toISOString().split('T')[0]
        : '', // Convert date to string
      endDate: assessment?.endDate
        ? new Date(assessment.endDate).toISOString().split('T')[0]
        : '', // Handle nullable endDate
      maxMarks: assessment?.maxMarks?.toString() || '',
      areSubmissionsEditable: assessment?.areSubmissionsEditable || false, // New field added
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
      areSubmissionsEditable: form.values.areSubmissionsEditable, // Included in request body
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
          type="date" // Ensure the input is treated as a date input
          {...form.getInputProps('startDate')}
          mb="sm"
        />
        <TextInput
          label="End Date (Optional)"
          type="date" // Ensure the input is treated as a date input
          {...form.getInputProps('endDate')}
          mb="sm"
        />
        <TextInput
          label="Maximum Marks (Optional)"
          {...form.getInputProps('maxMarks')}
          mb="sm"
        />

        {/* New Checkbox for areSubmissionsEditable */}
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
