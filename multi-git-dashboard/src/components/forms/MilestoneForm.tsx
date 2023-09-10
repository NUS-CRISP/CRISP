import React from 'react';
import { Box, TextInput, Button } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';

const backendPort = process.env.BACKEND_PORT || 3001;

interface MilestoneFormProps {
  courseId: string | string[] | undefined;
  onMileStoneCreated: () => void;
}

const MilestoneForm: React.FC<MilestoneFormProps> = ({ courseId, onMileStoneCreated }) => {

  const form = useForm({
    initialValues: {
      mileStoneNumber: 0,
      dateline: new Date(),
      description: '',
    },
  });

  const handleSubmit = async () => {

    console.log('Sending milestone data:', form.values);

    const response = await fetch(`http://localhost:${backendPort}/api/courses/${courseId}/milestones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form.values),
    });

    const data = await response.json();
    console.log('Milestone created:', data);
    onMileStoneCreated();
  };

  return (
    <Box maw={300} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Milestone Number"
          {...form.getInputProps('mileStoneNumber')}
          value={form.values.mileStoneNumber}
          onChange={(event) => {
            form.setFieldValue('mileStoneNumber', +event.currentTarget.value);
          }}
        />
        <DatePicker
          allowDeselect
          {...form.getInputProps('dateline')}
          value={form.values.dateline}
          onChange={(date) => {
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
          onChange={(event) => {
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