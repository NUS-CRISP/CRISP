import { ActionIcon, Button, Group, Text, Stack } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { PeerReviewAssignment } from '@shared/types/PeerReview';
import { Team } from '@shared/types/Team';

interface PeerReviewAssignmentsProps {
  assignments: PeerReviewAssignment[];
  hasFacultyPermission: boolean;
  onDelete: (reviewee: Team) => void;
}

const PeerReviewAssignments: React.FC<PeerReviewAssignmentsProps> = ({
  assignments,
  hasFacultyPermission,
  onDelete,
}) => {
  const router = useRouter();

  if (assignments.length === 0) {
    return (
      <Text c="dimmed" size="xs" mb="xs">
        (no assignments found)
      </Text>
    );
  }

  return (
    <Stack gap="sm" my="xs">
      {assignments.map(assignment => (
        <Group key={assignment._id} gap={4} justify="flex-start" wrap="nowrap">
          <Button
            size="compact-xs"
            variant="light"
            color="blue"
            onClick={() =>
              router.push(
                `${router.asPath.replace(/\/$/, '')}/${assignment._id}`
              )
            }
          >
            Assignment: Team {assignment.reviewee.number}
            {hasFacultyPermission && ` (TA: ${assignment.reviewee.TA.name})`}
          </Button>
          {hasFacultyPermission && (
            <>
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => onDelete(assignment.reviewee)}
                style={{ cursor: 'pointer' }}
                size="sm"
              >
                <IconTrash size={12} />
              </ActionIcon>
            </>
          )}
        </Group>
      ))}
    </Stack>
  );
};

export default PeerReviewAssignments;
