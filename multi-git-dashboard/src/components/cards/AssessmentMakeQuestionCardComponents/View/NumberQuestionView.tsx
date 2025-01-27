import React, { useState } from 'react';
import { TextInput } from '@mantine/core';
import { NumberQuestion } from '@shared/types/Question';

interface NumberQuestionViewProps {
  questionData: NumberQuestion;
}

const NumberQuestionView: React.FC<NumberQuestionViewProps> = ({
  questionData,
}) => {
  const [value, setValue] = useState<number | ''>('');
  const maxNumber = questionData.maxNumber || 100;

  return (
    <TextInput
      type="number"
      placeholder={`Enter a number (Max: ${maxNumber})`}
      value={value}
      onChange={e => setValue(Number(e.currentTarget.value))}
    />
  );
};

export default NumberQuestionView;
