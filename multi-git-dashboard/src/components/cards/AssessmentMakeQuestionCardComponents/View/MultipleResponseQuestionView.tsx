import React, { useState } from 'react';
import { Box, Group, Checkbox } from '@mantine/core';
import { MultipleResponseQuestion } from '@shared/types/Question';

interface MultipleResponseQuestionViewProps {
  questionData: MultipleResponseQuestion;
}

const MultipleResponseQuestionView: React.FC<
  MultipleResponseQuestionViewProps
> = ({ questionData }) => {
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const options = questionData.options || [];

  const toggleOption = (index: number) => {
    setSelectedOptions(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <Group
      align="stretch"
      style={{
        marginTop: '8px',
        gap: '8px',
        flexGrow: 1,
        flexDirection: 'column',
      }}
    >
      {options.map((option, index) => (
        <Box
          key={index}
          p="xs"
          style={{ border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <Checkbox
            label={option.text}
            checked={selectedOptions.includes(index)}
            onChange={() => toggleOption(index)}
          />
        </Box>
      ))}
    </Group>
  );
};

export default MultipleResponseQuestionView;
