import { Button, Container, Modal } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import SprintCard from '../cards/SprintCard';
import SprintForm from '../forms/SprintForm';
import { hasFacultyPermission } from '@/lib/utils';

interface SprintsInfoProps {
  course: Course;
  onUpdate: () => void;
}

const SprintsInfo: React.FC<SprintsInfoProps> = ({ course, onUpdate }) => {
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);

  const { data: session } = useSession();

  const sprintCards = course.sprints.map(sprint => (
    <SprintCard
      key={sprint.number}
      sprintNumber={sprint.number}
      startDate={sprint.startDate}
      endDate={sprint.endDate}
      description={sprint.description}
    />
  ));

  const toggleForm = () => {
    setIsCreatingSprint(o => !o);
  };

  const handleSprintCreated = () => {
    setIsCreatingSprint(false);
    onUpdate();
  };

  return (
    <Container>
      {hasFacultyPermission(session) && (
        <Button
          onClick={toggleForm}
          style={{ marginTop: '16px', marginBottom: '16px' }}
        >
          Create Sprint
        </Button>
      )}
      <Modal
        opened={isCreatingSprint}
        onClose={toggleForm}
        title="Create Sprint"
      >
        <SprintForm
          courseId={course._id.toString()}
          onSprintCreated={handleSprintCreated}
        />
      </Modal>
      {sprintCards}
    </Container>
  );
};

export default SprintsInfo;
