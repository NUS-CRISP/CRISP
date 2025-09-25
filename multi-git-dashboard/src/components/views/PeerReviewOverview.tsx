import { hasFacultyPermission } from '@/lib/auth/utils';
import {
  Button,
  Center,
  Container,
  Group,
  Modal,
  Text,
  Tabs,
} from '@mantine/core';
import Link from 'next/link';
import PeerReviewSettingsForm from '../forms/PeerReviewSettingsForm';
import TutorialPopover from '../tutorial/TutorialPopover';
import { useState } from 'react';
import { DateUtils } from '@/lib/utils';
import { TeamSet } from '@shared/types/TeamSet';
import { Course } from '@shared/types/Course';
import { PeerReview } from '@shared/types/PeerReview';
import PeerReviewInfo from './PeerReviewInfo';

interface PeerReviewOverviewProps {
  course: Course | undefined;
  courseId: string;
  dateUtils: DateUtils | undefined;
  teamSets: TeamSet[];
  peerReviews: PeerReview[];
  hasFacultyPermission: boolean;
  onUpdate: () => void;
}

const PeerReviewOverview: React.FC<PeerReviewOverviewProps> = ({
  course,
  courseId,
  dateUtils,
  teamSets,
  peerReviews,
  hasFacultyPermission,
  onUpdate,
}) => {
  
  return (
    <Tabs defaultValue={hasFacultyPermission ? "createPeerReview" : "peerReviews"}>
      <Tabs.List
        style={{
          justifyContent: 'center',
        }}
      >
        {hasFacultyPermission && (
          <Tabs.Tab value="createPeerReview">Create Peer Review</Tabs.Tab>
        )}
        {course && dateUtils && peerReviews.length > 0? (
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
          peerReviewId={null}
          onSetUpConfirmed={onUpdate}
        />
      </Tabs.Panel>
      
      { peerReviews.map((pr) => (
        <Tabs.Panel key={pr._id} value={pr._id} pt="xs">
          <PeerReviewInfo
            courseId={courseId}
            teamSets={teamSets}
            dateUtils={dateUtils!}
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
