import React from 'react';
import {
  Modal,
  Stack,
  Alert,
  Text,
  ScrollAreaAutosize,
  Card,
  Group,
  Badge,
  Button,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { PeerReviewComment } from '@shared/types/PeerReview';

interface FlaggedCommentsModalProps {
  opened: boolean;
  onClose: () => void;
  isSubmitted: boolean;
  comments: PeerReviewComment[];
  onOpenComment: (comment: PeerReviewComment) => void;
}

const FlaggedCommentsModal: React.FC<FlaggedCommentsModalProps> = ({
  opened,
  onClose,
  isSubmitted,
  comments,
  onOpenComment,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Flagged Comments Requiring Action"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Alert
          color="orange"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
        >
          {isSubmitted
            ? 'Your review has been submitted. Flagged comments are read-only, take note of the reasons before the next peer review.'
            : 'Please revise and update these comments.'}
        </Alert>

        <Text size="sm" c="dimmed">
          {comments.length} flagged comment
          {comments.length === 1 ? '' : 's'} found.
        </Text>

        <ScrollAreaAutosize
          mah={320}
          offsetScrollbars={false}
          styles={{ viewport: { overflowX: 'hidden' } }}
        >
          <Stack gap="sm" style={{ minWidth: 0, overflowX: 'hidden' }}>
            {comments.map(comment => (
              <Card
                key={comment._id}
                withBorder
                radius="md"
                p="sm"
                style={{ overflow: 'hidden', maxWidth: '100%', width: '100%' }}
              >
                <Group justify="space-between" align="center" mb={6}>
                  <Badge variant="light" color="blue">
                    {comment.filePath} ({comment.startLine}-{comment.endLine})
                  </Badge>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => onOpenComment(comment)}
                  >
                    Open
                  </Button>
                </Group>

                <Text
                  size="sm"
                  mb={6}
                  title={comment.comment}
                  style={{
                    width: 0,
                    minWidth: '100%',
                    maxWidth: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {comment.comment}
                </Text>

                <Text
                  size="xs"
                  c="orange"
                  fw={500}
                  style={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  Reason: {comment.flagReason?.trim() || 'No reason provided.'}
                </Text>
              </Card>
            ))}
          </Stack>
        </ScrollAreaAutosize>
      </Stack>
    </Modal>
  );
};

export default FlaggedCommentsModal;
