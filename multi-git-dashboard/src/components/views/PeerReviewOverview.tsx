import { Tabs, Container, Button, Modal, Group } from '@mantine/core';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview } from '@shared/types/PeerReview';
import PeerReviewInfo from './PeerReviewInfo';

interface PeerReviewOverviewProps {
  courseId: string;
  teamSets: TeamSet[];
  peerReviews: PeerReview[];
  hasFacultyPermission: boolean;
  onUpdate: () => void;
}

const PeerReviewOverview: React.FC<PeerReviewOverviewProps> = ({
  courseId,
  teamSets,
  peerReviews,
  hasFacultyPermission,
  onUpdate,
}) => {
  return (
    <Container>
      <Tabs mt="md">
        <Tabs.List
          style={{
            justifyContent: 'center',
          }}
        >
          {courseId && peerReviews.length > 0 ? (
            peerReviews.map(pr => (
              <Tabs.Tab key={pr._id} value={pr._id}>
                {pr.title}
              </Tabs.Tab>
            ))
          ) : (
            <Tabs.Tab key={'default'} value={'default'}>
              No Peer Reviews Available
            </Tabs.Tab>
          )}
        </Tabs.List>

        {peerReviews.map(pr => (
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
    </Container>
  );
};

export default PeerReviewOverview;
