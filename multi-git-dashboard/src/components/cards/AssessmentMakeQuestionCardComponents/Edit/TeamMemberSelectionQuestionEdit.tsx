import React from 'react';
import { Box, Text, Button, Group } from '@mantine/core';
import { TeamMemberSelectionQuestion } from '@shared/types/Question';

interface TeamMemberSelectionQuestionEditProps {
  onSave: (updatedData: Partial<TeamMemberSelectionQuestion>) => void;
  onDelete: () => void;
}

const TeamMemberSelectionQuestionEdit: React.FC<
  TeamMemberSelectionQuestionEditProps
> = ({ onSave, onDelete }) => {
  const saveQuestion = () => {
    onSave({});
  };

  return (
    <Box mb="md">
      <Text>
        This question allows the form taker to select team members from their
        team to evaluate. This question is always the first question asked and
        is required.
      </Text>
      <Group mt="md">
        <Button onClick={saveQuestion}>Save</Button>
        <Button onClick={onDelete} color="red" disabled>
          Delete Question
        </Button>
      </Group>
    </Box>
  );
};

export default TeamMemberSelectionQuestionEdit;
