/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  Card,
  Text,
  Badge,
  Group,
  Modal,
  Button,
  ScrollArea,
} from '@mantine/core';
import { Submission } from '@shared/types/Submission';
import { useRouter } from 'next/router';
import { NUSNETEmailAnswer } from '@shared/types/Answer';
import { QuestionUnion } from '@shared/types/Question';
import { IconListDetails, IconEye } from '@tabler/icons-react';

interface SubmissionCardProps {
  submission: Submission;
  hasFacultyPermission: boolean;
  courseId: string;
  assessmentId?: string;
  questions: QuestionUnion[];
  userIdToNameMap: { [key: string]: string };
}

const SubmissionCard: React.FC<SubmissionCardProps> = ({
  submission,
  hasFacultyPermission,
  courseId,
  assessmentId,
  questions,
  userIdToNameMap,
}) => {
  const [opened, setOpened] = useState(false);
  const router = useRouter();
  const user = submission.user;
  const userName = user ? user.name : 'Unknown User';

  const handleSummaryClick = () => {
    setOpened(true);
  };

  const handleViewSubmission = () => {
    router.push(
      `/courses/${courseId}/internal-assessments/${assessmentId}/submission/${submission._id}`
    );
  };

  const emailAnswer: NUSNETEmailAnswer | undefined = submission.answers.find(
    answer => answer.type === 'NUSNET Email'
  );

  const nusnetIdAnswer = submission.answers.find(
    answer => answer.type === 'NUSNET ID'
  );

  const teamMemberSelectionAnswer = submission.answers.find(
    answer => answer.type === 'Team Member Selection'
  );

  // Get the score and adjusted score
  const totalScore =
    submission.adjustedScore !== undefined
      ? submission.adjustedScore
      : submission.score;
  const originalScore = submission.score;

  return (
    <>
      <Card withBorder shadow="sm" mb="md">
        {/* Submission Info */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Group justify="flex-start" gap="xs">
              <Text>
                {hasFacultyPermission
                  ? `Submitted by: ${userName}`
                  : 'Your Submission'}
              </Text>
              <Badge color={submission.isDraft ? 'yellow' : 'green'}>
                {submission.isDraft ? 'Draft' : 'Submitted'}
              </Badge>
            </Group>

            {emailAnswer && (
              <Text size="sm">
                <strong>Email:</strong>{' '}
                {emailAnswer.value || 'No email provided'}
              </Text>
            )}
            {nusnetIdAnswer && (
              <Text size="sm">
                <strong>NUSNET ID:</strong>{' '}
                {nusnetIdAnswer.value || 'No NUSNET ID provided'}
              </Text>
            )}
            {teamMemberSelectionAnswer && (
              <Text size="sm">
                <strong>Selected Team Member(s):</strong>{' '}
                {formatAnswer(teamMemberSelectionAnswer, userIdToNameMap)}
              </Text>
            )}
            <Text size="sm" color="dimmed">
              Submitted at: {new Date(submission.submittedAt).toLocaleString()}
            </Text>

            {/* Display score and adjusted score */}
            <Text size="sm">
              {hasFacultyPermission ? (
                <>
                  <strong>Adjusted Score:</strong> {totalScore} <br />
                  <strong>Original Score:</strong> {originalScore}
                </>
              ) : (
                <>
                  <strong>Total Score:</strong> {totalScore}
                </>
              )}
            </Text>
          </div>
        </Group>

        {/* Buttons at the bottom right */}
        <Group justify="flex-end" mt="md">
          {!submission.isDraft && (
            <Button
              onClick={handleSummaryClick}
              leftSection={<IconListDetails size={16} />}
              variant="light"
              size="sm"
            >
              Summary
            </Button>
          )}
          <Button
            onClick={handleViewSubmission}
            leftSection={<IconEye size={16} />}
            variant="light"
            size="sm"
          >
            View Submission
          </Button>
        </Group>
      </Card>

      {/* Modal to display submission details */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          hasFacultyPermission ? `Submission by ${userName}` : 'Your Submission'
        }
        size="lg"
      >
        <ScrollArea style={{ height: '60vh' }}>
          {/* Display submission details here */}
          {submission.answers.map((answer, index) => {
            if (
              answer.type === 'NUSNET Email' ||
              answer.type === 'NUSNET ID' ||
              answer.type === 'Team Member Selection'
            )
              return null;

            const question = questions.find(q => q._id === answer.question);
            const questionText = question
              ? question.text
              : 'Question text not available';

            return (
              <div key={index} style={{ marginBottom: '1rem' }}>
                <Text>
                  <strong>Question:</strong> {questionText}
                </Text>
                <Text>
                  <strong>Answer:</strong>{' '}
                  {formatAnswer(answer, userIdToNameMap)}
                </Text>

                {/* Show points earned if the user has faculty permissions */}
                {hasFacultyPermission && answer.score !== undefined && (
                  <Text>
                    <strong>Points Earned:</strong> {answer.score}
                  </Text>
                )}
              </div>
            );
          })}
        </ScrollArea>
        <Group justify="flex-end" mt="md">
          <Button onClick={() => setOpened(false)}>Close</Button>
        </Group>
      </Modal>
    </>
  );
};

// Helper function to format answers based on type
function formatAnswer(
  answer: any,
  userIdToNameMap: { [key: string]: string }
): string {
  switch (answer.type) {
    case 'Multiple Choice':
    case 'Short Response':
    case 'Long Response':
    case 'NUSNET ID':
    case 'NUSNET Email':
      return answer.value || 'No answer provided';
    case 'Multiple Response':
      return answer.values ? answer.values.join(', ') : 'No answer provided';
    case 'Scale':
    case 'Number':
      return answer.value !== undefined
        ? answer.value.toString()
        : 'No answer provided';
    case 'Date':
      if (answer.startDate && answer.endDate) {
        return `${new Date(answer.startDate).toLocaleDateString()} - ${new Date(
          answer.endDate
        ).toLocaleDateString()}`;
      } else if (answer.value) {
        return new Date(answer.value).toLocaleDateString();
      } else {
        return 'No date selected';
      }
    case 'Team Member Selection':
      if (answer.selectedUserIds && Array.isArray(answer.selectedUserIds)) {
        const names = answer.selectedUserIds.map(
          (userId: string) => userIdToNameMap[userId] || userId
        );
        return names.join(', ');
      } else {
        return 'No team members selected';
      }
    default:
      return 'No answer provided';
  }
}

export default SubmissionCard;
