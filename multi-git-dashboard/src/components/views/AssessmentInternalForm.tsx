import { Button, Modal, Group, Text, Box } from '@mantine/core';
import {
  MultipleChoiceQuestion,
  MultipleResponseQuestion,
  NumberQuestion,
  Question,
  ScaleQuestion,
} from '@shared/types/Question';
import AssessmentMakeQuestionCard from '@/components/cards/AssessmentMakeQuestionCard';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { useEffect, useState } from 'react';

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
  onAssessmentUpdated,
}) => {
  console.log(questions);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false); // Modal for releasing the form
  const [isRecallModalOpen, setIsRecallModalOpen] = useState<boolean>(false); // Modal for recalling the form

  const isLocked = assessment?.isReleased || false;
  const isReleased = assessment?.isReleased || false;
  const calculateTotalPossiblePoints = (): number => {
    let totalPoints = 0;
    questions.forEach(question => {
      switch (question.type) {
        case 'Multiple Choice':
          if ((question as MultipleChoiceQuestion).isScored) {
            const maxOptionPoints = Math.max(
              ...(question as MultipleChoiceQuestion).options.map(
                option => option.points || 0
              )
            );
            totalPoints += maxOptionPoints;
          }
          break;
        case 'Multiple Response':
          if ((question as MultipleResponseQuestion).isScored) {
            const optionsPoints = (
              question as MultipleResponseQuestion
            ).options.map(option => option.points || 0);
            // Sum only positive points
            const positiveOptionPoints = optionsPoints.filter(p => p > 0);
            const totalOptionPoints = positiveOptionPoints.reduce(
              (sum, p) => sum + p,
              0
            );
            totalPoints += totalOptionPoints;
          }
          break;
        case 'Scale':
          if ((question as ScaleQuestion).isScored) {
            const maxLabelPoints = Math.max(
              ...(question as ScaleQuestion).labels.map(
                label => label.points || 0
              )
            );
            totalPoints += maxLabelPoints;
          }
          break;
        case 'Number':
          if ((question as NumberQuestion).isScored) {
            if ((question as NumberQuestion).scoringMethod === 'direct') {
              totalPoints += (question as NumberQuestion).maxPoints || 0;
            } else if ((question as NumberQuestion).scoringMethod === 'range') {
              const maxRangePoints = Math.max(
                ...((question as NumberQuestion).scoringRanges || []).map(
                  range => range.points || 0
                )
              );
              totalPoints += maxRangePoints;
            }
          }
          break;
        default:
          break;
      }
    });
    return totalPoints;
  };
  const [totalPossiblePoints, setTotalPossiblePoints] = useState(
    calculateTotalPossiblePoints()
  );
  const maxMarks = assessment?.maxMarks || 0;
  const [scalingFactor, setScalingFactor] = useState(
    maxMarks && totalPossiblePoints > 0 ? maxMarks / totalPossiblePoints : 1
  );

  const releaseForm = async () => {
    try {
      const response = await fetch(
        `/api/internal-assessments/${assessment?._id}/release`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
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
      const response = await fetch(
        `/api/internal-assessments/${assessment?._id}/recall`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
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

  useEffect(() => {
    setTotalPossiblePoints(calculateTotalPossiblePoints());
  }, questions);

  useEffect(() => {
    const calculateTotalPossiblePoints = (): number => {
      let totalPoints = 0;
      questions.forEach(question => {
        switch (question.type) {
          case 'Multiple Choice':
            if ((question as MultipleChoiceQuestion).isScored) {
              const maxOptionPoints = Math.max(
                ...(question as MultipleChoiceQuestion).options.map(
                  option => option.points || 0
                )
              );
              totalPoints += maxOptionPoints;
            }
            break;
          case 'Multiple Response':
            if ((question as MultipleResponseQuestion).isScored) {
              const optionsPoints = (
                question as MultipleResponseQuestion
              ).options.map(option => option.points || 0);
              const positiveOptionPoints = optionsPoints.filter(p => p > 0);
              const totalOptionPoints = positiveOptionPoints.reduce(
                (sum, p) => sum + p,
                0
              );
              totalPoints += totalOptionPoints;
            }
            break;
          case 'Scale':
            if ((question as ScaleQuestion).isScored) {
              const maxLabelPoints = Math.max(
                ...(question as ScaleQuestion).labels.map(
                  label => label.points || 0
                )
              );
              totalPoints += maxLabelPoints;
            }
            break;
          case 'Number':
            if ((question as NumberQuestion).isScored) {
              if ((question as NumberQuestion).scoringMethod === 'direct') {
                totalPoints += (question as NumberQuestion).maxPoints || 0;
              } else if (
                (question as NumberQuestion).scoringMethod === 'range'
              ) {
                const maxRangePoints = Math.max(
                  ...((question as NumberQuestion).scoringRanges || []).map(
                    range => range.points || 0
                  )
                );
                totalPoints += maxRangePoints;
              }
            }
            break;
          default:
            break;
        }
      });
      return totalPoints;
    };

    const totalPoints = calculateTotalPossiblePoints();
    setTotalPossiblePoints(totalPoints);

    const maxMarks = assessment?.maxMarks || 0;
    const scaling = maxMarks && totalPoints > 0 ? maxMarks / totalPoints : 1;
    setScalingFactor(scaling);
  }, [questions, assessment?.maxMarks]);

  return (
    <div>
      {/* Padding added above the first question card */}
      <Box pt={16}>
        {/* Questions list */}
        {questions.map((question, index) => (
          <AssessmentMakeQuestionCard
            key={question._id}
            index={index}
            questionData={question}
            onSave={updatedQuestion =>
              handleSaveQuestion(question._id, updatedQuestion)
            }
            onDelete={() => handleDeleteQuestion(question._id)}
            isLocked={isLocked || question.isLocked} // Pass isLocked to disable edit buttons
          />
        ))}
      </Box>
      <Box mt={24} pb={16}>
        <Text>Total Possible Points from Questions: {totalPossiblePoints}</Text>
        <Text>Assessment Maximum Marks: {maxMarks}</Text>
        {maxMarks && totalPossiblePoints > 0 && (
          <Text>
            Points in this quiz will be adjusted by this factor to match max
            marks: x{scalingFactor.toFixed(2)}
          </Text>
        )}
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
          Are you sure you want to release the form to all Teaching Assistants?
          The form will be locked and you won’t be able to edit it unless you
          recall it later.
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
          Are you sure you want to recall the form? The form will be unlocked,
          and Teaching Assistants will no longer have access to it.
        </Text>
        <Group mt="md">
          <Button color="red" onClick={recallForm}>
            Yes, Recall Form
          </Button>
        </Group>
      </Modal>
    </div>
  );
};

export default AssessmentInternalForm;
