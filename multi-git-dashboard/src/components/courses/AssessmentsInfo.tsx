import React, { useState } from 'react';
import AssessmentCard from './cards/AssessmentCard';
import AssessmentForm from '../forms/AssessmentForm';
import { Button, Container } from '@mantine/core';
import { Course } from '@backend/models/Course';

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
    <AssessmentCard
      key={assessment._id.toString()}
      assessmentType={assessment.assessmentType}
      markType={assessment.markType}
      frequency={assessment.frequency}
      granularity={assessment.granularity}
    />
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
          courseId={course._id.toString()}
          onAssessmentCreated={handleAssessmentCreated}
        />
      )}
    </Container>
  );
};

export default AssessmentInfo;
