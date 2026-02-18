import CodeAnalysisAccordionItem from '@/components/code-analysis/CodeAnalysisAccordianItem';
import OverviewAccordionItem from '@/components/overview/OverviewAccordionItem';
import ProjectManagementJiraCard from '@/components/cards/ProjectManagementJiraCard';
import { CodeAnalysisData } from '@shared/types/CodeAnalysisData';
import { TeamData } from '@shared/types/TeamData';
import { DateUtils, getInitials, AVATAR_COLORS } from '@/lib/utils';
import { Course } from '@shared/types/Course';
import { TeamSet } from '@shared/types/TeamSet';
import { Profile } from '@shared/types/Profile';
import {
  Accordion,
  Anchor,
  Avatar,
  Box,
  Button,
  Center,
  Group,
  Loader,
  ScrollArea,
  SimpleGrid,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconCalendar, IconCode, IconDownload, IconUsersGroup } from '@tabler/icons-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Team as SharedTeam } from '@shared/types/Team';
import pageLayout from '@/styles/page-layout.module.css';
import classes from '@/styles/team-analytics.module.css';

export interface Team extends Omit<SharedTeam, 'teamData'> {
  teamData: string;
}

type TeamDetailStatus = 'loading' | 'ready' | 'notfound' | 'error';

interface TeamDetailProps {
  courseId: string;
  teamName: string;
  status: TeamDetailStatus;
  course?: Course | null;
  dateUtils?: DateUtils | null;
  teamSets?: TeamSet[];
}

