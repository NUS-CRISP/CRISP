import React from 'react';
import { Box, Checkbox, Group } from '@mantine/core';
import { MultipleResponseQuestion } from '@shared/types/Question';
import { AnswerInput } from '@shared/types/AnswerInput';

interface TakeMultipleResponseQuestionViewProps {
  question: MultipleResponseQuestion;
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  disabled?: boolean;
}

const TakeMultipleResponseQuestionView: React.FC<
  TakeMultipleResponseQuestionViewProps
> = ({ question, answer, onAnswerChange, disabled = false }) => {
  const multipleResponseAnswer = Array.isArray(answer)
    ? (answer as string[])
    : [];

  return (
    <Group align="stretch" style={{ flexGrow: 1, flexDirection: 'column' }}>
      {question.options.map((option, idx) => {
        const isChecked = multipleResponseAnswer.includes(option.text);

        return (
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
            <Checkbox
              label={option.text}
              checked={isChecked}
              onChange={() => {
                if (multipleResponseAnswer.includes(option.text)) {
                  // Remove the option
                  const updatedAnswers = multipleResponseAnswer.filter(
                    a => a !== option.text
                  );
                  onAnswerChange(updatedAnswers);
                } else {
                  // Add the option
                  const updatedAnswers = [
                    ...multipleResponseAnswer,
                    option.text,
                  ];
                  onAnswerChange(updatedAnswers);
                }
              }}
              style={{ width: '100%' }}
              disabled={disabled}
            />
          </Box>
        );
      })}
    </Group>
  );
};

export default TakeMultipleResponseQuestionView;
