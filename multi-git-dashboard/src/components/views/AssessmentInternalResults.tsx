import { Button, Group, Modal, Select, Text } from '@mantine/core';
import { useState } from 'react';
import ResultCard from '@/components/cards/ResultCard';
import { Result } from '@shared/types/Result';
import { User } from '@shared/types/User';

interface AssessmentInternalResultsProps {
  results: Result[];
  assessmentId: string;
  teachingTeam: User[];
}

const AssessmentInternalResults: React.FC<AssessmentInternalResultsProps> = ({
  results,
  assessmentId,
  teachingTeam,
}) => {
  const [isResultFormOpen, setIsResultFormOpen] = useState<boolean>(false);
  const [markerFilter, setMarkerFilter] = useState<string | null>('All');
  const [sortCriterion, setSortCriterion] = useState<string>('name');

  const toggleResultForm = () => {
    setIsResultFormOpen(!isResultFormOpen);
  }

  const taOptions = teachingTeam.map(user => ({
    value: user._id,
    label: user.name,
  }));

  const filterAndSortResultsByMarker = (results: Result[]) => {
    let filteredResults = results;

    if (markerFilter !== 'All') {
      filteredResults = markerFilter === 'Unassigned'
        ? results.filter((result) => !result.marker)
        : results.filter((result) => result.marker && result.marker._id === markerFilter);
    }

    return filteredResults.sort((a, b) => {
      switch (sortCriterion) {
        case 'name':
          return a.marks[0].name.localeCompare(b.marks[0].name);
        case 'teamNumber':
          return a.team.number - b.team.number;
        case 'studentID':
          return a.marks[0].user.localeCompare(b.marks[0].user);
        case 'marks':
          return b.marks[0].mark - a.marks[0].mark;
        default:
          return 0;
      }
    });
  };

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
              ...taOptions
            ]}
            placeholder="Select marker"
            my={8}
          />
        </div>

        <div>
          <Text size="sm">Sort by</Text>
          <Select
            value={sortCriterion}
            onChange={(value) => setSortCriterion(value || 'name')}
            data={[
              { value: 'name', label: 'Student Name' },
              { value: 'teamNumber', label: 'Team Number' },
              { value: 'studentID', label: 'Student ID' },
              { value: 'marks', label: 'Marks' },
            ]}
            placeholder="Sort by"
            my={8}
          />
        </div>

        <Button onClick={toggleResultForm} style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}>
          Download Results
        </Button>
      </Group>

      <Modal
        opened={isResultFormOpen}
        onClose={toggleResultForm}
        title="Download results"
      >
        {'TODO: Download file to upload to Canvas'}
      </Modal>

      {filterAndSortResultsByMarker(results).map((result) => (
        <ResultCard
          key={result._id}
          result={result}
          teachingTeam={teachingTeam}
          assessmentId={assessmentId}
        />
      ))}
    </div>
  );
};

export default AssessmentInternalResults;
