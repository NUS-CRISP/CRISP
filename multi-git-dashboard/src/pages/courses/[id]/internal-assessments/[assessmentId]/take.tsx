// components/TakeAssessment.tsx

import { Container, Button, Text, Modal, Group, ScrollArea } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { Question, QuestionUnion } from '@shared/types/Question';
import { AnswerUnion } from '@shared/types/Answer';
import { AnswerInput } from '@shared/types/AnswerInput';
import { Submission } from '@shared/types/Submission';
import TakeAssessmentCard from '@/components/cards/TakeAssessmentCard';

interface TakeAssessmentProps {
  assessment: InternalAssessment;
  existingSubmission?: Submission;
  canEdit?: boolean;
}

const TakeAssessment: React.FC<TakeAssessmentProps> = ({
  assessment,
  existingSubmission,
  canEdit = true,
}) => {
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };

  const questionsApiRoute = `/api/internal-assessments/${assessmentId}/questions`;
  const submitAssessmentApiRoute = `/api/internal-assessments/${assessmentId}/submit`;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: AnswerInput }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [missingRequiredQuestions, setMissingRequiredQuestions] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [showBackModal, setShowBackModal] = useState<boolean>(false);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch(questionsApiRoute);
      if (!response.ok) {
        console.error('Error fetching questions:', response.statusText);
        return;
      }
      const data: Question[] = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  }, [questionsApiRoute]);

  useEffect(() => {
    if (router.isReady) {
      fetchQuestions();
    }
  }, [router.isReady, fetchQuestions]);

  useEffect(() => {
    if (existingSubmission) {
      // Initialize answers from existing submission
      const initialAnswers = existingSubmission.answers.reduce(
        (acc, answer) => {
          // Extract the question ID correctly
          const questionId =
            typeof answer.question === 'string'
              ? answer.question
              : (answer.question as QuestionUnion)._id;

          acc[questionId] = extractAnswerValue(answer);
          return acc;
        },
        {} as { [questionId: string]: AnswerInput }
      );
      setAnswers(initialAnswers);
    } else {
      // Load draft from localStorage if available
      const savedDraft = localStorage.getItem(`assessmentDraft_${assessmentId}`);
      if (savedDraft) {
        setAnswers(JSON.parse(savedDraft));
      }
    }
  }, [existingSubmission, assessmentId]);
  const extractAnswerValue = (answer: AnswerUnion): AnswerInput => {
    switch (answer.type) {
      case 'Multiple Choice':
        return answer.value;
      case 'Multiple Response':
        return answer.values;
      case 'Scale':
        return answer.value;
      case 'Short Response':
      case 'Long Response':
        return answer.value;
      case 'Date':
        if (answer.startDate && answer.endDate) {
          return [new Date(answer.startDate), new Date(answer.endDate)];
        } else if (answer.value) {
          return new Date(answer.value);
        } else {
          return undefined;
        }
      case 'Number':
        return answer.value;
      default:
        return undefined;
    }
  };

  const handleAnswerChange = (questionId: string, answer: AnswerInput) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: answer,
    }));
  };

  const isAnswerEmpty = (answer: AnswerInput): boolean => {
    if (answer === undefined || answer === null) {
      return true;
    }

    if (typeof answer === 'string') {
      return answer.trim() === '';
    }

    if (typeof answer === 'number') {
      return false; // Numbers are considered not empty
    }

    if (answer instanceof Date) {
      return isNaN(answer.getTime());
    }

    if (Array.isArray(answer)) {
      if (answer.length === 0) {
        return true;
      }
      // For date ranges or arrays, check if all elements are empty
      return answer.every(
        (item) => item === undefined || item === null || item === '' || isNaN((item as Date).getTime())
      );
    }

    return false;
  };

  const handleSubmitClick = () => {
    // Check for missing required questions
    const missingQuestions = questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => question.isRequired && isAnswerEmpty(answers[question._id]))
      .map(({ index }) => `Question ${index + 1}`);

    if (missingQuestions.length > 0) {
      setMissingRequiredQuestions(missingQuestions);
      setShowErrorModal(true);
    } else {
      setShowConfirmationModal(true);
    }
  };

  interface SubmissionData {
    answers: AnswerUnion[];
    isDraft: boolean;
    submissionId?: string;
  }

  const formatAnswerForSubmission = (
    question: Question,
    answer: AnswerInput
  ): Partial<AnswerUnion> => {
    switch (question.type) {
      case 'Multiple Choice':
        return { value: answer as string };
      case 'Multiple Response':
        return { values: answer as string[] };
      case 'Scale':
        return { value: answer as number };
      case 'Short Response':
      case 'Long Response':
        return { value: answer as string };
      case 'Date':
        if (Array.isArray(answer)) {
          const [startDate, endDate] = answer as [Date | null, Date | null];
          return {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          };
        } else {
          return { value: (answer as Date) || undefined };
        }
      case 'Number':
        return { value: answer as number };
      default:
        return {};
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Prepare the answers in the format expected by the backend
      const formattedAnswers = Object.entries(answers)
        .map(([questionId, answer]) => {
          const question = questions.find((q) => q._id === questionId);
          if (!question) {
            return null;
          }
          return {
            question: questionId,
            type: question.type,
            ...formatAnswerForSubmission(question, answer),
          };
        })
        .filter((a): a is AnswerUnion => a !== null);

      const submissionData: SubmissionData = {
        answers: formattedAnswers,
        isDraft: false,
      };
      if (existingSubmission && existingSubmission._id) {
        submissionData.submissionId = existingSubmission._id;
      }

      const response = await fetch(submitAssessmentApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
      if (!response.ok) {
        console.error('Error submitting assessment:', response.statusText);
        setIsSubmitting(false);
        return;
      }
      // Remove draft from local storage
      localStorage.removeItem(`assessmentDraft_${assessmentId}`);
      // Handle successful submission
      showNotification({
        title: 'Submission Successful',
        message: 'Your assessment has been submitted.',
        color: 'green',
      });
      router.back();
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setIsSubmitting(false);
    }
  };

  const handleBackClick = () => {
    // Show confirmation modal when back button is clicked
    setShowBackModal(true);
  };

  const confirmBack = () => {
    setShowBackModal(false);
    // Navigate to the assessment overview or course page
    router.push(`/courses/${id}/assessments/${assessmentId}`);
  };

  const handleSaveDraft = async () => {
    // Save the answers to local storage
    localStorage.setItem(`assessmentDraft_${assessmentId}`, JSON.stringify(answers));
    showNotification({
      title: 'Draft Saved',
      message: 'Your answers have been saved as a draft.',
    });
    // Optionally, send the draft to the backend
    try {
      // Prepare the answers in the format expected by the backend
      const formattedAnswers = Object.entries(answers)
        .map(([questionId, answer]) => {
          const question = questions.find((q) => q._id === questionId);
          if (!question) {
            return null;
          }
          return {
            question: questionId,
            type: question.type,
            ...formatAnswerForSubmission(question, answer),
          };
        })
        .filter((a): a is AnswerUnion => a !== null);

      const submissionData: SubmissionData = {
        answers: formattedAnswers,
        isDraft: true,
      };
      if (existingSubmission && existingSubmission._id) {
        submissionData.submissionId = existingSubmission._id;
      }

      await fetch(submitAssessmentApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const formatAnswer = (answer: AnswerInput, questionType: string): string => {
    if (answer === undefined || answer === null || answer === '') {
      return 'No answer provided';
    }
    switch (questionType) {
      case 'Multiple Choice':
        return answer as string;
      case 'Multiple Response':
        return Array.isArray(answer) ? (answer as string[]).join(', ') : answer.toString();
      case 'Scale':
        return (answer as number).toString();
      case 'Short Response':
      case 'Long Response':
        return answer as string;
      case 'Date':
        if (Array.isArray(answer)) {
          const [start, end] = answer as [Date | null, Date | null];
          return `${start ? start.toLocaleDateString() : 'N/A'} - ${end ? end.toLocaleDateString() : 'N/A'}`;
        } else {
          return answer ? (answer as Date).toLocaleDateString() : 'No date selected';
        }
      case 'Number':
        return (answer as number).toString();
      default:
        return answer.toString();
    }
  };

  return (
    <Container mb="xl">
      {assessment && (
        <div>
          <h1>{assessment.assessmentName}</h1>
          <p>{assessment.description}</p>
        </div>
      )}
      {questions.map((question, index) => (
        <TakeAssessmentCard
          key={question._id}
          index={index}
          question={question}
          answer={answers[question._id]}
          onAnswerChange={(answer) => handleAnswerChange(question._id, answer)}
          disabled={!canEdit}
        />
      ))}

      {canEdit && (
        <Group mt="md" justify="space-between">
          <Button variant="default" onClick={handleBackClick}>
            Back
          </Button>
          <Group>
            <Button variant="default" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button onClick={handleSubmitClick} loading={isSubmitting}>
              Submit
            </Button>
          </Group>
        </Group>
      )}

      {/* Confirmation Modal */}
      <Modal
        opened={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title="Confirm Submission"
        size="lg"
      >
        <ScrollArea style={{ height: '60vh' }}>
          {/* Display a summary of the user's responses */}
          {questions.map((question, index) => (
            <div key={question._id} style={{ marginBottom: '1rem' }}>
              <Text>
                {index + 1}. {question.text}
              </Text>
              <Text>Answer: {formatAnswer(answers[question._id], question.type)}</Text>
            </div>
          ))}
        </ScrollArea>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setShowConfirmationModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Confirm</Button>
        </Group>
      </Modal>

      {/* Error Modal */}
      <Modal
        opened={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Missing Required Questions"
      >
        <Text>Please answer the following required questions before submitting:</Text>
        <ul>
          {missingRequiredQuestions.map((questionNumber) => (
            <li key={questionNumber}>{questionNumber}</li>
          ))}
        </ul>
        <Button onClick={() => setShowErrorModal(false)} mt="md">
          OK
        </Button>
      </Modal>

      {/* Back Confirmation Modal */}
      <Modal
        opened={showBackModal}
        onClose={() => setShowBackModal(false)}
        title="Unsaved Progress"
      >
        <Text>
          You have unsaved progress. Are you sure you want to leave this page? Your unsaved changes
          will be lost.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setShowBackModal(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmBack}>
            Leave Page
          </Button>
        </Group>
      </Modal>
    </Container>
  );
};

export default TakeAssessment;
