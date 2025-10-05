import {
  Tabs,
} from '@mantine/core';
import PeerReviewSettingsForm from '../forms/PeerReviewSettingsForm';
import TutorialPopover from '../tutorial/TutorialPopover';
import { useState } from 'react';
import { TeamSet } from '@shared/types/TeamSet';
import { Course } from '@shared/types/Course';
import { PeerReview } from '@shared/types/PeerReview';
import PeerReviewInfo from './PeerReviewInfo';

interface PeerReviewOverviewProps {
  course: Course | undefined;
  courseId: string;
  teamSets: TeamSet[];
  peerReviews: PeerReview[];
  hasFacultyPermission: boolean;
  onUpdate: () => void;
}

const PeerReviewOverview: React.FC<PeerReviewOverviewProps> = ({
  course,
  courseId,
  teamSets,
  peerReviews,
  hasFacultyPermission,
  onUpdate,
}) => {
  
  return (
    <Tabs
      defaultValue={
        hasFacultyPermission
          ? "createPeerReview"
          : peerReviews.length > 0
          ? peerReviews[0]._id
          : undefined
      }
    >
      <Tabs.List
        style={{
          justifyContent: 'center',
        }}
      >
        {hasFacultyPermission && (
          <Tabs.Tab value="createPeerReview">Create Peer Review</Tabs.Tab>
        )}
        {course && peerReviews.length > 0? (
            peerReviews.map((pr) => (
            <Tabs.Tab key={pr._id} value={pr._id}>
              {pr.title}
            </Tabs.Tab>
          ))) : null
        }
      </Tabs.List>

      <Tabs.Panel value="createPeerReview" pt="xs">
        <PeerReviewSettingsForm
          courseId={courseId}
          peerReview={null}
          onSetUpConfirmed={onUpdate}
        />
      </Tabs.Panel>
      
      { peerReviews.map((pr) => (
        <Tabs.Panel key={pr._id} value={pr._id} pt="xs">
          <PeerReviewInfo
            courseId={courseId}
            teamSets={teamSets}
            peerReview={pr}
            hasFacultyPermission={hasFacultyPermission}
            onUpdate={onUpdate}
          />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
};

export default PeerReviewOverview;
