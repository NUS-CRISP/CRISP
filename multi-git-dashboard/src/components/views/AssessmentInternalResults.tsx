import { Button, Group, Modal, Select, Text } from '@mantine/core';
import { useState, useEffect } from 'react';
import { AssessmentResult } from '@shared/types/AssessmentResults';
import { User } from '@shared/types/User';
import { Team } from '@shared/types/Team';
import {
  AssignedTeam,
  AssignedUser,
} from '@shared/types/AssessmentAssignmentSet';
import AssessmentResultCard from '../cards/AssessmentResultCard';

interface AssessmentInternalResultsProps {
  results: AssessmentResult[];
  teachingTeam: User[];
  assignedTeams?: AssignedTeam[];
  assignedUsers?: AssignedUser[];
  maxScore?: number;
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
}) => {
  const [isResultFormOpen, setIsResultFormOpen] = useState<boolean>(false);
  const [markerFilter, setMarkerFilter] = useState<string>('All');
  const [markedFilter, setMarkedFilter] = useState<string>('All');
  const [sortCriterion, setSortCriterion] = useState<string>('name');
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [filteredAndSortedStudentResults, setFilteredAndSortedStudentResults] =
    useState<StudentResult[]>([]);

  const toggleResultForm = () => {
    setIsResultFormOpen(!isResultFormOpen);
  };

  const taOptions = teachingTeam.map(user => ({
    value: user._id,
    label: user.name,
  }));

  useEffect(() => {
    const buildStudentResults = () => {
      const studentResultsArray: StudentResult[] = [];
      if (assignedUsers && assignedUsers.length > 0) {
        // Individual granularity
        assignedUsers.forEach(assignedUser => {
          studentResultsArray.push({
            student: assignedUser.user,
            assignedTAIds: assignedUser.tas.map(ta => ta._id),
            team: null,
            result: results.find(r => r.student?._id === assignedUser.user._id),
          });
        });
      } else if (assignedTeams && assignedTeams.length > 0) {
        // Team granularity
        assignedTeams.forEach(assignedTeam => {
          assignedTeam.team.members.forEach(member => {
            studentResultsArray.push({
              student: member,
              assignedTAIds: assignedTeam.tas.map(ta => ta._id),
              team: assignedTeam.team,
              result: results.find(r => r.student?._id === member._id),
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
          filteredResults = filteredResults.filter(
            sr => sr.assignedTAIds.length === 0
          );
        } else {
          filteredResults = filteredResults.filter(sr =>
            sr.assignedTAIds.includes(markerFilter)
          );
        }
      }

      // Apply Marked Status filter
      if (markedFilter !== 'All') {
        if (markedFilter === 'Complete') {
          filteredResults = filteredResults.filter(sr => {
            if (sr.result && sr.result.marks.length > 0) {
              // Check if any marks have submission: null
              const hasNullSubmissions = sr.result.marks.some(
                mark => !mark.submission
              );
              return !hasNullSubmissions;
            }
            return false; // No marks or empty marks array, marking is incomplete
          });
        } else if (markedFilter === 'Incomplete') {
          filteredResults = filteredResults.filter(sr => {
            if (!sr.result || sr.result.marks.length === 0) {
              return true; // No results or marks, marking is incomplete
            }
            // Check if any marks have submission: null
            const hasNullSubmissions = sr.result.marks.some(
              mark => !mark.submission
            );
            return hasNullSubmissions;
          });
        }
      }

      // Sort the results
      switch (sortCriterion) {
        case 'name':
          filteredResults.sort((a, b) =>
            a.student.name.localeCompare(b.student.name)
          );
          break;
        case 'studentID':
          filteredResults.sort((a, b) =>
            a.student.identifier.localeCompare(b.student.identifier)
          );
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

  // Function to generate CSV content
  const generateCSV = () => {
    const headers = ['StudentID', 'Marks'];
    const rows = filteredAndSortedStudentResults.map(sr => [
      sr.student.identifier,
      sr.result ? sr.result.averageScore.toString() : 'N/A',
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');

    return csvContent;
  };

  // Function to trigger CSV download
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

  return (
    <div>
      <Group mt="xs" align="flex-end">
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
        title="Download results"
      >
        <Group>
          <Text>
            Click the button below to download the assessment results as a CSV
            file. The CSV includes the following columns:
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

      {filteredAndSortedStudentResults &&
        filteredAndSortedStudentResults.length > 0 &&
        (sortCriterion === 'teamNumber'
          ? // Group by teams
            Object.entries(
              filteredAndSortedStudentResults.reduce(
                (groups, sr) => {
                  const teamId = sr.team ? sr.team._id : 'No Team';
                  if (!groups[teamId]) {
                    groups[teamId] = [];
                  }
                  groups[teamId].push(sr);
                  return groups;
                },
                {} as { [teamId: string]: StudentResult[] }
              )
            ).map(([teamId, studentsInTeam]) => (
              <div key={teamId} style={{ marginBottom: '1rem' }}>
                <h3>
                  {teamId === 'No Team'
                    ? 'No Team'
                    : `Team ${studentsInTeam[0].team!.number}`}
                </h3>
                {studentsInTeam.map(sr => (
                  <AssessmentResultCard
                    key={sr.student._id}
                    studentResult={sr}
                    maxScore={maxScore}
                  />
                ))}
              </div>
            ))
          : // Display students directly
            filteredAndSortedStudentResults.map(sr => (
              <AssessmentResultCard
                key={sr.student._id}
                studentResult={sr}
                maxScore={maxScore}
              />
            )))}
    </div>
  );
};

export default AssessmentInternalResults;
