import {
  Accordion,
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
  TAToAssignmentsMap,
} from '@shared/types/PeerReview';

interface PeerReviewTAAccordionItemProps {
  teams: { value: string; label: string }[];
  TAToAssignments: TAToAssignmentsMap;
  maxReviewsPerReviewer: number;
  addManualAssignment: (revieweeId: string, reviewerId: string) => void;
  deleteManualAssignment: (revieweeId: string, reviewerId: string) => void;
}

const PeerReviewAccordionItem = forwardRef<
  HTMLDivElement,
  PeerReviewTAAccordionItemProps
>(
  (
    {
      teams,
      TAToAssignments,
      maxReviewsPerReviewer,
      addManualAssignment,
      deleteManualAssignment,
    },
    ref
  ) => {
    const [taAddChoice, setTaAddChoice] = useState<
      Record<string, string | null>
    >({});

    // Convert TAToAssignments object to array for mapping
    const taEntries = useMemo(
      () =>
        Object.entries(TAToAssignments) as Array<
          [string, { taName: string; assignedReviews: PeerReviewAssignment[] }]
        >,
      [TAToAssignments]
    );

    // Get dropdown options for TAs excluding own supervising teams and already assigned reviewees
    const taAssignedCount = useMemo(() => {
      const counts: Record<string, number> = {};
      for (const [taId, info] of taEntries) {
        counts[taId] = info.assignedReviews.length ?? 0;
      }
      return counts;
    }, [taEntries]);

    const getTaOptions = (taId: string) => {
      const assigned = new Set(
        TAToAssignments[taId]?.assignedReviews.map(a => a.reviewee._id) || []
      );
      return teams.filter(t => !assigned.has(t.value));
    };

    const renderAssignmentRows = (
      assignments: PeerReviewAssignment[],
      taId: string
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
            return (
              <Group key={a._id} gap="xs" justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <Badge variant="light">#{a._id}</Badge>
                  <Text size="sm">Team: {a.reviewee?.number}</Text>
                </Group>
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => deleteManualAssignment(a.reviewee._id, taId)}
                >
                  <IconTrash size={12} />
                </ActionIcon>
              </Group>
            );
          })}
        </Stack>
      );
    };

    return (
      <Accordion.Item key={'teaching-assistants'} value={'teaching-assistants'}>
        <Accordion.Control>
          <Text fw={600}>Teaching Assistants</Text>
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
              <Stack gap={8}>
                <Text fw={600}>TA Assignments</Text>
                <Divider />
                {taEntries.length > 0 ? (
                  taEntries.map(([taId, info]) => {
                    const atCap =
                      (taAssignedCount[taId] ?? 0) >= maxReviewsPerReviewer;
                    const taOptions = getTaOptions(taId); // exclude own supervising teams + already assigned
                    const choice = taAddChoice[taId] ?? null;

                    return (
                      <ScrollArea key={taId}>
                        <Group justify="space-between" mt={4}>
                          <Text>
                            {info.taName} ({taAssignedCount[taId]})
                          </Text>
                          <Group>
                            <Select
                              placeholder="Select team to review"
                              data={taOptions}
                              value={choice}
                              onChange={val =>
                                setTaAddChoice(prev => ({
                                  ...prev,
                                  [taId]: val,
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
                                addManualAssignment(choice, taId);
                                setTaAddChoice(prev => ({
                                  ...prev,
                                  [taId]: null,
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
                        </Group>
                        {renderAssignmentRows(info.assignedReviews, taId)}
                        <Divider />
                      </ScrollArea>
                    );
                  })
                ) : (
                  <Text c="dimmed" size="xs">
                    (no TA assignments found)
                  </Text>
                )}
              </Stack>
            </Stack>
          </Group>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }
);

export default PeerReviewAccordionItem;
