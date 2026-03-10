import React from 'react';
import { Badge } from '@mantine/core';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import type { PeerReviewSubmission } from '@shared/types/PeerReview';

type SubmissionStatusBadgeProps = {
  userCourseRole: string | null;
  submission: PeerReviewSubmission | null;
  isSupervisorTA?: boolean;
};

const SubmissionStatusBadge: React.FC<SubmissionStatusBadgeProps> = ({
  userCourseRole,
  submission,
  isSupervisorTA = false,
}) => {
  if (!userCourseRole) return null;

  if (userCourseRole === COURSE_ROLE.Faculty) {
    return (
      <Badge variant="filled" radius="md" size="lg" color="indigo">
        Staff View
      </Badge>
    );
  }

  if (userCourseRole === COURSE_ROLE.TA) {
    if (isSupervisorTA) {
      return (
        <Badge variant="light" radius="md" size="lg" color="blue">
          Supervising View
        </Badge>
      );
    }

    if (submission?.status) {
      const colourByStatus: Record<string, string> = {
        NotStarted: 'gray',
        Draft: 'blue',
        Submitted: 'green',
      };

      return (
        <Badge
          variant={submission.status === 'Submitted' ? 'filled' : 'light'}
          radius="md"
          size="lg"
          color={colourByStatus[submission.status] || 'gray'}
        >
          {submission.status === 'NotStarted'
            ? 'Not Started'
            : submission.status}
        </Badge>
      );
    }

    return (
      <Badge variant="light" radius="md" size="lg" color="red">
        No Submission
      </Badge>
    );
  }

  if (!submission?.status) {
    return (
      <Badge variant="light" radius="md" size="lg" color="red">
        No Submission
      </Badge>
    );
  }

  const colourByStatus: Record<string, string> = {
    NotStarted: 'gray',
    Draft: 'blue',
    Submitted: 'green',
  };

  return (
    <Badge
      variant={submission.status === 'Submitted' ? 'filled' : 'light'}
      radius="md"
      size="lg"
      color={colourByStatus[submission.status] || 'gray'}
    >
      {submission.status === 'NotStarted' ? 'Not Started' : submission.status}
    </Badge>
  );
};

export default SubmissionStatusBadge;
