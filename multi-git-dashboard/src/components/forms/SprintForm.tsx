import { getApiUrl } from '@/lib/apiConfig';
import { Box, Button, Notification, TextInput } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useState } from 'react';

interface SprintFormProps {
  courseId: string | string[] | undefined;
  onSprintCreated: () => void;
}

const SprintForm: React.FC<SprintFormProps> = ({
  courseId,
  onSprintCreated,
}) => {
  const form = useForm({
    initialValues: {
      sprintNumber: 0,
      description: '',
      startDate: new Date(),
      endDate: new Date(),
    },
    validate: {
      sprintNumber: value =>
        value >= 1 && value <= 100 ? null : 'Invalid sprint number',
      startDate: value => (value ? null : 'Start date is required'),
      endDate: value => (value ? null : 'End date is required'),
    },
  });

  const [error, setError] = useState<string | null>(null);
  const apiUrl = getApiUrl() + `/courses/${courseId}/sprints`;

  const handleSubmit = async () => {
    console.log('Sending sprint data:', form.values);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.values),
      });

      if (!response.ok) {
        console.error('Error creating sprint:', response.statusText);
        setError('Error creating sprint. Please try again.');
        return;
      }
      const data = await response.json();
      console.log('Sprint created:', data);
      onSprintCreated();
    } catch (error) {
      console.error('Error creating sprint:', error);
      setError('Error creating sprint. Please try again.');
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
          label="Sprint Number"
          {...form.getInputProps('sprintNumber')}
          value={form.values.sprintNumber}
          onChange={event => {
            form.setFieldValue('sprintNumber', +event.currentTarget.value);
          }}
        />
        <DatePicker
          allowDeselect
          {...form.getInputProps('startDate')}
          value={form.values.startDate}
          onChange={date => {
            form.setFieldValue('startDate', date || new Date());
          }}
          placeholder="Select start date"
          style={{ marginBottom: '16px' }}
        />
        <DatePicker
          allowDeselect
          {...form.getInputProps('endDate')}
          value={form.values.endDate}
          onChange={date => {
            form.setFieldValue('endDate', date || new Date());
          }}
          placeholder="Select end date"
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
          Create Sprint
        </Button>
      </form>
    </Box>
  );
};

export default SprintForm;
