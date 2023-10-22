import React from 'react';
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
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text size="lg" weight={500}>
        Milestone {milestoneNumber}
      </Text>
      <Text size="sm" color="dimmed">
        Dateline: {dateline.toLocaleDateString()}
      </Text>
      <Text size="sm" color="dimmed">
        {description}
      </Text>
    </Card>
  );
};

export default MilestoneCard;
