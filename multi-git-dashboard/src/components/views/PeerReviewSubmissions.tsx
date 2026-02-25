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
  ScrollArea,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import {
  PeerReviewSubmissionsDTO,
  PeerReviewSubmissionListItemDTO,
} from '@shared/types/PeerReviewAssessment';
import PeerReviewSubmissionCard from '../cards/PeerReviewSubmissionCard';

type StatusFilter = 'All' | 'NotStarted' | 'Draft' | 'Submitted';
type ReviewerKindFilter = 'All' | 'Student' | 'Team' | 'TA';
type GradingFilter = 'All' | 'Ungraded' | 'HasGrades';

interface PeerReviewSubmissionsProps {
  courseId: string;
  assessmentId: string;
  hasFacultyPermission: boolean;
}

const PeerReviewSubmissions: React.FC<PeerReviewSubmissionsProps> = ({
  courseId,
  assessmentId,
  hasFacultyPermission,
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

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/peer-review-assessments/${courseId}/${assessmentId}/submissions`,
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
  }, [courseId, assessmentId]);

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
    <Container pt="6px">
      <Stack gap="md" mt="md" mb="xs">
        <Group justify="space-between" align="flex-end">
          <div>
            <Text fw={700} fz="lg">
              Review Submissions
            </Text>
            <Text fz="sm" c="dimmed">
              {hasFacultyPermission
                ? 'All reviewer submissions for this peer review assessment.'
                : 'Submissions you are assigned to grade.'}
            </Text>
          </div>

          <Text fz="sm" c="dimmed">
            Showing {filteredItems.length} / {dto.items.length}
          </Text>
        </Group>

        <Group gap="sm" align="flex-end" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={16} />}
            label="Search"
            placeholder="Reviewer, team, repo, grader..."
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            w={300}
          />

          <Select
            label="Reviewee Team"
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
            label="Reviewer Kind"
            data={[
              { value: 'All', label: 'All' },
              { value: 'Student', label: 'Student' },
              { value: 'Team', label: 'Team' },
              { value: 'TA', label: 'TA' },
            ]}
            value={reviewerKindFilter}
            onChange={v => setReviewerKindFilter((v as ReviewerKindFilter) || 'All')}
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

          <SegmentedControl
            value={gradingFilter}
            onChange={v => setGradingFilter(v as GradingFilter)}
            data={[
              { value: 'All', label: 'All' },
              { value: 'Ungraded', label: 'Ungraded' },
              { value: 'HasGrades', label: 'Graded' },
            ]}
          />
        </Group>
        
        <Divider my="xs" />
        
        <ScrollArea style={{ height: 'calc(100vh - 380px)' }} pb="lg" scrollbarSize={8} offsetScrollbars>
          <Stack gap="sm">
            {filteredItems.length > 0
              ? filteredItems.map((item: PeerReviewSubmissionListItemDTO) => (
                  <PeerReviewSubmissionCard
                    key={item.peerReviewSubmissionId}
                    courseId={courseId}
                    assessmentId={assessmentId}
                    item={item}
                    maxMarks={dto.maxMarks}
                    // for now both faculty and TA can click grade; you can tighten later
                    canGrade={true}
                    onAfterAction={fetchSubmissions}
                  />
                ))
              : <Center>No submissions found.</Center>
            }
          </Stack>
        </ScrollArea>
      </Stack>
    </Container>
  );
};

export default PeerReviewSubmissions;
