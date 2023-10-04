import React, { useState } from 'react';
import SprintCard from './Cards/SprintCard';
import { Course } from '../../types/course';
import SprintForm from '../forms/SprintForm';
import { Button, Container } from '@mantine/core';

interface SprintsInfoProps {
  course: Course;
  onUpdate: () => void;
}

const SprintsInfo: React.FC<SprintsInfoProps> = ({ course, onUpdate }) => {
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);

  const sprintCards = course.sprints.map((sprint) => (
    <SprintCard
      key={sprint.sprintNumber}
      sprintNumber={sprint.sprintNumber}
      startDate={sprint.startDate}
      endDate={sprint.endDate}
      description={sprint.description}
    />
  ));

  const handleSprintCreated = () => {
    setIsCreatingSprint(false);
    onUpdate();
  };

  return (
    <Container>
      {sprintCards}
      <Button onClick={() => setIsCreatingSprint(!isCreatingSprint)} style={{ marginTop: '16px' }}>
        {isCreatingSprint ? 'Cancel' : 'Create Sprint'}
      </Button>
      {isCreatingSprint &&
        <SprintForm
          courseId={course._id}
          onSprintCreated={handleSprintCreated}
        />
      }
    </Container>
  );
};

export default SprintsInfo;
