import { Button, Container, Modal } from '@mantine/core';
import { Course } from '@shared/types/Course';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
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

  const { data: session } = useSession();
  const userRole = session?.user?.role;

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

  const hasPermission = ['admin', 'Faculty member'].includes(userRole);

  return (
    <Container>
      {hasPermission && (
        <Button
          onClick={toggleForm}
          style={{ marginTop: '16px', marginBottom: '16px' }}
        >
          Create Assessment
        </Button>
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
