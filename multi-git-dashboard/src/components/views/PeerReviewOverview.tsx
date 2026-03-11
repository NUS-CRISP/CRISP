import { Tabs, Container, ScrollArea } from '@mantine/core';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview } from '@shared/types/PeerReview';
import PeerReviewInfo from './PeerReviewInfo';

interface PeerReviewOverviewProps {
  courseId: string;
  teamSets: TeamSet[];
  peerReviews: PeerReview[];
  isFaculty: boolean;
  onUpdate: () => void;
}

const PeerReviewOverview: React.FC<PeerReviewOverviewProps> = ({
  courseId,
  teamSets,
  peerReviews,
  isFaculty,
  onUpdate,
}) => {
  const defaultTab = peerReviews[0]?._id || 'default';

  return (
    <Container>
      <Tabs mt="md" defaultValue={defaultTab}>
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
            <ScrollArea
              style={{ height: 'calc(100vh - 180px)' }}
              scrollbarSize={8}
              offsetScrollbars
              pb="md"
            >
              <PeerReviewInfo
                courseId={courseId}
                teamSets={teamSets}
                peerReview={pr}
                isFaculty={isFaculty}
                onUpdate={onUpdate}
              />
            </ScrollArea>
          </Tabs.Panel>
        ))}
      </Tabs>
    </Container>
  );
};

export default PeerReviewOverview;
