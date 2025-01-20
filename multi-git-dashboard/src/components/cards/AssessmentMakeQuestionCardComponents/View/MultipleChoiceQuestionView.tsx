import React, { useState } from 'react';
import { Box, Group, Radio } from '@mantine/core';
import { MultipleChoiceQuestion } from '@shared/types/Question';

interface MultipleChoiceQuestionViewProps {
  questionData: MultipleChoiceQuestion;
}

const MultipleChoiceQuestionView: React.FC<MultipleChoiceQuestionViewProps> = ({
  questionData,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const options = questionData.options || [];

  const handleSelect = (index: number) => {
    setSelectedOption(index);
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
          <Radio
            label={option.text}
            checked={selectedOption === index}
            onChange={() => handleSelect(index)}
          />
        </Box>
      ))}
    </Group>
  );
};

export default MultipleChoiceQuestionView;
