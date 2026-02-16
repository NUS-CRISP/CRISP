import {
  Avatar,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Loader,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Course } from '@shared/types/Course';
import { TeamData } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import { IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import classes from '@/styles/team-analytics.module.css';

interface TeamsOverviewProps {
  courseId: string;
  course: Course | null;
  teamDatas: TeamData[];
  status: Status;
}

const formatCompactNumber = (n: number) =>
  new Intl.NumberFormat('en', { notation: 'compact' }).format(n);

const normalizePrState = (s?: string) => (s ?? '').trim().toLowerCase();

type TeamStatus = 'active' | 'review-needed';

function getTeamStatus(team: TeamData): TeamStatus {
  const openPRs = (team.teamPRs ?? []).filter(
    pr => normalizePrState(pr.state) === 'open'
  );
  const needsReview = openPRs.some(pr => (pr.reviews?.length ?? 0) === 0);
  return needsReview ? 'review-needed' : 'active';
}

function getMemberCount(team: TeamData): number {
  const contrib = team.teamContributions ?? {};
  return Object.keys(contrib).length;
}

function getInitials(name: string): string {
  return name
    .split(/[\s_.-]/)
    .filter(Boolean)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const TeamsOverview: React.FC<TeamsOverviewProps> = ({
  courseId,
  course,
  teamDatas,
  status,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const [sortBy, setSortBy] = useState<string | null>('name');

  const uniqueTeamData = useMemo(
    () =>
      teamDatas.filter(
        (team, index, self) =>
          index === self.findIndex(t => t.repoName === team.repoName)
      ),
    [teamDatas]
  );

  const filteredAndSortedTeams = useMemo(() => {
    let list = uniqueTeamData;

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter(team =>
        team.repoName.toLowerCase().includes(query)
      );
    }

    if (statusFilter === 'active') {
      list = list.filter(team => getTeamStatus(team) === 'active');
    } else if (statusFilter === 'review-needed') {
      list = list.filter(team => getTeamStatus(team) === 'review-needed');
    }

    const sorted = [...list];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.repoName.localeCompare(b.repoName));
    } else if (sortBy === 'prs') {
      sorted.sort((a, b) => (b.pullRequests ?? 0) - (a.pullRequests ?? 0));
    } else if (sortBy === 'commits') {
      sorted.sort((a, b) => (b.commits ?? 0) - (a.commits ?? 0));
    } else if (sortBy === 'members') {
      sorted.sort(
        (a, b) => getMemberCount(b) - getMemberCount(a)
      );
    }

    return sorted;
  }, [uniqueTeamData, search, statusFilter, sortBy]);

  if (status === Status.Loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Loader />
      </Center>
    );
  }

  if (status === Status.Error) {
    return (
      <Center style={{ height: '70vh' }}>
        <Text c="dimmed">Failed to load team data.</Text>
      </Center>
    );
  }

  if (!course) {
    return (
      <Center style={{ height: '70vh' }}>
        <Text c="dimmed">Course not available.</Text>
      </Center>
    );
  }

  return (
    <ScrollArea
      style={{
        height: '100vh',
        paddingRight: '20px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
      }}
    >
      <Box className={classes.page} pl={20} pr={20}>
        <Box className={classes.pageHeader}>
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
            <Box>
              <Title order={1} className={classes.pageTitle}>
                Team Analytics
              </Title>
              <Text c="dimmed" className={classes.pageSubtitle}>
                {course.code}
                {course.semester ? ` · ${course.semester}` : ''} — View and
                compare team performance
              </Text>
            </Box>
          </Group>
        </Box>

        <Box className={classes.filters}>
          <TextInput
            placeholder="Search by team or repo name..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            className={classes.searchInput}
          />
          <Select
            label="Status"
            placeholder="All"
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'all', label: 'All teams' },
              { value: 'active', label: 'Active' },
              { value: 'review-needed', label: 'Review needed' },
            ]}
            clearable
            className={classes.filterSelect}
          />
          <Select
            label="Sort by"
            value={sortBy}
            onChange={setSortBy}
            data={[
              { value: 'name', label: 'Name' },
              { value: 'prs', label: 'Pull requests' },
              { value: 'commits', label: 'Commits' },
              { value: 'members', label: 'Members' },
            ]}
            className={classes.filterSelect}
          />
        </Box>

        {filteredAndSortedTeams.length === 0 ? (
          <Card withBorder radius="lg" p="xl" className={classes.emptyState}>
            <Text c="dimmed" ta="center">
              {uniqueTeamData.length === 0
                ? 'No team data yet. Connect repositories and sync GitHub data.'
                : 'No teams match your filters.'}
            </Text>
          </Card>
        ) : (
          <SimpleGrid
            cols={{ base: 1, sm: 2, lg: 3 }}
            spacing="lg"
            className={classes.grid}
          >
            {filteredAndSortedTeams.map(team => {
              const teamStatus = getTeamStatus(team);
              const memberCount = getMemberCount(team);
              const members = Object.keys(team.teamContributions ?? {});

              return (
                <Card
                  key={team._id}
                  withBorder
                  radius="lg"
                  component={Link}
                  href={`/courses/${courseId}/teams?repo=${encodeURIComponent(team.repoName)}`}
                  className={classes.teamCard}
                >
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Box style={{ minWidth: 0 }}>
                      <Title order={4} className={classes.teamName} lineClamp={1}>
                        {team.repoName}
                      </Title>
                      <Group gap={6} mt={6}>
                        <Badge
                          size="sm"
                          variant="light"
                          color={teamStatus === 'active' ? 'green' : 'orange'}
                          className={classes.statusBadge}
                        >
                          {teamStatus === 'active' ? 'Active' : 'Review needed'}
                        </Badge>
                      </Group>
                    </Box>
                    <Avatar.Group spacing="sm" className={classes.avatarGroup}>
                      {members.slice(0, 4).map(user => (
                        <Avatar
                          key={user}
                          radius="xl"
                          size="sm"
                          color="blue"
                          className={classes.avatar}
                        >
                          {getInitials(user)}
                        </Avatar>
                      ))}
                      {members.length > 4 && (
                        <Avatar radius="xl" size="sm" color="gray">
                          +{members.length - 4}
                        </Avatar>
                      )}
                    </Avatar.Group>
                  </Group>

                  <Stack gap="xs" mt="md" className={classes.stats}>
                    <Group gap="lg">
                      <Text size="sm" c="dimmed">
                        {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {formatCompactNumber(team.pullRequests ?? 0)} PRs
                      </Text>
                      <Text size="sm" c="dimmed">
                        {formatCompactNumber(team.commits ?? 0)} commits
                      </Text>
                    </Group>
                    <Group gap="md">
                      <Text size="xs" c="dimmed">
                        Issues: {formatCompactNumber(team.issues ?? 0)}
                      </Text>
                    </Group>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Box>
    </ScrollArea>
  );
};

export default TeamsOverview;
