import React from 'react';
import { Card, Text } from '@mantine/core';

interface AssessmentCardProps {
  assessmentType: string;
  markType: string;
  frequency: string;
  granularity: 'individual' | 'team';
  teamSetName: string | null;
  formLink: string | null;
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessmentType,
  markType,
  frequency,
  granularity,
  teamSetName,
  formLink,
}) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text size="lg">{assessmentType}</Text>
      <Text size="sm" c="dimmed">
        Mark Type: {markType}
      </Text>
      <Text size="sm" c="dimmed">
        Frequency: {frequency}
      </Text>
      <Text size="sm" c="dimmed">
        Granularity: {granularity}
      </Text>
      <Text size="sm" c="dimmed">
        Team Set: {teamSetName}
      </Text>
      <Text size="sm" c="dimmed">
        Form Link: {formLink}
      </Text>
    </Card>
  );
};

export default AssessmentCard;
