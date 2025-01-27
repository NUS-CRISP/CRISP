import React, { useState } from 'react';
import { TextInput } from '@mantine/core';
import {
  ShortResponseQuestion,
  NUSNETIDQuestion,
  NUSNETEmailQuestion,
} from '@shared/types/Question';

interface ShortResponseQuestionViewProps {
  questionData: ShortResponseQuestion | NUSNETIDQuestion | NUSNETEmailQuestion;
}

const ShortResponseQuestionView: React.FC<ShortResponseQuestionViewProps> = ({
  questionData,
}) => {
  const [value, setValue] = useState<string>('');
  const placeholder =
    questionData.shortResponsePlaceholder || 'Enter your response here...';

  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChange={e => setValue(e.currentTarget.value)}
    />
  );
};

export default ShortResponseQuestionView;
