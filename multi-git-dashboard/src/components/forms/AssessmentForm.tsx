import React, { useState, useCallback } from 'react';
import { TeamSet } from '@/types/course';
import {
  Box,
  TextInput,
  Button,
  Text,
  Radio,
  Select,
  Group,
} from '@mantine/core';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

const backendPort = process.env.BACKEND_PORT || 3001;

interface AssessmentFormProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
  teamSets: TeamSet[];
}

interface Assessment {
  assessmentType: string;
  markType: string;
  frequency: string;
  granularity: string;
  teamSetName?: string;
  formLink: string;
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
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const handleFileUpload = useCallback((file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        Papa.parse(reader.result as string, {
          header: true,
          skipEmptyLines: true,
          complete: function (results) {
            const assessmentsData = results.data as Assessment[];
            setAssessments(assessmentsData);
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
    const csvHeaders =
      'assessmentType,markType,frequency,granularity,teamSetName,formLink\n';
    const blob = new Blob([csvHeaders], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'assessments_template.csv');
  };

  const handleSubmitCSV = async () => {
    if (assessments.length === 0) {
      console.log('No assessments to upload.');
      return;
    }

    console.log('Sending assessments data:', assessments);

    try {
      const response = await fetch(
        `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/assessments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: assessments,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Assessments created:', data);
        onAssessmentCreated();
      } else {
        console.error('Error uploading assessments:', response.statusText);
      }
    } catch (error) {
      console.error('Error uploading assessments:', error);
    }
  };

  const handleSubmitForm = async () => {
    console.log('Sending assessment data:', form.values);

    const response = await fetch(
      `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/assessments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [form.values],
        }),
      }
    );

    const data = await response.json();
    console.log('Assessment created:', data);
    onAssessmentCreated();
  };

  return (
    <Box maw={300} mx="auto">
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
      <Dropzone
        onDrop={(files: File[]) => {
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
              Drag CSV here or click to select files
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach as many files as you like, each file should not exceed 5mb
            </Text>
          </div>
        </Group>
      </Dropzone>
      <Button onClick={handleSubmitCSV} style={{ marginTop: '16px' }}>
        Upload Assessments
      </Button>
      <Button onClick={downloadCsvTemplate} style={{ marginTop: '16px' }}>
        Download CSV Template
      </Button>
    </Box>
  );
};

export default AssessmentForm;
