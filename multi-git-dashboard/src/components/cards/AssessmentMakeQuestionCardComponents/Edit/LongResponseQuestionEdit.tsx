import React, { useState } from 'react';
import { Box, TextInput, Textarea, Button, Group } from '@mantine/core';
import { LongResponseQuestion } from '@shared/types/Question';

interface LongResponseQuestionEditProps {
  questionData: LongResponseQuestion;
  onSave: (updatedData: Partial<LongResponseQuestion>) => void;
  onDelete: () => void;
  isValid: boolean;
}

const LongResponseQuestionEdit: React.FC<LongResponseQuestionEditProps> = ({
  questionData,
  onSave,
  onDelete,
  isValid,
}) => {
  const [placeholder, setPlaceholder] = useState<string>(
    questionData.longResponsePlaceholder || ''
  );

  const saveQuestion = () => {
    onSave({
      longResponsePlaceholder: placeholder === '' ? 'Enter your response here.' : placeholder,
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
      <Textarea
        label="Preview"
        style={{ marginBottom: '24px' }}
        placeholder={placeholder}
        disabled
        minRows={5}
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

export default LongResponseQuestionEdit;
