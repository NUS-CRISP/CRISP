import React from 'react';
import { Card, Group, Text, Badge } from '@mantine/core';
import { User } from '@shared/types/User';
import { AssessmentResult } from '@shared/types/AssessmentResults';
import { Team } from '@shared/types/Team';

interface StudentResult {
  student: User;
  assignedTAIds: string[];
  team?: Team | null;
  result?: AssessmentResult;
}

interface AssessmentResultCardProps {
  studentResult: StudentResult;
}

const AssessmentResultCard: React.FC<AssessmentResultCardProps> = ({
  studentResult,
}) => {
  const { student, team, result } = studentResult;

  return (
    <Card withBorder shadow="sm" mb="sm">
      <Group justify='space-between'>
        <div>
          <Text>{student.name}</Text>
          <Text size="sm" c="dimmed">
            Student ID: {student.identifier}
          </Text>
          {team && (
            <Text size="sm" color="dimmed">
              Team: {team.number}
            </Text>
          )}
        </div>
      </Group>

      {/* Display marks */}
      <Group mt="md">
        {result && result.marks.length > 0 ? (
          result.marks.map((markEntry, index) => (
            <Badge key={index} color="teal">
              Score: {markEntry.score}
            </Badge>
          ))
        ) : (
          <Text color="dimmed">No marks yet</Text>
        )}
      </Group>
    </Card>
  );
};

export default AssessmentResultCard;
