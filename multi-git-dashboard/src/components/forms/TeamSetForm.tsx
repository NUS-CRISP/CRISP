import { Box, Button, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';

interface TeamSetFormProps {
  courseId: string;
  onTeamSetCreated: () => void;
}

const TeamSetForm: React.FC<TeamSetFormProps> = ({
  courseId,
  onTeamSetCreated,
}) => {
  const apiRoute = `/courses/${courseId}/teamsets`;

  const form = useForm({
    initialValues: {
      course: courseId,
      name: '',
      teams: [],
    },
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.values),
      });

      if (!response.ok) {
        console.error('Error creating teamset:', response.statusText);
        setError('Error creating teamset. Please try again.');
        return;
      }
      const data = await response.json();
      console.log('TeamSet created:', data);
      onTeamSetCreated();
    } catch (error) {
      console.error('Error creating teamset:', error);
      setError('Error creating teamset. Please try again.');
    }
  };

  return (
    <Box maw={300} mx="auto">
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="TeamSet Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create TeamSet
        </Button>
      </form>
    </Box>
  );
};

export default TeamSetForm;
