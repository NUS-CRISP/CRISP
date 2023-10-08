import React from 'react';
import { Card, Text } from '@mantine/core';

interface AssessmentCardProps {
  assessmentType: string;
  markType: string;
  frequency: string;
  granularity: 'individual' | 'team';
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessmentType,
  markType,
  frequency,
  granularity,
}) => {
  return (
    <Card shadow="xs" padding="md" style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text weight={500} size="xl">
          Assessment: {assessmentType}
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
      </div>
    </Card>
  );
};

export default AssessmentCard;
