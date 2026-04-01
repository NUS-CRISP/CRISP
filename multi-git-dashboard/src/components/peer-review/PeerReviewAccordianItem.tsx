import {
  Accordion,
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
  PeerReviewTeamDTO,
  PeerReviewTeamMemberDTO,
  RevieweeAssignmentsDTO,
} from '@shared/types/PeerReview';
import { Team } from '@shared/types/Team';
import { useRouter } from 'next/router';
import { useDisclosure } from '@mantine/hooks';
import DeleteConfirmationModal from '../cards/Modals/DeleteConfirmationModal';
import PeerReviewAssignments from './PeerReviewAssignments';
import AddManualAssignmentBox from './AddManualAssignmentBox';

interface PeerReviewAccordionItemProps {
  currentTeam: PeerReviewTeamDTO;
  currentUserId?: string;
  taReviewerAssignmentIds?: string[];
  teams: {
    value: string;
    TA: {
      id: string;
      name: string;
    };
    label: string;
  }[];
  assignmentOfTeam: RevieweeAssignmentsDTO | null;
  reviewerType: 'Individual' | 'Team';
  maxReviewsPerReviewer: number;
  showUnassignedOnly?: boolean;
  isFaculty: boolean;
  isTA: boolean;
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
  ({
    currentTeam,
    currentUserId,
    taReviewerAssignmentIds,
    teams,
    assignmentOfTeam,
    reviewerType,
    maxReviewsPerReviewer,
    showUnassignedOnly,
    isFaculty,
    isTA,
    addManualAssignment,
    deleteManualAssignment,
  }) => {
    const router = useRouter();

    const [
      openedDeleteModal,
      { open: openDeleteModal, close: closeDeleteModal },
    ] = useDisclosure(false);

    const [toBeDeletedReviewer, setToBeDeletedReviewer] = useState<{
      reviewee: Team;
      reviewer: PeerReviewTeamDTO | PeerReviewTeamMemberDTO;
    } | null>(null);

    // Get values for display
    const numberOfMembers = currentTeam.members.length;
    const numberOfTeamAssignments = currentTeam.assignedReviewsToTeam.length;
    const numberOfReviewers = assignmentOfTeam
      ? assignmentOfTeam.reviewers.students.length +
        assignmentOfTeam.reviewers.teams.length +
        assignmentOfTeam.reviewers.TAs.length
      : 0;

    // Get dropdown options for teams excluding own team and already assigned teams
    const teamAssignedReviewees = useMemo(
      () =>
        new Set(
          currentTeam.assignedReviewsToTeam
            ? currentTeam.assignedReviewsToTeam.map(
                tr => tr.assignment.reviewee._id
              )
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
        .sort((a, b) => a.label.localeCompare(b.label))
        .map(t => ({
          value: t.value,
          isSameTA: t.TA?.id === currentTeam.TA?.id,
          label: t.label,
        }))
        .sort((a, b) => {
          if (a.isSameTA !== b.isSameTA) {
            return a.isSameTA ? 1 : -1; // non-same-TA first
          }
          return a.label.localeCompare(b.label);
        })
        .map(t => ({
          value: t.value,
          label: t.isSameTA ? `(Same TA) ${t.label}` : t.label,
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
            ? member.assignedReviews.map(ar => ar.assignment.reviewee._id)
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
          isSameTA: t.TA?.id === currentTeam.TA?.id,
          label: t.label,
        }))
        .sort((a, b) => {
          if (a.isSameTA !== b.isSameTA) {
            return a.isSameTA ? 1 : -1; // non-same-TA first
          }
          return a.label.localeCompare(b.label);
        })
        .map(t => ({
          value: t.value,
          label: t.isSameTA ? `(Same TA) ${t.label}` : t.label,
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
            {currentTeam.TA && currentTeam.TA.name && (
              <Group gap="sm">
                <Badge mr="sm" color="gray" variant="light">
                  TA: {currentTeam.TA.name}
                </Badge>
              </Group>
            )}
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
                      Team Assignments ({numberOfTeamAssignments})
                    </Text>
                    {isFaculty && (
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
                  <div
                    style={{
                      overflowX: 'auto',
                      whiteSpace: 'nowrap',
                      paddingBottom: 4,
                    }}
                  >
                    <PeerReviewAssignments
                      assignments={currentTeam.assignedReviewsToTeam}
                      isFaculty={isFaculty}
                      isTA={isTA}
                      currentUserId={currentUserId}
                      taReviewerAssignmentIds={taReviewerAssignmentIds}
                      onDelete={(reviewee: Team) =>
                        handleDelete(reviewee, currentTeam)
                      }
                    />
                  </div>
                </>
              )}
              <Stack gap={4}>
                <Text fw={600}>Members ({numberOfMembers})</Text>
                <Divider />
                {currentTeam.members
                  .filter(m => {
                    if (!showUnassignedOnly) return true;
                    // Only show members with no assignments
                    return m.assignedReviews.length === 0;
                  })
                  .map(m => {
                    const isCurrentUser = m.userId === currentUserId;
                    const shouldShowAssignments =
                      isFaculty || isTA || isCurrentUser;

                    return (
                      <ScrollArea key={m.userId}>
                        <Group justify="space-between" mt={4}>
                          <Text>{m.name}</Text>

                          {reviewerType === 'Individual' && isFaculty && (
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

                        {reviewerType === 'Individual' &&
                          shouldShowAssignments && (
                            <>
                              <PeerReviewAssignments
                                assignments={m.assignedReviews}
                                isFaculty={isFaculty}
                                isTA={isTA}
                                currentUserId={currentUserId}
                                taReviewerAssignmentIds={
                                  taReviewerAssignmentIds
                                }
                                onDelete={(reviewee: Team) =>
                                  handleDelete(reviewee, m)
                                }
                              />
                            </>
                          )}
                        <Divider mt={6} />
                      </ScrollArea>
                    );
                  })}
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
                  <Button
                    component="a"
                    onClick={() =>
                      router.push(
                        `${router.asPath.replace(/\/$/, '')}/${assignmentOfTeam?.assignment._id}`
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
                </Stack>
              )}
              {isFaculty && (
                <Stack gap={4}>
                  <Text fw={600} size="md">
                    Reviewers for Team ({numberOfReviewers})
                  </Text>
                  <Divider />

                  {assignmentOfTeam && numberOfReviewers > 0 ? (
                    <ScrollArea
                      style={{
                        maxHeight: 'calc(10 * 32px + 18px)',
                        height: 'auto',
                        border: 'solid 1px',
                        borderColor: '#505050',
                        borderRadius: '6px',
                        padding: '8px 0',
                        transition: 'max-height 0.2s',
                      }}
                      mt="xs"
                      px="sm"
                      py="xs"
                      scrollbarSize={6}
                    >
                      <Stack gap="xs">
                        {reviewerType === 'Individual'
                          ? assignmentOfTeam.reviewers.students.map(
                              reviewer => (
                                <Badge
                                  size="sm"
                                  variant="light"
                                  key={`user-${reviewer.userId}`}
                                  radius="sm"
                                  style={{ minHeight: 28 }}
                                >
                                  {reviewer.name}
                                </Badge>
                              )
                            )
                          : assignmentOfTeam.reviewers.teams.map(reviewer => (
                              <Badge
                                size="sm"
                                key={`team-${reviewer.teamId}`}
                                variant="light"
                                radius="sm"
                                style={{ minHeight: 24 }}
                              >
                                Team {reviewer.teamNumber}
                              </Badge>
                            ))}
                        {assignmentOfTeam.reviewers.TAs.map(reviewer => (
                          <Badge
                            key={`ta-${reviewer.userId}`}
                            color="yellow"
                            variant="light"
                            size="sm"
                            radius="sm"
                            style={{ minHeight: 24 }}
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
