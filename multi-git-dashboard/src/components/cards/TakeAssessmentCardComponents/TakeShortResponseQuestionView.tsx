import React from 'react';
import { TextInput } from '@mantine/core';
import { ShortResponseQuestion } from '@shared/types/Question';
import { AnswerInput } from '@shared/types/AnswerInput';

interface TakeShortResponseQuestionViewProps {
  question: ShortResponseQuestion;
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  disabled?: boolean;
}

const TakeShortResponseQuestionView: React.FC<
  TakeShortResponseQuestionViewProps
> = ({ question, answer, onAnswerChange, disabled = false }) => {
  return (
    <TextInput
      placeholder={
        question.shortResponsePlaceholder || 'Enter your response here...'
      }
      value={typeof answer === 'string' ? answer : ''}
      onChange={e => onAnswerChange(e.currentTarget.value)}
      disabled={disabled}
    />
  );
};

export default TakeShortResponseQuestionView;
