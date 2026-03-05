import { Card, Text, Badge, Box, Group } from '@mantine/core';

interface InternalAssessmentCardProps {
  assessmentName: string;
  startDate: Date;
  endDate?: Date | null;
  description: string;
  granularity: 'individual' | 'team';
}

const InternalAssessmentCard: React.FC<InternalAssessmentCardProps> = ({
  assessmentName,
  startDate,
  endDate,
  description,
  granularity,
}) => {
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  
  const assessmentStatus = now < start
    ? 'Upcoming'
    : (end && now > end)
      ? 'Closed'
      : 'Active';
  const statusColor = assessmentStatus === 'Closed'
    ? 'red'
    : assessmentStatus === 'Active'
      ? 'green'
      : 'yellow';

  return (
    <Card shadow="sm" padding="lg" radius="md" my={6} withBorder>
      <Box>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <Text size="lg" style={{ fontWeight: 500 }}>
            {assessmentName}
          </Text>
          <Group gap="xs">
            <Badge
              color={statusColor}
            >
              {assessmentStatus}
            </Badge>
            <Badge
              color={granularity === 'team' ? 'blue' : 'green'}
              variant="light"
            >
              {granularity === 'team' ? 'Team' : 'Individual'}
            </Badge>
          </Group>
        </div>

        <Text size="sm" color="dimmed" style={{ marginBottom: '8px' }}>
          {formatDate(startDate)} {endDate ? `- ${formatDate(endDate)}` : ' ~'}
        </Text>

        <Text
          size="sm"
          color="dimmed"
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '8px',
          }}
        >
          {description}
        </Text>
      </Box>
    </Card>
  );
};

export default InternalAssessmentCard;
