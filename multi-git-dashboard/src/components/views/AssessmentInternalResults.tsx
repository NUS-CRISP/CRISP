/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
// components/views/AssessmentInternalResults.tsx

import { Button, Group, Modal, Select, Text } from '@mantine/core';
import { useState, useEffect } from 'react';
import { AssessmentResult } from '@shared/types/AssessmentResults';
import { User } from '@shared/types/User';
import { Team } from '@shared/types/Team';
import { AssignedTeam, AssignedUser } from '@shared/types/AssessmentAssignmentSet';
import AssessmentResultCard from '../cards/AssessmentResultCard';

interface AssessmentInternalResultsProps {
  results: AssessmentResult[];
  teachingTeam: User[];
  assignedTeams?: AssignedTeam[];
  assignedUsers?: AssignedUser[];
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
}) => {
  const [isResultFormOpen, setIsResultFormOpen] = useState<boolean>(false);
  const [markerFilter, setMarkerFilter] = useState<string>('All');
  const [markedFilter, setMarkedFilter] = useState<string>('All');
  const [sortCriterion, setSortCriterion] = useState<string>('name');
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [filteredAndSortedStudentResults, setFilteredAndSortedStudentResults] = useState<StudentResult[]>([]);

  const toggleResultForm = () => {
    setIsResultFormOpen(!isResultFormOpen);
  };

  const taOptions = teachingTeam.map((user) => ({
    value: user._id,
    label: user.name,
  }));

  useEffect(() => {
    const buildStudentResults = () => {
      const studentResultsArray: StudentResult[] = [];
      if (assignedUsers && assignedUsers.length > 0) {
        // Individual granularity
        assignedUsers.forEach((assignedUser) => {
          studentResultsArray.push({
            student: assignedUser.user,
            assignedTAIds: assignedUser.tas.map((ta) => ta._id),
            team: null,
            result: results.find((r) => r.student?._id === assignedUser.user._id),
          });
        });
      } else if (assignedTeams && assignedTeams.length > 0) {
        // Team granularity
        assignedTeams.forEach((assignedTeam) => {
          assignedTeam.team.members.forEach((member) => {
            studentResultsArray.push({
              student: member,
              assignedTAIds: assignedTeam.tas.map((ta) => ta._id),
              team: assignedTeam.team,
              result: results.find((r) => r.student?._id === member._id),
            });
          });
        });
      }
      setStudentResults(studentResultsArray);
    };

    buildStudentResults();
  }, [assignedUsers, assignedTeams, results]);

  useEffect(() => {
    const filterAndSortStudentResults = () => {
      let filteredResults = [...studentResults];

      // Apply Marker filter
      if (markerFilter !== 'All') {
        if (markerFilter === 'Unassigned') {
          filteredResults = filteredResults.filter((sr) => sr.assignedTAIds.length === 0);
        } else {
          filteredResults = filteredResults.filter((sr) => sr.assignedTAIds.includes(markerFilter));
        }
      }

      // Apply Marked filter
      if (markedFilter !== 'All') {
        if (markedFilter === 'Marked') {
          filteredResults = filteredResults.filter((sr) => sr.result && sr.result.marks.length > 0);
        } else if (markedFilter === 'Unmarked') {
          filteredResults = filteredResults.filter((sr) => !sr.result || sr.result.marks.length === 0);
        }
      }

      // Sort the results
      switch (sortCriterion) {
        case 'name':
          filteredResults.sort((a, b) => a.student.name.localeCompare(b.student.name));
          break;
        case 'studentID':
          filteredResults.sort((a, b) => a.student.studentId.localeCompare(b.student.studentId));
          break;
        case 'marks':
          filteredResults.sort((a, b) => {
            const scoreA = a.result ? a.result.averageScore : 0;
            const scoreB = b.result ? b.result.averageScore : 0;
            return scoreB - scoreA;
          });
          break;
        case 'teamNumber':
          filteredResults.sort((a, b) => {
            const teamA = a.team ? a.team.number : Infinity;
            const teamB = b.team ? b.team.number : Infinity;
            return teamA - teamB;
          });
          break;
        default:
          break;
      }

      setFilteredAndSortedStudentResults(filteredResults);
    };

    filterAndSortStudentResults();
  }, [studentResults, markerFilter, markedFilter, sortCriterion]);

  return (
    <div>
      <Group>
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
          />
        </div>
        <div>
          <Text size="sm">Marked Status</Text>
          <Select
            value={markedFilter}
            onChange={(value) => setMarkedFilter(value || 'All')}
            data={[
              { value: 'All', label: 'All' },
              { value: 'Marked', label: 'Marked' },
              { value: 'Unmarked', label: 'Unmarked' },
            ]}
            placeholder="Select marked status"
            my={8}
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
          />
        </div>
        <Button onClick={toggleResultForm} style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}>
          Download Results
        </Button>
      </Group>

      <Modal opened={isResultFormOpen} onClose={toggleResultForm} title="Download results">
        {'TODO: Download file to upload to Canvas'}
      </Modal>

      {sortCriterion === 'teamNumber' ? (
        // Group by teams
        Object.entries(
          filteredAndSortedStudentResults.reduce((groups, sr) => {
            const teamId = sr.team ? sr.team._id : 'No Team';
            if (!groups[teamId]) {
              groups[teamId] = [];
            }
            groups[teamId].push(sr);
            return groups;
          }, {} as { [teamId: string]: StudentResult[] })
        ).map(([teamId, studentsInTeam]) => (
          <div key={teamId} style={{ marginBottom: '1rem' }}>
            <h3>{teamId === 'No Team' ? 'No Team' : `Team ${studentsInTeam[0].team!.number}`}</h3>
            {studentsInTeam.map((sr) => (
              <AssessmentResultCard
                key={sr.student._id}
                studentResult={sr}
              />
            ))}
          </div>
        ))
      ) : (
        // Display students directly
        filteredAndSortedStudentResults.map((sr) => (
          <AssessmentResultCard
            key={sr.student._id}
            studentResult={sr}
          />
        ))
      )}
    </div>
  );
};

export default AssessmentInternalResults;
