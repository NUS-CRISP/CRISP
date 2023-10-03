// AssessmentForm.tsx
import React from 'react';
import { Box, TextInput, Button, Text, Radio } from '@mantine/core';
import { useForm } from '@mantine/form';

const backendPort = process.env.BACKEND_PORT || 3001;

interface AssessmentFormProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
}

const AssessmentForm: React.FC<AssessmentFormProps> = ({
  courseId,
  onAssessmentCreated,
}) => {
  const form = useForm({
    initialValues: {
      assessmentType: '',
      markType: '',
      frequency: '',
      granularity: 'individual',
      teamSetName: '',
      formLink: '',
    },
    validate: {
    },
  });

  const handleSubmit = async () => {
    console.log('Sending assessment data:', form.values);

    const response = await fetch(
      `http://localhost:${backendPort}/api/courses/${courseId}/assessments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.values),
      }
    );

    const data = await response.json();
    console.log('Assessment created:', data);
    onAssessmentCreated();
  };

  return (
    <Box maw={300} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Assessment Type"
          {...form.getInputProps('assessmentType')}
          value={form.values.assessmentType}
          onChange={(event) => {
            form.setFieldValue('assessmentType', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Mark Type"
          {...form.getInputProps('markType')}
          value={form.values.markType}
          onChange={(event) => {
            form.setFieldValue('markType', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Frequency"
          {...form.getInputProps('frequency')}
          value={form.values.frequency}
          onChange={(event) => {
            form.setFieldValue('frequency', event.currentTarget.value);
          }}
        />
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
          <Text>Granularity:</Text>
          <Radio.Group
            value={form.values.granularity}
            onChange={(value) => {
              form.setFieldValue('granularity', value);
            }}
          >
            <Radio label="Individual" value="individual" />
            <Radio label="Team" value="team" />
          </Radio.Group>
          </div>
        </div>
        <TextInput
          label="Team Set Name"
          {...form.getInputProps('teamSetName')}
          value={form.values.teamSetName}
          onChange={(event) => {
            form.setFieldValue('teamSetName', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Form Link"
          {...form.getInputProps('formLink')}
          value={form.values.formLink}
          onChange={(event) => {
            form.setFieldValue('formLink', event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create Assessment
        </Button>
      </form>
    </Box>
  );
};

export default AssessmentForm;
