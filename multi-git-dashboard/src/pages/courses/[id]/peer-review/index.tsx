import PeerReviewOverview from '@/components/views/PeerReviewOverview';
import { Container } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { TeamSet } from '@shared/types/TeamSet';
import { PeerReview } from '@shared/types/PeerReview';
import {
  DateUtils,
  getCurrentWeekGenerator,
  getEndOfWeek,
  weekToDateGenerator,
} from '@/lib/utils';
import { Course } from '@shared/types/Course';
import dayjs from 'dayjs';

const PeerReviewListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };
  
  const courseApiRoute = `/api/courses/${id}`;
  const teamSetsApiRoute = `/api/courses/${id}/teamsets`;
  const peerReviewsApiRoute = `/api/peer-review/${id}/peer-reviews`;
  
  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);
  const [course, setCourse] = useState<Course>();
  const [peerReviews, setPeerReviews] = useState<PeerReview[]>([]);
  const permission = hasFacultyPermission();
  
  const examplePeerReviews: PeerReview[] = [
    {
      _id: "pr1",
      courseId: id,
      title: "Example Upcoming Peer Review",
      description: "This is a sample upcoming peer review.",
      peerReviewSettingsId: "settings1",
      peerReviewAssignmentIds: [],
      createdAt: new Date("2023-09-20T12:00:00Z"),
      startDate: new Date("2023-09-25T12:00:00Z"),
      endDate: new Date("2023-10-25T12:00:00Z"),
      status: "Upcoming",
    },
    {
      _id: "pr2",
      courseId: id,
      title: "Example Ongoing Peer Review",
      description: "This is a sample ongoing peer review.",
      peerReviewSettingsId: "settings2",
      peerReviewAssignmentIds: [],
      createdAt: new Date("2023-09-20T12:00:00Z"),
      startDate: new Date("2023-09-25T12:00:00Z"),
      endDate: new Date("2023-10-25T12:00:00Z"),
      status: "Ongoing",
    },
    {
      _id: "pr3",
      courseId: id,
      title: "Example Completed Peer Review",
      description: "This is a sample completed peer review.",
      peerReviewSettingsId: "settings3",
      peerReviewAssignmentIds: [],
      createdAt: new Date("2023-09-20T12:00:00Z"),
      startDate: new Date("2023-09-25T12:00:00Z"),
      endDate: new Date("2023-10-25T12:00:00Z"),
      status: "Completed",
    }
  ];

  const onUpdate = () => {
    fetchTeamSets();
    fetchPeerReviews();
    fetchCourse();
  };
  
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
  
  const fetchCourse = useCallback(async () => {
    try {
      const response = await fetch(courseApiRoute);
      if (!response.ok) {
        console.error('Error fetching course:', response.statusText);
        return;
      }
      const course: Course = await response.json();

      const courseStartDate = dayjs(course.startDate);
      const dateUtils = {
        weekToDate: weekToDateGenerator(courseStartDate),
        getCurrentWeek: getCurrentWeekGenerator(courseStartDate),
        getEndOfWeek: getEndOfWeek,
      };

      setCourse(course);
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  }, [id]);

  useEffect(() => {
    if (router.isReady) {
      fetchTeamSets();
      fetchPeerReviews();
      if (id) {
        fetchCourse();
      }
    }
  }, [router.isReady, id, fetchCourse]);

  return (
    <Container style={{ marginTop: '40px', }} >
      <PeerReviewOverview
        course={course}
        courseId={id}
        teamSets={teamSets}
        peerReviews={peerReviews}
        hasFacultyPermission={permission}
        onUpdate={onUpdate}
      />
    </Container>
  );
};

export default PeerReviewListPage;
