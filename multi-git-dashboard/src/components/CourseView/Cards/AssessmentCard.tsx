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
    <Card shadow="xs" padding="md" style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text size="xl">Assessment: {assessmentType}</Text>
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
      </div>
    </Card>
  );
};

export default AssessmentCard;
