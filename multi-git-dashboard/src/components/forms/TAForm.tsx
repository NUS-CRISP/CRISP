import {
  Box,
  Button,
  Notification,
  Group,
  Text,
  TextInput,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { User } from '@shared/types/User';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { saveAs } from 'file-saver';
import Papa, { ParseResult } from 'papaparse';
import { useCallback, useState } from 'react';

interface TAFormProps {
  courseId: string | string[] | undefined;
  onTACreated: () => void;
}

const TAForm: React.FC<TAFormProps> = ({ courseId, onTACreated }) => {
  const form = useForm({
    initialValues: {
      identifier: '',
      name: '',
      gitHandle: '',
      email: '',
    },
  });
  const [TAs, setTAs] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        Papa.parse(reader.result as string, {
          header: true,
          skipEmptyLines: true,
          complete: function (results: ParseResult<User>) {
            setTAs(results.data);
          },
          error: function (error: Error) {
            console.error('CSV parsing error:', error.message);
            setError('Error cparsing CSV. Please check the format.');
          },
        });
      };
      reader.readAsText(file);
    }
  }, []);

  const downloadCsvTemplate = () => {
    const csvHeaders = 'name,identifier,gitHandle,email\n';
    const blob = new Blob([csvHeaders], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'tas_template.csv');
  };

  const handleSubmitCSV = async () => {
    if (TAs.length === 0) {
      console.log('No TAs to upload.');
      return;
    }

    console.log('Sending TAs data:', TAs);

    try {
      const response = await fetch(
        `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/courses/${courseId}/tas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: TAs,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('TAs created:', data);
        onTACreated();
      } else {
        console.error('Error uploading TAs:', response.statusText);
        setError('Error uploading TAs. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading TAs:', error);
      setError('Error uploading TAs. Please try again.');
    }
  };

  const handleSubmitForm = async () => {
    console.log('Sending ta data:', form.values);

    const response = await fetch(
      `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/courses/${courseId}/tas`,
      {
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
            },
          ],
        }),
      }
    );

    const data = await response.json();
    console.log('TA created:', data);
    onTACreated();
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
          label="TA Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
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
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create TA
        </Button>
      </form>

      <Dropzone
        onDrop={(files: File[]) => {
          console.error(files);
          if (files.length > 0) {
            handleFileUpload(files[0]);
          }
        }}
        accept={[MIME_TYPES.csv]}
        maxSize={1024 * 1024 * 5}
        maxFiles={1}
        multiple={false}
        style={{ marginTop: '16px' }}
      >
        <Group mih={220} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload
              style={{ color: 'var(--mantine-color-blue-6)' }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{ color: 'var(--mantine-color-red-6)' }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto
              style={{ color: 'var(--mantine-color-dimmed)' }}
              stroke={1.5}
            />
          </Dropzone.Idle>

          <div>
            <Text size="xl" inline>
              Drag images here or click to select files
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach as many files as you like, each file should not exceed 5mb
            </Text>
          </div>
        </Group>
      </Dropzone>
      <Button onClick={handleSubmitCSV} style={{ marginTop: '16px' }}>
        Upload TAs
      </Button>
      <Button onClick={downloadCsvTemplate} style={{ marginTop: '16px' }}>
        Download CSV Template
      </Button>
    </Box>
  );
};

export default TAForm;
