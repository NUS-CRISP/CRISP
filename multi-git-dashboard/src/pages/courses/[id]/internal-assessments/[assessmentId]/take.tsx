/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, Button, Text, Modal, Group, ScrollArea } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { Question } from '@shared/types/Question';
import TakeAssessmentCard from '@/components/cards/TakeAssessmentCard';

const TakeAssessment: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };

  const assessmentsApiRoute = `/api/internal-assessments/${assessmentId}`;
  const questionsApiRoute = `/api/internal-assessments/${assessmentId}/questions`;
  const submitAssessmentApiRoute = `/api/internal-assessments/${assessmentId}/submit`;

  const [assessment, setAssessment] = useState<InternalAssessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [missingRequiredQuestions, setMissingRequiredQuestions] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [showBackModal, setShowBackModal] = useState<boolean>(false); // Added state for back modal

  const fetchAssessment = useCallback(async () => {
    try {
      const response = await fetch(assessmentsApiRoute);
      if (!response.ok) {
        console.error('Error fetching assessment:', response.statusText);
        return;
      }
      const data: InternalAssessment = await response.json();
      setAssessment(data);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    }
  }, [assessmentsApiRoute]);

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
      fetchAssessment();
      fetchQuestions();
    }
  }, [router.isReady, fetchAssessment, fetchQuestions]);

  useEffect(() => {
    if (questions.length > 0) {
      const savedDraft = localStorage.getItem(`assessmentDraft_${assessmentId}`);
      if (savedDraft) {
        setAnswers(JSON.parse(savedDraft));
      }
    }
  }, [questions]);

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: answer,
    }));
  };

  const handleSubmitClick = () => {
    // Check for missing required questions
    const missingQuestions = questions
      .map((question, index) => ({ question, index }))
      .filter(
        ({ question }) =>
          question.isRequired &&
          (answers[question._id] === undefined ||
            answers[question._id] === null ||
            answers[question._id] === '' ||
            (Array.isArray(answers[question._id]) && answers[question._id].length === 0))
      )
      .map(({ index }) => `Question ${index + 1}`);

    if (missingQuestions.length > 0) {
      setMissingRequiredQuestions(missingQuestions);
      setShowErrorModal(true);
    } else {
      setShowConfirmationModal(true);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(submitAssessmentApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });
      if (!response.ok) {
        console.error('Error submitting assessment:', response.statusText);
        setIsSubmitting(false);
        return;
      }
      // Remove draft from local storage
      localStorage.removeItem(`assessmentDraft_${assessmentId}`);
      // Handle successful submission
      router.push(`/courses/${id}/assessments/${assessmentId}/thank-you`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setIsSubmitting(false);
    }
  };

  const handleBackClick = () => {
    setShowBackModal(true); // Show confirmation modal when back button is clicked
  };

  const confirmBack = () => {
    setShowBackModal(false);
    router.back();
  };

  const handleSaveDraft = () => {
    // Save the answers to local storage
    localStorage.setItem(`assessmentDraft_${assessmentId}`, JSON.stringify(answers));
    showNotification({
      title: 'Draft Saved',
      message: 'Your answers have been saved as a draft.',
    });
  };

  const formatAnswer = (answer: any, questionType: string) => {
    if (answer === undefined || answer === null || answer === '') {
      return 'No answer provided';
    }
    switch (questionType) {
      case 'Multiple Choice':
        return answer;
      case 'Multiple Response':
        return Array.isArray(answer) ? answer.join(', ') : answer;
      case 'Scale':
        return answer.toString();
      case 'Short Response':
      case 'Long Response':
        return answer;
      case 'Date':
        if (Array.isArray(answer)) {
          // Date range
          const [start, end] = answer;
          return `${start ? new Date(start).toLocaleDateString() : 'N/A'} - ${
            end ? new Date(end).toLocaleDateString() : 'N/A'
          }`;
        } else {
          return answer ? new Date(answer).toLocaleDateString() : 'No date selected';
        }
      case 'Number':
        return answer.toString();
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
        />
      ))}

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
        <Group justify="end" mt="md">
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
        <Group justify="end" mt="md">
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