const TeamDetail: React.FC<TeamDetailProps> = ({
  courseId,
  teamName,
  status: initialStatus,
  course,
  dateUtils,
  teamSets = [],
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [codeAnalysisData, setCodeAnalysisData] = useState<CodeAnalysisData[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, Profile>>({});
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const teamData = useMemo(
    () => teamDatas.find(d => d.repoName === teamName),
    [teamDatas, teamName]
  );

  const team = useMemo(
    () => (teamData ? teams.find(t => t.teamData === teamData._id) : undefined),
    [teams, teamData]
  );

  const teamWithBoard = useMemo(() => {
    if (!team) return null;
    for (const ts of teamSets) {
      const t = ts.teams?.find((tt: { _id: string }) => tt._id === team._id);
      if (t) return t;
    }
    return team;
  }, [teamSets, team]);

  const getTeamNumberByCodeData = useCallback(
    (codeDataTeamId: number) => {
      const relatedTeamData = teamDatas.find(d => d.teamId === codeDataTeamId);
      if (!relatedTeamData) return null;
      const relatedTeam = teams.find(t => t.teamData === relatedTeamData._id);
      return relatedTeam?.number ?? null;
    },
    [teamDatas, teams]
  );

  const codeAnalysisDataForTeam = useMemo(() => {
    if (!teamData || !team) return {};
    const filtered = codeAnalysisData.filter(
      (codeData: CodeAnalysisData) => codeData.teamId === teamData.teamId
    );
    const acc: Record<
      number,
      Record<
        string,
        {
          metrics: string[];
          values: string[];
          types: string[];
          domains: string[];
          metricStats: Map<string, { median: number; mean: number }>;
        }
      >
    > = {};
    for (const codeData of filtered) {
      const teamNumber = getTeamNumberByCodeData(codeData.teamId);
      if (teamNumber !== null) {
        if (!acc[teamNumber]) acc[teamNumber] = {};
        acc[teamNumber][new Date(codeData.executionTime).toISOString()] = {
          metrics: codeData.metrics,
          values: codeData.values,
          types: codeData.types,
          domains: codeData.domains,
          metricStats:
            codeData.metricStats ||
            new Map<string, { median: number; mean: number }>(),
        };
      }
    }
    return acc;
  }, [codeAnalysisData, teamData, team, getTeamNumberByCodeData]);

  const aiInsights = useMemo(() => {
    if (!teamData?.aiInsights || !team) return undefined;
    return teamData.aiInsights;
  }, [teamData, team]);

  const getStudentNameByGitHandle = useCallback(
    async (gitHandle: string): Promise<Profile> => {
      if (studentMap[gitHandle]) return studentMap[gitHandle];
      const res = await fetch(`/api/user/profile?gitHandle=${gitHandle}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const profile: Profile = await res.json();
      setStudentMap(prev => ({ ...prev, [gitHandle]: profile }));
      return profile;
    },
    [studentMap]
  );

  useEffect(() => {
    if (initialStatus !== 'ready' || !courseId) return;

    setFetchStatus('loading');
    Promise.all([
      fetch(`/api/teams/course/${courseId}`).then(r => (r.ok ? r.json() : [])),
      fetch(`/api/github/course/${courseId}`).then(r => (r.ok ? r.json() : [])),
      fetch(`/api/codeanalysis/course/${courseId}`).then(r =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([teamsData, teamDatasData, codeData]: [Team[], TeamData[], CodeAnalysisData[]]) => {
        setTeams(teamsData);
        setTeamDatas(teamDatasData);
        setCodeAnalysisData(codeData);
        setFetchStatus('done');
      })
      .catch(() => setFetchStatus('error'));
  }, [initialStatus, courseId]);

  const notFound =
    initialStatus === 'ready' &&
    fetchStatus === 'done' &&
    (!teamData || (teamDatas.length > 0 && !teamData));
  const error = initialStatus === 'error' || fetchStatus === 'error';
  const loading =
    initialStatus === 'loading' ||
    (initialStatus === 'ready' && fetchStatus === 'loading');

  if (loading) {
    return (
      <Box className={`${pageLayout.page} ${classes.detailPage}`} pl={20} pr={20}>
        <Box className={pageLayout.pageHeader}>
          <Anchor
            component={Link}
            href={`/courses/${courseId}/team-analytics`}
            className={classes.backLink}
          >
            <IconArrowLeft size={18} />
            Team Analytics
          </Anchor>
        </Box>
        <Center style={{ minHeight: 300 }}>
          <Loader />
        </Center>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={`${pageLayout.page} ${classes.detailPage}`} pl={20} pr={20}>
        <Box className={pageLayout.pageHeader}>
          <Anchor
            component={Link}
            href={`/courses/${courseId}/team-analytics`}
            className={classes.backLink}
          >
            <IconArrowLeft size={18} />
            Team Analytics
          </Anchor>
        </Box>
        <Center style={{ minHeight: 200 }}>
          <Text c="dimmed">Failed to load team data.</Text>
        </Center>
      </Box>
    );
  }

  if (notFound || (fetchStatus === 'done' && !teamData)) {
    return (
      <Box className={`${pageLayout.page} ${classes.detailPage}`} pl={20} pr={20}>
        <Box className={pageLayout.pageHeader}>
          <Anchor
            component={Link}
            href={`/courses/${courseId}/team-analytics`}
            className={classes.backLink}
          >
            <IconArrowLeft size={18} />
            Team Analytics
          </Anchor>
        </Box>
        <Center style={{ minHeight: 200 }}>
          <Text c="dimmed">Team not found.</Text>
        </Center>
      </Box>
    );
  }

  const repoName = teamData?.repoName ?? 'Team';
  const teamNumber = team?.number;
  const codeData = teamNumber != null ? codeAnalysisDataForTeam[teamNumber] : undefined;
  const memberHandles = teamData ? Object.keys(teamData.teamContributions ?? {}) : [];
  const openPRs = (teamData?.teamPRs ?? []).filter(
    pr => (pr.state ?? '').toLowerCase() === 'open'
  );
  const prsWithReviews = (teamData?.teamPRs ?? []).filter(
    pr => (pr.reviews?.length ?? 0) > 0
  ).length;

  return (
    <ScrollArea
      style={{
        height: '100vh',
        paddingRight: '20px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
      }}
    >
      <Box className={`${pageLayout.page} ${classes.detailPage}`} pl={20} pr={20}>
        <Box className={pageLayout.pageHeader}>
          <Title order={1} className={classes.detailTitle}>
            {repoName}
          </Title>
          {course?.code && (
            <Text className={classes.detailMeta}>
              {course.code}
              {course.semester ? ` · ${course.semester}` : ''}
            </Text>
          )}
          <Group className={classes.detailHeaderActions} justify="space-between" wrap="wrap">
            <Group gap="sm">
              <Avatar.Group spacing="sm">
                {memberHandles.slice(0, 5).map((handle, index) => (
                  <Avatar
                    key={handle}
                    radius="xl"
                    size="sm"
                    color={AVATAR_COLORS[index % AVATAR_COLORS.length]}
                  >
                    {getInitials(handle)}
                  </Avatar>
                ))}
                {memberHandles.length > 5 && (
                  <Avatar radius="xl" size="sm" color="gray">
                    +{memberHandles.length - 5}
                  </Avatar>
                )}
              </Avatar.Group>
              <Text className={classes.memberCount} component="span">
                {memberHandles.length} member{memberHandles.length !== 1 ? 's' : ''}
              </Text>
            </Group>
            <Button
              variant="default"
              leftSection={<IconDownload size={16} />}
              className={classes.exportButton}
            >
              Export Report
            </Button>
          </Group>
        </Box>

        <Tabs defaultValue="team-review" className={classes.detailTabs}>
          <Tabs.List>
            <Tabs.Tab value="team-review" leftSection={<IconUsersGroup size={16} />}>
              Team Review
            </Tabs.Tab>
            <Tabs.Tab value="code-analysis" leftSection={<IconCode size={16} />}>
              Code Analysis
            </Tabs.Tab>
            <Tabs.Tab value="project-management" leftSection={<IconCalendar size={16} />}>
              Project Management
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="team-review" pt="md">
            {teamData && dateUtils && (
              <Box className={classes.tabPanel}>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} className={classes.overviewStatsGrid}>
                  <Box className={classes.overviewStatCard}>
                    <Text className={classes.overviewStatCardTitle}>Pull requests</Text>
                    <Text className={classes.overviewStatCardValue}>
                      {teamData.pullRequests ?? 0}
                    </Text>
                    <Text className={classes.overviewStatCardDetail}>
                      {openPRs.length} open
                    </Text>
                  </Box>
                  <Box className={classes.overviewStatCard}>
                    <Text className={classes.overviewStatCardTitle}>Code quality</Text>
                    <Text className={classes.overviewStatCardValue}>
                      —
                    </Text>
                    <Text className={classes.overviewStatCardDetail}>
                      From code analysis
                    </Text>
                  </Box>
                  <Box className={classes.overviewStatCard}>
                    <Text className={classes.overviewStatCardTitle}>Commits</Text>
                    <Text className={classes.overviewStatCardValue}>
                      {teamData.commits ?? 0}
                    </Text>
                    <Text className={classes.overviewStatCardDetail}>
                      Total commits
                    </Text>
                  </Box>
                  <Box className={classes.overviewStatCard}>
                    <Text className={classes.overviewStatCardTitle}>Peer reviews</Text>
                    <Text className={classes.overviewStatCardValue}>
                      {prsWithReviews}
                    </Text>
                    <Text className={classes.overviewStatCardDetail}>
                      PRs with reviews
                    </Text>
                  </Box>
                </SimpleGrid>
                <Accordion multiple variant="separated" defaultValue={[teamData._id]}>
                  <OverviewAccordionItem
                    index={0}
                    teamData={teamData}
                    team={team ?? undefined}
                    teamDatas={teamDatas}
                    dateUtils={dateUtils}
                    getStudentNameByGitHandle={getStudentNameByGitHandle}
                  />
                </Accordion>
              </Box>
            )}
            {(!teamData || !dateUtils) && (
              <Center py="xl">
                <Text c="dimmed">No team review data available.</Text>
              </Center>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="code-analysis" pt="md">
            {codeData && teamNumber != null ? (
              <Box className={classes.tabPanel}>
                <Accordion multiple variant="separated" defaultValue={[teamNumber.toString()]}>
                  <CodeAnalysisAccordionItem
                  codeData={codeData}
                  teamNumber={teamNumber}
                  aiInsights={aiInsights}
                  renderTutorialPopover={false}
                />
                </Accordion>
              </Box>
            ) : (
              <Center py="xl">
                <Text c="dimmed">No code analysis data for this team yet.</Text>
              </Center>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="project-management" pt="md">
            {teamWithBoard?.board != null ? (
              <Box className={classes.tabPanel}>
                <ProjectManagementJiraCard
                  TA={teamWithBoard.TA ?? null}
                  jiraBoard={teamWithBoard.board}
                  renderTutorialPopover={false}
                />
              </Box>
            ) : (
              <Center py="xl">
                <Text c="dimmed">
                  No project board linked for this team. Link a Jira board from the
                  course Project Management page.
                </Text>
              </Center>
            )}
          </Tabs.Panel>
        </Tabs>
      </Box>
    </ScrollArea>
  );
};

export default TeamDetail;
