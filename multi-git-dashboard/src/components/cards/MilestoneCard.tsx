import React from 'react';
import { Card, Text } from '@mantine/core';

interface MilestoneCardProps {
  milestoneNumber: number;
  dateline: Date;
  description: string;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestoneNumber,
  dateline,
  description,
}) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text size="lg">Milestone {milestoneNumber}</Text>
      <Text size="sm" c="dimmed">
        Dateline: {dateline.toLocaleDateString()}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Card>
  );
};

export default MilestoneCard;
