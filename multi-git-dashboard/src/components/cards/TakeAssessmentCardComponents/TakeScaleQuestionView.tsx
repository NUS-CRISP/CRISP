import React from 'react';
import { Box, Slider } from '@mantine/core';
import { ScaleQuestion } from '@shared/types/Question';
import { AnswerInput } from '@shared/types/AnswerInput';

interface TakeScaleQuestionViewProps {
  question: ScaleQuestion;
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  disabled?: boolean;
}

const TakeScaleQuestionView: React.FC<TakeScaleQuestionViewProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false,
}) => {
  const scaleValue =
    typeof answer === 'number' ? answer : question.labels[0].value;

  return (
    <Box>
      <Slider
        value={scaleValue}
        min={question.labels[0].value}
        max={question.scaleMax}
        marks={question.labels.map(label => ({
          value: label.value,
          label: label.label,
        }))}
        step={1}
        style={{ padding: '0 20px', marginBottom: '20px' }}
        onChange={value => onAnswerChange(value)}
        disabled={disabled}
      />
    </Box>
  );
};

export default TakeScaleQuestionView;
