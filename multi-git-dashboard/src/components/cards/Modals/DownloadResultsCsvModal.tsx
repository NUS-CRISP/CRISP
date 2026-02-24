import { Button, Group, Modal, Text, TextInput } from '@mantine/core';
import { useState, useEffect } from 'react';

export interface ResultsCsvHeaders {
  studentHeader: string;
  idHeader: string;
  marksHeader: string;
}

interface DownloadResultsCsvModalProps {
  opened: boolean;
  onClose: () => void;
  defaultHeaders?: ResultsCsvHeaders;
  onDownload: (headers: ResultsCsvHeaders) => void;
}

const DownloadResultsCsvModal: React.FC<DownloadResultsCsvModalProps> = ({
  opened,
  onClose,
  defaultHeaders,
  onDownload,
}) => {
  const [studentHeader, setStudentHeader] = useState(defaultHeaders?.studentHeader ?? 'Student');
  const [idHeader, setIdHeader] = useState(defaultHeaders?.idHeader ?? 'SIS User ID');
  const [marksHeader, setMarksHeader] = useState(defaultHeaders?.marksHeader ?? 'Average Marks');

  useEffect(() => {
    if (!opened) return;
    setStudentHeader(defaultHeaders?.studentHeader ?? 'Student');
    setIdHeader(defaultHeaders?.idHeader ?? 'SIS User ID');
    setMarksHeader(defaultHeaders?.marksHeader ?? 'Average Marks');
  }, [opened, defaultHeaders]);

  return (
    <Modal opened={opened} onClose={onClose} title="Results CSV Options" centered>
      <Text size="sm">
        Provide the column headers for the results CSV. The CSV will include columns
        for student name, ID, and average marks.
      </Text>

      <Group gap="md" mt="md">
        <TextInput
          label="Student Header"
          placeholder="e.g., Student"
          value={studentHeader}
          onChange={e => setStudentHeader(e.currentTarget.value)}
        />
        <TextInput
          label="ID Header"
          placeholder="e.g., SIS User ID"
          value={idHeader}
          onChange={e => setIdHeader(e.currentTarget.value)}
        />
        <TextInput
          label="Marks Header"
          placeholder="e.g., Average Marks"
          value={marksHeader}
          onChange={e => setMarksHeader(e.currentTarget.value)}
        />
      </Group>

      <Button
        onClick={() => onDownload({ studentHeader, idHeader, marksHeader })}
        color="blue"
        mt="md"
      >
        Download CSV
      </Button>
    </Modal>
  );
};

export default DownloadResultsCsvModal;
