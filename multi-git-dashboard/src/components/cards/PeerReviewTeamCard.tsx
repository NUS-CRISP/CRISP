import { Card, Group, Stack, Text, Badge } from '@mantine/core';
import { PeerReviewResultsTeamCard } from '@shared/types/PeerReviewAssessment';

const formatScore = (v: number | null | undefined) => {
  if (v === null || v === undefined) return 'Not yet graded';
  return Number.isFinite(v) ? v.toFixed(2) : '—';
};

const PeerReviewTeamCard = ({ team }: { team: PeerReviewResultsTeamCard }) => (
  <Card withBorder radius="md" p="md">
    <Group justify="space-between" align="flex-start" mb="xs">
      <Stack gap={2}>
        <Text fw={700}>Team {team.teamNumber}</Text>
        <Text fz="sm" c="dimmed">
          Members: {team.members.length}
        </Text>
      </Stack>

      <Stack gap={6} align="flex-end">
        <Badge variant="light">
          {team.teamAggregatedScore === null ? 'Not yet graded' : 'Graded'}
        </Badge>
        <Text fw={800}>{formatScore(team.teamAggregatedScore)}</Text>
      </Stack>
    </Group>

    <Stack gap={6}>
      {team.members.map(m => (
        <Group key={m.studentId} justify="space-between">
          <Text fz="sm">
            {m.studentName}
          </Text>
          <Text fz="sm" fw={600}>
            {formatScore(m.aggregatedScore)}
          </Text>
        </Group>
      ))}
    </Stack>
  </Card>
);

export default PeerReviewTeamCard;
