import {
  Accordion,
  Group,
  Stack,
  Text,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { forwardRef, useState, useMemo } from 'react';
import {
  AssignedReviewDTO,
  TAToAssignmentsMap,
} from '@shared/types/PeerReview';
import { Team } from '@shared/types/Team';
import AddManualAssignmentBox from './AddManualAssignmentBox';
import DeleteConfirmationModal from '../cards/Modals/DeleteConfirmationModal';
import PeerReviewAssignments from './PeerReviewAssignments';
import { useDisclosure } from '@mantine/hooks';

type SubmissionStatusValue = 'NotStarted' | 'Draft' | 'Submitted';

interface PeerReviewTAAccordionItemProps {
  teams: {
    value: string;
    TA: {
      id: string;
      name: string;
    };
    label: string;
  }[];
  TAToAssignments: TAToAssignmentsMap;
  statusFilters?: SubmissionStatusValue[];
  showUnassignedOnly?: boolean;
  isFaculty: boolean;
  addManualAssignment: (
    revieweeId: string,
    reviewerId: string,
    isTA: boolean
  ) => void;
  deleteManualAssignment: (
    revieweeId: string,
    reviewerId: string,
    isTA: boolean
  ) => void;
}

const PeerReviewTAAccordionItem = forwardRef<
  HTMLDivElement,
  PeerReviewTAAccordionItemProps
>(
  ({
    teams,
    TAToAssignments,
    statusFilters = [],
    showUnassignedOnly,
    isFaculty,
    addManualAssignment,
    deleteManualAssignment,
  }) => {
    const [toBeDeletedReviewer, setToBeDeletedReviewer] = useState<{
      reviewee: Team;
      reviewer: { taId: string; taName: string };
    } | null>(null);

    const [
      openedDeleteModal,
      { open: openDeleteModal, close: closeDeleteModal },
    ] = useDisclosure(false);

    // Convert TAToAssignments object to array for mapping + filtering for unassigned
    const taEntries = useMemo(() => {
      const temp = Object.entries(TAToAssignments) as Array<
        [string, { taName: string; assignedReviews: AssignedReviewDTO[] }]
      >;

      const matchesStatus = (a: AssignedReviewDTO) =>
        statusFilters.length === 0 ? true : statusFilters.includes(a.status);

      return temp.filter(([taId, info]) => {
        if (!showUnassignedOnly) {
          if (statusFilters.length === 0) return true;
          return info.assignedReviews.some(matchesStatus);
        }

        const visibleAssignments = info.assignedReviews.filter(matchesStatus);
        return taId && visibleAssignments.length === 0;
      });
    }, [TAToAssignments, showUnassignedOnly, statusFilters]);

    if (taEntries.length === 0 && showUnassignedOnly) return null; // Don't render the TA section if filtering for unassigned and there are none

    // Get dropdown options for TAs excluding already assigned reviewees
    const taAssignedCount = useMemo(() => {
      const counts: Record<string, number> = {};
      for (const [taId, info] of taEntries) {
        counts[taId] = info.assignedReviews.length ?? 0;
      }
      return counts;
    }, [taEntries]);

    const getTaOptions = (taId: string) => {
      const assigned = new Set(
        TAToAssignments[taId]?.assignedReviews.map(
          a => a.assignment.reviewee._id
        ) || []
      );
      return teams
        .filter(t => !assigned.has(t.value))
        .map(t => ({
          value: t.value,
          label: t.TA.id === taId ? `(Is Supervising) ${t.label}` : t.label,
        }));
    };

    return (
      <Accordion.Item key={'teaching-assistants'} value={'teaching-assistants'}>
        <Accordion.Control>
          <Text fw={600}>
            {isFaculty ? 'TA Assignments' : 'Your Assigned Reviews'}
          </Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Group display="flex" align="flex-start">
            <Stack gap="sm" display="flex" flex="1">
              <Stack gap={8}>
                <Divider />
                {taEntries.length > 0 ? (
                  taEntries.map(([taId, info]) => (
                    <ScrollArea key={taId}>
                      <Group justify="space-between" mt={4}>
                        <Text>
                          {info.taName} ({taAssignedCount[taId]})
                        </Text>
                        {isFaculty && (
                          <AddManualAssignmentBox
                            assignedCount={taAssignedCount[taId] ?? 0}
                            dropdownOptions={getTaOptions(taId)}
                            maxReviewsPerReviewer={teams.length} // TAs have no limit
                            reviewerId={taId}
                            addManualAssignment={(reviewee, reviewer) =>
                              addManualAssignment(reviewee, reviewer, true)
                            }
                          />
                        )}
                      </Group>
                      <PeerReviewAssignments
                        assignments={info.assignedReviews}
                        statusFilters={statusFilters}
                        isFaculty={isFaculty}
                        onDelete={(reviewee: Team) => {
                          setToBeDeletedReviewer({
                            reviewee,
                            reviewer: { taId, taName: info.taName },
                          });
                          openDeleteModal();
                        }}
                      />
                      <Divider />
                    </ScrollArea>
                  ))
                ) : (
                  <Text c="dimmed" size="xs">
                    (no TA assignments found)
                  </Text>
                )}
              </Stack>
            </Stack>
          </Group>
          {toBeDeletedReviewer && (
            <DeleteConfirmationModal
              opened={openedDeleteModal}
              onClose={closeDeleteModal}
              onCancel={closeDeleteModal}
              onConfirm={() => {
                deleteManualAssignment(
                  toBeDeletedReviewer!.reviewee._id,
                  toBeDeletedReviewer!.reviewer.taId,
                  true
                );
                closeDeleteModal();
              }}
              title={`Remove Reviewer of Team ${toBeDeletedReviewer?.reviewee.number}`}
              message={`Confirm remove TA ${toBeDeletedReviewer?.reviewer.taName} as a reviewer?`}
            />
          )}
        </Accordion.Panel>
      </Accordion.Item>
    );
  }
);

export default PeerReviewTAAccordionItem;
