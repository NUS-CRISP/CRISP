import React from 'react';
import { Box, Text } from '@mantine/core';

interface UndecidedQuestionEditProps {}

const UndecidedQuestionEdit: React.FC<UndecidedQuestionEditProps> = () => {
  return (
    <Box mb="md">
      <Text c="red">
        Please select a question type to start editing this question.
      </Text>
    </Box>
  );
};

export default UndecidedQuestionEdit;
