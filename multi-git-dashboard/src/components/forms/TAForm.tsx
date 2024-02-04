import { Box, Button, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

interface TAFormProps {
  courseId: string | string[] | undefined;
  onTACreated: () => void;
}

const TAForm: React.FC<TAFormProps> = ({ courseId, onTACreated }) => {
  const apiRoute = `/courses/${courseId}/tas`;
  const csvTemplateHeaders = ['name', 'identifier', 'email', 'gitHandle'];

  const form = useForm({
    initialValues: {
      identifier: '',
      name: '',
      gitHandle: '',
      email: '',
    },
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmitForm = async () => {
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            identifier: form.values.identifier,
            name: form.values.name,
            gitHandle: form.values.gitHandle,
            email: form.values.email,
          },
        ],
      }),
    });

    const data = await response.json();
    console.log('TA created:', data);
    onTACreated();
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
          label="TA Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="TA ID (NUS Net)"
          {...form.getInputProps('identifier')}
          value={form.values.identifier}
          onChange={event => {
            form.setFieldValue('identifier', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Email"
          {...form.getInputProps('email')}
          value={form.values.email}
          onChange={event => {
            form.setFieldValue('email', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Git Handle"
          {...form.getInputProps('gitHandle')}
          value={form.values.gitHandle}
          onChange={event => {
            form.setFieldValue('gitHandle', event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create TA
        </Button>
      </form>
      <CSVUpload
        headers={csvTemplateHeaders}
        onProcessComplete={onTACreated}
        onError={setError}
        filename="students_template.csv"
        uploadButtonString="Upload Students"
        urlString={apiRoute}
      />
    </Box>
  );
};

export default TAForm;
