import {
  Button,
  Container,
  Divider,
  Group,
  Modal,
  Space,
  Text,
} from '@mantine/core';
import { Milestone, Sprint } from '@shared/types/Course';
import { useState } from 'react';
import MilestoneCard from '../cards/MilestoneCard';
import MilestoneForm from '../forms/MilestoneForm';
import SprintCard from '../cards/SprintCard';
import SprintForm from '../forms/SprintForm';

interface TimelineInfoProps {
  courseId: string;
  milestones: Milestone[];
  sprints: Sprint[];
  hasFacultyPermission: boolean;
  onUpdate: () => void;
}

const TimelineInfo: React.FC<TimelineInfoProps> = ({
  courseId,
  milestones,
  sprints,
  hasFacultyPermission,
  onUpdate,
}) => {
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);

  const milestoneCards = milestones.map(milestone => (
    <MilestoneCard
      key={milestone.number}
      number={milestone.number}
      dateline={milestone.dateline}
      description={milestone.description}
    />
  ));

  const sprintCards = sprints.map(sprint => (
    <SprintCard
      key={sprint.number}
      sprintNumber={sprint.number}
      startDate={sprint.startDate}
      endDate={sprint.endDate}
      description={sprint.description}
    />
  ));

  const toggleMilestoneForm = () => {
    setIsCreatingMilestone(o => !o);
  };

  const toggleSprintForm = () => {
    setIsCreatingSprint(o => !o);
  };

  const handleUpdate = () => {
    setIsCreatingMilestone(false);
    setIsCreatingSprint(false);
    onUpdate();
  };

  return (
    <Container>
      {hasFacultyPermission && (
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
          <Button onClick={toggleMilestoneForm}>Create Milestone</Button>
          <Button onClick={toggleSprintForm}>Create Sprint</Button>
        </Group>
      )}
      <Modal
        opened={isCreatingMilestone}
        onClose={toggleMilestoneForm}
        title="Create Milestone"
      >
        <MilestoneForm
          courseId={courseId.toString()}
          onMilestoneCreated={handleUpdate}
        />
      </Modal>
      <Modal
        opened={isCreatingSprint}
        onClose={toggleSprintForm}
        title="Create Sprint"
      >
        <SprintForm
          courseId={courseId.toString()}
          onSprintCreated={handleUpdate}
        />
      </Modal>
      <Divider label="Milestones" size="lg" />
      {milestoneCards.length > 0 ? milestoneCards : <Text>No Milestones</Text>}
      <Space h="md" />
      <Divider label="Sprints" size="lg" />
      {sprintCards.length > 0 ? sprintCards : <Text>No Sprints</Text>}
    </Container>
  );
};

export default TimelineInfo;
