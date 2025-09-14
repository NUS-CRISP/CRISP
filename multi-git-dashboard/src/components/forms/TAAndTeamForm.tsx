import { Box, Button, Divider, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

interface TAAndTeamFormProps {
  courseId: string | string[] | undefined;
  onTACreated: () => void;
}

interface TAAndTeamFormUser {
  identifier: string;
  name: string;
  gitHandle: string;
  email: string;
  teamNumber?: number | string;
}

const TAAndTeamForm: React.FC<TAAndTeamFormProps> = ({
  courseId,
  onTACreated,
}) => {
  const apiRoute = `/api/courses/${courseId}/tas/teams`;
  const csvTemplateHeaders = [
    'name',
    'identifier',
    'email',
    'gitHandle',
    'teamNumber',
  ];

  const form = useForm({
    initialValues: {
      identifier: '',
      name: '',
      gitHandle: '',
      email: '',
      teamNumber: '',
    },
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmitForm = async () => {
    const tnStr = String(form.values.teamNumber ?? '').trim();
    const tn = tnStr === '' ? undefined : Number(tnStr);
    if (tn !== undefined && !Number.isInteger(tn)) {
      setError('Team Number must be an integer');
      return;
    }
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            identifier: form.values.identifier,
            name: form.values.name,
            gitHandle: form.values.gitHandle,
            email: form.values.email,
            ...(tn !== undefined ? { teamNumber: tn } : {}),
          },
        ],
      }),
    });

    await response.json();
    onTACreated();
  };

  const transformTAData = (rows: unknown[]) => {
    const tas = rows as TAAndTeamFormUser[];
    return tas.map(ta => {
      const tn = ta.teamNumber === undefined ? '' : String(ta.teamNumber);
      const teamNumber = /^\d+$/.test(tn.trim()) ? Number(tn) : undefined;
      const row: TAAndTeamFormUser = {
        identifier: ta.identifier,
        name: ta.name,
        email: (ta.email ?? '').trim(),
        gitHandle: ta.gitHandle || '',
      };
      if (teamNumber !== undefined) row.teamNumber = teamNumber;
      return row;
    });
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
          label="TA Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="TA ID (NUS Net)"
          {...form.getInputProps('identifier')}
          value={form.values.identifier}
          onChange={event => {
            form.setFieldValue('identifier', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Email"
          {...form.getInputProps('email')}
          value={form.values.email}
          onChange={event => {
            form.setFieldValue('email', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Git Handle"
          {...form.getInputProps('gitHandle')}
          value={form.values.gitHandle}
          onChange={event => {
            form.setFieldValue('gitHandle', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Team Number"
          {...form.getInputProps('teamNumber')}
          value={form.values.teamNumber}
          onChange={event => {
            const v = event.currentTarget.value;
            if (/^\d*$/.test(v)) {
              form.setFieldValue('teamNumber', v);
            }
          }}
          inputMode="numeric"
          pattern="\d*"
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create TA
        </Button>
      </form>
      <Divider label="or Upload CSV" size="lg" />
      <CSVUpload
        headers={csvTemplateHeaders}
        onProcessComplete={onTACreated}
        onError={setError}
        filename="tas_template.csv"
        uploadButtonString="Upload TAs"
        urlString={apiRoute}
        transformFunction={transformTAData}
      />
    </Box>
  );
};

export default TAAndTeamForm;
