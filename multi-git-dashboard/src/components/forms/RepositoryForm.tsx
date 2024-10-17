import { Box, Button, Divider, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

interface RepositoryFormProps {
  courseId: string | string[] | undefined;
  onRepositoryCreated: () => void;
}

const RepositoryForm: React.FC<RepositoryFormProps> = ({
  courseId,
  onRepositoryCreated,
}) => {
  const apiRoute = `/api/courses/${courseId}/repositories`;

  // CSV template with a single column for GitHub repo links
  const csvTemplateHeaders = ['gitHubRepoLink'];

  const form = useForm({
    initialValues: {
      gitHubRepoLink: '',
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
        items: [{ gitHubRepoLink: form.values.gitHubRepoLink }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setError(
        errorData.message ||
          'An error occurred while submitting the repository link.'
      );
      return;
    }

    await response.json();
    onRepositoryCreated();
  };

  return (
    <Box maw={300} mx="auto">
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <Divider label="Enter GitHub Repository Link" size="lg" />
      <form onSubmit={form.onSubmit(handleSubmitForm)}>
        <TextInput
          withAsterisk
          label="GitHub Repository Link"
          {...form.getInputProps('gitHubRepoLink')}
          value={form.values.gitHubRepoLink}
          onChange={event =>
            form.setFieldValue('gitHubRepoLink', event.currentTarget.value)
          }
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create Repository
        </Button>
      </form>
      <Divider label="or Upload CSV" size="lg" />
      <CSVUpload
        headers={csvTemplateHeaders}
        onProcessComplete={onRepositoryCreated}
        onError={setError}
        filename="repository_links_template.csv"
        uploadButtonString="Upload Repository Links"
        urlString={apiRoute}
      />
    </Box>
  );
};

export default RepositoryForm;
