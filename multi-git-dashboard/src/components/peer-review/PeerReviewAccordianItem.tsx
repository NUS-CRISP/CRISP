import {
  Accordion,
  Anchor,
  Badge,
  Group,
  Stack,
  Text,
  Button,
  ActionIcon,
  Select,
  Divider,
  Center,
  ScrollArea,
} from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { forwardRef, useState, useMemo } from 'react';
import {
  PeerReviewAssignment,
  PeerReviewTeamDTO,
} from '@shared/types/PeerReview';

interface PeerReviewAccordionItemProps {
  currentTeam: PeerReviewTeamDTO;
  teams: { value: string; label: string }[];
  assignmentOfTeam: PeerReviewAssignment | null;
  reviewerType: 'Individual' | 'Team';
  maxReviewsPerReviewer: number;
  hasFacultyPermission: boolean;
  addManualAssignment: (revieweeId: string, reviewerId: string) => void;
  deleteManualAssignment: (revieweeId: string, reviewerId: string) => void;
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
      addManualAssignment,
      deleteManualAssignment,
    },
    ref
  ) => {
    const [teamAddChoice, setTeamAddChoice] = useState<string | null>(null);
    const [memberAddChoice, setMemberAddChoice] = useState<
      Record<string, string | null>
    >({});

    // Get dropdown options for teams excluding current team and already assigned teams
    const teamAssignedReviewees = useMemo(
      () =>
        new Set(
          currentTeam.assignedReviewsToTeam
            ? currentTeam.assignedReviewsToTeam.map(tr => tr._id)
            : []
        ),
      [currentTeam.assignedReviewsToTeam]
    );
    const teamAssignedCount = currentTeam.assignedReviewsToTeam.length;
    const teamOptions = useMemo(() => {
      return teams.filter(
        t =>
          t.value !== currentTeam.teamId && !teamAssignedReviewees.has(t.value)
      );
    }, [teams, currentTeam.teamId, teamAssignedReviewees]);

    // Get dropdown options for members excluding already assigned members
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
          member.assignedReviews ? member.assignedReviews.map(ar => ar._id) : []
        );
      });
      return m;
    }, [currentTeam.members]);
    const getMemberOptions = (memberId: string) =>
      teams.filter(
        t =>
          t.value !== currentTeam.teamId &&
          !memberAssignedReviewees[memberId]?.has(t.value)
      );

    const renderAssignmentRows = (
      assignments: PeerReviewAssignment[],
      reviewerId: string
    ) => {
      if (assignments.length === 0)
        return (
          <Text c="dimmed" size="xs" mb="xs">
            (no assignments found)
          </Text>
        );
      return (
        <Stack mb="xs">
          {assignments.map(a => {
            const revieweeId = a.reviewee._id;
            return (
              <Group key={a._id} gap="xs" justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <Badge variant="light">Assignment </Badge>
                  <Text size="sm">Team: {a.reviewee.number}</Text>
                </Group>
                {hasFacultyPermission && (
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() =>
                      deleteManualAssignment(revieweeId, reviewerId)
                    }
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
                  TA: {currentTeam.TA}
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
                borderRight: '1px solid #e0e0e0',
                paddingRight: '16px',
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
                      <Group align="end">
                        <Select
                          placeholder="Select team to review"
                          data={teamOptions}
                          value={teamAddChoice}
                          onChange={setTeamAddChoice}
                          searchable
                          clearable
                          nothingFoundMessage="No teams"
                          w={200}
                          size="xs"
                        />
                        <Button
                          leftSection={<IconPlus size={12} />}
                          disabled={!teamAddChoice || teamAssignedCount >= 5}
                          onClick={() => {
                            if (!teamAddChoice) return;
                            // reviewer = current team; reviewee = selected team
                            addManualAssignment(
                              teamAddChoice,
                              currentTeam.teamId
                            );
                            setTeamAddChoice(null);
                          }}
                          size="xs"
                        >
                          Add
                        </Button>
                        {teamAssignedCount >= 5 && (
                          <Text size="xs" c="dimmed">
                            Max reviews reached
                          </Text>
                        )}
                      </Group>
                    )}
                  </Group>
                  <Divider />
                  {renderAssignmentRows(
                    currentTeam.assignedReviewsToTeam,
                    currentTeam.teamId
                  )}
                </>
              )}
              <Stack gap={4}>
                <Text fw={600}>Members ({currentTeam.members.length})</Text>
                <Divider />
                {currentTeam.members.map(m => {
                  const atCap = (memberAssignedCount[m.userId] ?? 0) >= 5;
                  const memberOptions = getMemberOptions(m.userId); // exclude own team + already assigned
                  const choice = memberAddChoice[m.userId] ?? null;

                  return (
                    <ScrollArea key={m.userId}>
                      <Group justify="space-between" mt={4}>
                        <Text>{m.name}</Text>

                        {reviewerType === 'Individual' &&
                          hasFacultyPermission && (
                            <Group>
                              <Select
                                placeholder="Select team to review"
                                data={memberOptions}
                                value={choice}
                                onChange={val =>
                                  setMemberAddChoice(prev => ({
                                    ...prev,
                                    [m.userId]: val,
                                  }))
                                }
                                searchable
                                clearable
                                nothingFoundMessage="No teams available"
                                w={200}
                                size="xs"
                              />
                              <Button
                                leftSection={<IconPlus size={12} />}
                                disabled={!choice || atCap}
                                onClick={() => {
                                  if (!choice) return;
                                  addManualAssignment(choice, m.userId);
                                  setMemberAddChoice(prev => ({
                                    ...prev,
                                    [m.userId]: null,
                                  }));
                                }}
                                size="xs"
                              >
                                Add
                              </Button>
                              {atCap && (
                                <Text size="xs" c="dimmed">
                                  Max reviews reached
                                </Text>
                              )}
                            </Group>
                          )}
                      </Group>

                      {reviewerType === 'Individual' && (
                        <>
                          {renderAssignmentRows(m.assignedReviews, m.userId)}
                          <Divider />
                        </>
                      )}
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
                    Go to Team Repository
                  </Button>
                  {hasFacultyPermission && (
                    <Button
                      component="a"
                      href={assignmentOfTeam ? `/${assignmentOfTeam._id}` : ''}
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
                    <Group gap="xs" wrap="wrap">
                      {reviewerType === 'Individual'
                        ? assignmentOfTeam.studentReviewers.map(reviewer => (
                            <Badge key={`user-${reviewer._id}`}>
                              {reviewer.name}
                            </Badge>
                          ))
                        : assignmentOfTeam.teamReviewers.map(reviewer => (
                            <Badge key={`team-${reviewer._id}`}>
                              Team {reviewer.number}
                            </Badge>
                          ))}
                      {assignmentOfTeam.taReviewers.map(reviewer => (
                        <Badge
                          key={`ta-${reviewer._id}`}
                          color="gray"
                          variant="light"
                        >
                          TA: {reviewer.name}
                        </Badge>
                      ))}
                    </Group>
                  ) : (
                    <Text c="dimmed" my="xs" size="xs">
                      (no reviewers assigned)
                    </Text>
                  )}
                </Stack>
              )}
            </Stack>
          </Group>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }
);

export default PeerReviewAccordionItem;
