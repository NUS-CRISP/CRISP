/* eslint-disable @typescript-eslint/no-explicit-any */
/* Example file: components/views/TakeAssessmentInline.tsx */

import React, {
  useState,
  useEffect,
  useCallback,
  Fragment
} from 'react';
import {
  Container,
  Button,
  Text,
  Modal,
  Group,
  ScrollArea,
  Divider,
  NumberInput,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import {
  Question,
  QuestionUnion,
  MultipleChoiceQuestion,
  MultipleResponseQuestion,
  ScaleQuestion,
  NumberQuestion,
} from '@shared/types/Question';
import {
  AnswerUnion
} from '@shared/types/Answer';
import { AnswerInput } from '@shared/types/AnswerInput';
import { Submission } from '@shared/types/Submission';
import { User } from '@shared/types/User';
import TakeAssessmentCard from '@/components/cards/TakeAssessmentCard';
import { useRouter } from 'next/router';
import { isTrial } from '@/lib/auth/utils';

interface TakeAssessmentInlineProps {
  courseId: string;
  assessmentId: string;
  onReturnToOverview: () => void;
}

const TakeAssessmentInline: React.FC<TakeAssessmentInlineProps> = ({
  assessmentId,
  onReturnToOverview,
}) => {
  const router = useRouter();
  const [assessment, setAssessment] = useState<InternalAssessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: AnswerInput }>({});
  const [submission, setSubmission] = useState<Submission | undefined>();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [missingRequiredQuestions, setMissingRequiredQuestions] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);

  const [showAdjustScoreModal, setShowAdjustScoreModal] = useState<boolean>(false);
  const [newAdjustedScore, setNewAdjustedScore] = useState<number | undefined>(undefined);

  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showBackModal, setShowBackModal] = useState<boolean>(false);
  const [showDeleteDraftModal, setShowDeleteDraftModal] = useState<boolean>(false);

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

  const isTrialVar = isTrial();

  const questionsApiRoute = `/api/internal-assessments/${assessmentId}/questions`;
  const submitAssessmentApiRoute = `/api/internal-assessments/${assessmentId}/submit`;
  const assessmentApiRoute = `/api/internal-assessments/${assessmentId}`;
  const assignedEntitiesApiRoute = `/api/assignment-sets/${assessmentId}/assignment-sets/graderunmarked`;

  // =========== UTILS =============
  const isScoredQuestion = (
    question: QuestionUnion
  ): question is MultipleChoiceQuestion | MultipleResponseQuestion | ScaleQuestion | NumberQuestion => {
    return (
      (question.type === 'Multiple Choice' ||
       question.type === 'Multiple Response' ||
       question.type === 'Scale' ||
       question.type === 'Number') &&
      question.isScored
    );
  };

  const extractAnswerValue = (answer: AnswerUnion): AnswerInput => {
    switch (answer.type) {
      case 'Team Member Selection Answer':
        if (assessment?.granularity === 'team') {
          const userIds = answer.selectedUserIds;
          const teamIds = teamOptions
            .filter(team =>
              team.members.some(member => userIds.includes(member.value))
            )
            .map(team => team.value);
          return teamIds;
        } else {
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

  const formatAnswerForSubmission = (
    question: Question,
    answer: AnswerInput
  ): Partial<AnswerUnion> => {
    switch (question.type) {
      case 'Team Member Selection':
        if (assessment?.granularity === 'team') {
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
      const arrayAnswer = answer as any[];
      if (arrayAnswer.length === 0) {
        return true;
      }
      if (arrayAnswer.every(item => typeof item === 'string')) {
        return arrayAnswer.every(item => item.trim() === '');
      }
      if (arrayAnswer.every(item => item instanceof Date)) {
        return arrayAnswer.every(item => isNaN(new Date(item).getTime()));
      }
      return false;
    }
    return false;
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
          return `${start ? start.toLocaleDateString() : 'N/A'} - ${end ? end.toLocaleDateString() : 'N/A'}`;
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
            const selectedMembers = answer as string[];
            const selectedNames = selectedMembers
              .map(
                id =>
                  teamMembersOptions.find(option => option.value === id)?.label || id
              )
              .join(', ');
            return selectedNames;
          } else {
            return '';
          }
        } else {
          return 'No selection made';
        }
      default:
        return answer.toString();
    }
  };

  // =========== DATA FETCH =============
  const fetchAssessment = useCallback(async () => {
    try {
      if (assessment) return;

      const resp = await fetch(assessmentApiRoute);
      if (!resp.ok) {
        throw new Error('Failed to fetch assessment');
      }
      const data: InternalAssessment = await resp.json();
      setAssessment(data);
    } catch (e) {
      console.error(e);
      showNotification({
        title: 'Error',
        message: 'Failed to load assessment data.',
        color: 'red'
      });
    }
  }, [assessment, assessmentApiRoute]);

  const fetchQuestions = useCallback(async () => {
    try {
      const resp = await fetch(questionsApiRoute);
      if (!resp.ok) {
        throw new Error('Failed to fetch questions');
      }
      const data: Question[] = await resp.json();
      setQuestions(data);
    } catch (e) {
      console.error(e);
      showNotification({
        title: 'Error',
        message: 'Failed to load questions.',
        color: 'red'
      });
    }
  }, [questionsApiRoute]);

  const fetchAssignedEntities = useCallback(async () => {
    try {
      if (!assessment) return;

      const resp = await fetch(assignedEntitiesApiRoute);
      if (!resp.ok) {
        throw new Error('Failed to fetch assigned entities');
      }
      const data = await resp.json();

      if (assessment.granularity === 'team') {
        const teams = data as any[];
        const options = teams.map(team => ({
          value: team._id,
          label: `Team ${team.number}`,
          members: team.members.map((member: { _id: any; name: any; }) => ({
            value: member._id,
            label: member.name,
          })),
        }));
        setTeamOptions(options);
      } else if (assessment.granularity === 'individual') {
        const users = data as User[];
        const options = users.map(u => ({
          value: u._id,
          label: u.name,
        }));
        setTeamMembersOptions(options);
      }
    } catch (e) {
      console.error(e);
      showNotification({
        title: 'Error',
        message: 'Failed to load assigned data.',
        color: 'red'
      });
    }
  }, [assessment, assignedEntitiesApiRoute]);

  // =========== LIFECYCLE =============
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleRouteChangeStart = (url: string) => {
      onReturnToOverview();
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [router, onReturnToOverview]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  useEffect(() => {
    if (assessment) {
      fetchQuestions();
      fetchAssignedEntities();
    }
  }, [assessment, fetchQuestions, fetchAssignedEntities]);

  // =========== EVENT HANDLERS =============
  const handleAnswerChange = (questionId: string, answer: AnswerInput) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitClick = () => {
    const missingQuestions = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q.isRequired && isAnswerEmpty(answers[q._id]))
      .map(({ i }) => `Question ${i + 1}`);

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
      const formattedAnswers = Object.entries(answers)
        .map(([qId, ans]) => {
          const questionObj = questions.find(q => q._id === qId);
          if (!questionObj) return null;
          return {
            question: qId,
            type: questionObj.type + ' Answer',
            ...formatAnswerForSubmission(questionObj, ans),
          };
        })
        .filter((a): a is AnswerUnion => a !== null);

      const submissionData = {
        answers: formattedAnswers,
        isDraft: false,
        submissionId: submission?._id,
      };

      const resp = await fetch(submitAssessmentApiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });
      if (!resp.ok) {
        throw new Error('Error submitting assessment');
      }

      const { submission: savedSubmission } = await resp.json();
      setSubmission(savedSubmission);

      // If you want to discard the submission data after final submission:
      // (Based on your note “submit clicked will delete saved answers after submission is complete”)
      setSubmission(undefined);
      setAnswers({});

      showNotification({
        title: 'Submission Successful',
        message: 'Your assessment has been submitted.',
        color: 'green',
      });

      // Return to overview
      onReturnToOverview();
    } catch (err) {
      console.error(err);
      alert('Error submitting assessment: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackClick = () => {
    setShowBackModal(true);
  };
  const confirmBack = () => {
    // Optionally discard unsaved data
    setSubmission(undefined);
    setAnswers({});
    setShowBackModal(false);
    onReturnToOverview();
  };

  const handleDeleteDraft = () => {
    setShowDeleteDraftModal(true);
  };
  const confirmDeleteDraft = async () => {
    if (!submission?._id) return;
    try {
      const resp = await fetch(`/api/submissions/${submission._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) {
        showNotification({
          title: 'Error',
          message: 'Failed to delete draft',
          color: 'red'
        });
        return;
      }
      setSubmission(undefined);
      setAnswers({});
      setShowDeleteDraftModal(false);
      showNotification({
        title: 'Draft Deleted',
        message: 'Your draft submission was deleted.',
        color: 'red',
      });
      onReturnToOverview();
    } catch (err) {
      console.error(err);
      showNotification({
        title: 'Error',
        message: 'Failed to delete draft submission.',
        color: 'red',
      });
    }
  };

  // ========== SCORING / ADJUSTMENTS ==========

  const calculatePerQuestionScores = (): { question: Question; score: number }[] => {
    if (!submission || !submission.answers) return [];
    return questions
      .map(question => {
        const ans = submission.answers.find(a => a.question === question._id);
        return { question, score: ans?.score || 0 };
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustedScore }),
      });
    } catch (err) {
      console.error(err);
      showNotification({
        title: 'Error',
        message: 'Failed to adjust submission score.',
        color: 'red'
      });
    }
  };

  const handleAdjustScoreSubmit = async () => {
    if (newAdjustedScore === undefined || !submission?._id) {
      showNotification({
        title: 'Error',
        message: 'Please enter a valid score or no submission found.',
        color: 'red',
      });
      return;
    }

    try {
      await adjustSubmissionScore(submission._id, newAdjustedScore);
      setShowAdjustScoreModal(false);
      setNewAdjustedScore(undefined);

      showNotification({
        title: 'Score Adjusted',
        message: 'The submission score has been successfully adjusted.',
        color: 'green',
      });
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err?.message || 'Failed to adjust score.',
        color: 'red',
      });
    }
  };

  // ========== RENDER ==========
  if (!assessment) return null;

  return (
    <Container mb="xl">
      <div>
        <h1>{assessment.assessmentName}</h1>
        <p>{assessment.description}</p>
      </div>

      {questions.map((question, index) => {
        const hasTeamOptions =
          assessment.granularity === 'team' && teamOptions.length > 0;
        const hasMemberOptions =
          assessment.granularity === 'individual' && teamMembersOptions.length > 0;

        // If it's a "Team Member Selection" question, we want to wait until
        // we have the relevant teamOptions or teamMembersOptions
        const isDisabled =
          question.type === 'Team Member Selection' &&
          submission &&
          !submission.isDraft;

        return (
          <Fragment key={question._id}>
            {(hasTeamOptions || hasMemberOptions || question.type !== 'Team Member Selection') && (
              <TakeAssessmentCard
                index={index}
                question={question}
                answer={answers[question._id]}
                onAnswerChange={ans => handleAnswerChange(question._id, ans)}
                disabled={isDisabled}
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
                isFaculty={false}
                submission={submission}
              />
            )}
          </Fragment>
        );
      })}

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
          {/* Temporarily disabled
              <Button variant="default" onClick={handleSaveDraft}>Save Draft</Button>
          */}
          <Button
            onClick={handleSubmitClick}
            loading={isSubmitting}
            disabled={isTrialVar}
            variant={submission && submission.isDraft ? 'filled' : 'outline'}
          >
            Submit
          </Button>
        </Group>
      </Group>

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
          max={submission ? submission.score + 100 : undefined}
          required
        />
        <Group justify='flex-end' mt="md">
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

      <Modal
        opened={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title="Score Summary"
        size="lg"
      >
        <ScrollArea style={{ height: '60vh' }}>
          {calculatePerQuestionScores().map(({ question, score }, idx) => {
            const ans = submission?.answers.find(a => a.question === question._id);
            const formatted = ans
              ? formatAnswer(extractAnswerValue(ans), question.type)
              : 'No answer provided';
            return (
              <div key={question._id} style={{ marginBottom: '1rem' }}>
                <Text>
                  {idx + 1}. {question.text}
                </Text>
                <Text>Answer: {formatted}</Text>
                <Text>Score: {score}</Text>
                <Divider my="sm" />
              </div>
            );
          })}
        </ScrollArea>
        <Group justify='flex-end' mt="md">
          <Button onClick={() => setShowSummaryModal(false)}>Close</Button>
        </Group>
      </Modal>

      <Modal
        opened={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title="Confirm Submission"
        size="lg"
      >
        <ScrollArea style={{ height: '60vh' }}>
          {questions.map((question, index) => (
            <div key={question._id} style={{ marginBottom: '1rem' }}>
              <Text>
                {index + 1}. {question.text}
              </Text>
              <Text>
                Answer: {formatAnswer(answers[question._id], question.type)}
              </Text>
              {isScoredQuestion(question) && (
                <Text>
                  Score:{' '}
                  {submission?.answers.find(
                    a => a.question === question._id
                  )?.score || 0}
                </Text>
              )}
            </div>
          ))}
        </ScrollArea>
        <Group justify='flex-end' mt="md">
          <Button variant="default" onClick={() => setShowConfirmationModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Confirm</Button>
        </Group>
      </Modal>

      <Modal
        opened={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Missing Required Questions"
      >
        <Text>
          Please answer the following required questions before submitting:
        </Text>
        <ul>
          {missingRequiredQuestions.map(qnum => (
            <li key={qnum}>{qnum}</li>
          ))}
        </ul>
        <Button onClick={() => setShowErrorModal(false)} mt="md">
          OK
        </Button>
      </Modal>

      <Modal
        opened={showBackModal}
        onClose={() => setShowBackModal(false)}
        title="Leaving submission"
      >
        <Text>Are you sure you want to leave this page? Any unsaved changes will be lost.</Text>
        <Group justify='flex-end' mt="md">
          <Button variant="default" onClick={() => setShowBackModal(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmBack}>
            Leave Page
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={showDeleteDraftModal}
        onClose={() => setShowDeleteDraftModal(false)}
        title="Delete Draft Submission"
      >
        <Text>
          Are you sure you want to delete your draft submission? This action
          cannot be undone.
        </Text>
        <Group justify='flex-end' mt="md">
          <Button variant="default" onClick={() => setShowDeleteDraftModal(false)}>
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

export default TakeAssessmentInline;
