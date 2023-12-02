import { getApiUrl } from '@/lib/apiConfig';
import { Box, Button, Notification, TextInput } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useState } from 'react';

interface MilestoneFormProps {
  courseId: string | string[] | undefined;
  onMilestoneCreated: () => void;
}

const MilestoneForm: React.FC<MilestoneFormProps> = ({
  courseId,
  onMilestoneCreated,
}) => {
  const form = useForm({
    initialValues: {
      number: 0,
      dateline: new Date(),
      description: '',
    },
    validate: {
      number: value =>
        value >= 1 && value <= 100 ? null : 'Invalid milestone number',
      dateline: value => (value ? null : 'Dateline is required'),
    },
  });

  const [error, setError] = useState<string | null>(null);
  const apiUrl = getApiUrl() + `/courses/${courseId}/milestones`;

  const handleSubmit = async () => {
    console.log('Sending milestone data:', form.values);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.values),
      });

      if (!response.ok) {
        console.error('Error creating milestone:', response.statusText);
        setError('Error creating milestone. Please try again.');
        return;
      }
      const data = await response.json();
      console.log('Milestone created:', data);
      onMilestoneCreated();
    } catch (error) {
      console.error('Error creating milestone:', error);
      setError('Error creating milestone. Please try again.');
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
          label="Milestone Number"
          {...form.getInputProps('number')}
          value={form.values.number}
          onChange={event => {
            form.setFieldValue('number', +event.currentTarget.value);
          }}
        />
        <DatePicker
          allowDeselect
          {...form.getInputProps('dateline')}
          value={form.values.dateline}
          onChange={date => {
            form.setFieldValue('dateline', date || new Date());
          }}
          placeholder="Select dateline"
          style={{ marginBottom: '16px' }}
        />
        <TextInput
          withAsterisk
          label="Description"
          {...form.getInputProps('description')}
          value={form.values.description}
          onChange={event => {
            form.setFieldValue('description', event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create Milestone
        </Button>
      </form>
    </Box>
  );
};

export default MilestoneForm;
