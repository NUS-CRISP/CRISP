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
  Tooltip,
  Popover,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconTrash,
  IconPencil,
  IconX,
  IconCheck,
  IconFlag,
  IconFlagOff,
} from '@tabler/icons-react';
import { PeerReviewComment } from '@shared/types/PeerReview';
import classes from '../../styles/PeerReview.module.css';
import { useEffect } from 'react';
import {
  COURSE_ROLE,
  CourseRole as UserCourseRole,
} from '@shared/types/auth/CourseRole';

interface PeerReviewCommentSidebarProps {
  user: { userId: string; userCourseRole: string } | null;
  comments: PeerReviewComment[];
  focusedComments: string[];
  onFocusComment: (comment: PeerReviewComment) => void;
  onAddComment: (comment: string) => void;
  onCancelComment: () => void;
  onUpdateComment: (commentId: string, updatedComment: string) => void;
  onDeleteComment: (commentId: string) => void;
  onFlagComment: (commentId: string) => void;
  onUnflagComment: (commentId: string) => void;
  selectedLines?: { start: number; end: number } | null;
  readOnly?: boolean;
  canEditComments?: boolean;
}

const PeerReviewCommentSidebar: React.FC<PeerReviewCommentSidebarProps> = ({
  user,
  comments,
  focusedComments,
  onFocusComment,
  onAddComment,
  onCancelComment,
  onUpdateComment,
  onDeleteComment,
  onFlagComment,
  onUnflagComment,
  selectedLines,
  readOnly = false,
  canEditComments = true,
}) => {
  const [opened, setOpened] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const isStaffViewer =
    user?.userCourseRole === COURSE_ROLE.Faculty ||
    user?.userCourseRole === COURSE_ROLE.TA;

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

  const getRoleVars = (courseRole?: UserCourseRole) => {
    switch (courseRole) {
      case COURSE_ROLE.TA:
        return {
          '--cc-accent': '#3B82F6', // clear blue
          '--cc-tint': 'rgba(59, 130, 246, 0.16)',
        } as React.CSSProperties;

      case COURSE_ROLE.Faculty:
        return {
          '--cc-accent': '#A855F7', // clear purple
          '--cc-tint': 'rgba(168, 85, 247, 0.16)',
        } as React.CSSProperties;

      default:
        return {
          '--cc-accent': '#10B981', // clear green
          '--cc-tint': 'rgba(16, 185, 129, 0.14)',
        } as React.CSSProperties;
    }
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
        style={{ left: opened ? 225 : 5 }}
      >
        {opened ? (
          <IconChevronRight size={18} />
        ) : (
          <IconChevronLeft size={18} />
        )}
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
        <ScrollArea
          className={classes.commentSidebarScrollarea}
          type="auto"
          scrollbarSize={1}
        >
          {selectedLines && !readOnly && (
            <Box mr="8px">
              <Textarea
                placeholder={`Add comment for lines ${selectedLines.start}-${selectedLines.end}...`}
                className={classes.commentTextarea}
                autosize
                minRows={4}
                maxRows={6}
                value={newComment}
                onChange={e => setNewComment(e.currentTarget.value)}
              />
              <Group my="xs" gap="8px" justify="flex-start">
                <Button
                  size="xs"
                  disabled={!newComment.trim()}
                  onClick={handleAddComment}
                >
                  Add
                </Button>
                <Button size="xs" variant="outline" onClick={onCancelComment}>
                  Cancel
                </Button>
              </Group>
            </Box>
          )}
          {comments.map(c => (
            <Card
              id={`comment-${c._id}`}
              key={c._id}
              onClick={() => onFocusComment?.(c)}
              className={`${classes.commentCard} ${
                focusedComments.includes(c._id)
                  ? classes.commentCardFocused
                  : ''
              }`}
              style={getRoleVars(c.authorCourseRole)}
            >
              {(() => {
                const canManageComment =
                  c.canManage || user?.userId === c.author?._id;
                const canShowEditDelete =
                  Boolean(canManageComment) && !readOnly && canEditComments;
                const canShowFlag =
                  Boolean(canManageComment) && !readOnly && isStaffViewer;

                return (
                  <Group
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                    mb={4}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {!readOnly && (c.displayAuthorName || c.author?.name) && (
                        <Tooltip
                          label={c.displayAuthorName ?? c.author?.name}
                          withArrow
                          position="top-start"
                        >
                          <Text
                            fw={500}
                            lh={1.2}
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {c.displayAuthorName ?? c.author.name}
                          </Text>
                        </Tooltip>
                      )}
                      <Text size="xs" c="dimmed" mt={4}>
                        {c.updatedAt &&
                          new Date(c.updatedAt).toLocaleDateString()}
                      </Text>
                      {c.isFlagged && !c.unflaggedAt && (
                        <Popover
                          width={240}
                          position="bottom-start"
                          withArrow
                          shadow="md"
                        >
                          <Popover.Target>
                            <Button
                              size="compact-xs"
                              variant="light"
                              color="orange"
                              leftSection={<IconFlag size={12} />}
                              className={classes.flaggedIndicatorButton}
                              onClick={event => event.stopPropagation()}
                            >
                              {isStaffViewer
                                ? 'Flagged'
                                : 'Flagged for revision'}
                            </Button>
                          </Popover.Target>
                          <Popover.Dropdown
                            onClick={event => event.stopPropagation()}
                          >
                            <Text size="xs" fw={600} mb={4}>
                              Flag Reason:
                            </Text>
                            <Text size="sm">
                              {c.flagReason?.trim() || 'No reason provided.'}
                            </Text>
                          </Popover.Dropdown>
                        </Popover>
                      )}
                    </div>
                    {(canShowEditDelete || canShowFlag) && (
                      <Group
                        gap={4}
                        wrap="nowrap"
                        style={{ alignSelf: 'flex-start', flexShrink: 0 }}
                      >
                        {editingId === c._id && canShowEditDelete ? (
                          <>
                            <ActionIcon
                              size={24}
                              disabled={!editComment.trim()}
                              onClick={() => handleEditSave(c._id)}
                            >
                              <IconCheck size={14} />
                            </ActionIcon>
                            <ActionIcon
                              size={24}
                              color="gray"
                              onClick={handleEditCancel}
                            >
                              <IconX size={14} />
                            </ActionIcon>
                          </>
                        ) : (
                          <>
                            {canShowEditDelete && (
                              <>
                                <ActionIcon
                                  size={24}
                                  className={classes.commentEditButton}
                                  color="blue"
                                  onClick={() =>
                                    handleEditStart(c._id, c.comment)
                                  }
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
                            {canShowFlag && (
                              <Tooltip
                                label={
                                  c.isFlagged && !c.unflaggedAt
                                    ? 'Unflag comment'
                                    : 'Flag comment'
                                }
                                withArrow
                                position="top"
                              >
                                <ActionIcon
                                  size={24}
                                  color={
                                    c.isFlagged && !c.unflaggedAt
                                      ? 'orange'
                                      : undefined
                                  }
                                  className={classes.commentFlagButton}
                                  onClick={() =>
                                    c.isFlagged && !c.unflaggedAt
                                      ? onUnflagComment(c._id)
                                      : onFlagComment(c._id)
                                  }
                                >
                                  {c.isFlagged && !c.unflaggedAt ? (
                                    <IconFlagOff size={14} />
                                  ) : (
                                    <IconFlag size={14} />
                                  )}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Group>
                    )}
                  </Group>
                );
              })()}

              {editingId === c._id ? (
                <Textarea
                  value={editComment}
                  onChange={e => setEditComment(e.currentTarget.value)}
                  autosize
                  minRows={3}
                  maxRows={4}
                />
              ) : (
                <Text
                  className={classes.commentText}
                  size="sm"
                  style={{ maxHeight: 120, overflowY: 'auto' }}
                >
                  {c.comment}
                </Text>
              )}
            </Card>
          ))}
        </ScrollArea>
      </div>
    </Card>
  );
};

export default PeerReviewCommentSidebar;
