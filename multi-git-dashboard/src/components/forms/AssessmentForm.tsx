import {
  Box,
  Button,
  Notification,
  Radio,
  Select,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { TeamSet } from '@shared/types/TeamSet';
import { useState } from 'react';
import CSVUpload from './CSVUpload';

const backendPort = process.env.BACKEND_PORT || 3001;

interface AssessmentFormProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
  teamSets: TeamSet[];
}

const AssessmentForm: React.FC<AssessmentFormProps> = ({
  courseId,
  onAssessmentCreated,
  teamSets,
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
    validate: {},
  });
  const [error, setError] = useState<string | null>(null);
  const apiUrl = `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/assessments`;
  const csvTemplateHeaders =
    'assessmentType,markType,frequency,granularity,teamSetName,formLink';

  const handleSubmitForm = async () => {
    console.log('Sending assessment data:', form.values);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [form.values],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Assessment created:', data);
        onAssessmentCreated();
      } else {
        console.error('Error creating assessment:', response.statusText);
        setError('Error creating assessment. Please try again.');
      }
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
        {form.values.granularity === 'team' && (
          <Select
            label="Team Set Name"
            data={teamSets.map((teamSet: TeamSet) => ({
              value: teamSet.name,
              label: teamSet.name,
            }))}
            {...form.getInputProps('teamSetName')}
            value={teamSets.length > 0 ? form.values.teamSetName : null}
            onChange={value => {
              if (teamSets.length === 0 || value === null) {
                form.setFieldValue('teamSetName', '');
              } else {
                form.setFieldValue('teamSetName', value);
              }
            }}
          />
        )}
        <TextInput
          label="Form Link"
          {...form.getInputProps('formLink')}
          value={form.values.formLink}
          onChange={event => {
            form.setFieldValue('formLink', event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create Assessment
        </Button>
      </form>
      <CSVUpload
        templateHeaders={csvTemplateHeaders}
        onProcessComplete={onAssessmentCreated}
        onError={setError}
        downloadFilename="assessments_template.csv"
        uploadButtonString="Upload Assessments"
        urlString={apiUrl}
      />
    </Box>
  );
};

export default AssessmentForm;
