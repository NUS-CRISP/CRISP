import React, { useEffect, useMemo, useState } from 'react';
import {
  Center,
  Loader,
  Notification,
  Stack,
  Group,
  Select,
  TextInput,
  SegmentedControl,
  Text,
  Container,
  Divider,
  Button,
  Collapse,
  ScrollArea,
  Card,
} from '@mantine/core';
import { IconSearch, IconUserPlus, IconFilter } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import {
  PeerReviewSubmissionsDTO,
  PeerReviewSubmissionListItemDTO,
} from '@shared/types/PeerReviewAssessment';
import PeerReviewSubmissionCard from '../cards/PeerReviewSubmissionCard';
import AssignGradersModal from '../cards/Modals/AssignGradersModal';
import ResultsPaginationDisplay from '../peer-review/ResultsPaginationDisplay';

type StatusFilter = 'All' | 'NotStarted' | 'Draft' | 'Submitted';
type ReviewerKindFilter = 'All' | 'Student' | 'Team' | 'TA';
type GradingFilter = 'All' | 'Ungraded' | 'HasGrades';

interface PeerReviewSubmissionsProps {
  courseId: string;
  assessmentId: string;
  isFaculty: boolean;
}

const PeerReviewSubmissions: React.FC<PeerReviewSubmissionsProps> = ({
  courseId,
  assessmentId,
  isFaculty,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dto, setDto] = useState<PeerReviewSubmissionsDTO | null>(null);

  // UI filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [reviewerKindFilter, setReviewerKindFilter] =
    useState<ReviewerKindFilter>('All');
  const [gradingFilter, setGradingFilter] = useState<GradingFilter>('All');
  const [search, setSearch] = useState('');
  const [graderFilter, setGraderFilter] = useState<string | null>(null);

  const [assignModalOpened, { open: openAssignModal, close: closeAssignModal }] =
    useDisclosure(false);
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<string>('20');

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit,
      });
      
      const res = await fetch(
        `/api/peer-review-assessments/${courseId}/${assessmentId}/submissions?${params}`,
        { method: 'GET' }
      );

      const text = await res.text();
      if (!res.ok) throw new Error(text || res.statusText);

      const data: PeerReviewSubmissionsDTO = JSON.parse(text);
      setDto(data);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [courseId, assessmentId, page, limit]);

  const revieweeOptions = useMemo(() => {
    if (!dto) return [];
    const uniq = new Map<string, { value: string; label: string }>();
    for (const item of dto.items) {
      const id = item.revieweeTeam.teamId;
      const label = `Team ${item.revieweeTeam.teamNumber}`;
      uniq.set(id, { value: id, label });
    }
    return Array.from(uniq.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [dto]);

  const graderOptions = useMemo(() => {
    if (!dto) return [];
    const uniq = new Map<string, { value: string; label: string }>();
    for (const item of dto.items) {
      for (const grader of item.grading.graders) {
        uniq.set(grader.id, { value: grader.id, label: grader.name });
      }
    }
    return Array.from(uniq.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [dto]);

  const [revieweeTeamId, setRevieweeTeamId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!dto) return [];

    const q = search.trim().toLowerCase();

    return dto.items.filter(item => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (reviewerKindFilter !== 'All' && item.reviewerKind !== reviewerKindFilter)
        return false;

      if (gradingFilter === 'Ungraded' && item.grading.count > 0) return false;
      if (gradingFilter === 'HasGrades' && item.grading.count === 0) return false;

      if (revieweeTeamId && item.revieweeTeam.teamId !== revieweeTeamId)
        return false;

      if (graderFilter && !item.grading.graders.some(g => g.id === graderFilter))
        return false;

      if (!q) return true;

      const reviewerText =
        item.reviewer.kind === 'User'
          ? `${item.reviewer.name} ${item.reviewer.userId}`
          : `team ${item.reviewer.teamNumber}`;

      const haystack = [
        reviewerText,
        `team ${item.revieweeTeam.teamNumber}`,
        item.repo.repoName,
        item.repo.repoUrl,
        item.status,
        item.reviewerKind,
        item.grading.graders.map(g => g.name).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [
    dto,
    search,
    statusFilter,
    reviewerKindFilter,
    gradingFilter,
    revieweeTeamId,
    graderFilter,
  ]);

  if (loading) {
    return (
      <Center mt={80}>
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Notification color="red" title="Error" onClose={() => setError(null)}>
        {error}
      </Notification>
    );
  }

  if (!dto) return <Text>No data.</Text>;

  return (
    <Container pt="6px" pb="lg">
      <ScrollArea
        style={{ height: 'calc(100vh - 180px)' }}
        scrollbarSize={8}
        offsetScrollbars
        pb="md"
      >
        <Stack gap="md" my="md" mr="xs">
          <Card withBorder radius="md" p="md">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Stack gap={4}>
                <Text fw={800} fz="xl">
                  Review submissions
                </Text>
                <Text fz="sm" c="dimmed">
                  {isFaculty
                    ? 'All reviewer submissions for this peer review assessment.'
                    : 'Submissions you are assigned to grade.'}
                </Text>
              </Stack>

              <Group gap="sm">
                {isFaculty && (
                  <Button
                    leftSection={<IconUserPlus size={16} />}
                    onClick={openAssignModal}
                    disabled={!dto || dto.items.length === 0}
                  >
                    Assign graders
                  </Button>
                )}

                <Button
                  leftSection={<IconFilter size={16} />}
                  onClick={toggleFilters}
                  variant={filtersOpened ? 'filled' : 'light'}
                >
                  Filters
                </Button>
              </Group>
            </Group>

            <Divider my="sm" />

            <Group gap="sm" align="flex-end" justify="space-between" wrap="wrap">
              <TextInput
                leftSection={<IconSearch size={16} />}
                label="Search"
                placeholder="Reviewer, team, repo, grader…"
                value={search}
                onChange={e => setSearch(e.currentTarget.value)}
                w={360}
              />

              <SegmentedControl
                value={gradingFilter}
                onChange={v => setGradingFilter(v as GradingFilter)}
                data={[
                  { value: 'All', label: 'All' },
                  { value: 'Ungraded', label: 'Ungraded' },
                  { value: 'HasGrades', label: 'Graded' },
                ]}
                size="sm"
              />
            </Group>

            <Collapse in={filtersOpened}>
              <Stack gap="sm" mt="sm">
                <Group gap="sm" align="flex-end" wrap="wrap">
                  <Select
                    label="Reviewee team"
                    placeholder="All teams"
                    data={revieweeOptions}
                    value={revieweeTeamId}
                    onChange={setRevieweeTeamId}
                    clearable
                    searchable
                    nothingFoundMessage="No teams"
                    w={180}
                  />

                  <Select
                    label="Reviewer kind"
                    data={[
                      { value: 'All', label: 'All' },
                      { value: 'Student', label: 'Student' },
                      { value: 'Team', label: 'Team' },
                      { value: 'TA', label: 'TA' },
                    ]}
                    value={reviewerKindFilter}
                    onChange={v =>
                      setReviewerKindFilter((v as ReviewerKindFilter) || 'All')
                    }
                    w={160}
                  />

                  <Select
                    label="Status"
                    data={[
                      { value: 'All', label: 'All' },
                      { value: 'NotStarted', label: 'Not started' },
                      { value: 'Draft', label: 'Draft' },
                      { value: 'Submitted', label: 'Submitted' },
                    ]}
                    value={statusFilter}
                    onChange={v => setStatusFilter((v as StatusFilter) || 'All')}
                    w={160}
                  />

                  <Select
                    label="Grader"
                    placeholder="All graders"
                    data={graderOptions}
                    value={graderFilter}
                    onChange={setGraderFilter}
                    clearable
                    searchable
                    nothingFoundMessage="No graders assigned"
                    w={220}
                  />
                </Group>
              </Stack>
            </Collapse>
          </Card>
          
          <Stack gap="sm">
            {filteredItems.length > 0
              ? filteredItems.map((item: PeerReviewSubmissionListItemDTO) => (
                  <PeerReviewSubmissionCard
                    key={item.peerReviewSubmissionId}
                    courseId={courseId}
                    assessmentId={assessmentId}
                    item={item}
                    maxMarks={dto.maxMarks}
                    canGrade={true}
                    isFaculty={isFaculty}
                    onAfterAction={fetchSubmissions}
                  />
                ))
              : <Center>No submissions found.</Center>
            }
          </Stack>
          
          <ResultsPaginationDisplay
            numResultsDisplay={`${filteredItems.length} / ${dto.pagination.total}`}
            limit={limit}
            page={page}
            totalPages={dto.pagination.totalPages}
            onLimitChange={val => {
              setLimit(val);
              setPage(1);
            }}
            onPageChange={setPage}
          />
        </Stack>
      </ScrollArea>
      <AssignGradersModal
        opened={assignModalOpened}
        onClose={closeAssignModal}
        courseId={courseId}
        assessmentId={assessmentId}
        onAssigned={fetchSubmissions}
      />
    </Container>
  );
};

export default PeerReviewSubmissions;
