import React from 'react';
import { Textarea } from '@mantine/core';
import { LongResponseQuestion } from '@shared/types/Question';
import { AnswerInput } from '@shared/types/AnswerInput';

interface MakeLongResponseQuestionViewProps {
  question: LongResponseQuestion;
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  disabled?: boolean;
}

const MakeLongResponseQuestionView: React.FC<
  MakeLongResponseQuestionViewProps
> = ({ question, answer, onAnswerChange, disabled = false }) => {
  return (
    <Textarea
      placeholder={
        question.longResponsePlaceholder || 'Enter your response here...'
      }
      value={typeof answer === 'string' ? answer : ''}
      onChange={e => onAnswerChange(e.currentTarget.value)}
      minRows={5}
      autosize
      style={{ marginBottom: '16px' }}
      disabled={disabled}
    />
  );
};

export default MakeLongResponseQuestionView;
