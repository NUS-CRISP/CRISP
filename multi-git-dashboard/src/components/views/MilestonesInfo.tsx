import { hasFacultyPermission } from '@/lib/auth/utils';
import { Button, Container, Modal } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { useState } from 'react';
import MilestoneCard from '../cards/MilestoneCard';
import MilestoneForm from '../forms/MilestoneForm';

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

  const toggleForm = () => {
    setIsCreatingMilestone(o => !o);
  };

  const handleMilestoneCreated = () => {
    setIsCreatingMilestone(false);
    onUpdate();
  };

  return (
    <Container>
      {hasFacultyPermission() && (
        <Button onClick={toggleForm} my={16}>
          Create Milestone
        </Button>
      )}
      <Modal
        opened={isCreatingMilestone}
        onClose={toggleForm}
        title="Create Milestone"
      >
        <MilestoneForm
          courseId={course._id.toString()}
          onMilestoneCreated={handleMilestoneCreated}
        />
      </Modal>
      {milestoneCards}
    </Container>
  );
};

export default MilestonesInfo;
