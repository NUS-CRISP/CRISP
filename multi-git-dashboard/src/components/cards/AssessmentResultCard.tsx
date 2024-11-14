import React from 'react';
import {
  Badge,
  Card,
  Group,
  Text,
  Grid,
  Space,
  Flex,
  Accordion,
  ThemeIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { User } from '@shared/types/User';
import { Team } from '@shared/types/Team';
import { AssessmentResult } from '@shared/types/AssessmentResults';
import { useRouter } from 'next/router';

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
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };
  const { student, team, result } = studentResult;
  const maxScoreString = maxScore ? ` / ${maxScore}` : '';

  const hasMissingSubmissions =
    result && result.marks.some(mark => !mark.submission);
  if (result?.averageScore === 8.50) {
    console.log(result.marks.filter(mark => mark.submission).length > 0);
  }

  const allSubmissionsPresent =
    result && result.marks.length > 0 && !hasMissingSubmissions;

  return (
    <Card withBorder shadow="sm" mb="md" radius="md">
      <Flex justify="space-between" align="center">
        <Group>
          <Text size="lg">{student.name}</Text>
          <Text size="sm" color="dimmed">
            ID: {student.identifier}
          </Text>
          {team && (
            <Text size="sm" color="dimmed">
              Team: {team.number}
            </Text>
          )}
        </Group>
        {result && (
          <Group align="center">
            <Badge color="green" variant="filled" size="lg">
              Avg Score: {result.averageScore.toFixed(2)}
              {maxScoreString}
            </Badge>
            <Tooltip
              label={
                allSubmissionsPresent
                  ? 'All submissions are present'
                  : 'Some submissions are missing'
              }
              withArrow
              position="top"
            >
              <ThemeIcon
                color={allSubmissionsPresent ? 'green' : 'red'}
                variant="light"
                radius="xl"
                size="lg"
                style={{ cursor: 'pointer' }}
              >
                {allSubmissionsPresent ? (
                  <IconCheck size={16} />
                ) : (
                  <IconAlertCircle size={16} />
                )}
              </ThemeIcon>
            </Tooltip>
          </Group>
        )}
      </Flex>

      <Space h="md" />

      <Accordion variant="separated" radius="md" chevronPosition="right">
        <Accordion.Item value="submissions">
          <Accordion.Control>Submissions</Accordion.Control>
          <Accordion.Panel>
            <div>
              <Text size="sm" mb="xs">
                Submitted Scores:
              </Text>
              {result &&
              result.marks.filter(mark => mark.submission).length > 0 ? (
                <Grid>
                  {result.marks
                    .filter(mark => mark.submission)
                    .map((markEntry, index) => (
                      <Grid.Col span={6} key={index}>
                        <Card shadow="xs" p="xs" radius="md" withBorder>
                          <Group justify="space-between" align="center" onClick={() => router.push(`/courses/${id}/internal-assessments/${assessmentId}/submission/${markEntry.submission!._id}`)}>
                            <Text size="sm">{markEntry.marker.name}</Text>
                            <Badge color="blue" variant="light">
                              {markEntry.score?.toFixed(2)}
                              {maxScore && maxScore > 0 ? ` / ${maxScore}` : ''}
                            </Badge>
                          </Group>
                        </Card>
                      </Grid.Col>
                    ))}
                </Grid>
              ) : (
                <Text color="dimmed">No submitted scores.</Text>
              )}
            </div>

            {hasMissingSubmissions && (
              <>
                <Space h="md" />
                <Divider />
                <Space h="md" />
              </>
            )}

            {hasMissingSubmissions && (
              <div>
                <Text size="sm" mb="xs" color="red">
                  Missing Submissions:
                </Text>
                <Grid>
                  {result!.marks
                    .filter(mark => !mark.submission)
                    .map((markEntry, index) => (
                      <Grid.Col span={6} key={index}>
                        <Card shadow="xs" p="xs" radius="md" withBorder>
                          <Group justify="space-between" align="center">
                            <Text size="sm">{markEntry.marker.name}</Text>
                            <Badge color="red" variant="filled">
                              <Group>
                                <IconAlertCircle size={14} />
                                <Text size="xs">Missing</Text>
                              </Group>
                            </Badge>
                          </Group>
                          <Text size="xs" color="dimmed" mt="xs">
                            Submission is missing from this grader.
                          </Text>
                        </Card>
                      </Grid.Col>
                    ))}
                </Grid>
              </div>
            )}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
};

export default AssessmentResultCard;
