import React, { useState } from 'react';
import { QuestionUnion } from '@shared/types/Question';
import QuestionView from './AssessmentMakeQuestionCardComponents/View/QuestionView';
import QuestionEdit from './AssessmentMakeQuestionCardComponents/Edit/QuestionEdit';

interface AssessmentMakeQuestionCardProps {
  questionData: QuestionUnion;
  onDelete: () => void;
  onSave: (updatedQuestion: QuestionUnion) => void;
  isLocked: boolean;
  index: number;
}

const AssessmentMakeQuestionCard: React.FC<AssessmentMakeQuestionCardProps> = ({
  questionData,
  onDelete,
  onSave,
  isLocked,
  index,
}) => {
  const isNewQuestion = questionData._id.startsWith('temp-');
  const [isEditing, setIsEditing] = useState<boolean>(
    isNewQuestion || questionData.type === 'Undecided'
  );

  const handleSave = (updatedQuestion: QuestionUnion) => {
    onSave(updatedQuestion);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <QuestionView
        questionData={questionData}
        index={index}
        onDelete={onDelete}
        onEdit={() => setIsEditing(true)}
        isLocked={isLocked}
      />
    );
  } else {
    return (
      <QuestionEdit
        questionData={questionData}
        index={index}
        onDelete={onDelete}
        onSave={handleSave}
      />
    );
  }
};

export default AssessmentMakeQuestionCard;
