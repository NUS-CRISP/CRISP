import {
  Box,
  Card,
  Divider,
  Group,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconChartArrowsVertical,
  IconChecks,
  IconClipboardCheck,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { PeerReviewProgressOverviewDTO } from '@shared/types/PeerReview';

interface PeerReviewProgressOverviewProps {
  courseId: string;
  peerReviewId: string;
  title?: string;
  enabled?: boolean;
  showGrading?: boolean;
}

const emptyOverview: PeerReviewProgressOverviewDTO = {
  peerReviewId: '',
  scope: 'course',
  submissions: {
    total: 0,
    notStarted: 0,
    draft: 0,
    submitted: 0,
    started: 0,
  },
  grading: {
    total: 0,
    graded: 0,
    inProgress: 0,
    notYetGraded: 0,
    toBeAssigned: 0,
  },
};

const LegendItem: React.FC<{
  color: string;
  label: string;
  count?: number;
  percent?: number;
}> = ({ color, label, count, percent }) => (
  <Group justify="space-between" gap="sm" wrap="nowrap">
    <Group gap={6} wrap="nowrap">
      <ThemeIcon size={10} radius="xl" color={color} variant="filled" />
      <Text fz="11px" c="dimmed">
        {label}
      </Text>
    </Group>
    <Text fz="11px" fw={600} c="dimmed" ta="right">
      {typeof count === 'number' ? count : '—'}
      {typeof percent === 'number' ? ` · ${percent}%` : ''}
    </Text>
  </Group>
);

const StatCard: React.FC<{
  color: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ color, icon, title, children }) => (
  <Card
    withBorder
    radius="md"
    p="sm"
    h="100%"
    style={{ backgroundColor: '#2b2b2b' }}
  >
    <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
      <Box>
        <Text fw={700} fz="sm" mt={2}>
          {title}
        </Text>
      </Box>
      <ThemeIcon size={34} radius="xl" color={color} variant="light">
        {icon}
      </ThemeIcon>
    </Group>

    {children}
  </Card>
);

