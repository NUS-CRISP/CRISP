import { Box, Button, Group, Text, TextInput } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { User } from '@shared/types/User';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { saveAs } from 'file-saver';
import Papa, { ParseResult } from 'papaparse';
import { useCallback, useState } from 'react';

interface StudentFormProps {
  courseId: string | string[] | undefined;
  onStudentCreated: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({
  courseId,
  onStudentCreated,
}) => {
  const form = useForm({
    initialValues: {
      identifier: '',
      name: '',
      gitHandle: '',
      email: '',
    },
  });
  const [students, setStudents] = useState<User[]>([]);

  const handleFileUpload = useCallback((file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        Papa.parse(reader.result as string, {
          header: true,
          skipEmptyLines: true,
          complete: function (results: ParseResult<User>) {
            setStudents(results.data);
          },
          error: function (error: Error) {
            console.error('CSV parsing error:', error.message);
          },
        });
      };
      reader.readAsText(file);
    }
  }, []);

  const downloadCsvTemplate = () => {
    const csvHeaders = 'name,identifier,email,gitHandle\n';
    const blob = new Blob([csvHeaders], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'students_template.csv');
  };

  const handleSubmitCSV = async () => {
    if (students.length === 0) {
      console.log('No students to upload.');
      return;
    }

    console.log('Sending students data:', students);

    try {
      const response = await fetch(
        `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/courses/${courseId}/students`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: students,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Students created:', data);
        onStudentCreated();
      } else {
        console.error('Error uploading students:', response.statusText);
      }
    } catch (error) {
      console.error('Error uploading students:', error);
    }
  };

  const handleSubmitForm = async () => {
    console.log('Sending student data:', form.values);

    const response = await fetch(
      `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/courses/${courseId}/students`,
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
    console.log('Student created:', data);
    onStudentCreated();
  };

  return (
    <Box maw={300} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmitForm)}>
        <TextInput
          withAsterisk
          label="Student Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Student ID"
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
          Create Student
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
        Upload Students
      </Button>
      <Button onClick={downloadCsvTemplate} style={{ marginTop: '16px' }}>
        Download CSV Template
      </Button>
    </Box>
  );
};

export default StudentForm;
