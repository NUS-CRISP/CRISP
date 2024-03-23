import { Card, Text } from '@mantine/core';

interface AssessmentCardProps {
  assessmentType: string;
  markType: string;
  teamSetName: string | null;
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessmentType,
  markType,
  teamSetName,
}) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" my={6} withBorder>
      <Text size="lg">{assessmentType}</Text>
      <Text size="sm" c="dimmed">
        Mark Type: {markType}
      </Text>
      <Text size="sm" c="dimmed">
        Team Set: {teamSetName}
      </Text>
    </Card>
  );
};

export default AssessmentCard;
