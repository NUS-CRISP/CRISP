import React from 'react';
import { Box, TextInput, Button } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';

const backendPort = process.env.BACKEND_PORT || 3001;

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

  const handleSubmit = async () => {
    console.log('Sending sprint data:', form.values);

    const response = await fetch(
      `http://localhost:${backendPort}/api/courses/${courseId}/sprints`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.values),
      }
    );

    const data = await response.json();
    console.log('Sprint created:', data);
    onSprintCreated();
  };

  return (
    <Box maw={300} mx="auto">
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
