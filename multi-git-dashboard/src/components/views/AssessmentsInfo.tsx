import { Button, Container } from '@mantine/core';
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

  const handleAssessmentCreated = () => {
    setIsCreatingAssessment(false);
    onUpdate();
  };

  return (
    <Container>
      {assessmentCards}
      <Button
        onClick={() => setIsCreatingAssessment(!isCreatingAssessment)}
        style={{ marginTop: '16px' }}
      >
        {isCreatingAssessment ? 'Cancel' : 'Create Assessment'}
      </Button>
      {isCreatingAssessment && (
        <AssessmentForm
          teamSets={course.teamSets}
          courseId={course._id.toString()}
          onAssessmentCreated={handleAssessmentCreated}
        />
      )}
    </Container>
  );
};

export default AssessmentInfo;
