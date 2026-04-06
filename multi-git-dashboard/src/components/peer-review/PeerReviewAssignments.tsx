import { ActionIcon, Button, Group, Text, Stack, Badge } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { AssignedReviewDTO } from '@shared/types/PeerReview';
import { Team } from '@shared/types/Team';

type SubmissionStatusFilter = 'All' | 'NotStarted' | 'Draft' | 'Submitted';

interface PeerReviewAssignmentsProps {
  assignments: AssignedReviewDTO[];
  statusFilter?: SubmissionStatusFilter;
  isFaculty: boolean;
  isTA?: boolean;
  currentUserId?: string;
  taReviewerAssignmentIds?: string[];
  onDelete: (reviewee: Team) => void;
}

const PeerReviewAssignments: React.FC<PeerReviewAssignmentsProps> = ({
  assignments,
  statusFilter = 'All',
  isFaculty,
  isTA = false,
  currentUserId,
  taReviewerAssignmentIds = [],
  onDelete,
}) => {
  const router = useRouter();

  const filteredAssignments = assignments.filter(a =>
    statusFilter === 'All' ? true : a.status === statusFilter
  );

  if (filteredAssignments.length === 0) {
    return (
      <Text c="dimmed" size="xs" mb="xs">
        (no assignments found)
      </Text>
    );
  }

  return (
    <Stack gap="sm" my="xs">
      {filteredAssignments.map(a => {
        const teamNumber =
          (a.assignment.reviewee as Partial<Team> | undefined)?.number ??
          (a.assignment.reviewee as { teamNumber?: number } | undefined)
            ?.teamNumber ??
          'Unknown';
        const taName =
          (a.assignment.reviewee as Partial<Team> | undefined)?.TA?.name ??
          'Unassigned';

        const revieweeTAId = (
          a.assignment.reviewee as Partial<Team> | undefined
        )?.TA?._id;
        const isSupervisingTA = Boolean(
          isTA &&
          currentUserId &&
          revieweeTAId &&
          String(revieweeTAId) === String(currentUserId)
        );
        const isAssignedTAReviewer = Boolean(
          isTA && taReviewerAssignmentIds.includes(a.assignment._id)
        );
        const disableNavigation = Boolean(
          isTA && !isSupervisingTA && !isAssignedTAReviewer
        );

        return (
          <Group
            key={a.assignment._id}
            gap={4}
            justify="flex-start"
            wrap="nowrap"
          >
            <Button
              size="compact-xs"
              variant="light"
              color="blue"
              disabled={disableNavigation}
              onClick={() =>
                router.push(
                  `${router.asPath.replace(/\/$/, '')}/${a.assignment._id}`
                )
              }
            >
              Assignment: Team {teamNumber}
              {isFaculty && ` (TA: ${taName})`}
            </Button>
            {a.status === 'Submitted' && (
              <Badge
                color="green"
                variant="light"
                size="sm"
                radius="sm"
                h="21.5px"
              >
                Submitted
              </Badge>
            )}
            {a.status === 'Draft' && (
              <Badge
                color="yellow"
                variant="light"
                size="sm"
                radius="sm"
                h="21.5px"
              >
                Draft
              </Badge>
            )}
            {a.status === 'NotStarted' && (
              <Badge
                color="gray"
                variant="light"
                size="sm"
                radius="sm"
                h="21.5px"
              >
                Not Started
              </Badge>
            )}
            {isFaculty && (
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => onDelete(a.assignment.reviewee as Team)}
                style={{ cursor: 'pointer' }}
                size="sm"
              >
                <IconTrash size={12} />
              </ActionIcon>
            )}
          </Group>
        );
      })}
    </Stack>
  );
};

export default PeerReviewAssignments;
