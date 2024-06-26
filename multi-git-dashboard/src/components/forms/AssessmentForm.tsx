import {
  Box,
  Button,
  Divider,
  Notification,
  Radio,
  Select,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

interface AssessmentFormProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
  teamSetNames: string[];
}

const AssessmentForm: React.FC<AssessmentFormProps> = ({
  courseId,
  onAssessmentCreated,
  teamSetNames,
}) => {
  const apiRoute = `/api/courses/${courseId}/assessments`;
  const csvTemplateHeaders = [
    'assessmentType',
    'markType',
    'frequency',
    'granularity',
    'teamSetName',
    'formLink',
    'sheetID',
    'sheetTab',
  ];

  const form = useForm({
    initialValues: {
      assessmentType: '',
      markType: '',
      frequency: '',
      granularity: 'individual',
      teamSetName: '',
      formLink: '',
      sheetID: '',
      sheetTab: '',
    },
    validate: {},
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmitForm = async () => {
    try {
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [form.values],
        }),
      });
      if (!response.ok) {
        console.error('Error creating assessment:', response.statusText);
        setError('Error creating assessment. Please try again.');
        return;
      }
      await response.json();
      onAssessmentCreated();
    } catch (error) {
      console.error('Error creating assessment:', error);
      setError('Error creating assessment. Please try again.');
    }
  };

  return (
    <Box maw={300} mx="auto">
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <Divider label="Enter Details" size="lg" />
      <form onSubmit={form.onSubmit(handleSubmitForm)}>
        <TextInput
          withAsterisk
          label="Assessment Type"
          {...form.getInputProps('assessmentType')}
          value={form.values.assessmentType}
          onChange={event => {
            form.setFieldValue('assessmentType', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Mark Type"
          {...form.getInputProps('markType')}
          value={form.values.markType}
          onChange={event => {
            form.setFieldValue('markType', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Frequency"
          {...form.getInputProps('frequency')}
          value={form.values.frequency}
          onChange={event => {
            form.setFieldValue('frequency', event.currentTarget.value);
          }}
        />
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Text>Granularity:</Text>
            <Radio.Group
              value={form.values.granularity}
              onChange={value => {
                form.setFieldValue('granularity', value);
              }}
            >
              <Radio label="Individual" value="individual" />
              <Radio label="Team" value="team" />
            </Radio.Group>
          </div>
        </div>
        <Select
          label="Team Set Name"
          data={teamSetNames.map((teamSetName: string) => ({
            value: teamSetName,
            label: teamSetName,
          }))}
          {...form.getInputProps('teamSetName')}
          value={teamSetNames.length > 0 ? form.values.teamSetName : null}
          onChange={value => {
            if (teamSetNames.length === 0 || value === null) {
              form.setFieldValue('teamSetName', '');
            } else {
              form.setFieldValue('teamSetName', value);
            }
          }}
        />
        <TextInput
          label="Form Link"
          {...form.getInputProps('formLink')}
          value={form.values.formLink}
          onChange={event => {
            form.setFieldValue('formLink', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Sheet ID"
          {...form.getInputProps('sheetID')}
          value={form.values.sheetID}
          onChange={event => {
            form.setFieldValue('sheetID', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Sheet Tab"
          {...form.getInputProps('sheetTab')}
          value={form.values.sheetTab}
          onChange={event => {
            form.setFieldValue('sheetTab', event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create Assessment
        </Button>
      </form>
      <Divider label="or Upload CSV" size="lg" />
      <CSVUpload
        headers={csvTemplateHeaders}
        onProcessComplete={onAssessmentCreated}
        onError={setError}
        filename="assessments_template.csv"
        uploadButtonString="Upload Assessments"
        urlString={apiRoute}
      />
    </Box>
  );
};

export default AssessmentForm;
