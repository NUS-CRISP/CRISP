import {
  Box,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Course } from '@shared/types/Course';
import { TeamData, TeamPR } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import {
  IconChecklist,
  IconGitPullRequest,
  IconMessagePlus,
  IconSettings,
  IconUsersGroup,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import classes from '@/styles/course-overview.module.css';
import pageLayout from '@/styles/root-layout.module.css';
import AllTeams from '../overview/analytics/team/AllTeams';

interface OverviewProps {
  courseId: string;
}

type Stat = {
  label: string;
  value: string;
  sublabel?: string;
  color?: string;
};

const formatCompactNumber = (n: number) =>
  new Intl.NumberFormat('en', { notation: 'compact' }).format(n);

const toDate = (d: unknown): Date | null => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d as string);
  return isNaN(date.getTime()) ? null : date;
};

const timeAgo = (d: Date) => {
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const normalizePrState = (s?: string) => (s ?? '').trim().toLowerCase();

const CourseOverview: React.FC<OverviewProps> = ({ courseId }) => {
  const permission = hasFacultyPermission();

  const [course, setCourse] = useState<Course | null>(null);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [status, setStatus] = useState<Status>(Status.Loading);

  const getCourse = async () => {
    const res = await fetch(`/api/courses/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch course');
    const c: Course = await res.json();
    return c;
  };

  const getTeamDatas = async () => {
    const res = await fetch(`/api/github/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch team data');
    const teamDatas: TeamData[] = await res.json();
    return teamDatas;
  };

  useEffect(() => {
    const fetchData = async () => {
      setStatus(Status.Loading);
      try {
        const [fetchedCourse, fetchedTeamDatas] = await Promise.all([
          getCourse(),
          getTeamDatas(),
        ]);
        setCourse(fetchedCourse);
        setTeamDatas(fetchedTeamDatas);
        setStatus(Status.Idle);
      } catch (error) {
        setStatus(Status.Error);
        console.error(error);
      }
    };

    fetchData();
  }, [courseId]);

  const uniqueTeamData = useMemo(
    () =>
      teamDatas.filter(
        (team, index, self) =>
          index === self.findIndex(t => t.repoName === team.repoName)
      ),
    [teamDatas]
  );

  const totals = useMemo(() => {
    const totalCommits = uniqueTeamData.reduce(
      (acc, t) => acc + (t.commits ?? 0),
      0
    );
    const totalPRs = uniqueTeamData.reduce(
      (acc, t) => acc + (t.pullRequests ?? 0),
      0
    );

    const allPRs: Array<TeamPR & { repoName: string }> = [];
    for (const t of uniqueTeamData) {
      for (const pr of t.teamPRs ?? [])
        allPRs.push({ ...pr, repoName: t.repoName });
    }
    const openPRs = allPRs.filter(pr => normalizePrState(pr.state) === 'open');
    const pendingReviews = openPRs.filter(
      pr => (pr.reviews?.length ?? 0) === 0
    );

    return {
      totalCommits,
      totalPRs,
      openPRsCount: openPRs.length,
      pendingReviewsCount: pendingReviews.length,
      totalRepos: uniqueTeamData.length,
    };
  }, [uniqueTeamData]);

  const stats: Stat[] = useMemo(() => {
    const totalStudents = course?.students?.length ?? 0;
    const activeTeams = course?.teamSets?.length
      ? course.teamSets.reduce((acc, ts) => acc + (ts.teams?.length ?? 0), 0)
      : undefined;

    return [
      {
        label: 'Total students',
        value: formatCompactNumber(totalStudents),
        sublabel: activeTeams ? `${activeTeams} teams configured` : undefined,
        color: 'blue',
      },
      {
        label: 'Pull requests',
        value: formatCompactNumber(totals.totalPRs),
        sublabel: `${totals.openPRsCount} open`,
        color: 'grape',
      },
      {
        label: 'Code commits',
        value: formatCompactNumber(totals.totalCommits),
        sublabel: `Across ${totals.totalRepos} repos`,
        color: 'teal',
      },
      {
        label: 'Pending reviews',
        value: formatCompactNumber(totals.pendingReviewsCount),
        sublabel: 'Open PRs with no reviews',
        color: 'orange',
      },
    ];
  }, [course, totals]);

  const recentActivity = useMemo(() => {
    const allPRs: Array<TeamPR & { repoName: string }> = [];
    for (const t of uniqueTeamData) {
      for (const pr of t.teamPRs ?? [])
        allPRs.push({ ...pr, repoName: t.repoName });
    }

    const withDates = allPRs
      .map(pr => ({
        ...pr,
        createdAtDate: toDate(pr.createdAt),
        updatedAtDate: toDate(pr.updatedAt),
      }))
      .filter(pr => pr.createdAtDate || pr.updatedAtDate);

    withDates.sort((a, b) => {
      const ad = (a.updatedAtDate ?? a.createdAtDate)!.getTime();
      const bd = (b.updatedAtDate ?? b.createdAtDate)!.getTime();
      return bd - ad;
    });

    return withDates.slice(0, 8);
  }, [uniqueTeamData]);

  if (status === Status.Loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Container mt={40}>
          <Loader />
        </Container>
      </Center>
    );
  }

  if (status === Status.Error) {
    return (
      <Center style={{ height: '70vh' }}>
        <Text c="dimmed">No GitHub data available for this course.</Text>
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
      style={{
        paddingRight: '20px',
      }}
    >
      <Box className={pageLayout.page} pl={20} pr={20}>
        <Box className={classes.pageHeader}>
          <Title order={1} className={pageLayout.pageTitle}>
            Course Overview
          </Title>
          <Text c="dimmed" className={pageLayout.pageSubtitle}>
            Manage your course, track progress, and review student performance
          </Text>
        </Box>

        <Group align="stretch" className={classes.overviewRow}>
          <Box className={classes.graphCard}>
            <AllTeams teamDatas={teamDatas} />
          </Box>

          <Card withBorder radius="lg" className={classes.statsCard}>
            <Stack gap={0} className={classes.statsCardStack}>
              {stats.map((s, idx) => (
                <Box
                  key={s.label}
                  className={classes.statRow}
                  data-last={idx === stats.length - 1 || undefined}
                >
                  <Text className={classes.statLabel}>{s.label}</Text>
                  <Text
                    className={classes.statValue}
                    style={
                      s.color
                        ? {
                            color: `var(--mantine-color-${s.color}-6)`,
                          }
                        : undefined
                    }
                  >
                    {s.value}
                  </Text>
                  {s.sublabel && (
                    <Text
                      className={classes.statSublabel}
                      style={
                        s.color
                          ? {
                              color: `var(--mantine-color-${s.color}-5)`,
                            }
                          : undefined
                      }
                    >
                      {s.sublabel}
                    </Text>
                  )}
                </Box>
              ))}
            </Stack>
          </Card>
        </Group>

        <Box mt={30}>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            <Card
              withBorder
              radius="xl"
              component={Link}
              href={`/courses/${courseId}/team-analytics`}
              className={`${classes.navCard} ${classes.navCardPrimary}`}
            >
              <ThemeIcon radius="md" size={80} className={classes.navIcon}>
                <IconUsersGroup size={34} />
              </ThemeIcon>
              <Title order={3} className={classes.navTitle}>
                Team Analytics
              </Title>
              <Text className={classes.navDescription}>
                Deep dive into team performance metrics, code quality, and
                project progress
              </Text>
            </Card>

            <Card
              withBorder
              radius="xl"
              component={Link}
              href={`/courses/${courseId}/peer-review`}
              className={`${classes.navCard} ${classes.navCardFeatured}`}
            >
              <ThemeIcon radius="md" size={80} className={classes.navIcon}>
                <IconMessagePlus size={34} />
              </ThemeIcon>
              <Title order={3} className={classes.navTitle}>
                Peer Review
              </Title>
              <Text className={classes.navDescription}>
                Review peer evaluations and provide feedback
              </Text>
            </Card>

            {permission ? (
              <Card
                withBorder
                radius="xl"
                component={Link}
                href={`/courses/${courseId}/assessments`}
                className={`${classes.navCard} ${classes.navCardFeatured}`}
              >
                <ThemeIcon radius="md" size={80} className={classes.navIcon}>
                  <IconChecklist size={34} />
                </ThemeIcon>
                <Group justify="space-between" wrap="nowrap">
                  <Title order={3} className={classes.navTitle}>
                    Create Assessment
                  </Title>
                </Group>
                <Text className={classes.navDescription}>
                  Set up a new assignment or evaluation for your students
                </Text>
              </Card>
            ) : (
              <Card
                withBorder
                radius="xl"
                component="div"
                className={`${classes.navCard} ${classes.navCardFeatured} ${classes.navCardDisabled}`}
              >
                <ThemeIcon radius="md" size={80} className={classes.navIcon}>
                  <IconChecklist size={34} />
                </ThemeIcon>
                <Group justify="space-between" wrap="nowrap">
                  <Title order={3} className={classes.navTitle}>
                    Create Assessment
                  </Title>
                </Group>
                <Text className={classes.navDescription}>
                  Set up a new assignment or evaluation for your students
                </Text>
                <Text size="xs" c="dimmed" mt="sm">
                  Available to faculty only
                </Text>
              </Card>
            )}

            {permission ? (
              <Card
                withBorder
                radius="xl"
                component={Link}
                href={`/courses/${courseId}/repositories`}
                className={`${classes.navCard} ${classes.navCardSettings}`}
              >
                <ThemeIcon
                  radius="md"
                  size={80}
                  className={classes.navIconMuted}
                >
                  <IconSettings size={34} />
                </ThemeIcon>
                <Title order={3} className={classes.navTitle}>
                  Course Settings
                </Title>
                <Text className={classes.navDescription}>
                  Manage people, repositories, timeline, and course
                  configuration
                </Text>
              </Card>
            ) : (
              <Card
                withBorder
                radius="xl"
                component="div"
                className={`${classes.navCard} ${classes.navCardSettings} ${classes.navCardDisabled}`}
              >
                <ThemeIcon
                  radius="md"
                  size={80}
                  className={classes.navIconMuted}
                >
                  <IconSettings size={34} />
                </ThemeIcon>
                <Title order={3} className={classes.navTitle}>
                  Course Settings
                </Title>
                <Text className={classes.navDescription}>
                  Manage people, repositories, timeline, and course
                  configuration
                </Text>
                <Text size="xs" c="dimmed" mt="sm">
                  Available to faculty only
                </Text>
              </Card>
            )}
          </SimpleGrid>
        </Box>

        <Box mt={40} pb={30}>
          <Group justify="space-between" mb="md">
            <Title order={2}>Recent activity</Title>
            <Text size="sm" c="dimmed">
              Based on PR updates across repos
            </Text>
          </Group>

          <Card withBorder radius="lg" className={classes.activityCard}>
            {recentActivity.length === 0 ? (
              <Center style={{ padding: '22px 10px' }}>
                <Text c="dimmed">No recent pull request activity.</Text>
              </Center>
            ) : (
              <Stack gap={0}>
                {recentActivity.map((item, idx) => {
                  const activityDate =
                    item.updatedAtDate ?? item.createdAtDate ?? new Date();
                  const isLast = idx === recentActivity.length - 1;
                  return (
                    <Box key={`${item.repoName}-${item.id}`}>
                      <Group
                        align="flex-start"
                        justify="space-between"
                        wrap="nowrap"
                        className={classes.activityRow}
                      >
                        <Group gap="sm" wrap="nowrap">
                          <ThemeIcon
                            radius="md"
                            variant="light"
                            color="blue"
                            className={classes.activityIcon}
                          >
                            <IconGitPullRequest size={18} />
                          </ThemeIcon>
                          <Box>
                            <Text fw={500} lineClamp={1}>
                              {item.title || `PR #${item.id}`}
                            </Text>
                            <Text size="sm" c="dimmed" lineClamp={1}>
                              {item.repoName}
                              {item.user ? ` • opened by ${item.user}` : ''}
                            </Text>
                            {item.url && (
                              <Text
                                size="sm"
                                component="a"
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className={classes.activityLink}
                              >
                                View PR
                              </Text>
                            )}
                          </Box>
                        </Group>
                        <Text
                          size="sm"
                          c="dimmed"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {timeAgo(activityDate)}
                        </Text>
                      </Group>
                      {!isLast && <Divider />}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default CourseOverview;
