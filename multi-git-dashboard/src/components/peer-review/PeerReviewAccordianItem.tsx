import {
  Accordion,
  Anchor,
  Badge,
  Group,
  Stack,
  Text,
  Button,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { forwardRef, useState, useMemo } from 'react';
import {
  PeerReviewAssignment,
  PeerReviewTeamDTO,
  PeerReviewTeamMemberDTO,
} from '@shared/types/PeerReview';
import { Team } from '@shared/types/Team';
import { useRouter } from 'next/router';
import { useDisclosure } from '@mantine/hooks';
import DeleteConfirmationModal from '../cards/Modals/DeleteConfirmationModal';
import PeerReviewAssignments from './PeerReviewAssignments';
import AddManualAssignmentBox from './AddManualAssignmentBox';

interface PeerReviewAccordionItemProps {
  currentTeam: PeerReviewTeamDTO;
  teams: {
    value: string;
    TA: {
      id: string;
      name: string;
    };
    label: string;
  }[];
  assignmentOfTeam: PeerReviewAssignment | null;
  reviewerType: 'Individual' | 'Team';
  maxReviewsPerReviewer: number;
  hasFacultyPermission: boolean;
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

const PeerReviewAccordionItem = forwardRef<
  HTMLDivElement,
  PeerReviewAccordionItemProps
>(
  (
    {
      currentTeam,
      teams,
      assignmentOfTeam,
      reviewerType,
      hasFacultyPermission,
      maxReviewsPerReviewer,
      addManualAssignment,
      deleteManualAssignment,
    },
    ref
  ) => {
    const router = useRouter();

    const [
      openedDeleteModal,
      { open: openDeleteModal, close: closeDeleteModal },
    ] = useDisclosure(false);

    const [toBeDeletedReviewer, setToBeDeletedReviewer] = useState<{
      reviewee: Team;
      reviewer: PeerReviewTeamDTO | PeerReviewTeamMemberDTO;
    } | null>(null);

    // Get dropdown options for teams excluding own team and already assigned teams
    const teamAssignedReviewees = useMemo(
      () =>
        new Set(
          currentTeam.assignedReviewsToTeam
            ? currentTeam.assignedReviewsToTeam.map(tr => tr.reviewee._id)
            : []
        ),
      [currentTeam.assignedReviewsToTeam]
    );
    const teamAssignedCount = currentTeam.assignedReviewsToTeam.length;
    const teamOptions = useMemo(() => {
      return teams
        .filter(
          t =>
            t.value !== currentTeam.teamId &&
            !teamAssignedReviewees.has(t.value)
        )
        .map(t => ({
          value: t.value,
          label:
            t.TA.id === currentTeam.TA.id ? `(Same TA) ${t.label}` : t.label,
        }));
    }, [teams, currentTeam.teamId, teamAssignedReviewees]);

    // Get dropdown options for members excluding own team and already assigned teams
    const memberAssignedCount = useMemo(() => {
      const m: Record<string, number> = {};
      currentTeam.members.forEach(
        member => (m[member.userId] = member.assignedReviews.length)
      );
      return m;
    }, [currentTeam.members]);
    const memberAssignedReviewees = useMemo(() => {
      const m: Record<string, Set<string>> = {};
      currentTeam.members.forEach(member => {
        m[member.userId] = new Set(
          member.assignedReviews
            ? member.assignedReviews.map(ar => ar.reviewee._id)
            : []
        );
      });
      return m;
    }, [currentTeam.members]);
    const getMemberOptions = (memberId: string) =>
      teams
        .filter(
          t =>
            t.value !== currentTeam.teamId &&
            !memberAssignedReviewees[memberId]?.has(t.value)
        )
        .map(t => ({
          value: t.value,
          label: t.TA === currentTeam.TA ? `(Same TA) ${t.label}` : t.label,
        }));

    const handleDelete = (
      reviewee: Team,
      reviewer: PeerReviewTeamDTO | PeerReviewTeamMemberDTO
    ) => {
      setToBeDeletedReviewer({
        reviewee: reviewee,
        reviewer: reviewer,
      });
      openDeleteModal();
    };

    return (
      <Accordion.Item key={currentTeam.teamId} value={currentTeam.teamId}>
        <Accordion.Control>
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm">
              <Text fw={600}>Team {currentTeam.teamNumber}</Text>
              {currentTeam.repoName && (
                <Text c="dimmed">{currentTeam.repoName}</Text>
              )}
            </Group>
            <Group gap="sm">
              {currentTeam.TA && (
                <Badge mr="sm" color="gray" variant="light">
                  TA: {currentTeam.TA.name}
                </Badge>
              )}
            </Group>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Group display="flex" align="flex-start">
            <Stack
              gap="sm"
              style={{
                border: '0.5px solid gray',
                borderRadius: '4px',
                padding: '16px',
                flex: 1,
              }}
            >
              {reviewerType === 'Team' && (
                <>
                  <Group justify="space-between">
                    <Text fw={600}>
                      Team Assignments (
                      {currentTeam.assignedReviewsToTeam.length})
                    </Text>
                    {hasFacultyPermission && (
                      <AddManualAssignmentBox
                        assignedCount={teamAssignedCount}
                        dropdownOptions={teamOptions}
                        maxReviewsPerReviewer={maxReviewsPerReviewer}
                        reviewerId={currentTeam.teamId}
                        addManualAssignment={(reviewee, reviewer) =>
                          addManualAssignment(reviewee, reviewer, false)
                        }
                      />
                    )}
                  </Group>
                  <Divider />
                  <PeerReviewAssignments
                    assignments={currentTeam.assignedReviewsToTeam}
                    hasFacultyPermission={hasFacultyPermission}
                    onDelete={(reviewee: Team) =>
                      handleDelete(reviewee, currentTeam)
                    }
                  />
                </>
              )}
              <Stack gap={4}>
                <Text fw={600}>Members ({currentTeam.members.length})</Text>
                <Divider />
                {currentTeam.members.map(m => (
                  <ScrollArea key={m.userId}>
                    <Group justify="space-between" mt={4}>
                      <Text>{m.name}</Text>

                      {reviewerType === 'Individual' &&
                        hasFacultyPermission && (
                          <AddManualAssignmentBox
                            assignedCount={memberAssignedCount[m.userId] ?? 0}
                            dropdownOptions={getMemberOptions(m.userId)}
                            maxReviewsPerReviewer={maxReviewsPerReviewer}
                            reviewerId={m.userId}
                            addManualAssignment={(reviewee, reviewer) =>
                              addManualAssignment(reviewee, reviewer, false)
                            }
                          />
                        )}
                    </Group>

                    {reviewerType === 'Individual' && (
                      <>
                        <PeerReviewAssignments
                          assignments={m.assignedReviews}
                          hasFacultyPermission={hasFacultyPermission}
                          onDelete={(reviewee: Team) =>
                            handleDelete(reviewee, m)
                          }
                        />
                        <Divider />
                      </>
                    )}
                  </ScrollArea>
                ))}
              </Stack>
            </Stack>
            <Stack>
              {currentTeam.repoUrl && (
                <Stack w={250}>
                  <Button
                    component="a"
                    href={currentTeam.repoUrl}
                    rel="noreferrer"
                    size="xs"
                    target="_blank"
                    variant="light"
                    color="gray"
                  >
                    Go to Team's Github Repository
                  </Button>
                  {hasFacultyPermission && (
                    <Button
                      component="a"
                      onClick={() =>
                        router.push(
                          `${router.asPath.replace(/\/$/, '')}/${assignmentOfTeam?._id}`
                        )
                      }
                      size="xs"
                      rel="noreferrer"
                      target="_blank"
                      variant="light"
                      color="gray"
                    >
                      See Peer Review for Team
                    </Button>
                  )}
                </Stack>
              )}
              {hasFacultyPermission && (
                <Stack gap={4}>
                  <Text fw={600} size="md">
                    Reviewers for Team (
                    {!assignmentOfTeam
                      ? 0
                      : reviewerType === 'Individual'
                        ? assignmentOfTeam.studentReviewers.length
                        : assignmentOfTeam.teamReviewers.length}
                    )
                  </Text>
                  <Divider />

                  {assignmentOfTeam ? (
                    <ScrollArea style={{ height: 150 }} scrollbarSize={4}>
                      <Stack gap="xs" mt="xs">
                        {reviewerType === 'Individual'
                          ? assignmentOfTeam.studentReviewers.map(reviewer => (
                              <Badge
                                size="sm"
                                variant="light"
                                key={`user-${reviewer._id}`}
                              >
                                {reviewer.name}
                              </Badge>
                            ))
                          : assignmentOfTeam.teamReviewers.map(reviewer => (
                              <Badge size="sm" key={`team-${reviewer._id}`}>
                                Team {reviewer.number}
                              </Badge>
                            ))}
                        {assignmentOfTeam.taReviewers.map(reviewer => (
                          <Badge
                            key={`ta-${reviewer._id}`}
                            color="yellow"
                            variant="light"
                            size="sm"
                          >
                            TA: {reviewer.name}
                          </Badge>
                        ))}
                      </Stack>
                    </ScrollArea>
                  ) : (
                    <Text c="dimmed" my="xs" size="xs">
                      (no reviewers assigned)
                    </Text>
                  )}
                </Stack>
              )}
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
                  'teamId' in toBeDeletedReviewer!.reviewer
                    ? toBeDeletedReviewer!.reviewer.teamId
                    : toBeDeletedReviewer!.reviewer.userId,
                  false
                );
                closeDeleteModal();
              }}
              title={`Remove Reviewer of Team ${toBeDeletedReviewer?.reviewee.number}`}
              message={`Confirm remove ${
                'name' in toBeDeletedReviewer.reviewer
                  ? toBeDeletedReviewer.reviewer.name
                  : `Team ${toBeDeletedReviewer.reviewer.teamNumber}`
              } as a reviewer?`}
            />
          )}
        </Accordion.Panel>
      </Accordion.Item>
    );
  }
);

export default PeerReviewAccordionItem;
