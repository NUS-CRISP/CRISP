import {
  Group,
  Text,
  Select,
  Pagination,
  SegmentedControl,
} from '@mantine/core';

interface ResultsPaginationDisplayProps {
  numResultsDisplay: string;
  limit: string;
  page: number;
  totalPages: number;
  onLimitChange: (newLimit: string) => void;
  onPageChange: (newPage: number) => void;
}

const ResultsPaginationDisplay: React.FC<ResultsPaginationDisplayProps> = ({
  numResultsDisplay,
  limit,
  page,
  totalPages,
  onLimitChange,
  onPageChange,
}) => {
  return (
    <Group justify="space-between" align="center" wrap="wrap">
      <Group gap="sm" align="center">
        <Text fz="sm" c="dimmed">
          Showing {numResultsDisplay}
        </Text>
        <Select
          value={limit}
          onChange={val => onLimitChange(val || '20')}
          data={[
            { value: '10', label: '10 / page' },
            { value: '20', label: '20 / page' },
            { value: '50', label: '50 / page' },
            { value: '100', label: '100 / page' },
          ]}
          size="xs"
          w={120}
        />
      </Group>

      {totalPages > 1 && (
        <Pagination
          value={page}
          onChange={onPageChange}
          total={totalPages}
          size="md"
        />
      )}
    </Group>
  )
}

export default ResultsPaginationDisplay;
