import React, { useState, useCallback } from 'react';
import { Box, TextInput, Button, Group, Text } from '@mantine/core';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import Papa from 'papaparse';
import { User } from '@/types/user';

const backendPort = process.env.BACKEND_PORT || 3001;

interface TAFormProps {
  courseId: string | string[] | undefined;
  onTACreated: () => void;
}

interface Results {
  data: User[];
}

const TAForm: React.FC<TAFormProps> = ({ courseId, onTACreated }) => {
  const form = useForm({
    initialValues: {
      name: '',
      id: '',
      email: '',
    },
    validate: {
      //email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });
  const [TAs, setTAs] = useState<User[]>([]);

  const handleFileUpload = useCallback((file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        Papa.parse(reader.result as string, {
          header: true,
          skipEmptyLines: true,
          complete: function (results: Results) {
            const TAsData = results.data;
            const TAs = TAsData.map((TA: User) => ({
              id: TA.id || '',
              name: TA.name || '',
              email: TA.email || '',
            }));
            setTAs(TAs as User[]);
          },
          error: function (error: Error) {
            console.error('CSV parsing error:', error.message);
          },
        });
      };
      reader.readAsText(file);
    }
  }, []);

  const handleSubmitCSV = async () => {
    if (TAs.length === 0) {
      console.log('No TAs to upload.');
      return;
    }

    console.log('Sending TAs data:', TAs);

    try {
      const response = await fetch(
        `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/tas`,
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
      }
    } catch (error) {
      console.error('Error uploading TAs:', error);
    }
  };

  const handleSubmitForm = async () => {
    console.log('Sending ta data:', form.values);

    const response = await fetch(
      `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/tas`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              id: form.values.id,
              name: form.values.name,
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
          {...form.getInputProps('id')}
          value={form.values.id}
          onChange={event => {
            form.setFieldValue('id', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="TA Email"
          {...form.getInputProps('email')}
          value={form.values.email}
          onChange={event => {
            form.setFieldValue('email', event.currentTarget.value);
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
    </Box>
  );
};

export default TAForm;
