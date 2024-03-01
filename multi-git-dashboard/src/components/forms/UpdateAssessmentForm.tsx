import { Box, Button, Group, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Assessment } from '@shared/types/Assessment';
import { useState } from 'react';

interface UpdateUserFormProps {
  assessment: Assessment | null;
  onAssessmentUpdated: () => void;
}

const UpdateUserForm: React.FC<UpdateUserFormProps> = ({
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

    const response = await fetch(apiRoute, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    await response.json();
    onAssessmentUpdated();
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
          label="Assessment Type"
          {...form.getInputProps('assessmentType')}
          value={form.values.assessmentType}
          onChange={event => {
            form.setFieldValue('assessmentType', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Mark Type"
          {...form.getInputProps('markType')}
          value={form.values.markType}
          onChange={event => {
            form.setFieldValue('markType', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Frequency"
          {...form.getInputProps('frequency')}
          value={form.values.frequency}
          onChange={event => {
            form.setFieldValue('frequency', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Form Link"
          {...form.getInputProps('formLink')}
          value={form.values.formLink}
          onChange={event => {
            form.setFieldValue('formLink', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Sheet ID"
          {...form.getInputProps('sheetID')}
          value={form.values.sheetID}
          onChange={event => {
            form.setFieldValue('sheetID', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Sheet Tab"
          {...form.getInputProps('sheetTab')}
          value={form.values.sheetTab}
          onChange={event => {
            form.setFieldValue('sheetTab', event.currentTarget.value);
          }}
        />
        <Group my={16}>
          <Button type="submit" style={{ marginTop: '16px' }}>
            Update User
          </Button>
        </Group>
      </form>
    </Box>
  );
};

export default UpdateUserForm;
