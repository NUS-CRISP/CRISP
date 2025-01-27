import React, { useState, useEffect, useMemo } from 'react';
import { Button, Group, Modal, Select, Text, Loader } from '@mantine/core';
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

interface AssessmentInternalResultsProps {
  results: AssessmentResult[];
  teachingTeam: User[];
  assignedTeams?: AssignedTeam[];
  assignedUsers?: AssignedUser[];
  maxScore?: number;
  assessmentReleaseNumber: number;
}

export interface StudentResult {
  student: User;
  assignedTAIds: string[];
  team?: Team | null;
  result?: AssessmentResult;
}

const AssessmentInternalResults: React.FC<AssessmentInternalResultsProps> = ({
  results,
  teachingTeam,
  assignedTeams,
  assignedUsers,
  maxScore,
  assessmentReleaseNumber,
}) => {
  const [isResultFormOpen, setIsResultFormOpen] = useState<boolean>(false);
  const [markerFilter, setMarkerFilter] = useState<string>('All');
  const [markedFilter, setMarkedFilter] = useState<string>('All');
  const [sortCriterion, setSortCriterion] = useState<string>('name');
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [filteredAndSortedStudentResults, setFilteredAndSortedStudentResults] =
    useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const toggleResultForm = () => {
    setIsResultFormOpen(prev => !prev);
  };

  // Prepare TA filter options
  const taOptions = teachingTeam.map(user => ({
    value: user._id,
    label: user.name,
  }));

  useEffect(() => {
    const buildStudentResults = () => {
      const srList: StudentResult[] = [];
      if (assignedUsers?.length) {
        assignedUsers.forEach(assignedUser => {
          srList.push({
            student: assignedUser.user,
            assignedTAIds: assignedUser.tas.map(ta => ta._id),
            team: null,
            result: results.find(r => r.student?._id === assignedUser.user._id),
          });
        });
      } else if (assignedTeams?.length) {
        assignedTeams.forEach(assignedTeam => {
          assignedTeam.team.members.forEach(member => {
            srList.push({
              student: member,
              assignedTAIds: assignedTeam.tas.map(ta => ta._id),
              team: assignedTeam.team,
              result: results.find(r => r.student?._id === member._id),
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
        filtered = filtered.filter(sr => sr.assignedTAIds.length === 0);
      } else {
        filtered = filtered.filter(sr =>
          sr.assignedTAIds.includes(markerFilter)
        );
      }
    }

    if (markedFilter !== 'All') {
      if (markedFilter === 'Complete') {
        filtered = filtered.filter(sr => {
          if (sr.result && sr.result.marks.length > 0) {
            return !sr.result.marks.some(mark => !mark.submission);
          }
          return false;
        });
      } else if (markedFilter === 'Incomplete') {
        filtered = filtered.filter(sr => {
          if (!sr.result || sr.result.marks.length === 0) return true;
          return sr.result.marks.some(mark => !mark.submission);
        });
      }
    }

    switch (sortCriterion) {
      case 'name':
        filtered.sort((a, b) => a.student.name.localeCompare(b.student.name));
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

  const generateCSV = () => {
    const headers = ['StudentID', 'Marks'];
    const rows = filteredAndSortedStudentResults.map(sr => [
      sr.student.identifier,
      sr.result ? sr.result.averageScore.toString() : 'N/A',
    ]);
    return [headers, ...rows].map(line => line.join(',')).join('\n');
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

  // Conditionally render normal Virtuoso:
  //    (A) If grouping by team, pass an array of "team groups" to Virtuoso
  //    (B) Otherwise, pass the array of StudentResults as is
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
      <Group mt="xs" align="flex-end" gap="md" wrap="wrap">
        <div>
          <Text size="sm">Marker</Text>
          <Select
            value={markerFilter}
            onChange={value => setMarkerFilter(value || 'All')}
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
            onChange={value => setMarkedFilter(value || 'All')}
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
            onChange={value => setSortCriterion(value || 'name')}
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
      </Group>

      <Modal
        opened={isResultFormOpen}
        onClose={toggleResultForm}
        title="Download Results"
        centered
      >
        <Group gap="md">
          <Text>
            Click below to download the assessment results as a CSV file. It
            includes:
            <ul>
              <li>
                <strong>StudentID</strong>: The identifier of the student.
              </li>
              <li>
                <strong>Marks</strong>: The average score of the student.
              </li>
            </ul>
          </Text>
          <Button onClick={downloadCSV} color="blue">
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
