import React, { useState } from 'react';
import { Group, Button, Select } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

interface AddManualAssignmentBoxProps {
  assignedCount: number;
  dropdownOptions: { value: string; label: string }[];
  maxReviewsPerReviewer: number;
  reviewerId: string;
  addManualAssignment: (revieweeId: string, reviewerId: string) => void;
}

const AddManualAssignmentBox: React.FC<AddManualAssignmentBoxProps> = ({
  assignedCount,
  dropdownOptions,
  maxReviewsPerReviewer,
  reviewerId,
  addManualAssignment,
}) => {
  const [addChoice, setAddChoice] = useState<string | null>(null);

  return (
    <Group align="end" gap={4}>
      <Select
        placeholder={
          assignedCount >= maxReviewsPerReviewer
            ? 'Max reviews reached'
            : 'Select team to review'
        }
        data={dropdownOptions}
        value={addChoice}
        onChange={setAddChoice}
        searchable
        clearable
        nothingFoundMessage="No teams"
        w={200}
        size="xs"
        disabled={assignedCount >= maxReviewsPerReviewer}
      />
      <Button
        disabled={!addChoice || assignedCount >= maxReviewsPerReviewer}
        onClick={() => {
          if (!addChoice) return;
          // reviewer = current team; reviewee = selected team
          addManualAssignment(addChoice, reviewerId);
          setAddChoice(null);
        }}
        size="xs"
      >
        <IconPlus size={12} />
      </Button>
    </Group>
  );
};

export default AddManualAssignmentBox;
