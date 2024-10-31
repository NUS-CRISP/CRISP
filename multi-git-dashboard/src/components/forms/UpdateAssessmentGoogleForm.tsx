import { Box, Button, Group, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Assessment } from '@shared/types/Assessment';
import { useState } from 'react';

interface UpdateAssessmentGoogleFormProps {
  assessment: Assessment | null;
  onAssessmentUpdated: () => void;
}

const UpdateAssessmentGoogleForm: React.FC<UpdateAssessmentGoogleFormProps> = ({
  assessment,
  onAssessmentUpdated,
}) => {
  const apiRoute = `/api/assessments/${assessment?._id}`;

  const form = useForm({
    initialValues: {
      assessmentType: assessment?.assessmentType || '',
      markType: assessment?.markType || '',
      frequency: assessment?.frequency || '',
      formLink: assessment?.formLink || '',
      sheetID: assessment?.sheetID || '',
      sheetTab: assessment?.sheetTab || '',
    },
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmitForm = async () => {
    const requestBody: Record<string, string> = {};
    if (form.values.assessmentType) {
      requestBody.assessmentType = form.values.assessmentType;
    }
    if (form.values.markType) {
      requestBody.markType = form.values.markType;
    }
    if (form.values.frequency) {
      requestBody.frequency = form.values.frequency;
    }
    if (form.values.formLink) {
      requestBody.formLink = form.values.formLink;
    }
    if (form.values.sheetID) {
      requestBody.sheetID = form.values.sheetID;
    }
    if (form.values.sheetTab) {
      requestBody.sheetTab = form.values.sheetTab;
    }
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
    <Box maw={300} mx="auto">
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <form onSubmit={form.onSubmit(handleSubmitForm)}>
        <TextInput
          withAsterisk
          label="Assessment Type"
          {...form.getInputProps('assessmentType')}
        />
        <TextInput
          withAsterisk
          label="Mark Type"
          {...form.getInputProps('markType')}
        />
        <TextInput
          withAsterisk
          label="Frequency"
          {...form.getInputProps('frequency')}
        />

        <TextInput
          withAsterisk
          label="Form Link"
          {...form.getInputProps('formLink')}
        />
        <TextInput label="Sheet ID" {...form.getInputProps('sheetID')} />
        <TextInput label="Sheet Tab" {...form.getInputProps('sheetTab')} />

        <Group my={16}>
          <Button type="submit" style={{ marginTop: '16px' }}>
            Update Assessment
          </Button>
        </Group>
      </form>
    </Box>
  );
};

export default UpdateAssessmentGoogleForm;
