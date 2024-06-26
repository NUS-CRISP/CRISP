import { Card, Text } from '@mantine/core';

interface MilestoneCardProps {
  number: number;
  dateline: Date;
  description: string;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  number: milestoneNumber,
  dateline,
  description,
}) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" my={6} withBorder>
      <Text size="lg">Milestone {milestoneNumber}</Text>
      <Text size="sm" c="dimmed">
        Dateline: {dateline.toLocaleString()}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Card>
  );
};

export default MilestoneCard;
