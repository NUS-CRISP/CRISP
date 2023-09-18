import React from 'react';
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
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text size="lg" weight={500}>
        Sprint {sprintNumber}
      </Text>
      <Text size="sm" color="dimmed">
        Start Date: {startDate.toLocaleDateString()}
      </Text>
      <Text size="sm" color="dimmed">
        End Date: {endDate.toLocaleDateString()}
      </Text>
      <Text size="sm">{description}</Text>
    </Card>
  );
};

export default SprintCard;
