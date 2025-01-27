import React, { useState } from 'react';
import { Box } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { DateQuestion } from '@shared/types/Question';

interface DateQuestionViewProps {
  questionData: DateQuestion;
}

const DateQuestionView: React.FC<DateQuestionViewProps> = ({
  questionData,
}) => {
  const [dateValue, setDateValue] = useState<Date | null>(null);
  const [datesRangeValue, setDatesRangeValue] = useState<
    [Date | null, Date | null]
  >([null, null]);

  const { isRange, datePickerPlaceholder, minDate, maxDate } = questionData;

  return (
    <Box>
      {isRange ? (
        <DatePicker
          type="range"
          style={{ marginTop: '8px', width: '100%' }}
          minDate={minDate ? new Date(minDate) : undefined}
          maxDate={maxDate ? new Date(maxDate) : undefined}
          value={datesRangeValue}
          onChange={setDatesRangeValue}
        />
      ) : (
        <DatePicker
          placeholder={datePickerPlaceholder || 'Select a date'}
          value={dateValue}
          onChange={setDateValue}
          minDate={minDate ? new Date(minDate) : undefined}
          maxDate={maxDate ? new Date(maxDate) : undefined}
        />
      )}
    </Box>
  );
};

export default DateQuestionView;
