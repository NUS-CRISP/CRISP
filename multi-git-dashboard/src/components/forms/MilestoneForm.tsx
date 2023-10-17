import React from 'react';
import { Box, TextInput, Button } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';

const backendPort = process.env.BACKEND_PORT || 3001;

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
      milestoneNumber: 0,
      dateline: new Date(),
      description: '',
    },
    validate: {
      milestoneNumber: value =>
        value >= 1 && value <= 100 ? null : 'Invalid milestone number',
      dateline: value => (value ? null : 'Dateline is required'),
    },
  });

  const handleSubmit = async () => {
    console.log('Sending milestone data:', form.values);

    const response = await fetch(
      `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/milestones`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.values),
      }
    );

    const data = await response.json();
    console.log('Milestone created:', data);
    onMilestoneCreated();
  };

  return (
    <Box maw={300} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Milestone Number"
          {...form.getInputProps('milestoneNumber')}
          value={form.values.milestoneNumber}
          onChange={event => {
            form.setFieldValue('milestoneNumber', +event.currentTarget.value);
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
