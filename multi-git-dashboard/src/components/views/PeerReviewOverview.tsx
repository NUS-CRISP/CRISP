import {
  Tabs,
  Container,
  Button,
  Modal,
  Group,
} from '@mantine/core';
import PeerReviewSettingsForm from '../forms/PeerReviewSettingsForm';
import { useDisclosure } from '@mantine/hooks';
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
  const [openedCreateForm, { open: openCreateForm, close: closeCreateForm }] = useDisclosure(false);
  
  return (
    <Container>
      { hasFacultyPermission && 
        <Group>
          <Button onClick={openCreateForm}>
            Create Peer Review
          </Button>
          <Modal
            opened={openedCreateForm}
            onClose={closeCreateForm}
            title="Create Peer Review"
          >
            <PeerReviewSettingsForm
              courseId={courseId}
              peerReview={null}
              onSetUpConfirmed={() => {
                onUpdate();
                closeCreateForm();
              }}
            />
          </Modal>
        </Group>
      }
      <Tabs defaultValue={ peerReviews.length > 0 ? peerReviews[0]._id : undefined } mt="md">
        <Tabs.List
          style={{
            justifyContent: 'center',
          }}
        >
          {course && peerReviews.length > 0? (
              peerReviews.map((pr) => (
              <Tabs.Tab key={pr._id} value={pr._id}>
                {pr.title}
              </Tabs.Tab>
            ))) : null
          }
        </Tabs.List>
        
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
    </Container>
  );
};

export default PeerReviewOverview;
