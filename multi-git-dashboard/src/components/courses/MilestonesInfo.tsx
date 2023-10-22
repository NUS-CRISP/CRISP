import React, { useState } from 'react';
import MilestoneCard from './cards/MilestoneCard';
import MilestoneForm from '../forms/MilestoneForm';
import { Button, Container } from '@mantine/core';
import { Course } from '@backend/models/Course';

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
      key={milestone.number}
      number={milestone.number}
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
          courseId={course._id.toString()}
          onMilestoneCreated={handleMilestoneCreated}
        />
      )}
    </Container>
  );
};

export default MilestonesInfo;
