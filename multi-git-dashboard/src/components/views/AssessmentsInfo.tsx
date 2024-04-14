import { hasFacultyPermission } from '@/lib/auth/utils';
import { Button, Center, Container, Group, Modal, Text } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import Link from 'next/link';
import { useState } from 'react';
import AssessmentCard from '../cards/AssessmentCard';
import AssessmentForm from '../forms/AssessmentForm';

interface AssessmentInfoProps {
  courseId: string;
  assessments: Assessment[];
  teamSetNames: string[];
  onUpdate: () => void;
}

const AssessmentInfo: React.FC<AssessmentInfoProps> = ({
  courseId,
  assessments,
  teamSetNames,
  onUpdate,
}) => {
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);

  const assessmentCards = assessments.map(assessment => (
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
  ));

  const toggleForm = () => {
    setIsCreatingAssessment(o => !o);
  };

  const handleAssessmentCreated = () => {
    setIsCreatingAssessment(false);
    onUpdate();
  };

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
        <AssessmentForm
          teamSetNames={teamSetNames}
          courseId={courseId}
          onAssessmentCreated={handleAssessmentCreated}
        />
      </Modal>
      {assessmentCards.length > 0 ? (
        assessmentCards
      ) : (
        <Center>
          <Text>No Assessments</Text>
        </Center>
      )}
    </Container>
  );
};

export default AssessmentInfo;
