/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/courses/[id]/internal-assessments/[assessmentId]/take.tsx

import {
  Container,
  Button,
  Text,
  Modal,
  Group,
  ScrollArea,
  Divider,
  NumberInput,
  Paper,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import {
  MultipleChoiceQuestion,
  MultipleResponseQuestion,
  NumberQuestion,
  Question,
  QuestionUnion,
  ScaleQuestion,
} from '@shared/types/Question';
import { AnswerUnion } from '@shared/types/Answer';
import { AnswerInput } from '@shared/types/AnswerInput';
import { Submission } from '@shared/types/Submission';
import TakeAssessmentCard from '@/components/cards/TakeAssessmentCard';
import { Team } from '@shared/types/Team';
import { User } from '@shared/types/User';

interface TakeAssessmentProps {
  inputAssessment: InternalAssessment;
  existingSubmission?: Submission;
  canEdit?: boolean;
  isFaculty?: boolean;
}

const TakeAssessment: React.FC<TakeAssessmentProps> = ({
  inputAssessment,
  existingSubmission,
  canEdit = true,
  isFaculty = false,
}) => {
  console.log(existingSubmission)
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };

  const questionsApiRoute = `/api/internal-assessments/${assessmentId}/questions`;
  const submitAssessmentApiRoute = `/api/internal-assessments/${assessmentId}/submit`;
  const assessmentApiRoute = `/api/internal-assessments/${assessmentId}`;

  const [assessment, setAssessment] = useState<InternalAssessment | null>(
    inputAssessment
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: AnswerInput }>(
    {}
  );
  const [totalScore, setTotalScore] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmationModal, setShowConfirmationModal] =
    useState<boolean>(false);
  const [showDeleteDraftModal, setShowDeleteDraftModal] =
    useState<boolean>(false);
  const [missingRequiredQuestions, setMissingRequiredQuestions] = useState<
    string[]
  >([]);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [showBackModal, setShowBackModal] = useState<boolean>(false);
  const [teamOptions, setTeamOptions] = useState<
    {
      value: string;
      label: string;
      members: { value: string; label: string }[];
    }[]
  >([]);
  const [teamMembersOptions, setTeamMembersOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [submission, setSubmission] = useState<Submission | undefined>(
    existingSubmission
  );
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showAdjustScoreModal, setShowAdjustScoreModal] =
    useState<boolean>(false);
  const [newAdjustedScore, setNewAdjustedScore] = useState<number | undefined>(
    undefined
  );

  const isScoredQuestion = (
    question: QuestionUnion
  ): question is
    | MultipleChoiceQuestion
    | MultipleResponseQuestion
    | ScaleQuestion
    | NumberQuestion => {
    return (
      (question.type === 'Multiple Choice' ||
        question.type === 'Multiple Response' ||
        question.type === 'Scale' ||
        question.type === 'Number') &&
      question.isScored
    );
  };

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
      console.log(data);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    }
  }, [assessmentApiRoute, assessment]);

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
      console.log(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  }, [questionsApiRoute]);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    try {
      const endpoint = isFaculty
        ? `/api/teams/course/${id}`
        : `/api/teams/course/${id}/ta`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch teams');

      const teams: Team[] = await res.json();
      // Extract team members
      const teamMembers = teams.flatMap(team => team.members);
      // Remove duplicates
      const uniqueMembers = Array.from(
        new Set(teamMembers.map(member => member._id))
      ).map(id => teamMembers.find(member => member._id === id));
      if (uniqueMembers.length > 0) {
        const options = uniqueMembers
          .filter(member => member !== undefined && member !== null)
          .map(member => ({
            value: member!._id,
            label: member!.name,
          }));
        setTeamMembersOptions(options);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [id, isFaculty]);

  // Fetch assigned teams or users for TA
  const fetchAssignedEntities = useCallback(async () => {
    if (!assessment) return;
    try {
      const response = await fetch(
        `/api/assignment-sets/${assessmentId}/assignment-sets/ta`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        console.error('Error fetching assigned entities:', response.statusText);
        return;
      }
      const data = await response.json();
      console.log(data);

      if (assessment.granularity === 'team') {
        const teams = data as Team[];
        const options = teams.map(team => ({
          value: team._id,
          label: `Team ${team.number}`,
          members: team.members.map(member => ({
            value: member._id,
            label: member.name,
          })),
        }));
        console.log(options);
        setTeamOptions(options);
      } else if (assessment.granularity === 'individual') {
        const users = data as User[];
        const options = users.map(user => ({
          value: user._id,
          label: user.name,
        }));
        console.log(options);
        setTeamMembersOptions(options);
      }
    } catch (error) {
      console.error('Error fetching assigned entities:', error);
    }
  }, [assessment, assessmentId]);

  /**
   * Calculate the total score and per-question scores for the submission.
   * This is useful for displaying in the summary modal.
   */
  const calculatePerQuestionScores = (): {
    question: Question;
    score: number;
  }[] => {
    if (!submission) return [];

    return questions
      .map(question => {
        const answer = submission.answers.find(
          ans => ans.question.toString() === question._id.toString()
        );
        return {
          question,
          score: answer?.score || 0,
        };
      })
      .filter(({ question }) => isScoredQuestion(question));
  };

  const adjustSubmissionScore = async (
    submissionId: string,
    adjustedScore: number
  ) => {
    try {
      await fetch(`/api/submissions/${submissionId}/adjust-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adjustedScore,
        }),
      });
    } catch (error: any) {
      // Handle errors appropriately
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      showNotification({
        title: 'Error',
        message: 'Failed to adjust submission score.',
        color: 'red',
      });
    }
  };

  useEffect(() => {
    if (router.isReady) {
      fetchAssessment();
    }
  }, [router.isReady, fetchAssessment]);

  useEffect(() => {
    if (assessment) {
      fetchQuestions();
      fetchTeamMembers();
      fetchAssignedEntities();
    }
  }, [assessment, fetchQuestions, fetchAssignedEntities, fetchTeamMembers]);

  useEffect(() => {
    if (
      submission &&
      submission.answers &&
      ((assessment?.granularity === 'individual' &&
        teamMembersOptions.length > 0) ||
        (assessment?.granularity === 'team' && teamOptions.length > 0))
    ) {
      // Initialize answers from existing submission
      const initialAnswers = submission.answers.reduce(
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

      const initialTotalScore =
        submission.adjustedScore !== undefined
          ? submission.adjustedScore
          : submission.score;
      setTotalScore(initialTotalScore);
    }
  }, [submission, teamOptions, teamMembersOptions, assessment]);

  const extractAnswerValue = (answer: AnswerUnion): AnswerInput => {
    switch (answer.type) {
      case 'Team Member Selection Answer':
        if (assessment?.granularity === 'team') {
          // Find team IDs that contain the selectedUserIds
          const userIds = answer.selectedUserIds;
          const teamIds = teamOptions
            .filter(team =>
              team.members.some(member => userIds.includes(member.value))
            )
            .map(team => team.value);
          return teamIds;
        } else {
          // Individual granularity
          return answer.selectedUserIds;
        }
      case 'Multiple Response Answer':
        return answer.values;
      case 'Multiple Choice Answer':
      case 'Scale Answer':
      case 'Short Response Answer':
      case 'Long Response Answer':
      case 'NUSNET ID Answer':
      case 'NUSNET Email Answer':
      case 'Number Answer':
        return answer.value;
      case 'Date Answer':
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
    setAnswers(prevAnswers => ({
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
      const arrayAnswer = answer as any[]; // npm run build needs this to be any to compile
      if (arrayAnswer.length === 0) {
        return true;
      }

      if (arrayAnswer.every(item => typeof item === 'string')) {
        return arrayAnswer.every(item => item.trim() === '');
      }

      if (arrayAnswer.every(item => item instanceof Date)) {
        return arrayAnswer.every(
          item =>
            item === undefined ||
            item === null ||
            isNaN(new Date(item).getTime())
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
      .filter(
        ({ question }) =>
          question.isRequired && isAnswerEmpty(answers[question._id])
      )
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
        if (assessment?.granularity === 'team') {
          // Map team IDs to member IDs
          const selectedTeamIds = answer as string[];
          const memberIds = selectedTeamIds.flatMap(teamId => {
            const team = teamOptions.find(t => t.value === teamId);
            return team ? team.members.map(member => member.value) : [];
          });
          return { selectedUserIds: memberIds as string[] };
        } else {
          return { selectedUserIds: answer as string[] };
        }
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
          const question = questions.find(q => q._id === questionId);
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

      if (submission && submission._id) {
        submissionData.submissionId = submission._id;
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

      const savedSubmission: Submission = (await response.json()).submission;

      setSubmission(savedSubmission);

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
    setShowBackModal(true);
  };

  const confirmBack = () => {
    setShowBackModal(false);
    router.push(`/courses/${id}/internal-assessments/${assessmentId}`);
  };

  const handleSaveDraft = async () => {
    try {
      // Prepare the answers in the format expected by the backend
      const formattedAnswers = Object.entries(answers)
        .map(([questionId, answer]) => {
          const question = questions.find(q => q._id === questionId);
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
      if (submission && submission._id) {
        submissionData.submissionId = submission._id;
      }

      const response = await fetch(submitAssessmentApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        console.error('Error saving draft:', response.statusText);
        return;
      }

      const savedSubmission: Submission = (await response.json()).submission;

      setSubmission(savedSubmission);

      showNotification({
        title: 'Draft Saved',
        message: 'Your answers have been saved as a draft.',
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handleDeleteDraft = () => {
    // Open the confirmation modal
    setShowDeleteDraftModal(true);
  };

  const confirmDeleteDraft = async () => {
    try {
      if (!submission || !submission._id) {
        return;
      }

      const response = await fetch(`/api/submissions/${submission._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error deleting draft submission:', response.statusText);
        showNotification({
          title: 'Error',
          message: 'Failed to delete draft submission.',
          color: 'red',
        });
        return;
      }

      // Update state
      setSubmission(undefined);
      setAnswers({});
      setShowDeleteDraftModal(false);

      showNotification({
        title: 'Draft Deleted',
        message: 'Your draft submission has been deleted.',
        color: 'red',
      });
      router.back();
    } catch (error) {
      console.error('Error deleting draft submission:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to delete draft submission.',
        color: 'red',
      });
    }
  };

  const formatAnswer = (answer: AnswerInput, questionType: string): string => {
    if (answer === undefined || answer === null || answer === '') {
      return 'No answer provided';
    }
    switch (questionType) {
      case 'Multiple Response':
        return Array.isArray(answer)
          ? (answer as string[]).join(', ')
          : answer.toString();
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
          return `${
            start ? new Date(start).toLocaleDateString() : 'N/A'
          } - ${end ? new Date(end).toLocaleDateString() : 'N/A'}`;
        } else {
          return answer
            ? (answer as Date).toLocaleDateString()
            : 'No date selected';
        }
      case 'Number':
        return (answer as number).toString();
      case 'Team Member Selection':
        if (Array.isArray(answer)) {
          if (assessment?.granularity === 'team') {
            // answer contains team IDs
            const selectedTeams = answer as string[];
            const selectedTeamDetails = selectedTeams.map(teamId => {
              const team = teamOptions.find(option => option.value === teamId);
              if (team) {
                const memberNames = team.members
                  .map(member => member.label)
                  .join(', ');
                return `${team.label}: ${memberNames}`;
              } else {
                return `Team ${teamId}`;
              }
            });
            return selectedTeamDetails.join('; ');
          } else if (assessment?.granularity === 'individual') {
            // answer contains user IDs
            const selectedMembers = answer as string[];
            const selectedNames = selectedMembers
              .map(
                id =>
                  teamMembersOptions.find(option => option.value === id)
                    ?.label || id
              )
              .join(', ');
            return selectedNames;
          } else {
            console.log('Error; Should never reach here');
            return '';
          }
        } else {
          return 'No selection made';
        }
      default:
        return answer.toString();
    }
  };

  const handleAdjustScore = () => {
    setShowAdjustScoreModal(true);
  };

  const handleAdjustScoreSubmit = async () => {
    if (newAdjustedScore === undefined) {
      showNotification({
        title: 'Error',
        message: 'Please enter a valid score.',
        color: 'red',
      });
      return;
    }

    try {
      if (!submission || !submission._id) {
        showNotification({
          title: 'Error',
          message: 'No submission available to adjust the score of.',
          color: 'red',
        });
      }

      await adjustSubmissionScore(submission!._id, newAdjustedScore);
      setTotalScore(newAdjustedScore);

      setShowAdjustScoreModal(false);
      setNewAdjustedScore(undefined);

      showNotification({
        title: 'Score Adjusted',
        message: 'The submission score has been successfully adjusted.',
        color: 'green',
      });
    } catch (error: any) {
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to adjust score.',
        color: 'red',
      });
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
          You cannot edit this submission.
        </Text>
      )}

      {assessment &&
        questions &&
        ((teamMembersOptions && teamMembersOptions.length > 0) ||
          (teamOptions && teamOptions.length > 0)) &&
        questions.map((question, index) => (
          <TakeAssessmentCard
            key={question._id}
            index={index}
            question={question}
            answer={answers[question._id]}
            onAnswerChange={answer => handleAnswerChange(question._id, answer)}
            disabled={
              !canEdit ||
              (question.type === 'Team Member Selection' &&
                submission &&
                !submission.isDraft)
            }
            teamMembersOptions={
              question.type === 'Team Member Selection' &&
              assessment.granularity === 'individual'
                ? teamMembersOptions
                : undefined
            }
            teamOptions={
              question.type === 'Team Member Selection' &&
              assessment.granularity === 'team'
                ? teamOptions
                : undefined
            }
            assessmentGranularity={assessment.granularity}
            isFaculty={isFaculty}
            submission={submission}
          />
        ))}

      {canEdit && (
        <Group mt="md" justify="space-between">
          <Button variant="default" onClick={handleBackClick}>
            Back
          </Button>
          <Group>
            {submission && submission.isDraft && (
              <Button variant="default" color="red" onClick={handleDeleteDraft}>
                Delete Draft
              </Button>
            )}
            {(!submission || submission.isDraft) && (
              <Button variant="default" onClick={handleSaveDraft}>
                Save Draft
              </Button>
            )}
            <Button
              onClick={handleSubmitClick}
              loading={isSubmitting}
              disabled={!canEdit && !(submission && submission.isDraft)}
              variant={
                canEdit || (submission && submission.isDraft)
                  ? 'filled'
                  : 'outline'
              }
            >
              Submit
            </Button>
          </Group>
        </Group>
      )}

      {/* Faculty Panel with Total Score and Adjust Score Button */}
      {isFaculty && submission && (
        <Paper shadow="sm" p="md" mt="xl" withBorder>
          <Group justify="flex-end" align="center" mb="md">
            <Text size="lg">Submission Score</Text>
            <Button onClick={handleAdjustScore} color="orange">
              Adjust Score
            </Button>
          </Group>
          <Divider mb="md" />
          <Group justify="flex-end" mb="md">
            {/* Display adjusted score if it exists */}
            {submission.adjustedScore !== undefined ? (
              <>
                <Text>Adjusted Score:</Text>
                <Text>{totalScore}</Text>
                <Text>Original Score:</Text>
                <Text>{submission.score}</Text>
              </>
            ) : (
              // Display only original score if no adjusted score exists
              <>
                <Text>Total Score:</Text>
                <Text>{submission.score}</Text>
              </>
            )}
          </Group>
          <Button
            onClick={() => setShowSummaryModal(true)}
            variant="light"
            color="blue"
          >
            View Score Summary
          </Button>
        </Paper>
      )}

      {/* Adjust Score Modal */}
      <Modal
        opened={showAdjustScoreModal}
        onClose={() => setShowAdjustScoreModal(false)}
        title="Adjust Submission Score"
      >
        <NumberInput
          label="New Score"
          placeholder="Enter the adjusted score"
          value={newAdjustedScore}
          onChange={value => setNewAdjustedScore(value as number | undefined)}
          min={0}
          max={submission ? submission.score + 100 : undefined} // Example: allow up to original score + 100
          required
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => setShowAdjustScoreModal(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleAdjustScoreSubmit} color="green">
            Submit
          </Button>
        </Group>
      </Modal>

      {/* Summary Modal */}
      <Modal
        opened={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title="Score Summary"
        size="lg"
      >
        <ScrollArea style={{ height: '60vh' }}>
          {calculatePerQuestionScores().map(({ question, score }, index) => {
            const answer = submission?.answers.find(
              ans => ans.question.toString() === question._id.toString()
            );
            const formattedAnswer = answer
              ? formatAnswer(extractAnswerValue(answer), question.type)
              : 'No answer provided';
            return (
              <div key={question._id} style={{ marginBottom: '1rem' }}>
                <Text>
                  {index + 1}. {question.text}
                </Text>
                <Text>Answer: {formattedAnswer}</Text>
                <Text>Score: {score}</Text>
                <Divider my="sm" />
              </div>
            );
          })}
        </ScrollArea>
        <Group justify="flex-end" mt="md">
          <Button onClick={() => setShowSummaryModal(false)}>Close</Button>
        </Group>
      </Modal>

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
              <Text>
                Answer: {formatAnswer(answers[question._id], question.type)}
              </Text>
              {isFaculty && isScoredQuestion(question) && (
                <Text>
                  Score:{' '}
                  {submission?.answers.find(
                    a => a.question.toString() === question._id.toString()
                  )?.score || 0}
                </Text>
              )}
            </div>
          ))}
        </ScrollArea>
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => setShowConfirmationModal(false)}
          >
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
        <Text>
          Please answer the following required questions before submitting:
        </Text>
        <ul>
          {missingRequiredQuestions.map(questionNumber => (
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
          You have unsaved progress. Are you sure you want to leave this page?
          Your unsaved changes will be lost.
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

      {/* Delete Draft Confirmation Modal */}
      <Modal
        opened={showDeleteDraftModal}
        onClose={() => setShowDeleteDraftModal(false)}
        title="Delete Draft Submission"
      >
        <Text>
          Are you sure you want to delete your draft submission? This action
          cannot be undone.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => setShowDeleteDraftModal(false)}
          >
            Cancel
          </Button>
          <Button color="red" onClick={confirmDeleteDraft}>
            Delete Draft
          </Button>
        </Group>
      </Modal>
    </Container>
  );
};

export default TakeAssessment;
