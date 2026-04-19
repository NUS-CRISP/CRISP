import {
  Tabs,
  Container,
  ScrollArea,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview } from '@shared/types/PeerReview';
import PeerReviewInfo from './PeerReviewInfo';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { IconPlus } from '@tabler/icons-react';

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
  const router = useRouter();
  const defaultTab = peerReviews[0]?._id || 'default';
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const handledRequestedTabRef = useRef<string | null>(null);
  const requestedPeerReviewTab =
    typeof router.query.peerReviewId === 'string'
      ? router.query.peerReviewId
      : null;

  useEffect(() => {
    // Priority: explicit tab from navigation query > current valid tab > saved tab > default
    if (
      requestedPeerReviewTab &&
      handledRequestedTabRef.current !== requestedPeerReviewTab
    ) {
      if (peerReviews.length === 0) {
        return;
      }

      const requestedExists = peerReviews.some(
        pr => pr._id === requestedPeerReviewTab
      );
      if (requestedExists) {
        handledRequestedTabRef.current = requestedPeerReviewTab;
        setActiveTab(requestedPeerReviewTab);
        localStorage.setItem(
          `activePeerReviewTab_${courseId}`,
          requestedPeerReviewTab
        );
        return;
      }

      // Query tab does not exist in loaded data; mark as handled and fall back below
      handledRequestedTabRef.current = requestedPeerReviewTab;
    }

    if (activeTab && peerReviews.some(pr => pr._id === activeTab)) {
      return;
    }

    const savedTab = localStorage.getItem(`activePeerReviewTab_${courseId}`);
    if (savedTab && peerReviews.some(pr => pr._id === savedTab)) {
      setActiveTab(savedTab);
    } else {
      setActiveTab(defaultTab);
    }
  }, [courseId, defaultTab, peerReviews, requestedPeerReviewTab, activeTab]);

  const handleTabChange = (tabValue: string | null) => {
    if (tabValue) {
      setActiveTab(tabValue);
      localStorage.setItem(`activePeerReviewTab_${courseId}`, tabValue);
    }
  };

  const goToCreatePeerReviewAssessment = () => {
    router.push({
      pathname: `/courses/${courseId}/assessments`,
      query: {
        openCreateAssessment: '1',
        createAssessmentTab: 'peerReview',
      },
    });
  };

  return (
    <Container>
      <Tabs mt="md" value={activeTab} onChange={handleTabChange}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Tabs.List
            style={{
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {courseId && peerReviews.length > 0 ? (
              peerReviews.map(pr => (
                <Tabs.Tab
                  key={pr._id}
                  value={pr._id}
                  style={{
                    padding: '10px 16px',
                    fontWeight: 500,
                    fontSize: '14px',
                    transition: 'all 150ms ease',
                    cursor: 'pointer',
                  }}
                >
                  {pr.title}
                </Tabs.Tab>
              ))
            ) : (
              <Tabs.Tab key={'default'} value={'default'}>
                No Peer Reviews Available
              </Tabs.Tab>
            )}
          </Tabs.List>

          {isFaculty && (
            <Tooltip label="Create Peer Review Assessment" withArrow>
              <ActionIcon
                variant="light"
                color="blue"
                size="md"
                onClick={goToCreatePeerReviewAssessment}
                aria-label="Create Peer Review Assessment"
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </div>

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
