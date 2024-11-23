import React, { useState } from 'react';
import { Textarea } from '@mantine/core';
import { LongResponseQuestion } from '@shared/types/Question';

interface LongResponseQuestionViewProps {
  questionData: LongResponseQuestion;
}

const LongResponseQuestionView: React.FC<LongResponseQuestionViewProps> = ({
  questionData,
}) => {
  const [value, setValue] = useState<string>('');
  const placeholder =
    questionData.longResponsePlaceholder || 'Enter your response here...';

  return (
    <Textarea
      placeholder={placeholder}
      value={value}
      onChange={e => setValue(e.currentTarget.value)}
      minRows={5}
      autosize
    />
  );
};

export default LongResponseQuestionView;
