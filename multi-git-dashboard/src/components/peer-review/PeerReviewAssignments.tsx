import { ActionIcon, Button, Group, Text, Stack } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { AssignedReviewDTO, PeerReviewAssignment } from '@shared/types/PeerReview';
import { Team } from '@shared/types/Team';

interface PeerReviewAssignmentsProps {
  assignments: AssignedReviewDTO[];
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
      {assignments.map(a => (
        <Group key={a.assignment._id} gap={4} justify="flex-start" wrap="nowrap">
          <Button
            size="compact-xs"
            variant="light"
            color="blue"
            onClick={() =>
              router.push(
                `${router.asPath.replace(/\/$/, '')}/${a.assignment._id}`
              )
            }
          >
            Assignment: Team {a.assignment.reviewee.number}
            {hasFacultyPermission && ` (TA: ${a.assignment.reviewee.TA.name})`}
          </Button>
          {hasFacultyPermission && (
            <>
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => onDelete(a.assignment.reviewee)}
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
