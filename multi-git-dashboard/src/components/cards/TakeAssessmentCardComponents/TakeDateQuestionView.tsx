import React from 'react';
import { Box, Text } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { DateQuestion } from '@shared/types/Question';
import { AnswerInput } from '@shared/types/AnswerInput';

interface TakeDateQuestionViewProps {
  question: DateQuestion;
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  disabled?: boolean;
}

const TakeDateQuestionView: React.FC<TakeDateQuestionViewProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false,
}) => {
  const isRange = question.isRange;

  return (
    <Box style={{ marginBottom: '16px' }}>
      {disabled ? (
        // Display date as string if disabled
        <Text>
          {Array.isArray(answer)
            ? (answer as [Date | null, Date | null])
                .map(date => (date ? date.toLocaleDateString() : 'N/A'))
                .join(' - ')
            : answer instanceof Date
              ? answer.toLocaleDateString()
              : 'No date selected'}
        </Text>
      ) : isRange ? (
        <Box>
          <Text>{question.datePickerPlaceholder || 'Select a date range'}</Text>
          <DatePicker
            type="range"
            style={{ marginTop: '8px', width: '100%' }}
            minDate={question.minDate ? new Date(question.minDate) : undefined}
            maxDate={question.maxDate ? new Date(question.maxDate) : undefined}
            value={
              Array.isArray(answer) &&
              (answer as [Date | null, Date | null]).every(Boolean)
                ? (answer as [Date, Date])
                : [null, null]
            }
            onChange={(dates: [Date | null, Date | null]) =>
              onAnswerChange(dates)
            }
          />
        </Box>
      ) : (
        <Box>
          <Text>{question.datePickerPlaceholder || 'Select a date'}</Text>
          <DatePicker
            style={{ marginTop: '8px', width: '100%' }}
            minDate={question.minDate ? new Date(question.minDate) : undefined}
            maxDate={question.maxDate ? new Date(question.maxDate) : undefined}
            value={answer instanceof Date ? answer : null}
            onChange={(date: Date | null) => onAnswerChange(date)}
          />
        </Box>
      )}
    </Box>
  );
};

export default TakeDateQuestionView;
