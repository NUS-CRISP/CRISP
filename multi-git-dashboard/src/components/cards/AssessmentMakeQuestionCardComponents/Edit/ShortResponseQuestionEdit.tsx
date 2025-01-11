import React, { useState } from 'react';
import { Box, TextInput, Button, Group } from '@mantine/core';
import {
  ShortResponseQuestion,
  NUSNETIDQuestion,
  NUSNETEmailQuestion,
} from '@shared/types/Question';

interface ShortResponseQuestionEditProps {
  questionData: ShortResponseQuestion | NUSNETIDQuestion | NUSNETEmailQuestion;
  onSave: (
    updatedData: Partial<
      ShortResponseQuestion | NUSNETIDQuestion | NUSNETEmailQuestion
    >
  ) => void;
  onDelete: () => void;
  isValid: boolean;
}

const ShortResponseQuestionEdit: React.FC<ShortResponseQuestionEditProps> = ({
  questionData,
  onSave,
  onDelete,
  isValid,
}) => {
  const [placeholder, setPlaceholder] = useState<string>(
    questionData.shortResponsePlaceholder || ''
  );

  const saveQuestion = () => {
    onSave({
      shortResponsePlaceholder:
        placeholder === '' ? 'Enter your response here' : placeholder,
    });
  };

  return (
    <Box mb="md">
      <TextInput
        label="Placeholder"
        placeholder="Enter placeholder text"
        value={placeholder}
        onChange={e => setPlaceholder(e.currentTarget.value)}
        mb="sm"
      />
      <TextInput
        style={{ marginBottom: '24px' }}
        label="Preview"
        placeholder={placeholder}
        disabled
      />
      <Group>
        <Button onClick={saveQuestion} disabled={!isValid}>
          Save Question
        </Button>
        <Button onClick={onDelete} color="red">
          Delete Question
        </Button>
      </Group>
    </Box>
  );
};

export default ShortResponseQuestionEdit;
