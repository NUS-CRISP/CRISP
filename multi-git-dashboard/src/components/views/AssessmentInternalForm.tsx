import { Button, Modal, Group, Text, Box } from '@mantine/core';
import { Question } from '@shared/types/Question';
import AssessmentQuestionCard from '@/components/cards/AssessmentQuestionCard';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { useState } from 'react';

interface AssessmentInternalFormProps {
  assessment: InternalAssessment | null;
  questions: Question[];
  addQuestion: () => void;
  handleSaveQuestion: (id: string, updatedQuestion: Question) => void;
  handleDeleteQuestion: (id: string) => void;
  onAssessmentUpdated: () => void;
}

const AssessmentInternalForm: React.FC<AssessmentInternalFormProps> = ({
  assessment,
  questions,
  addQuestion,
  handleSaveQuestion,
  handleDeleteQuestion,
  onAssessmentUpdated
}) => {
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false); // Modal for releasing the form
  const [isRecallModalOpen, setIsRecallModalOpen] = useState<boolean>(false); // Modal for recalling the form

  const isLocked = assessment?.isReleased || false;
  const isReleased = assessment?.isReleased || false;

  const releaseForm = async () => {
    try {
      const response = await fetch(`/api/internal-assessments/${assessment?._id}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      if (!response.ok) {
        console.error('Error releasing form:', response.statusText);
        return;
      }
      setIsReleaseModalOpen(false); // Close release modal
      onAssessmentUpdated(); // Refresh assessment data
    } catch (error) {
      console.error('Error releasing form:', error);
    }
  };

  const recallForm = async () => {
    try {
      const response = await fetch(`/api/internal-assessments/${assessment?._id}/recall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      if (!response.ok) {
        console.error('Error recalling form:', response.statusText);
        return;
      }
      setIsRecallModalOpen(false); // Close recall modal
      onAssessmentUpdated(); // Refresh assessment data
    } catch (error) {
      console.error('Error recalling form:', error);
    }
  };

  return (
    <>
      {/* Padding added above the first question card */}
      <Box pt={16}>
        {/* Questions list */}
        {questions.map((question) => (
          <AssessmentQuestionCard
            key={question._id}
            questionData={question}
            onSave={(updatedQuestion) => handleSaveQuestion(question._id, updatedQuestion)}
            onDelete={() => handleDeleteQuestion(question._id)}
            isLocked={isLocked || question.isLocked} // Pass isLocked to disable edit buttons
          />
        ))}
      </Box>

      <Group mt={24} pb={16}>
        {/* Add Question button moved to the bottom */}
        {!isLocked && (
          <Button onClick={addQuestion} color="blue">
            Add Question
          </Button>
        )}

        {/* Confirm and Release Form button */}
        {!isReleased && questions.length > 0 && (
          <Button color="green" onClick={() => setIsReleaseModalOpen(true)}>
            Confirm and Release Form
          </Button>
        )}

        {/* Recall Form button */}
        {isReleased && (
          <Button color="red" onClick={() => setIsRecallModalOpen(true)}>
            Recall Form
          </Button>
        )}
      </Group>

      {/* Modal for confirming form release */}
      <Modal
        opened={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        title="Confirm and Release Form"
      >
        <Text>
          Are you sure you want to release the form to all Teaching Assistants? The form will be locked and you won’t be able to edit it unless you recall it later.
        </Text>
        <Group mt="md">
          <Button color="green" onClick={releaseForm}>
            Yes, Release Form
          </Button>
        </Group>
      </Modal>

      {/* Modal for recalling the form */}
      <Modal
        opened={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
        title="Recall Form"
      >
        <Text>
          Are you sure you want to recall the form? The form will be unlocked, and Teaching Assistants will no longer have access to it.
        </Text>
        <Group mt="md">
          <Button color="red" onClick={recallForm}>
            Yes, Recall Form
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default AssessmentInternalForm;
