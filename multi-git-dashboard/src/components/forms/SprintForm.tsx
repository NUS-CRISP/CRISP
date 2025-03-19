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
      number: 0,
      description: '',
      startDate: new Date(),
      endDate: new Date(),
    },
    validate: {
      number: (value: number) =>
        value >= 1 && value <= 100 ? null : 'Invalid sprint number',
      startDate: (value: Date) => (value ? null : 'Start date is required'),
      endDate: (value: Date) => (value ? null : 'End date is required'),
    },
  });

  const [error, setError] = useState<string | null>(null);
  const apiRoute = `/api/courses/${courseId}/sprints`;

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
        console.error('Error creating sprint:', response.statusText);
        setError('Error creating sprint. Please try again.');
        return;
      }
      await response.json();
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
          {...form.getInputProps('number')}
          value={form.values.number}
          onChange={event => {
            form.setFieldValue('number', +event.currentTarget.value);
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