const PeerReviewProgressOverview: React.FC<PeerReviewProgressOverviewProps> = ({
  courseId,
  peerReviewId,
  title = 'Progress Overview',
  enabled = true,
  showGrading = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] =
    useState<PeerReviewProgressOverviewDTO>(emptyOverview);

  useEffect(() => {
    if (!enabled || !courseId || !peerReviewId) return;

    const fetchOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/peer-review/${courseId}/${peerReviewId}/progress-overview`,
          { method: 'GET' }
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.message ?? res.statusText);
        setOverview(body);
      } catch (e) {
        setError((e as Error).message ?? 'Failed to load progress overview');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [courseId, peerReviewId, enabled]);

  const exactPct = (value: number, total: number) => {
    if (!total) return 0;
    return Math.max(0, Math.min(100, (value / total) * 100));
  };

  const displayPct = (value: number, total: number) => {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  };

  const reviewsStartedPct = displayPct(
    overview.submissions.started,
    overview.submissions.total
  );

  const submissionsCompletedPct = displayPct(
    overview.submissions.submitted,
    overview.submissions.total
  );

  const gradingCompletedPct = displayPct(
    overview.grading.graded,
    overview.grading.total
  );

  const submissionStatusItems = useMemo(
    () => [
      {
        label: 'Not Started',
        count: overview.submissions.notStarted,
        color: 'gray',
        percent: displayPct(
          overview.submissions.notStarted,
          overview.submissions.total
        ),
        value: exactPct(
          overview.submissions.notStarted,
          overview.submissions.total
        ),
      },
      {
        label: 'Draft',
        count: overview.submissions.draft,
        color: 'blue',
        percent: displayPct(
          overview.submissions.draft,
          overview.submissions.total
        ),
        value: exactPct(overview.submissions.draft, overview.submissions.total),
      },
      {
        label: 'Completed',
        count: overview.submissions.submitted,
        color: 'green',
        percent: displayPct(
          overview.submissions.submitted,
          overview.submissions.total
        ),
        value: exactPct(
          overview.submissions.submitted,
          overview.submissions.total
        ),
      },
    ],
    [overview]
  );

  const gradingStatusItems = useMemo(
    () => [
      {
        label: 'Already Graded',
        count: overview.grading.graded,
        color: 'green',
        percent: displayPct(overview.grading.graded, overview.grading.total),
        value: exactPct(overview.grading.graded, overview.grading.total),
      },
      {
        label: 'Is Grading',
        count: overview.grading.inProgress,
        color: 'yellow',
        percent: displayPct(
          overview.grading.inProgress,
          overview.grading.total
        ),
        value: exactPct(overview.grading.inProgress, overview.grading.total),
      },
      {
        label: 'Not Yet Graded',
        count: overview.grading.notYetGraded,
        color: 'violet',
        percent: displayPct(
          overview.grading.notYetGraded,
          overview.grading.total
        ),
        value: exactPct(overview.grading.notYetGraded, overview.grading.total),
      },
      {
        label: 'To Be Assigned',
        count: overview.grading.toBeAssigned,
        color: 'gray',
        percent: displayPct(
          overview.grading.toBeAssigned,
          overview.grading.total
        ),
        value: exactPct(overview.grading.toBeAssigned, overview.grading.total),
      },
    ],
    [overview]
  );

  if (!enabled) return null;

  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      mb="md"
      style={{ backgroundColor: '#2b2b2b' }}
    >
      <Stack gap="sm">
        <Stack gap={2}>
          <Text fw={600} fz="sm">
            {title}
          </Text>
          <Text c="dimmed" fz="sm">
            Review activity and completion status.
          </Text>
        </Stack>

        <Divider my="xs" />

        {error ? (
          <Text c="red" fz="sm">
            {error}
          </Text>
        ) : (
          <Box>
            <SimpleGrid
              cols={{ base: 1, sm: 2, lg: showGrading ? 3 : 2 }}
              spacing="sm"
            >
              <StatCard
                color="cyan"
                icon={<IconChartArrowsVertical size={18} />}
                title="Reviews Started"
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-end" wrap="nowrap">
                    <Box>
                      <Text fz="30px" fw={800} lh={1}>
                        {loading ? '—' : overview.submissions.started}
                      </Text>
                      <Text fz="sm" c="dimmed" mt={4}>
                        Out of {loading ? '—' : overview.submissions.total}{' '}
                        submissions
                      </Text>
                    </Box>
                  </Group>

                  <Progress.Root size="md" radius="xl">
                    <Progress.Section
                      value={
                        loading
                          ? 0
                          : exactPct(
                              overview.submissions.started,
                              overview.submissions.total
                            )
                      }
                      color="cyan"
                      aria-label="Started reviews"
                    />
                    <Progress.Section
                      value={
                        loading
                          ? 0
                          : Math.max(
                              0,
                              100 -
                                exactPct(
                                  overview.submissions.started,
                                  overview.submissions.total
                                )
                            )
                      }
                      color="dark.4"
                      aria-label="Not started reviews"
                    />
                  </Progress.Root>

                  <Group justify="space-between" gap="sm">
                    <Text fz="11px" c="dimmed">
                      {loading ? '—' : `${reviewsStartedPct}% started`}
                    </Text>
                    <Text fz="11px" c="dimmed">
                      {loading
                        ? '—'
                        : `${Math.max(overview.submissions.total - overview.submissions.started, 0)} still idle`}
                    </Text>
                  </Group>
                </Stack>
              </StatCard>

              <StatCard
                color="blue"
                icon={<IconClipboardCheck size={18} />}
                title="Submission Status"
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Stack gap={2}>
                      <Text fz="11px" c="dimmed" tt="uppercase" fw={700}>
                        Completed
                      </Text>
                      <Text fw={800} fz="xl" lh={1}>
                        {loading ? '—' : `${submissionsCompletedPct}%`}
                      </Text>
                    </Stack>

                    <RingProgress
                      size={112}
                      thickness={12}
                      rootColor="rgba(255,255,255,0.08)"
                      transitionDuration={300}
                      sections={
                        loading
                          ? []
                          : submissionStatusItems.map(item => ({
                              value: item.value,
                              color: item.color,
                            }))
                      }
                      label={
                        <Stack gap={0} align="center">
                          <Text ta="center" fz="lg" fw={800} lh={1.1}>
                            {loading ? '—' : overview.submissions.total}
                          </Text>
                          <Text ta="center" fz="10px" c="dimmed">
                            total
                          </Text>
                        </Stack>
                      }
                    />
                  </Group>

                  <Progress.Root size="sm" radius="xl">
                    {loading
                      ? null
                      : submissionStatusItems.map(item => (
                          <Progress.Section
                            key={item.label}
                            value={item.value}
                            color={item.color}
                            aria-label={item.label}
                          />
                        ))}
                  </Progress.Root>

                  <Stack gap={6}>
                    {submissionStatusItems.map(item => (
                      <LegendItem
                        key={item.label}
                        color={item.color}
                        label={item.label}
                        count={loading ? undefined : item.count}
                        percent={loading ? undefined : item.percent}
                      />
                    ))}
                  </Stack>
                </Stack>
              </StatCard>

              {showGrading && (
                <StatCard
                  color="green"
                  icon={<IconChecks size={18} />}
                  title="Grading Status"
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Stack gap={2}>
                        <Text fz="11px" c="dimmed" tt="uppercase" fw={700}>
                          Graded
                        </Text>
                        <Text fw={800} fz="xl" lh={1}>
                          {loading ? '—' : `${gradingCompletedPct}%`}
                        </Text>
                      </Stack>

                      <RingProgress
                        size={112}
                        thickness={12}
                        rootColor="rgba(255,255,255,0.08)"
                        transitionDuration={300}
                        sections={
                          loading
                            ? []
                            : gradingStatusItems.map(item => ({
                                value: item.value,
                                color: item.color,
                              }))
                        }
                        label={
                          <Stack gap={0} align="center">
                            <Text ta="center" fz="lg" fw={800} lh={1.1}>
                              {loading ? '—' : overview.grading.total}
                            </Text>
                            <Text ta="center" fz="10px" c="dimmed">
                              total
                            </Text>
                          </Stack>
                        }
                      />
                    </Group>

                    <Progress.Root size="sm" radius="xl">
                      {loading
                        ? null
                        : gradingStatusItems.map(item => (
                            <Progress.Section
                              key={item.label}
                              value={item.value}
                              color={item.color}
                              aria-label={item.label}
                            />
                          ))}
                    </Progress.Root>

                    <Stack gap={6}>
                      {gradingStatusItems.map(item => (
                        <LegendItem
                          key={item.label}
                          color={item.color}
                          label={item.label}
                          count={loading ? undefined : item.count}
                          percent={loading ? undefined : item.percent}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </StatCard>
              )}
            </SimpleGrid>
          </Box>
        )}
      </Stack>
    </Card>
  );
};

export default PeerReviewProgressOverview;
