import React, { useState } from 'react';
import MilestoneCard from '../CourseView/Cards/MilestoneCard';
import { Course } from '../../types/course';
import MilestoneForm from '../forms/MilestoneForm';
import { Button, Container } from '@mantine/core';

interface MilestonesInfoProps {
  course: Course;
  onUpdate: () => void;
}

const MilestonesInfo: React.FC<MilestonesInfoProps> = ({
  course,
  onUpdate,
}) => {
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);

  const milestoneCards = course.milestones.map(milestone => (
    <MilestoneCard
      key={milestone.milestoneNumber}
      milestoneNumber={milestone.milestoneNumber}
      dateline={milestone.dateline}
      description={milestone.description}
    />
  ));

  const handleMilestoneCreated = () => {
    setIsCreatingMilestone(false);
    onUpdate();
  };

  return (
    <Container>
      {milestoneCards}
      <Button
        onClick={() => setIsCreatingMilestone(!isCreatingMilestone)}
        style={{ marginTop: '16px' }}
      >
        {isCreatingMilestone ? 'Cancel' : 'Create Milestone'}
      </Button>
      {isCreatingMilestone && (
        <MilestoneForm
          courseId={course._id}
          onMilestoneCreated={handleMilestoneCreated}
        />
      )}
    </Container>
  );
};

export default MilestonesInfo;
