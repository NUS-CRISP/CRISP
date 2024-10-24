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
  maxScore?: number;
}

const AssessmentResultCard: React.FC<AssessmentResultCardProps> = ({
  studentResult,
  maxScore,
}) => {
  const { student, team, result } = studentResult;
  const maxScoreString = ` / ${maxScore}`;

  return (
    <Card withBorder shadow="sm" mb="sm">
      <Group justify='space-between' flex='row'>
        <Group>
          <Text>{student.name}</Text>
          <Text size="sm" c="dimmed">
            Student ID: {student.identifier}
          </Text>
          {team && (
            <Text size="sm" c="dimmed">
              Team: {team.number}
            </Text>
          )}
        </Group>
        <Badge key={student._id} color="teal">
          Average Score: {result?.averageScore.toPrecision(3)}{maxScoreString}
        </Badge>
      </Group>

      {/* Display marks */}
      <Group mt="md">
        <Text>Submitted Scores:</Text>
        {result && result.marks.length > 0 ? (
          result.marks.map((markEntry, index) => (
            <Badge key={index} color="teal">
              Score: {markEntry.score.toPrecision(3)}{maxScoreString} by {markEntry.marker.name}
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
