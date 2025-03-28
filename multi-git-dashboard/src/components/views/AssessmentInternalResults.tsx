import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Group,
  Modal,
  Select,
  Text,
  Loader,
  TextInput,
} from '@mantine/core';
import { Virtuoso } from 'react-virtuoso';

import { AssessmentResult } from '@shared/types/AssessmentResults';
import { User } from '@shared/types/User';
import { Team } from '@shared/types/Team';
import {
  AssignedTeam,
  AssignedUser,
} from '@shared/types/AssessmentAssignmentSet';
import AssessmentResultCard from '../cards/AssessmentResultCard';
import AssessmentResultCardGroup from '../cards/AssessmentResultCardGroup';

export interface StudentResult {
  student: User;
  assignedTAIds: string[];
  team?: Team | null;
  result?: AssessmentResult;
}

interface AssessmentInternalResultsProps {
  results: AssessmentResult[];
  teachingTeam: User[];
  assignedTeams?: AssignedTeam[];
  assignedUsers?: AssignedUser[];
  maxScore?: number;
  assessmentReleaseNumber: number;
  assessmentId: string;
}

const AssessmentInternalResults: React.FC<AssessmentInternalResultsProps> = ({
  results,
  teachingTeam,
  assignedTeams,
  assignedUsers,
  maxScore,
  assessmentReleaseNumber,
  assessmentId,
}) => {
  // State for the existing results list and filters
  const [isResultFormOpen, setIsResultFormOpen] = useState<boolean>(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState<boolean>(false);

  // New state for configurable headers for Comments CSV (already existing)
  const [studentIdHeader, setStudentIdHeader] = useState<string>('SIS User ID');
  const [commentHeader, setCommentHeader] = useState<string>(
    'Assignment title (<Paste your Assignment ID here>)'
  );
  const [selectedCommentType, setSelectedCommentType] = useState<
    'short' | 'long' | 'both'
  >('both');

  // NEW: State for configurable headers for Results CSV
  const [resultStudentHeader, setResultStudentHeader] = useState<string>(
    'Student'
  );
  const [resultIdHeader, setResultIdHeader] = useState<string>('SIS User ID');
  const [resultMarksHeader, setResultMarksHeader] = useState<string>('New Assignment');

  const [markerFilter, setMarkerFilter] = useState<string>('All');
  const [markedFilter, setMarkedFilter] = useState<string>('All');
  const [sortCriterion, setSortCriterion] = useState<string>('name');
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [filteredAndSortedStudentResults, setFilteredAndSortedStudentResults] =
    useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const toggleResultForm = () => {
    setIsResultFormOpen((prev) => !prev);
  };

  const toggleCommentsModal = () => {
    setIsCommentsModalOpen((prev) => !prev);
  };

  // Prepare TA filter options
  const taOptions = teachingTeam.map((user) => ({
    value: user._id,
    label: user.name,
  }));

  useEffect(() => {
    const buildStudentResults = () => {
      const srList: StudentResult[] = [];
      if (assignedUsers?.length) {
        assignedUsers.forEach((assignedUser) => {
          srList.push({
            student: assignedUser.user,
            assignedTAIds: assignedUser.tas.map((ta) => ta._id),
            team: null,
            result: results.find(
              (r) => r.student?._id === assignedUser.user._id
            ),
          });
        });
      } else if (assignedTeams?.length) {
        assignedTeams.forEach((assignedTeam) => {
          assignedTeam.team.members.forEach((member) => {
            srList.push({
              student: member,
              assignedTAIds: assignedTeam.tas.map((ta) => ta._id),
              team: assignedTeam.team,
              result: results.find((r) => r.student?._id === member._id),
            });
          });
        });
      }
      setStudentResults(srList);
      setIsLoading(false);
    };
    buildStudentResults();
  }, [assignedUsers, assignedTeams, results]);

  useEffect(() => {
    let filtered = [...studentResults];

    if (markerFilter !== 'All') {
      if (markerFilter === 'Unassigned') {
        filtered = filtered.filter((sr) => sr.assignedTAIds.length === 0);
      } else {
        filtered = filtered.filter((sr) =>
          sr.assignedTAIds.includes(markerFilter)
        );
      }
    }

    if (markedFilter !== 'All') {
      if (markedFilter === 'Complete') {
        filtered = filtered.filter((sr) => {
          if (sr.result && sr.result.marks.length > 0) {
            return !sr.result.marks.some((mark) => !mark.submission);
          }
          return false;
        });
      } else if (markedFilter === 'Incomplete') {
        filtered = filtered.filter((sr) => {
          if (!sr.result || sr.result.marks.length === 0) return true;
          return sr.result.marks.some((mark) => !mark.submission);
        });
      }
    }

    switch (sortCriterion) {
      case 'name':
        filtered.sort((a, b) =>
          a.student.name.localeCompare(b.student.name)
        );
        break;
      case 'studentID':
        filtered.sort((a, b) =>
          a.student.identifier.localeCompare(b.student.identifier)
        );
        break;
      case 'marks':
        filtered.sort((a, b) => {
          const scoreA = a.result ? a.result.averageScore : 0;
          const scoreB = b.result ? b.result.averageScore : 0;
          return scoreB - scoreA;
        });
        break;
      case 'teamNumber':
        filtered.sort((a, b) => {
          const teamA = a.team ? a.team.number : Infinity;
          const teamB = b.team ? b.team.number : Infinity;
          return teamA - teamB;
        });
        break;
      default:
        break;
    }

    setFilteredAndSortedStudentResults(filtered);
  }, [studentResults, markerFilter, markedFilter, sortCriterion]);

  // Modified generateCSV to use configurable headers
  const generateCSV = () => {
    const headers = [
      resultStudentHeader,
      resultIdHeader,
      resultMarksHeader,
    ];
    const rows = filteredAndSortedStudentResults.map((sr) => [
      sr.student.name,
      sr.student.identifier,
      sr.result ? sr.result.averageScore.toString() : 'N/A',
    ]);
    return [headers, ...rows].map((line) => line.join(',')).join('\n');
  };

  const downloadCSV = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'assessment_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // New function to download comments as CSV (unchanged from previous version)
  const handleDownloadComments = async () => {
    try {
      const response = await fetch(
        `/api/internal-assessments/${assessmentId}/comments/${selectedCommentType}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to gather comments');
      }
      const data = await response.json();
      if (!data || !data.commentsByStudent) {
        alert(data.message);
        return;
      }
      const commentsByStudent: { [studentId: string]: string[] } =
        data.commentsByStudent;
      let csvContent = `"${studentIdHeader}","${commentHeader}"\n`;
      Object.entries(commentsByStudent).forEach(([studentId, comments]) => {
        const aggregatedComments = comments.join('\n');
        csvContent += `"${studentId}","${aggregatedComments}"\n`;
      });
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'assessment_comments.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsCommentsModalOpen(false);
    } catch (error) {
      console.error('Error downloading comments:', error);
      // Optionally, display an error notification here.
    }
  };

  // Build a new data array if grouping by team
  const groupedTeams = useMemo(() => {
    if (sortCriterion !== 'teamNumber') return [];

    // Build a map from teamId -> StudentResult[]
    const groupsMap: Record<string, StudentResult[]> = {};
    for (const sr of filteredAndSortedStudentResults) {
      const teamId = sr.team?._id ?? 'No Team';
      if (!groupsMap[teamId]) {
        groupsMap[teamId] = [];
      }
      groupsMap[teamId].push(sr);
    }

    // Convert that map to an array in the order the items appear
    const visitedIds = new Set<string>();
    const grouped: Array<{
      teamId: string;
      label: string;
      students: StudentResult[];
    }> = [];

    for (const sr of filteredAndSortedStudentResults) {
      const teamId = sr.team?._id ?? 'No Team';
      if (!visitedIds.has(teamId)) {
        visitedIds.add(teamId);
        const studentsInTeam = groupsMap[teamId];
        const label =
          teamId === 'No Team'
            ? 'No Team'
            : `Team ${studentsInTeam[0].team?.number}`;
        grouped.push({
          teamId,
          label,
          students: studentsInTeam,
        });
      }
    }
    return grouped;
  }, [filteredAndSortedStudentResults, sortCriterion]);

  // Conditionally render Virtuoso list
  const renderVirtualList = () => {
    if (sortCriterion === 'teamNumber' && groupedTeams.length > 0) {
      return (
        <Virtuoso
          data={groupedTeams}
          itemContent={(index, group) => (
            <AssessmentResultCardGroup
              teamId={group.teamId}
              label={group.label}
              students={group.students}
              maxScore={maxScore}
              assessmentReleaseNumber={assessmentReleaseNumber}
            />
          )}
          style={{ height: '100%', width: '100%' }}
        />
      );
    } else {
      return (
        <Virtuoso
          data={filteredAndSortedStudentResults}
          itemContent={(index, sr) => (
            <AssessmentResultCard
              key={sr.student._id}
              studentResult={sr}
              maxScore={maxScore}
              assessmentReleaseNumber={assessmentReleaseNumber}
            />
          )}
          style={{ height: '100%', width: '100%' }}
        />
      );
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Group mt="xs" align="flex-end" gap="md">
        <div>
          <Text size="sm">Marker</Text>
          <Select
            value={markerFilter}
            onChange={(value) => setMarkerFilter(value || 'All')}
            data={[
              { value: 'All', label: 'All' },
              { value: 'Unassigned', label: 'Unassigned' },
              ...taOptions,
            ]}
            placeholder="Select marker"
            my={8}
            style={{ width: 200 }}
          />
        </div>

        <div>
          <Text size="sm">Marked Status</Text>
          <Select
            value={markedFilter}
            onChange={(value) => setMarkedFilter(value || 'All')}
            data={[
              { value: 'All', label: 'All' },
              { value: 'Complete', label: 'Marking completed' },
              { value: 'Incomplete', label: 'Marking incomplete' },
            ]}
            placeholder="Select marked status"
            my={8}
            style={{ width: 200 }}
          />
        </div>

        <div>
          <Text size="sm">Sort by</Text>
          <Select
            value={sortCriterion}
            onChange={(value) => setSortCriterion(value || 'name')}
            data={[
              { value: 'name', label: 'Name' },
              { value: 'studentID', label: 'Student ID' },
              { value: 'marks', label: 'Average Score' },
              { value: 'teamNumber', label: 'Team Number' },
            ]}
            placeholder="Sort by"
            my={8}
            style={{ width: 200 }}
          />
        </div>

        <Group justify="flex-end">
          <Button
            onClick={toggleResultForm}
            style={{
              marginBottom: '10px',
              alignSelf: 'flex-end',
              marginLeft: 'auto',
            }}
          >
            Download Results
          </Button>

          <Button
            onClick={toggleCommentsModal}
            style={{
              marginBottom: '10px',
              alignSelf: 'flex-end',
              marginLeft: '10px',
            }}
          >
            Download Comments
          </Button>
        </Group>
      </Group>

      {/* Modal for Download Results with configurable headers */}
      <Modal
        opened={isResultFormOpen}
        onClose={toggleResultForm}
        title="Download Results"
        centered
      >
        <Group gap="md">
          <TextInput
            label="Student Header"
            placeholder="Student"
            value={resultStudentHeader}
            onChange={(e) => setResultStudentHeader(e.currentTarget.value)}
          />
          <TextInput
            label="ID Header"
            placeholder="ID"
            value={resultIdHeader}
            onChange={(e) => setResultIdHeader(e.currentTarget.value)}
          />
          <TextInput
            label="Marks Header"
            placeholder="Marks"
            value={resultMarksHeader}
            onChange={(e) => setResultMarksHeader(e.currentTarget.value)}
          />
          <Button onClick={downloadCSV} color="blue">
            Download CSV
          </Button>
        </Group>
      </Modal>

      {/* Modal for Download Comments */}
      <Modal
        opened={isCommentsModalOpen}
        onClose={toggleCommentsModal}
        title="Download Comments"
        centered
      >
        <Group gap="md">
          <TextInput
            label="Student ID Header"
            placeholder="Student ID"
            value={studentIdHeader}
            onChange={(e) => setStudentIdHeader(e.currentTarget.value)}
          />
          <TextInput
            label="Comment Header"
            placeholder="Comments"
            value={commentHeader}
            onChange={(e) => setCommentHeader(e.currentTarget.value)}
          />
          <Select
            label="Comment Type"
            placeholder="Select comment type"
            data={[
              { value: 'short', label: 'Short Response' },
              { value: 'long', label: 'Long Response' },
              { value: 'both', label: 'Both' },
            ]}
            value={selectedCommentType}
            onChange={(value) =>
              setSelectedCommentType(value as 'short' | 'long' | 'both')
            }
          />
          <Button onClick={handleDownloadComments} color="blue">
            Download CSV
          </Button>
        </Group>
      </Modal>

      <div style={{ flex: 0.95, marginTop: '20px' }}>
        {isLoading ? (
          <Group justify="center" style={{ height: '100%' }}>
            <Loader size="xl" />
          </Group>
        ) : (
          renderVirtualList()
        )}
      </div>
    </div>
  );
};

export default AssessmentInternalResults;
