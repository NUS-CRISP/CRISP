import { Box, Button, Group, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';

interface UpdateRepositoryFormProps {
  courseId: string;
  repository: string | null; // Updated type to reflect repository structure
  repositoryIndex: number | null;
  onRepositoryUpdated: () => void; // Updated callback name
}

const UpdateRepositoryForm: React.FC<UpdateRepositoryFormProps> = ({
  courseId,
  repository,
  repositoryIndex,
  onRepositoryUpdated,
}) => {
  // Assuming that repository has a unique identifier such as _id
  const apiRoute = `/api/courses/${courseId}/repositories/${repositoryIndex}`;

  const form = useForm({
    initialValues: {
      repoLink: repository || '', // Update form fields to match repository fields
    },
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmitForm = async () => {
    const requestBody: Record<string, string> = {
      repoLink: form.values.repoLink,
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
        throw new Error('Failed to update repository');
      }

      await response.json();
      onRepositoryUpdated(); // Trigger update after successful submission
    } catch (error) {
      setError('Error updating repository. Please try again.');
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
          label="Repository Link"
          {...form.getInputProps('repoLink')}
          value={form.values.repoLink}
          onChange={event =>
            form.setFieldValue('repoLink', event.currentTarget.value)
          }
        />
        <Group my={16}>
          <Button type="submit" style={{ marginTop: '16px' }}>
            Update Repository
          </Button>
        </Group>
      </form>
    </Box>
  );
};

export default UpdateRepositoryForm;
