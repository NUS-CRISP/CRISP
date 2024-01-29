import apiBaseUrl from '@/lib/api-config';
import { Box, Button, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

interface TATeamFormProps {
  courseId: string | string[] | undefined;
  teamSet: string;
  onTeamCreated: () => void;
}

interface TATeamFormUser {
  identifier: string;
  teamNumber: number;
}

const TATeamForm: React.FC<TATeamFormProps> = ({
  courseId,
  teamSet,
  onTeamCreated,
}) => {
  const form = useForm({
    initialValues: {
      identifier: '',
      teamNumber: 0,
    },
  });

  const [error, setError] = useState<string | null>(null);
  const apiUrl = apiBaseUrl + `/courses/${courseId}/teams/tas`;
  const csvTemplateHeaders = 'identifier,teamNumber';

  const transformTAData = (data: unknown[]) => {
    const TAs = data as TATeamFormUser[];
    return TAs.map((TA: TATeamFormUser) => ({
      identifier: TA.identifier || '',
      teamSet: teamSet,
      teamNumber: TA.teamNumber,
    }));
  };

  const handleSubmitForm = async () => {
    console.log('Sending teams data:', form.values);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              identifier: form.values.identifier,
              teamSet: teamSet,
              teamNumber: form.values.teamNumber,
            },
          ],
        }),
      });
      if (!response.ok) {
        console.error('Error creating team:', response.statusText);
        setError('Error creating team. Please try again.');
        return;
      }
      const data = await response.json();
      console.log('Team created:', data);
      onTeamCreated();
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Error creating team. Please try again.');
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
          label="TA ID"
          {...form.getInputProps('identifier')}
          value={form.values.identifier}
          onChange={event => {
            form.setFieldValue('identifier', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Team Number"
          {...form.getInputProps('teamNumber')}
          value={form.values.teamNumber}
          onChange={event => {
            form.setFieldValue('teamNumber', +event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Upload TA
        </Button>
      </form>
      <CSVUpload
        templateHeaders={csvTemplateHeaders}
        onProcessComplete={onTeamCreated}
        onError={setError}
        downloadFilename="tas_team_template.csv"
        uploadButtonString="Upload TAs"
        urlString={apiUrl}
        transformFunction={transformTAData}
      />
    </Box>
  );
};

export default TATeamForm;
