import { Card, Text, Badge, Box } from '@mantine/core';

interface InternalAssessmentCardProps {
  assessmentName: string;
  startDate: Date;
  endDate?: Date | null;
  description: string;
  granularity: 'individual' | 'team';
  gradedBy?: string | null;
}

const InternalAssessmentCard: React.FC<InternalAssessmentCardProps> = ({
  assessmentName,
  startDate,
  endDate,
  description,
  granularity,
  gradedBy,
}) => {
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" my={6} withBorder>
      <Box>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Text size="lg" style={{ fontWeight: 500 }}>
            {assessmentName}
          </Text>
          <Badge color={granularity === 'team' ? 'blue' : 'green'} variant="filled">
            {granularity === 'team' ? 'Team' : 'Individual'}
          </Badge>
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

        {gradedBy && (
          <Text size="sm" color="dimmed">
            Graded by: {gradedBy}
          </Text>
        )}
      </Box>
    </Card>
  );
};

export default InternalAssessmentCard;
