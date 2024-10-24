import ResultForm from '@/components/forms/ResultForm';
import { Button, Group, Modal, Select, Text } from '@mantine/core';
import { useState } from 'react';
import ResultCard from '@/components/cards/ResultCard';
import { Result } from '@shared/types/Result';
import { User } from '@shared/types/User';

interface AssessmentGoogleResultsProps {
  results: Result[];
  assessmentId: string;
  teachingTeam: User[];
  onResultsUploaded: () => void;
}

const AssessmentGoogleResults: React.FC<AssessmentGoogleResultsProps> = ({
  results,
  assessmentId,
  teachingTeam,
  onResultsUploaded,
}) => {
  const [isResultFormOpen, setIsResultFormOpen] = useState<boolean>(false);
  const [markerFilter, setMarkerFilter] = useState<string | null>('All');
  const [sortCriterion, setSortCriterion] = useState<string>('name'); // Sorting criterion

  const toggleResultForm = () => {
    setIsResultFormOpen(!isResultFormOpen);
  }

  const taOptions = teachingTeam.map(user => ({
    value: user._id,
    label: user.name,
  }));

  // Sorting and filtering logic here
  const filterAndSortResultsByMarker = (results: Result[]) => {
    let filteredResults = results;

    // Filter by marker
    if (markerFilter !== 'All') {
      filteredResults = markerFilter === 'Unassigned'
        ? results.filter((result) => !result.marker)
        : results.filter((result) => result.marker && result.marker._id === markerFilter);
    }

    // Sort the filtered results based on the selected criterion
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
    <>
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
          Upload Results
        </Button>
      </Group>

      <Modal
        opened={isResultFormOpen}
        onClose={toggleResultForm}
        title="Upload Results"
      >
        <ResultForm
          assessmentId={assessmentId}
          onResultsUploaded={onResultsUploaded}
        />
      </Modal>

      {filterAndSortResultsByMarker(results).map((result) => (
        <ResultCard
          key={result._id}
          result={result}
          teachingTeam={teachingTeam}
          assessmentId={assessmentId}
        />
      ))}
    </>
  );
};

export default AssessmentGoogleResults;
