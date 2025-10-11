import { useState } from 'react';
import {
  Card,
  Text,
  Textarea,
  Button,
  Group,
  ScrollArea,
  ActionIcon,
  Box,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconTrash,
  IconPencil,
  IconX,
  IconCheck,
} from '@tabler/icons-react';
import { PeerReviewComment } from '@shared/types/PeerReview';
import classes from '../../styles/PeerReview.module.css';
import { useEffect } from 'react';

interface PeerReviewCommentSidebarProps {
  comments: PeerReviewComment[];
  focusedComments: string[];
  onFocusComment: (comment: PeerReviewComment) => void;
  onAddComment: (comment: string) => void;
  onCancelComment: () => void;
  onUpdateComment: (commentId: string, updatedComment: string) => void;
  onDeleteComment: (commentId: string) => void;
  selectedLines?: { start: number; end: number } | null;
}

const PeerReviewCommentSidebar: React.FC<PeerReviewCommentSidebarProps> = ({
  comments,
  focusedComments,
  onFocusComment,
  onAddComment,
  onCancelComment,
  onUpdateComment,
  onDeleteComment,
  selectedLines,
}) => {
  const [opened, setOpened] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  
  const handleAddComment = () => {
    onAddComment(newComment);
    setNewComment('');
  };
  
  const handleEditStart = (commentId: string, currentText: string) => {
    setEditingId(commentId);
    setEditComment(currentText);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditComment('');
  };

  const handleEditSave = (commentId: string) => {
    if (!editComment.trim()) return;
    onUpdateComment(commentId, editComment);
    setEditingId(null);
    setEditComment('');
  };
  
  useEffect(() => {
    if (focusedComments.length === 0) return;
    const el = document.getElementById(`comment-${focusedComments[0]}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedComments]);

  return (
    <Card
      withBorder
      shadow="sm"
      className={classes.commentSidebarCard}
      style={{ width: opened ? 270 : 40, height: '100%' }}
    >
      <ActionIcon
        variant="light"
        color="gray"
        onClick={() => setOpened(!opened)}
        className={classes.commentSidebarToggleButton}
        style={{ left: opened ? 225 : 5, }}
      >
        {opened ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
      </ActionIcon>

      <div
        style={{
          display: opened ? 'flex' : 'none',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Text className={classes.commentSidebarTitle}>
          Comments ({comments.length})
        </Text>
        <ScrollArea className={classes.commentSidebarScrollarea} type="auto" scrollbarSize={1}>
          {selectedLines && (
            <Box mr="8px">
              <Textarea
                placeholder={`Add comment for lines ${selectedLines.start}-${selectedLines.end}...`}
                className={classes.commentTextarea}
                autosize
                minRows={4}
                maxRows={6}
                value={newComment}
                onChange={(e) => setNewComment(e.currentTarget.value)}
              />
              <Group my="xs" gap="8px" justify="flex-start">
                <Button
                  size="xs"
                  disabled={!newComment.trim()}
                  onClick={handleAddComment}
                >
                  Add
                </Button>
                <Button size="xs" variant="outline" onClick={onCancelComment}>Cancel</Button>
              </Group>
            </Box>
          )}
          { comments.map((c) => (
            <Card
              id={`comment-${c._id}`}
              key={c._id}
              onClick={() => onFocusComment?.(c)}
              className={`${classes.commentCard} ${
                focusedComments.includes(c._id) ? classes.commentCardFocused : ''
              }`}
            >
              <Group justify="space-between">
                <Text fw={500}>{c.author?.name || 'Anonymous'}</Text>
                <Group gap={4}>
                  {editingId === c._id ? (
                    <>
                      <ActionIcon size={24} disabled={!editComment.trim()} onClick={() => handleEditSave(c._id)}>
                        <IconCheck size={14} />
                      </ActionIcon>
                      <ActionIcon size={24} color="gray" onClick={handleEditCancel}>
                        <IconX size={14} />
                      </ActionIcon>
                    </>
                  ) : (
                    <>
                      <ActionIcon
                        size={24}
                        className={classes.commentEditButton}
                        color="blue"
                        onClick={() => handleEditStart(c._id, c.comment)}
                      >
                        <IconPencil size={14} />
                      </ActionIcon>
                      <ActionIcon
                        size={24}
                        className={classes.commentDeleteButton}
                        onClick={() => onDeleteComment(c._id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </>
                  )}
                </Group>
              </Group>
              <Text size="xs" c="dimmed" mb={4}>
                {c.updatedAt ? `(updated on ${new Date(c.updatedAt).toLocaleDateString()})` : c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
              </Text>
              {editingId === c._id ? (
                <Textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.currentTarget.value)}
                  autosize
                  minRows={3}
                  maxRows={4}
                />
              ) : (
                <Text className={classes.commentText} size="sm">{c.comment}</Text>
              )}
            </Card>
          ))}
        </ScrollArea>
      </div>
    </Card>
  );
};

export default PeerReviewCommentSidebar;
