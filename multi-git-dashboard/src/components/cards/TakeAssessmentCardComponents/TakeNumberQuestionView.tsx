import React from 'react';
import { NumberInput } from '@mantine/core';
import { NumberQuestion } from '@shared/types/Question';
import { AnswerInput } from '@shared/types/AnswerInput';

interface TakeNumberQuestionViewProps {
  question: NumberQuestion;
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  disabled?: boolean;
}

const TakeNumberQuestionView: React.FC<TakeNumberQuestionViewProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false,
}) => {
  return (
    <NumberInput
      min={0}
      max={question.maxNumber || 100}
      placeholder={`Enter a number (Max: ${question.maxNumber || 100})`}
      value={typeof answer === 'number' ? answer : undefined}
      onChange={value => onAnswerChange(value)}
      style={{ marginBottom: '16px' }}
      disabled={disabled}
    />
  );
};

export default TakeNumberQuestionView;
