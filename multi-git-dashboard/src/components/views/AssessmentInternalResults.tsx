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
  // Modal state for download results and download comments already exist.
  const [isResultFormOpen, setIsResultFormOpen] = useState<boolean>(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState<boolean>(false);
  // NEW: State for the new mapping modal.
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  // Comments CSV inputs (already existing)
  const [studentIdHeader, setStudentIdHeader] = useState<string>('SIS User ID');
  const [commentHeader, setCommentHeader] = useState<string>(
    'Assignment Title'
  );
  const [selectedCommentType, setSelectedCommentType] = useState<
    'short' | 'long' | 'both'
  >('both');
  // Results CSV configurable headers
  const [resultStudentHeader, setResultStudentHeader] = useState<string>('Student');
  const [resultIdHeader, setResultIdHeader] = useState<string>('SIS User ID');
  const [resultMarksHeader, setResultMarksHeader] = useState<string>('Average Marks');
  // New mapping modal state: file input and mapping headers
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [mapIdHeader, setMapIdHeader] = useState<string>('SIS User ID');
  const [mapResultHeader, setMapResultHeader] = useState<string>('Result');

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

  const toggleMapModal = () => {
    setIsMapModalOpen((prev) => !prev);
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

  // Generate CSV for Results using user-configurable headers
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

  // Function to download comments as CSV (unchanged from previous version)
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
    }
  };

  // New function to map results from an uploaded CSV file
  const handleMapCSV = () => {
    if (!mapFile) {
      alert('Please select a CSV file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log(mapIdHeader)
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim() !== '');
      if (lines.length === 0) {
        alert('CSV file is empty.');
        return;
      }
      // Assume first line is header
      const headers = lines[0]
        .split(',')
        .map((h) => h.trim().replace(/^"|"$/g, ''));
      const idIndex = headers.findIndex(
        (h) => h.toLowerCase() === mapIdHeader.toLowerCase()
      );
      console.log(idIndex);
      if (idIndex === -1) {
        alert(`ID header "${mapIdHeader}" not found in CSV file.`);
        return;
      }
      // Check if result header already exists; if not, add it.
      let resultIndex = headers.findIndex(
        (h) => h.toLowerCase() === mapResultHeader.toLowerCase()
      );
      if (resultIndex === -1) {
        headers.push(mapResultHeader);
        resultIndex = headers.length - 1;
      }
      const newLines = [headers.join(',')];
      // Process each subsequent line.
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(',')
          .map((col) => col.trim().replace(/^"|"$/g, ''));
        // If the ID cell is empty, skip processing this row and leave it intact.
        if (!cols[idIndex]) {
          newLines.push(lines[i]);
          continue;
        }
        const studentId = cols[idIndex];
        // Find the corresponding student in studentResults based on student.identifier.
        const studentEntry = studentResults.find(
          (sr) =>
            sr.student.identifier.toLowerCase() === studentId.toLowerCase()
        );
        if (!studentEntry) {
          alert(`Student ID "${studentId}" not found (row ${i + 1}). Row left unchanged.`);
          newLines.push(lines[i]);
          continue;
        }
        const resultText =
          studentEntry && studentEntry.result
            ? studentEntry.result.averageScore.toString()
            : 'N/A';
        // Insert or update the result column.
        if (cols.length > resultIndex) {
          cols[resultIndex] = resultText;
        } else {
          cols.push(resultText);
        }
        newLines.push(cols.join(','));
      }
      const newCSV = newLines.join('\n');
      const blob = new Blob([newCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mapped_results.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsMapModalOpen(false);
    };
    reader.readAsText(mapFile);
  };

  // Build a new data array if grouping by team
  const groupedTeams = useMemo(() => {
    if (sortCriterion !== 'teamNumber') return [];

    const groupsMap: Record<string, StudentResult[]> = {};
    for (const sr of filteredAndSortedStudentResults) {
      const teamId = sr.team?._id ?? 'No Team';
      if (!groupsMap[teamId]) {
        groupsMap[teamId] = [];
      }
      groupsMap[teamId].push(sr);
    }
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
              { value: 'Complete', label: 'Complete' },
              { value: 'Incomplete', label: 'Incomplete' },
            ]}
            placeholder="Select status"
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
            Download Results CSV
          </Button>

          <Button
            onClick={toggleMapModal}
            style={{
              marginBottom: '10px',
              alignSelf: 'flex-end',
              marginLeft: '10px',
            }}
          >
            Map Results to ID
          </Button>

          <Button
            onClick={toggleCommentsModal}
            style={{
              marginBottom: '10px',
              alignSelf: 'flex-end',
              marginLeft: '10px',
            }}
          >
            Download Comments CSV
          </Button>
        </Group>
      </Group>

      {/* Modal for Download Results */}
      <Modal
        opened={isResultFormOpen}
        onClose={toggleResultForm}
        title="Results CSV Options"
        centered
      >
        <Text size="sm">
          Enter the desired column headers for the results CSV. Columns for student name, ID, and average marks will be created.
        </Text>
        <Group gap="md" mt="md">
          <TextInput
            label="Student Header"
            placeholder="e.g., Student"
            value={resultStudentHeader}
            onChange={(e) => setResultStudentHeader(e.currentTarget.value)}
          />
          <TextInput
            label="ID Header"
            placeholder="e.g., SIS User ID"
            value={resultIdHeader}
            onChange={(e) => setResultIdHeader(e.currentTarget.value)}
          />
          <TextInput
            label="Marks Header"
            placeholder="e.g., Average Marks"
            value={resultMarksHeader}
            onChange={(e) => setResultMarksHeader(e.currentTarget.value)}
          />
        </Group>
        <Button onClick={downloadCSV} color="blue" mt="md">
          Download CSV
        </Button>
      </Modal>

      {/* Modal for Download Comments */}
      <Modal
        opened={isCommentsModalOpen}
        onClose={toggleCommentsModal}
        title="Comments CSV Options"
        centered
      >
        <Text size="sm">
          Enter the headers for the comments CSV. The CSV will list student IDs and their aggregated comments (from short and/or long responses).
        </Text>
        <Group gap="md" mt="md">
          <TextInput
            label="Student ID Header"
            placeholder="e.g., SIS User ID"
            value={studentIdHeader}
            onChange={(e) => setStudentIdHeader(e.currentTarget.value)}
          />
          <TextInput
            label="Comment Header"
            placeholder="e.g., Comments"
            value={commentHeader}
            onChange={(e) => setCommentHeader(e.currentTarget.value)}
          />
          <Select
            label="Comment Type"
            placeholder="Select type"
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
        </Group>
        <Button onClick={handleDownloadComments} color="blue" mt="md">
          Download CSV
        </Button>
      </Modal>

      {/* Modal for Map Results to ID */}
      <Modal
        opened={isMapModalOpen}
        onClose={toggleMapModal}
        title="Map Results to CSV"
        centered
      >
        <Text size="sm">
          Upload a CSV file that contains a column with student IDs. Specify the column header for student IDs and the header for the new result column. Rows with an empty ID cell or an unrecognized ID will remain unchanged (a warning will be displayed for unrecognized IDs).
        </Text>
        <Group gap="md" mt="md">
          <TextInput
            label="CSV ID Column Header"
            placeholder="e.g., SIS User ID"
            value={mapIdHeader}
            onChange={(e) => setMapIdHeader(e.currentTarget.value)}
          />
          <TextInput
            label="New Results Column Header"
            placeholder="e.g., Result"
            value={mapResultHeader}
            onChange={(e) => setMapResultHeader(e.currentTarget.value)}
          />
          <TextInput
            type="file"
            label="Select CSV File"
            placeholder="Choose CSV file"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(e: any) => {
              if (e.target.files.length > 0) {
                setMapFile(e.target.files[0]);
              }
            }}
          />
        </Group>
        <Button onClick={handleMapCSV} color="blue" mt="md">
          Map CSV
        </Button>
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
