import React from 'react';
import { Text } from '@mantine/core';

interface TeamMemberSelectionQuestionViewProps {}

const TeamMemberSelectionQuestionView: React.FC<
  TeamMemberSelectionQuestionViewProps
> = () => {
  return (
    <Text>
      This question allows the form taker to select team members to evaluate.
      This question is always required at the top of the assessment.
    </Text>
  );
};

export default TeamMemberSelectionQuestionView;
