import React from 'react';
import MilestoneCard from './MilestoneCard';
import { Course } from '../../types/course';

interface MilestonesInfoProps {
  course: Course;
}

const MilestonesInfo: React.FC<MilestonesInfoProps> = ({ course }) => {
  const milestoneCards = course.milestones.map((milestone) => (
    <MilestoneCard
      key={milestone.milestoneNumber}
      milestoneNumber={milestone.milestoneNumber}
      dateline={milestone.dateline}
      description={milestone.description}
    />
  ));

  return <div>{milestoneCards}</div>;
};

export default MilestonesInfo;