import { Card, Text } from '@mantine/core';

interface SprintCardProps {
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
  description: string;
}

const SprintCard: React.FC<SprintCardProps> = ({
  sprintNumber,
  startDate,
  endDate,
  description,
}) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" my={6} withBorder>
      <Text size="lg">Sprint {sprintNumber}</Text>
      <Text size="sm" c="dimmed">
        Start Date: {startDate.toLocaleString()}
      </Text>
      <Text size="sm" c="dimmed">
        End Date: {endDate.toLocaleString()}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Card>
  );
};

export default SprintCard;
