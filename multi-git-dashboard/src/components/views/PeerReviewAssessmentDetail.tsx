import {
  Text,
  Card,
  Stack,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { formatDate } from '../../lib/utils';

interface PeerReviewAssessmentDetailProps {
  assessment: InternalAssessment;
}

const PeerReviewAssessmentDetail: React.FC<PeerReviewAssessmentDetailProps> = ({ assessment }) => {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="xs">
        <Text fw={600} fz="sm">
          Assessment Details
        </Text>
        <Divider />

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Stack gap={2}>
            <Text fz="xs" c="dimmed">
              Max Marks
            </Text>
            <Text fz="sm">{assessment.maxMarks}</Text>

            <Text fz="xs" c="dimmed" mt="sm">
              Scale to max marks
            </Text>
            <Text fz="sm">{assessment.scaleToMaxMarks ? 'Yes' : 'No'}</Text>
          </Stack>

          <Stack gap={2}>
            <Text fz="xs" c="dimmed">
              Assessment Start
            </Text>
            <Text fz="sm">{formatDate(assessment.startDate)}</Text>

            <Text fz="xs" c="dimmed" mt="sm">
              Assessment End
            </Text>
            <Text fz="sm">{formatDate(assessment.endDate)}</Text>
          </Stack>

          <Stack gap={2}>
            <Text fz="xs" c="dimmed">
              Release Status
            </Text>
            <Text fz="sm">{assessment.isReleased ? 'Released' : 'Not released'}</Text>

            <Text fz="xs" c="dimmed" mt="sm">
              Release Number
            </Text>
            <Text fz="sm">{assessment.releaseNumber}</Text>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Card>
  )
}

export default PeerReviewAssessmentDetail;
