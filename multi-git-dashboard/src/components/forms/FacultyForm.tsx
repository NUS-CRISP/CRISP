import { Box, Button, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

interface FacultyFormProps {
  courseId: string | string[] | undefined;
  onFacultyCreated: () => void;
}

const FacultyForm: React.FC<FacultyFormProps> = ({
  courseId,
  onFacultyCreated,
}) => {
  const apiRoute = `/api/courses/${courseId}/faculty`;
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

    await response.json();
    onFacultyCreated();
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
          label="Faculty Member Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Faculty Member ID (NUS Net)"
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
          Create Faculty
        </Button>
      </form>
      <CSVUpload
        headers={csvTemplateHeaders}
        onProcessComplete={onFacultyCreated}
        onError={setError}
        filename="faculty_template.csv"
        uploadButtonString="Upload Faculty"
        urlString={apiRoute}
      />
    </Box>
  );
};

export default FacultyForm;
