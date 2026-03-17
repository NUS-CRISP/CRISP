import { Button, Group, Modal, Text, TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';

export interface MapResultsConfig {
  idHeader: string;
  resultHeader: string;
}

interface MapResultsToIdModalProps {
  opened: boolean;
  onClose: () => void;
  defaultConfig?: MapResultsConfig;
  onMap: (file: File, config: MapResultsConfig) => void;
}

const MapResultsToIdModal: React.FC<MapResultsToIdModalProps> = ({
  opened,
  onClose,
  defaultConfig,
  onMap,
}) => {
  const [idHeader, setIdHeader] = useState(
    defaultConfig?.idHeader ?? 'SIS User ID'
  );
  const [resultHeader, setResultHeader] = useState(
    defaultConfig?.resultHeader ?? 'Result'
  );
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!opened) return;
    setIdHeader(defaultConfig?.idHeader ?? 'SIS User ID');
    setResultHeader(defaultConfig?.resultHeader ?? 'Result');
    setFile(null);
  }, [opened, defaultConfig]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Map Results to CSV"
      centered
    >
      <Text size="sm">
        Upload a CSV file that includes a column with student IDs. Specify the
        column header (e.g., "SIS User ID") and the header for the new results
        column (e.g., "Result").
      </Text>

      <Group gap="md" mt="md">
        <TextInput
          label="CSV ID Column Header"
          placeholder="e.g., SIS User ID"
          value={idHeader}
          onChange={e => setIdHeader(e.currentTarget.value)}
        />
        <TextInput
          label="New Results Column Header"
          placeholder="e.g., Result"
          value={resultHeader}
          onChange={e => setResultHeader(e.currentTarget.value)}
        />
        <TextInput
          type="file"
          label="Select CSV File"
          placeholder="Choose CSV file"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(e: any) => {
            if (e.target.files?.length > 0) setFile(e.target.files[0]);
          }}
        />
      </Group>

      <Button
        onClick={() => {
          if (!file) return alert('Please select a CSV file.');
          onMap(file, { idHeader, resultHeader });
        }}
        color="blue"
        mt="md"
      >
        Map CSV
      </Button>
    </Modal>
  );
};

export default MapResultsToIdModal;
