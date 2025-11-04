import PeerReviewOverview from '@/components/views/PeerReviewOverview';
import { Container } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview } from '@shared/types/PeerReview';

const PeerReviewListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };

  const teamSetsApiRoute = `/api/courses/${id}/teamsets`;
  const peerReviewsApiRoute = `/api/peer-review/${id}/peer-reviews`;

  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);
  const [peerReviews, setPeerReviews] = useState<PeerReview[]>([]);
  const hasPermission = hasFacultyPermission();

  // Callback to refresh peer reviews after creating, updating, or deleting
  const onUpdate = () => {
    fetchPeerReviews();
  };

  // Fetch peer reviews for the course to populate tabs and future uses
  const fetchPeerReviews = async () => {
    try {
      const response = await fetch(peerReviewsApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error('Error fetching peer reviews:', response.statusText);
        return;
      }
      const peerReviews = await response.json();
      setPeerReviews(peerReviews);
    } catch (error) {
      console.error('Error fetching peer reviews:', error);
    }
  };

  // Fetch team sets for the course to populate dropdown in settings form and future uses
  const fetchTeamSets = async () => {
    try {
      const response = await fetch(teamSetsApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error fetching team set names:', response.statusText);
      } else {
        const data: TeamSet[] = await response.json();
        setTeamSets(data);
        console.log('Team Sets:', data);
      }
    } catch (error) {
      console.error('Error fetching team set names:', error);
    }
  };

  // Fetch data when the component mounts or when the course ID changes
  useEffect(() => {
    if (router.isReady) {
      fetchTeamSets();
      fetchPeerReviews();
    }
  }, [router.isReady, id]);

  return (
    <Container style={{ marginTop: '40px' }}>
      <PeerReviewOverview
        courseId={id}
        teamSets={teamSets}
        peerReviews={peerReviews}
        hasFacultyPermission={hasPermission}
        onUpdate={onUpdate}
      />
    </Container>
  );
};

export default PeerReviewListPage;
