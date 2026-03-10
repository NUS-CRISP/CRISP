import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Group,
  Select,
  Text,
  Loader,
  TextInput,
  SegmentedControl,
  Center,
  Container,
  Stack,
  Divider,
  Card,
  ScrollArea,
  Pagination,
} from '@mantine/core';
import {
  PeerReviewResultsDTO,
  PeerReviewResultsStudentRow,
} from '@shared/types/PeerReviewAssessment';
import { IconSearch } from '@tabler/icons-react';
import PeerReviewStudentRowCard from '../cards/PeerReviewStudentRowCard';
import PeerReviewTeamCard from '../cards/PeerReviewTeamCard';
import DownloadResultsCsvModal from '../cards/Modals/DownloadResultsCsvModal';
import MapResultsToIdModal from '../cards/Modals/MapResultsToIdModal';
import ResultsPaginationDisplay from '../peer-review/ResultsPaginationDisplay';

interface PeerReviewResultsProps {
  courseId: string;
  assessmentId: string;
}

type ViewMode = 'perStudent' | 'perTeam';
type SortCriterion = 'name' | 'studentId' | 'marks' | 'teamNumber';

const PeerReviewResults: React.FC<PeerReviewResultsProps> = ({
  courseId,
  assessmentId,
}) => {
  const [dto, setDto] = useState<PeerReviewResultsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('perStudent');
  const [sortCriterion, setSortCriterion] =
    useState<SortCriterion>('teamNumber');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<string>('20');

  // CSV modals
  const [isResultFormOpen, setIsResultFormOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Results CSV configurable headers
  const [resultStudentHeader, setResultStudentHeader] = useState('Student');
  const [resultIdHeader, setResultIdHeader] = useState('SIS User ID');
  const [resultMarksHeader, setResultMarksHeader] = useState('Average Marks');

  // Map CSV config
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [mapIdHeader, setMapIdHeader] = useState('SIS User ID');
  const [mapResultHeader, setMapResultHeader] = useState('Result');

  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        viewMode,
        page: page.toString(),
        limit,
      });
      const res = await fetch(
        `/api/peer-review-assessments/${courseId}/${assessmentId}/results?${params}`,
        { method: 'GET' }
      );
      const text = await res.text();
      if (!res.ok) throw new Error(text || res.statusText);
      const data: PeerReviewResultsDTO = JSON.parse(text);
      setDto(data);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load peer review results');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [assessmentId, courseId, viewMode, page, limit]);

  // ---- filtering + sorting ----
  const filteredStudents = useMemo(() => {
    if (!dto) return [];
    const q = search.trim().toLowerCase();
    let arr = dto.perStudent.slice();

    if (q) {
      arr = arr.filter(r => {
        const hay =
          `${r.studentName} ${r.studentId} team ${r.teamNumber}`.toLowerCase();
        return hay.includes(q);
      });
    }

    switch (sortCriterion) {
      case 'name':
        arr.sort((a, b) => a.studentName.localeCompare(b.studentName));
        break;
      case 'studentId':
        arr.sort((a, b) => a.studentId.localeCompare(b.studentId));
        break;
      case 'marks':
        arr.sort((a, b) => {
          const A = a.aggregatedScore ?? -Infinity;
          const B = b.aggregatedScore ?? -Infinity;
          return B - A;
        });
        break;
      case 'teamNumber':
      default:
        arr.sort(
          (a, b) =>
            a.teamNumber - b.teamNumber ||
            a.studentName.localeCompare(b.studentName)
        );
        break;
    }

    return arr;
  }, [dto, search, sortCriterion]);

  const filteredTeams = useMemo(() => {
    if (!dto) return [];
    const q = search.trim().toLowerCase();
    let arr = dto.perTeam.slice();

    if (q) {
      arr = arr.filter(t => {
        const hay = [
          `team ${t.teamNumber}`,
          ...t.members.map(m => `${m.studentName} ${m.studentId}`),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    // Team sorting reuses sortCriterion
    switch (sortCriterion) {
      case 'marks':
        arr.sort((a, b) => {
          const A = a.teamAggregatedScore ?? -Infinity;
          const B = b.teamAggregatedScore ?? -Infinity;
          return B - A;
        });
        break;
      case 'teamNumber':
      default:
        arr.sort((a, b) => a.teamNumber - b.teamNumber);
        break;
    }

    return arr;
  }, [dto, search, sortCriterion]);

  // ---- CSV helpers ----
  const escapeCSV = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const generateResultsCSV = (rows: PeerReviewResultsStudentRow[]) => {
    const headers = [resultStudentHeader, resultIdHeader, resultMarksHeader];
    const dataRows = rows.map(r => [
      r.studentName,
      r.studentId,
      r.aggregatedScore === null ? 'N/A' : r.aggregatedScore.toFixed(2),
    ]);
    return [headers, ...dataRows]
      .map(line => line.map(escapeCSV).join(','))
      .join('\n');
  };

  const downloadCSV = () => {
    const csv = generateResultsCSV(filteredStudents);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'peer_review_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // robust-ish CSV parsing (copied lightly from your reference)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleMapCSV = () => {
    if (!mapFile) {
      alert('Please select a CSV file.');
      return;
    }
    if (!dto) return;

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) {
        alert('CSV file is empty.');
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.trim());
      const idIndex = headers.findIndex(
        h => h.toLowerCase() === mapIdHeader.toLowerCase()
      );
      if (idIndex === -1) {
        alert(`ID header "${mapIdHeader}" not found in CSV file.`);
        return;
      }

      let resultIndex = headers.findIndex(
        h => h.toLowerCase() === mapResultHeader.toLowerCase()
      );
      if (resultIndex === -1) {
        headers.push(mapResultHeader);
        resultIndex = headers.length - 1;
      }

      const outLines = [headers.map(escapeCSV).join(',')];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (!cols[idIndex] || cols[idIndex].trim() === '') {
          outLines.push(lines[i]);
          continue;
        }
        const studentId = cols[idIndex].trim();

        const row = dto.perStudent.find(
          r => r.studentId.toLowerCase() === studentId.toLowerCase()
        );

        const resultText =
          row && row.aggregatedScore !== null
            ? row.aggregatedScore.toFixed(2)
            : 'N/A';

        if (cols.length > resultIndex) cols[resultIndex] = resultText;
        else cols.push(resultText);

        outLines.push(cols.map(escapeCSV).join(','));
      }

      const newCSV = outLines.join('\n');
      const blob = new Blob([newCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mapped_peer_review_results.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsMapModalOpen(false);
    };

    reader.readAsText(mapFile);
  };

  if (isLoading) {
    return (
      <Group justify="center" style={{ height: '60vh' }}>
        <Loader size="xl" />
      </Group>
    );
  }

  if (error) {
    return (
      <Center>
        <Text c="red">{error}</Text>
        <Button ml="md" variant="light" onClick={fetchResults}>
          Retry
        </Button>
      </Center>
    );
  }

  if (!dto) return <Text>No results.</Text>;

  const countText =
    viewMode === 'perStudent'
      ? `${filteredStudents.length} / ${dto.pagination.total}`
      : `${filteredTeams.length} / ${dto.pagination.total}`;

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
                <Group gap="xs" align="center">
                  <Text fw={800} fz="xl">
                    Peer review results
                  </Text>
                </Group>
                <Text fz="sm" c="dimmed">
                  View the results of the peer review assessment.
                </Text>
              </Stack>

              <Group gap="sm">
                <Button
                  variant="light"
                  onClick={() => setIsResultFormOpen(true)}
                >
                  Download CSV
                </Button>
                <Button variant="light" onClick={() => setIsMapModalOpen(true)}>
                  Map to ID
                </Button>
              </Group>
            </Group>

            <Divider my="sm" />

            <Group
              gap="sm"
              align="flex-end"
              justify="space-between"
              wrap="wrap"
            >
              <Group>
                <TextInput
                  label="Search"
                  placeholder="Student, ID, team…"
                  leftSection={<IconSearch size={16} />}
                  value={search}
                  onChange={e => setSearch(e.currentTarget.value)}
                  w={360}
                />

                <Select
                  value={sortCriterion}
                  label="Sort by"
                  onChange={value =>
                    setSortCriterion((value as SortCriterion) || 'teamNumber')
                  }
                  data={[
                    { value: 'teamNumber', label: 'Team Number' },
                    { value: 'name', label: 'Name' },
                    { value: 'studentId', label: 'Student ID' },
                    { value: 'marks', label: 'Score' },
                  ]}
                  placeholder="Sort by"
                  w={200}
                />
              </Group>

              <SegmentedControl
                value={viewMode}
                onChange={v => {
                  setViewMode(v as ViewMode);
                  setPage(1);
                }}
                data={[
                  { value: 'perStudent', label: 'Per-student' },
                  { value: 'perTeam', label: 'Per-team' },
                ]}
                size="sm"
              />
            </Group>
          </Card>

          <Stack gap="xs">
            {viewMode === 'perStudent' ? (
              filteredStudents.length > 0 ? (
                filteredStudents.map(row => (
                  <PeerReviewStudentRowCard
                    key={row.studentId}
                    row={row}
                    maxMarks={dto.maxMarks}
                  />
                ))
              ) : (
                <Text c="dimmed" ta="center" mt="md">
                  No students to display.
                </Text>
              )
            ) : filteredTeams.length > 0 ? (
              filteredTeams.map(team => (
                <PeerReviewTeamCard
                  key={team.teamId}
                  team={team}
                  maxMarks={dto.maxMarks}
                />
              ))
            ) : (
              <Text c="dimmed" ta="center" mt="md">
                No teams to display.
              </Text>
            )}
          </Stack>

          <ResultsPaginationDisplay
            numResultsDisplay={countText}
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

      {/* Modal for Download Results */}
      <DownloadResultsCsvModal
        opened={isResultFormOpen}
        onClose={() => setIsResultFormOpen(false)}
        onDownload={({ studentHeader, idHeader, marksHeader }) => {
          setResultStudentHeader(studentHeader);
          setResultIdHeader(idHeader);
          setResultMarksHeader(marksHeader);
          downloadCSV();
          setIsResultFormOpen(false);
        }}
      />

      {/* Modal for Map Results to ID */}
      <MapResultsToIdModal
        opened={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onMap={(file, { idHeader, resultHeader }) => {
          setMapFile(file);
          setMapIdHeader(idHeader);
          setMapResultHeader(resultHeader);
          handleMapCSV();
        }}
      />
    </Container>
  );
};

export default PeerReviewResults;
