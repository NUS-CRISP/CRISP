import React from 'react';
import { Box, Radio, Group } from '@mantine/core';
import { MultipleChoiceQuestion } from '@shared/types/Question';
import { AnswerInput } from '@shared/types/AnswerInput';

interface TakeMultipleChoiceQuestionViewProps {
  question: MultipleChoiceQuestion;
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  disabled?: boolean;
}

const TakeMultipleChoiceQuestionView: React.FC<
  TakeMultipleChoiceQuestionViewProps
> = ({ question, answer, onAnswerChange, disabled = false }) => {
  return (
    <Group align="stretch" style={{ flexGrow: 1, flexDirection: 'column' }}>
      {question.options.map((option, idx) => (
        <Box
          key={idx}
          p="xs"
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#fff',
            width: '100%',
          }}
        >
          <Radio
            label={option.text}
            checked={answer === option.text}
            onChange={() => onAnswerChange(option.text)}
            style={{ width: '100%' }}
            disabled={disabled}
          />
        </Box>
      ))}
    </Group>
  );
};

export default TakeMultipleChoiceQuestionView;
