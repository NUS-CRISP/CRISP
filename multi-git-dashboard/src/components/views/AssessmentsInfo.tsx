import { hasFacultyPermission } from '@/lib/auth/utils';
import {
  Button,
  Center,
  Container,
  Group,
  Modal,
  Text,
  Tabs,
} from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import Link from 'next/link';
import { useState } from 'react';
import AssessmentCard from '../cards/AssessmentCard';
import CreateAssessmentForm from '../forms/CreateAssessmentForm';
import InternalAssessmentCard from '../cards/InternalAssessmentCard';

interface AssessmentInfoProps {
  courseId: string;
  assessments: Assessment[];
  internalAssessments: InternalAssessment[];
  teamSetNames: string[];
  onUpdate: () => void;
}

const AssessmentInfo: React.FC<AssessmentInfoProps> = ({
  courseId,
  assessments,
  internalAssessments,
  teamSetNames,
  onUpdate,
}) => {
  console.log(internalAssessments);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);

  const toggleForm = () => {
    setIsCreatingAssessment(o => !o);
  };

  const handleAssessmentCreated = () => {
    setIsCreatingAssessment(false);
    onUpdate();
  };

  const assessmentCards = !(assessments === undefined || assessments === null)
    ? assessments.map(assessment => (
        <Link
          key={assessment._id}
          style={{ textDecoration: 'none' }}
          href={`/courses/${courseId}/assessments/${assessment._id}`}
          passHref
        >
          <AssessmentCard
            key={assessment._id}
            assessmentType={assessment.assessmentType}
            markType={assessment.markType}
            teamSetName={assessment.teamSet ? assessment.teamSet.name : null}
          />
        </Link>
      ))
    : [];

  const internalAssessmentCards = !(
    internalAssessments === undefined || internalAssessments === null
  )
    ? internalAssessments.map(assessment => (
        <Link
          key={assessment._id}
          style={{ textDecoration: 'none' }}
          href={`/courses/${courseId}/internal-assessments/${assessment._id}`}
          passHref
        >
          <InternalAssessmentCard
            key={assessment._id}
            assessmentName={assessment.assessmentName}
            startDate={assessment.startDate}
            endDate={assessment.endDate}
            description={assessment.description}
            granularity={assessment.granularity}
          />
        </Link>
      ))
    : [];

  return (
    <Container>
      {hasFacultyPermission() && (
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
          <Button onClick={toggleForm}>Create Assessment</Button>
        </Group>
      )}
      <Modal
        opened={isCreatingAssessment}
        onClose={toggleForm}
        title="Create Assessment"
      >
        <CreateAssessmentForm
          teamSetNames={teamSetNames}
          courseId={courseId}
          onAssessmentCreated={handleAssessmentCreated}
        />
      </Modal>

      <Tabs defaultValue="internalAssessments">
        <Tabs.List>
          <Tabs.Tab value="assessments">Assessments</Tabs.Tab>
          <Tabs.Tab value="internalAssessments">Internal Assessments</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="assessments" pt="xs">
          {assessmentCards.length > 0 ? (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {assessmentCards}
            </div>
          ) : (
            <Center>
              <Text>No Assessments</Text>
            </Center>
          )}
        </Tabs.Panel>

        {/* Tab Panel for Internal Assessments */}
        <Tabs.Panel value="internalAssessments" pt="xs">
          {internalAssessmentCards.length > 0 ? (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {internalAssessmentCards}
            </div>
          ) : (
            <Center>
              <Text>No Internal Assessments</Text>
            </Center>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default AssessmentInfo;
