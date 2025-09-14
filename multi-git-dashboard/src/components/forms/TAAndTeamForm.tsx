import { Box, Button, Divider, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

interface TAFormProps {
  courseId: string | string[] | undefined;
  onTACreated: () => void;
}

const TAForm: React.FC<TAFormProps> = ({ courseId, onTACreated }) => {
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

  const transformTAData = (rows: any[]) =>
    rows.map(r => {
      const raw = (r.teamNumber ?? '').toString().trim();
      const out: any = {
        identifier: r.identifier,
        name: r.name,
        email: (r.email ?? '').trim(),
        gitHandle: r.gitHandle || '',
      };
      if (/^\d+$/.test(raw)) out.teamNumber = parseInt(raw, 10);
      return out;
    });

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

export default TAForm;
