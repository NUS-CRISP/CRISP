import React from 'react';
import { Card, Text } from '@mantine/core';

interface AssessmentCardProps {
  assessmentType: string;
  markType: string;
  frequency: string;
  granularity: 'individual' | 'team';
  teamSetName: string | null;
  formLink: string;
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({ assessmentType, markType, frequency, granularity, teamSetName, formLink }) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text size="lg" weight={500}>
        {assessmentType}
      </Text>
      <Text size="sm" color="dimmed">
        Mark Type: {markType}
      </Text>
      <Text size="sm" color="dimmed">
        Frequency: {frequency}
      </Text>
      <Text size="sm" color="dimmed">
        Granularity: {granularity}
      </Text>
      { teamSetName && 
      <Text size="sm" color="dimmed">
        Team Set: {teamSetName}
      </Text>
      }
      <Text size="sm" color="dimmed">
        Form Link: {formLink}
      </Text>
    </Card>
  );
};

export default AssessmentCard;
