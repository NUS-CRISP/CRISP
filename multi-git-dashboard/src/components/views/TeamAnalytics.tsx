import {
  Avatar,
  Badge,
  Box,
  Card,
  Center,
  Loader,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { getInitials, AVATAR_COLORS } from '@/lib/utils';
import { Course } from '@shared/types/Course';
import { TeamData } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import { IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import pageLayout from '@/styles/root-layout.module.css';
import classes from '@/styles/team-analytics.module.css';

interface TeamAnalyticsProps {
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

const TeamAnalytics: React.FC<TeamAnalyticsProps> = ({
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
      list = list.filter(team => team.repoName.toLowerCase().includes(query));
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
      sorted.sort((a, b) => getMemberCount(b) - getMemberCount(a));
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
    <Box
      className={pageLayout.page}
      pl={20}
      pr={20}
      style={{ paddingRight: 24 }}
    >
      <Box className={pageLayout.pageHeader}>
        <Box className={classes.headerRow}>
          <Box>
            <Title order={1} className={pageLayout.pageTitle}>
              Team Analytics
            </Title>
            <Text className={pageLayout.pageSubtitle}>
              Track team performance, code quality, and project progress
            </Text>
          </Box>
          {/* <Button
            variant="default"
            leftSection={<IconDownload size={16} />}
            // To implement export function
            className={classes.exportButton}
          >
            Export Report
          </Button> */}
        </Box>
      </Box>

      <Box className={classes.filters}>
        <TextInput
          placeholder="Search teams..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          className={classes.searchInput}
        />
        <Select
          label="Status"
          placeholder="All Teams"
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: 'all', label: 'All Teams' },
            { value: 'active', label: 'Active' },
            { value: 'review-needed', label: 'Review needed' },
          ]}
          clearable
          classNames={{ label: classes.filterSelectLabel }}
          className={classes.filterSelect}
        />
        <Select
          label="Sort"
          placeholder="Sort by Name"
          value={sortBy}
          onChange={setSortBy}
          data={[
            { value: 'name', label: 'Sort by Name' },
            { value: 'prs', label: 'Pull requests' },
            { value: 'commits', label: 'Commits' },
            { value: 'members', label: 'Members' },
          ]}
          classNames={{ label: classes.filterSelectLabel }}
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
          spacing="md"
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
                href={`/courses/${courseId}/team-analytics/${encodeURIComponent(team.repoName)}`}
                className={classes.teamCard}
              >
                <Box className={classes.teamCardTop}>
                  <Title order={4} className={classes.teamName} lineClamp={1}>
                    {team.repoName}
                  </Title>
                  <Badge
                    size="sm"
                    variant="light"
                    color={teamStatus === 'active' ? 'green' : 'orange'}
                    className={classes.statusBadge}
                  >
                    {teamStatus === 'active' ? 'Active' : 'Review needed'}
                  </Badge>
                </Box>
                <Text className={classes.memberCount}>
                  {memberCount} member{memberCount !== 1 ? 's' : ''}
                </Text>
                <Avatar.Group
                  spacing="sm"
                  className={classes.avatarGroup}
                  mt="xs"
                >
                  {members.slice(0, 4).map((user, index) => (
                    <Avatar
                      key={user}
                      radius="xl"
                      size="md"
                      color={AVATAR_COLORS[index % AVATAR_COLORS.length]} // alternate the colours LOL
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

                <Box className={classes.statsRow}>
                  <Box>
                    <Text className={classes.statValue}>
                      {formatCompactNumber(team.pullRequests ?? 0)}
                    </Text>
                    <Text className={classes.statLabel}>PRs</Text>
                  </Box>
                  <Box>
                    <Text className={classes.statValue}>
                      {formatCompactNumber(team.commits ?? 0)}
                    </Text>
                    <Text className={classes.statLabel}>Commits</Text>
                  </Box>
                  <Box>
                    <Text className={classes.statValue}>
                      {formatCompactNumber(team.issues ?? 0)}
                    </Text>
                    <Text className={classes.statLabel}>Issues</Text>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default TeamAnalytics;
