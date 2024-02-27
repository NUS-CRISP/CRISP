import { hasFacultyPermission } from '@/lib/auth/utils';
import { Button, Container, Group, Modal } from '@mantine/core';
import { Course } from '@shared/types/Course';
import Link from 'next/link';
import { useState } from 'react';
import AssessmentCard from '../cards/AssessmentCard';
import AssessmentForm from '../forms/AssessmentForm';

interface AssessmentInfoProps {
  course: Course;
  onUpdate: () => void;
}

const AssessmentInfo: React.FC<AssessmentInfoProps> = ({
  course,
  onUpdate,
}) => {
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);

  const assessmentCards = course.assessments.map(assessment => (
    <Link
      key={assessment._id}
      style={{ textDecoration: 'none' }}
      href={`/courses/${course._id}/assessments/${assessment._id}`}
      passHref
    >
      <AssessmentCard
        key={assessment._id}
        assessmentType={assessment.assessmentType}
        markType={assessment.markType}
        frequency={assessment.frequency}
        granularity={assessment.granularity}
        teamSetName={assessment.teamSet ? assessment.teamSet.name : null}
        formLink={assessment.formLink}
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
          teamSets={course.teamSets}
          courseId={course._id.toString()}
          onAssessmentCreated={handleAssessmentCreated}
        />
      </Modal>
      {assessmentCards}
    </Container>
  );
};

export default AssessmentInfo;
