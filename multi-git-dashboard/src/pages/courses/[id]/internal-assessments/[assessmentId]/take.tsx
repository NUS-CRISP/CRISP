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
import { Team } from '@shared/types/Team';

interface TakeAssessmentProps {
  inputAssessment: InternalAssessment;
  existingSubmission?: Submission;
  canEdit?: boolean;
}

const TakeAssessment: React.FC<TakeAssessmentProps> = ({
  inputAssessment,
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
  const assessmentApiRoute = `/api/internal-assessments/${assessmentId}`;

  const [assessment, setAssessment] = useState<InternalAssessment | null>(inputAssessment);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: AnswerInput }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [missingRequiredQuestions, setMissingRequiredQuestions] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [showBackModal, setShowBackModal] = useState<boolean>(false);
  const [teamMembersOptions, setTeamMembersOptions] = useState<{ value: string; label: string }[]>([]);


  const fetchAssessment = useCallback(async () => {
    if (assessment !== null && assessment !== undefined) return;
    try {
      const response = await fetch(assessmentApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error('Error fetching assessment:', response.statusText);
        return;
      }
      const data: InternalAssessment = await response.json();
      setAssessment(data);
      console.log(data)
    } catch (error) {
      console.error('Error fetching assessment:', error);
    }
  }, [assessmentApiRoute]);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch(questionsApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
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

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/course/${id}/ta`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch teams');
      const teams: Team[] = await res.json();
      // Extract team members
      const teamMembers = teams.flatMap((team) => team.members);
      // Remove duplicates
      const uniqueMembers = Array.from(new Set(teamMembers.map((member) => member._id))).map((id) =>
        teamMembers.find((member) => member._id === id)
      );
      if (uniqueMembers.length > 0) {
        const options = uniqueMembers
        .filter((member) => member !== undefined && member !== null)
        .map((member) => ({
          value: member._id,
          label: member.name,
        }));
        setTeamMembersOptions(options);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [id]);

  useEffect(() => {
    if (router.isReady) {
      fetchAssessment();
      fetchQuestions();
      fetchTeamMembers();
    }
  }, [router.isReady, fetchAssessment, fetchQuestions, fetchTeamMembers]);

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
      case 'Team Member Selection':
        return answer.selectedUserIds;
      case 'Multiple Response':
        return answer.values;
      case 'Multiple Choice':
      case 'Scale':
      case 'Short Response':
      case 'Long Response':
      case 'NUSNET ID':
      case 'NUSNET Email':
      case 'Number':
        return answer.value;
      case 'Date':
        if (answer.startDate && answer.endDate) {
          return [new Date(answer.startDate), new Date(answer.endDate)];
        } else if (answer.value) {
          return new Date(answer.value);
        } else {
          return undefined;
        }
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
      return false;
    }

    if (answer instanceof Date) {
      return isNaN(answer.getTime());
    }

    if (Array.isArray(answer)) {
      if (answer.length === 0) {
        return true;
      }

      if (answer.every((item) => typeof item === 'string')) {
        return answer.every((item) => item.trim() === '');
      }

      if (answer.every((item) => item instanceof Date)) {
        return answer.every(
          (item) => item === undefined || item === null || isNaN(new Date(item).getTime())
        );
      }

      return false;
    }

    return false;
  };

  const handleSubmitClick = () => {
    if (!canEdit) {
      return;
    }
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
      case 'Team Member Selection':
        return { selectedUserIds: answer as string[] };
      case 'Multiple Response':
        return { values: answer as string[] };
      case 'Scale':
      case 'Number':
        return { value: answer as number };
      case 'Multiple Choice':
      case 'Short Response':
      case 'Long Response':
      case 'NUSNET ID':
      case 'NUSNET Email':
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
      // Remove draft from local storage (if it exists)
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
    router.push(`/courses/${id}/internal-assessments/${assessmentId}`);
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
      case 'Multiple Response':
        return Array.isArray(answer) ? (answer as string[]).join(', ') : answer.toString();
      case 'Scale':
        return (answer as number).toString();
      case 'Multiple Choice':
      case 'Short Response':
      case 'Long Response':
      case 'NUSNET ID':
      case 'NUSNET Email':
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
      case 'Team Member Selection':
        if (Array.isArray(answer)) {
          const selectedMembers = answer as string[];
          const selectedNames = selectedMembers
            .map((id) => teamMembersOptions.find((option) => option.value === id)?.label || id)
            .join(', ');
          return selectedNames;
        } else {
          return 'No team members selected';
        }
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
      {inputAssessment && !canEdit && (
        <Text c="red" mb="md">
          You cannot edit this submission. While you can change the fields, you cannot submit the edits.
        </Text>
      )}

      {assessment && questions.map((question, index) => (
        <TakeAssessmentCard
          key={question._id}
          index={index}
          question={question}
          answer={answers[question._id]}
          onAnswerChange={(answer) => handleAnswerChange(question._id, answer)}
          disabled={!canEdit}
          teamMembersOptions={
            question.type === 'Team Member Selection' ? teamMembersOptions : undefined
          }
          assessmentGranularity={assessment.granularity}
        />
      ))}

      {canEdit && (
        <Group mt="md" justify="space-between">
          <Button variant="default" onClick={handleBackClick}>
            Back
          </Button>
          <Group>
            {((!inputAssessment && !existingSubmission) || (existingSubmission && existingSubmission.isDraft)) &&
              <Button variant="default" onClick={handleSaveDraft}>
                Save Draft
              </Button>
            }
            <Button
              onClick={handleSubmitClick}
              loading={isSubmitting}
              disabled={!canEdit && !(existingSubmission && existingSubmission.isDraft)}
              variant={canEdit || (existingSubmission && existingSubmission.isDraft) ? 'filled' : 'outline'}
            >
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
