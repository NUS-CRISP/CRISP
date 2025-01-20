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
  Box,
} from '@mantine/core';
import { Submission } from '@shared/types/Submission';
import { useRouter } from 'next/router';
import { QuestionUnion } from '@shared/types/Question';
import { IconListDetails, IconEye, IconPencil } from '@tabler/icons-react';

interface SubmissionCardProps {
  submission: Submission;
  hasFacultyPermission: boolean;
  isEditable: boolean;
  courseId: string;
  assessmentId?: string;
  assessmentReleaseNumber?: number;
  questions: QuestionUnion[];
  userIdToNameMap: { [key: string]: string };
}

const SubmissionCard: React.FC<SubmissionCardProps> = ({
  submission,
  hasFacultyPermission,
  isEditable,
  courseId,
  assessmentId,
  assessmentReleaseNumber,
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

  const teamMemberSelectionAnswer = submission.answers.find(
    answer => answer.type === 'Team Member Selection Answer'
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

            {teamMemberSelectionAnswer && (
              <Text size="sm">
                <strong>Selected Team Member(s):</strong>{' '}
                {formatAnswer(teamMemberSelectionAnswer, userIdToNameMap)}
              </Text>
            )}
            <Text size="sm" c="dimmed">
              Submitted at: {new Date(submission.submittedAt).toLocaleString()}
            </Text>

            {/* Display score and adjusted score */}
            {hasFacultyPermission && (
              <Text size="sm">
                {submission.adjustedScore ? (
                  <>
                    <strong>Adjusted Score:</strong> {totalScore} <br />
                    <strong>Original Score:</strong> {originalScore}
                  </>
                ) : (
                  <>
                    <strong>Score:</strong> {originalScore}
                  </>
                )}
              </Text>
            )}
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
            leftSection={
              isEditable ||
              (assessmentReleaseNumber &&
                assessmentReleaseNumber !==
                  submission.submissionReleaseNumber) ? (
                <IconPencil size={16} />
              ) : (
                <IconEye size={16} />
              )
            }
            variant="light"
            size="sm"
          >
            {isEditable ||
            (assessmentReleaseNumber &&
              assessmentReleaseNumber !== submission.submissionReleaseNumber)
              ? 'View/Edit Submission'
              : 'View Submission'}
          </Button>
        </Group>
        {/* Warning if submission requires editing */}
        {assessmentReleaseNumber &&
          assessmentReleaseNumber !== submission.submissionReleaseNumber && (
            <Box bg="yellow.2" my="md" style={{ padding: 8, borderRadius: 8 }}>
              <Text>
                Warning: This submission is for an earlier version of this
                assessment!
              </Text>
            </Box>
          )}
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
              answer.type === 'NUSNET Email Answer' ||
              answer.type === 'NUSNET ID Answer' ||
              answer.type === 'Team Member Selection Answer'
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
    case 'Multiple Choice Answer':
    case 'Short Response Answer':
    case 'Long Response Answer':
    case 'NUSNET ID Answer':
    case 'NUSNET Email Answer':
      return answer.value || 'No answer provided';
    case 'Multiple Response Answer':
      return answer.values ? answer.values.join(', ') : 'No answer provided';
    case 'Scale Answer':
    case 'Number Answer':
      return answer.value !== undefined
        ? answer.value.toString()
        : 'No answer provided';
    case 'Date Answer':
      if (answer.startDate && answer.endDate) {
        return `${new Date(answer.startDate).toLocaleDateString()} - ${new Date(
          answer.endDate
        ).toLocaleDateString()}`;
      } else if (answer.value) {
        return new Date(answer.value).toLocaleDateString();
      } else {
        return 'No date selected';
      }
    case 'Team Member Selection Answer':
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
