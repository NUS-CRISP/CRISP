import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
  Card,
  Tabs,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconFilter } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

interface UnassignedReviewersInfo {
  unassignedCount: number;
  hasUnassigned: boolean;
  reviewerType: 'Individual' | 'Team';
  taAssignmentsEnabled: boolean;
  unassignedIndividuals: Array<{
    userId: string;
    name: string;
    teamNumber: number;
  }>;
  unassignedTeams: Array<{ teamId: string; teamNumber: number }>;
  unassignedTAs: Array<{ userId: string; name: string }>;
}

interface UnassignedReviewersFilterProps {
  peerReviewId: string;
  courseId: string;
  onFilterChange: (showUnassignedOnly: boolean) => void;
}

const UnassignedReviewersFilter: React.FC<UnassignedReviewersFilterProps> = ({
  peerReviewId,
  courseId,
  onFilterChange,
}) => {
  const [unassignedInfo, setUnassignedInfo] =
    useState<UnassignedReviewersInfo | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  useEffect(() => {
    fetchUnassignedInfo();
  }, []);

  // Update active tab when unassigned info changes
  useEffect(() => {
    if (unassignedInfo && !activeTab) {
      if (unassignedInfo.reviewerType === 'Individual') {
        setActiveTab('individuals');
      } else {
        setActiveTab('teams');
      }
    }
  }, [unassignedInfo]);

  const fetchUnassignedInfo = async () => {
    try {
      const response = await fetch(
        `/api/peer-review/${courseId}/${peerReviewId}/unassigned-reviewers`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        console.error('Error fetching unassigned info:', response.statusText);
        return;
      }

      const data = await response.json();
      setUnassignedInfo(data);
    } catch (err) {
      console.error('Error fetching unassigned reviewers:', err);
    }
  };

  const handleToggleFilter = () => {
    const newValue = !showUnassignedOnly;
    setShowUnassignedOnly(newValue);
    onFilterChange(newValue);
    close();
  };

  return (
    <>
      <Group gap="xs">
        <Tooltip
          label={
            unassignedInfo?.hasUnassigned
              ? `${unassignedInfo.unassignedCount} unassigned reviewer(s)`
              : 'All reviewers assigned'
          }
        >
          <ActionIcon
            onClick={open}
            variant="light"
            color={unassignedInfo?.hasUnassigned ? 'yellow' : 'green'}
            title="Show unassigned reviewers"
          >
            <IconFilter size={18} />
          </ActionIcon>
        </Tooltip>

        {unassignedInfo?.hasUnassigned && (
          <Badge
            size="lg"
            variant="light"
            color="yellow"
            onClick={open}
            style={{ cursor: 'pointer' }}
          >
            {unassignedInfo.unassignedCount} Unassigned
          </Badge>
        )}
      </Group>

      <Modal
        opened={opened}
        onClose={close}
        title="Unassigned Reviewers"
        centered
        size="md"
      >
        {!unassignedInfo ? (
          <Text>Loading...</Text>
        ) : unassignedInfo.hasUnassigned ? (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              {unassignedInfo.reviewerType === 'Individual' && (
                <Tabs.Tab value="individuals">
                  Individuals ({unassignedInfo.unassignedIndividuals.length})
                </Tabs.Tab>
              )}
              {unassignedInfo.reviewerType === 'Team' && (
                <Tabs.Tab value="teams">
                  Teams ({unassignedInfo.unassignedTeams.length})
                </Tabs.Tab>
              )}
              {unassignedInfo.taAssignmentsEnabled && (
                <Tabs.Tab value="tas">
                  TAs ({unassignedInfo.unassignedTAs.length})
                </Tabs.Tab>
              )}
            </Tabs.List>

            {unassignedInfo.reviewerType === 'Individual' && (
              <Tabs.Panel value="individuals" pt="md">
                <Stack gap="sm">
                  <Text c="dimmed" size="sm">
                    The following students have not been assigned any
                    submissions to review:
                  </Text>
                  {unassignedInfo.unassignedIndividuals.map(reviewer => (
                    <Card key={reviewer.userId} withBorder p="sm" bg="gray.0">
                      <Group justify="space-between">
                        <div>
                          <Text fw={500}>{reviewer.name}</Text>
                          <Text size="xs" c="dimmed">
                            Team {reviewer.teamNumber}
                          </Text>
                        </div>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Tabs.Panel>
            )}

            {unassignedInfo.reviewerType === 'Team' && (
              <Tabs.Panel value="teams" pt="md">
                <Stack gap="sm">
                  <Text c="dimmed" size="sm">
                    The following teams have not been assigned any submissions
                    to review:
                  </Text>
                  {unassignedInfo.unassignedTeams.map(team => (
                    <Card key={team.teamId} withBorder p="sm" bg="gray.0">
                      <Text fw={500}>Team {team.teamNumber}</Text>
                    </Card>
                  ))}
                </Stack>
              </Tabs.Panel>
            )}

            {unassignedInfo.taAssignmentsEnabled && (
              <Tabs.Panel value="tas" pt="md">
                <Stack gap="sm">
                  <Text c="dimmed" size="sm">
                    The following TAs have not been assigned any submissions to
                    review:
                  </Text>
                  {unassignedInfo.unassignedTAs.length > 0 ? (
                    unassignedInfo.unassignedTAs.map(ta => (
                      <Card key={ta.userId} withBorder p="sm" bg="gray.0">
                        <Text fw={500}>{ta.name}</Text>
                      </Card>
                    ))
                  ) : (
                    <Text c="green">All TAs have been assigned.</Text>
                  )}
                </Stack>
              </Tabs.Panel>
            )}
          </Tabs>
        ) : (
          <Text c="green">All reviewers have been assigned submissions.</Text>
        )}

        <Group justify="flex-end" mt="md">
          {unassignedInfo?.hasUnassigned && (
            <Button color="yellow" onClick={handleToggleFilter}>
              {showUnassignedOnly ? 'Clear Filter' : 'Show Only Unassigned'}
            </Button>
          )}
          <Button variant="light" onClick={close}>
            Close
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default UnassignedReviewersFilter;
