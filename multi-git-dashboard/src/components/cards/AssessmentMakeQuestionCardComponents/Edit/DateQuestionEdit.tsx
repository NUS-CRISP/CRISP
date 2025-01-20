import React, { useState } from 'react';
import { Box, TextInput, Checkbox, Group, Button, Text } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { DateQuestion } from '@shared/types/Question';

interface DateQuestionEditProps {
  questionData: DateQuestion;
  onSave: (updatedData: Partial<DateQuestion>) => void;
  onDelete: () => void;
  isValid: boolean;
}

const DateQuestionEdit: React.FC<DateQuestionEditProps> = ({
  questionData,
  onSave,
  onDelete,
  isValid,
}) => {
  const [isRange, setIsRange] = useState<boolean>(
    questionData.isRange || false
  );
  const [datePickerPlaceholder, setDatePickerPlaceholder] = useState<string>(
    questionData.datePickerPlaceholder || ''
  );
  const [minDate, setMinDate] = useState<Date | undefined>(
    questionData.minDate
  );
  const [maxDate, setMaxDate] = useState<Date | undefined>(
    questionData.maxDate
  );

  const saveQuestion = () => {
    onSave({
      isRange,
      datePickerPlaceholder,
      minDate,
      maxDate,
    });
  };

  return (
    <Box mb="md">
      <Group mb="sm">
        <Checkbox
          label="Enable Date Range"
          checked={isRange}
          onChange={e => setIsRange(e.currentTarget.checked)}
        />
      </Group>

      <TextInput
        label="Date Picker Placeholder"
        placeholder="Customize the placeholder"
        value={datePickerPlaceholder}
        onChange={e => setDatePickerPlaceholder(e.currentTarget.value)}
        mb="sm"
      />

      <Group grow style={{ marginTop: '16px', gap: '16px' }}>
        <Box>
          <Text>{'Earliest Valid Date'}</Text>
          <DatePicker
            value={minDate ?? null}
            onChange={date => setMinDate(date ?? undefined)}
          />
        </Box>
        <Box>
          <Text>{'Latest Valid Date'}</Text>
          <DatePicker
            value={maxDate ?? null}
            onChange={date => setMaxDate(date ?? undefined)}
          />
        </Box>
      </Group>

      <Group mt="md">
        <Button onClick={saveQuestion} disabled={!isValid}>
          Save Question
        </Button>
        <Button onClick={onDelete} color="red">
          Delete Question
        </Button>
      </Group>
    </Box>
  );
};

export default DateQuestionEdit;
