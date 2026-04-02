import { Card, Group, Stack, Text, Badge } from '@mantine/core';
import { PeerReviewResultsStudentRow } from '@shared/types/PeerReviewAssessment';

const PeerReviewStudentRowCard = ({
  row,
  maxMarks,
  onViewGraders,
}: {
  row: PeerReviewResultsStudentRow;
  maxMarks: number;
  onViewGraders?: (studentId: string) => void;
}) => {
  const graded =
    row.aggregatedScore !== null && row.aggregatedScore !== undefined;

  return (
    <Card
      withBorder
      radius="md"
      style={{
        cursor: onViewGraders ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onClick={() => onViewGraders?.(row.studentId)}
      onMouseEnter={e => {
        if (onViewGraders) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        if (onViewGraders) {
          e.currentTarget.style.boxShadow = '';
          e.currentTarget.style.transform = '';
        }
      }}
    >
      <Group justify="space-between" align="center">
        <Group align="center" gap="md">
          <div
            style={{
              width: 6,
              height: 46,
              borderRadius: 8,
              backgroundColor: graded ? '#4CAF50' : 'gray',
            }}
          />
          <Stack gap={2}>
            <Text fw={650} fz="lg">
              {row.studentName}
            </Text>
            <Text fz="sm" c="dimmed">
              Team {row.teamNumber}
            </Text>
          </Stack>
        </Group>

        <Stack gap={6} align="flex-end">
          <Badge variant="light" color={graded ? 'green' : 'orange'}>
            {graded ? 'GRADED' : 'NOT YET GRADED'}
          </Badge>

          <Text fw={800} fz="xl" mr="sm">
            {graded ? row.aggregatedScore!.toFixed(2) : '-'} /{' '}
            {maxMarks.toFixed(2)}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
};

export default PeerReviewStudentRowCard;
