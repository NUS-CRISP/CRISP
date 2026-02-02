import {
  Container,
  Center,
  ScrollArea,
  Group,
  Title,
  Anchor,
  Text,
  Box,
  Card,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import DeleteConfirmationModal from '@/components/cards/Modals/DeleteConfirmationModal';
import { IconListDetails, IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState, useRef } from 'react';
import { PeerReviewComment } from '@shared/types/PeerReview';
import PeerReviewFileTree from '@/components/peer-review/PeerReviewFileTree';
import PeerReviewCommentSidebar from '@/components/peer-review/PeerReviewCommentSidebar';
import dynamic from 'next/dynamic';
import classes from '@styles/PeerReview.module.css';
import usePeerReviewData from '@/components/hooks/usePeerReviewData';
import { getLanguageForFile } from '@/lib/peer-review/utils';
import type { editor as MEditor, IDisposable } from 'monaco-editor';
import type { OnMount, Monaco } from '@monaco-editor/react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
});

const PeerReviewDetail: React.FC = () => {
  const router = useRouter();
  const { id, peerReviewAssignmentId } = router.query as {
    id: string;
    peerReviewAssignmentId: string;
  };

  // Ensure router is ready and params are valid
  const ready =
    router.isReady &&
    typeof id === 'string' &&
    typeof peerReviewAssignmentId === 'string';
  if (!ready) return <Center>Loading...</Center>;

  // Fetch peer review assignment data
  const {
    loading,
    peerReviewAssignment,
    repoTree,
    currFile,
    currentCode,
    comments,
    openFile,
    addComment,
    updateComment,
    deleteComment,
  } = usePeerReviewData({
    courseId: id,
    assignmentId: peerReviewAssignmentId,
  });

  // Current User
  // const { data: session } = useSession();
  // const currentUser: User = session?.user as User;

  /* ===== Refs and States for Editor and Interaction Logic ===== */
  const editorRef = useRef<MEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const listenerDisposablesRef = useRef<IDisposable[]>([]);

  const hoverDecoRef = useRef<string[]>([]);
  const iconDecoRef = useRef<string[]>([]);
  const dragDecosRef = useRef<string[]>([]);
  const focusedDecosRef = useRef<string[]>([]);
  const staticDecosRef = useRef<string[]>([]);

  const [focusedCommentIds, setFocusedCommentIds] = useState<string[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(
    null
  );
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

  type ActiveWidget = { start: number; end: number; top: number } | null;
  const [activeWidget, setActiveWidget] = useState<ActiveWidget>(null);
  // const [overallComment, setOverallComment] = useState<string>(''); // To be implemented

  // Refs to keep track of latest comments, currFile, and active widget in callbacks
  const activeWidgetRef = useRef<ActiveWidget>(null);
  const commentsRef = useRef<PeerReviewComment[]>([]);
  const currFileRef = useRef<string | null>(null);
  useEffect(() => {
    activeWidgetRef.current = activeWidget;
  }, [activeWidget]);
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);
  useEffect(() => {
    currFileRef.current = currFile;
  }, [currFile]);

  /* ===== Helper Functions ===== */
  const renderFocusedAndStaticDecos = useCallback(
    (focusedIds: string[]) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const file = currFileRef.current;
      if (!editor || !monaco || !file) return;

      setFocusedCommentIds(focusedIds);
      const focusedSet = new Set(focusedIds);
      const fileComments = commentsRef.current.filter(c => c.filePath === file);
      const focusDecos = fileComments
        .filter(c => focusedSet.has(c._id))
        .map(c => ({
          range: new monaco.Range(c.startLine, 1, c.endLine, 1),
          options: {
            isWholeLine: true,
            className: classes.focusedCommentHighlight,
          },
        }));

      const staticDecos = fileComments
        .filter(c => !focusedSet.has(c._id))
        .map(c => ({
          range: new monaco.Range(c.startLine, 1, c.endLine, 1),
          options: { isWholeLine: true, className: classes.commentedLineHint },
        }));

      focusedDecosRef.current = editor.deltaDecorations(
        focusedDecosRef.current,
        focusDecos
      );
      staticDecosRef.current = editor.deltaDecorations(
        staticDecosRef.current,
        staticDecos
      );
    },
    [classes.focusedCommentHighlight, classes.commentedLineHint]
  );

  // Clear focused lines and render static hints when switching files
  useEffect(() => {
    if (!editorRef.current || !currFile || !currentCode) return;
    focusedDecosRef.current = editorRef.current.deltaDecorations(
      focusedDecosRef.current,
      []
    );
    staticDecosRef.current = editorRef.current.deltaDecorations(
      staticDecosRef.current,
      []
    );
    renderFocusedAndStaticDecos([]);
  }, [currFile, currentCode, comments, renderFocusedAndStaticDecos]);

  const clearCommentDecorations = () => {
    const editor = editorRef.current;
    if (!editor) return;

    hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, []);
    dragDecosRef.current = editor.deltaDecorations(dragDecosRef.current, []);
    iconDecoRef.current = editor.deltaDecorations(iconDecoRef.current, []);
    setActiveWidget(null);
  };

  /* ===== Editor Interaction Logic ===== */
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    focusedDecosRef.current = [];
    staticDecosRef.current = [];
    renderFocusedAndStaticDecos([]);

    // Dispose old listeners
    listenerDisposablesRef.current.forEach(d => d?.dispose?.());
    listenerDisposablesRef.current = [];

    let startLine: number | null = null;

    const onMouseDown = editor.onMouseDown((e: MEditor.IEditorMouseEvent) => {
      // 1) Click on glyph margin: start selection
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.position
      ) {
        startLine = e.target.position.lineNumber;

        // Clear previous decorations
        renderFocusedAndStaticDecos([]);
        hoverDecoRef.current = editor.deltaDecorations(
          hoverDecoRef.current,
          []
        );
        dragDecosRef.current = editor.deltaDecorations(
          dragDecosRef.current,
          []
        );
        iconDecoRef.current = editor.deltaDecorations(
          [],
          [
            {
              range: new monaco.Range(startLine, 1, startLine, 1),
              options: {
                isWholeLine: true,
                glyphMarginClassName: classes.reviewLineIcon,
              },
            },
          ]
        );
        return;
      }

      // 2) Click on text: focus comment if any
      if (
        e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT &&
        e.target.position
      ) {
        const line = e.target.position.lineNumber;
        const file = currFileRef.current;
        const fileComments = commentsRef.current.filter(
          c => c.filePath === file
        );
        const clicked = fileComments.filter(
          c => c.startLine <= line && c.endLine >= line
        );
        renderFocusedAndStaticDecos(clicked.map(c => c._id));
        return;
      }

      // 3) Click outside text or glyph margin: clear all
      renderFocusedAndStaticDecos([]);
    });

    const onMouseUp = editor.onMouseUp((e: MEditor.IEditorMouseEvent) => {
      if (startLine === null) return;

      // Cancel if not released on a line number
      if (!e.target?.position) {
        dragDecosRef.current = editor.deltaDecorations(
          dragDecosRef.current,
          []
        );
        iconDecoRef.current = editor.deltaDecorations(iconDecoRef.current, []);
        startLine = null;
        return;
      }

      // Finalize selection
      const endLine = e.target.position.lineNumber;
      const start = Math.min(startLine, endLine);
      const finish = Math.max(startLine, endLine);

      // Add final decorations
      const decos = [];
      for (let l = start; l <= finish; l++) {
        decos.push({
          range: new monaco.Range(l, 1, l, 1),
          options: {
            isWholeLine: true,
            className: classes.reviewLineHighlight,
            linesDecorationsClassName: classes.reviewLineMargin,
          },
        });
      }
      dragDecosRef.current = editor.deltaDecorations(
        dragDecosRef.current,
        decos
      );

      const top = editor.getTopForLineNumber(finish);
      setActiveWidget({ start, end: finish, top });
      startLine = null;
    });

    const onMouseMove = editor.onMouseMove((e: MEditor.IEditorMouseEvent) => {
      // Don't do anything if dragging a selection
      if (activeWidgetRef.current) {
        hoverDecoRef.current = editor.deltaDecorations(
          hoverDecoRef.current,
          []
        );
        return;
      }

      // If dragging to select lines
      if (startLine !== null && e.target?.position) {
        const line = e.target.position.lineNumber;
        const start = Math.min(startLine, line);
        const finish = Math.max(startLine, line);
        const decos = [];
        for (let l = start; l <= finish; l++) {
          decos.push({
            range: new monaco.Range(l, 1, l, 1),
            options: {
              isWholeLine: true,
              className: classes.reviewLineHighlight,
              linesDecorationsClassName: classes.reviewLineMargin,
            },
          });
        }
        dragDecosRef.current = editor.deltaDecorations(
          dragDecosRef.current,
          decos
        );
        return;
      }

      // If hovering over a line
      if (e.target?.position) {
        const line = e.target.position.lineNumber;
        hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, [
          {
            range: new monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: classes.reviewLineHighlight,
              glyphMarginClassName: classes.reviewLineIcon,
            },
          },
        ]);
      } else {
        hoverDecoRef.current = editor.deltaDecorations(
          hoverDecoRef.current,
          []
        );
      }
    });
    listenerDisposablesRef.current.push(onMouseDown, onMouseUp, onMouseMove);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => listenerDisposablesRef.current.forEach(d => d?.dispose?.());
  }, []);

  // Add comment handler
  const handleAddComment = useCallback(
    async (text: string) => {
      if (submittingComment) return false;
      if (!text.trim()) return false;
      if (!activeWidget || !currFile) return false;

      try {
        setSubmittingComment(true);
        await addComment({
          filePath: currFile,
          startLine: activeWidget.start,
          endLine: activeWidget.end,
          comment: text,
          isOverallComment: false,
        });

        clearCommentDecorations();
        setActiveWidget(null);

        return true;
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'Failed to add comment',
          message: (error as Error).message || 'Please try again.',
        });
        return false;
      } finally {
        setSubmittingComment(false);
      }
    },
    [submittingComment, activeWidget, currFile, addComment]
  );

  // Update comment handler
  const handleUpdateComment = useCallback(
    async (commentId: string, newComment: string) => {
      if (updatingCommentId) return false;
      if (!newComment.trim()) return false;

      const currComment = comments.find(c => c._id === commentId);
      if (!currComment) return false;
      if (currComment.comment === newComment) return true;

      try {
        setUpdatingCommentId(commentId);
        await updateComment(commentId, newComment);
        clearCommentDecorations();
        setActiveWidget(null);
        return true;
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'Failed to update comment',
          message: (error as Error).message || 'Please try again.',
        });
        return false;
      } finally {
        setUpdatingCommentId(null);
      }
    },
    [updatingCommentId, updateComment]
  );

  // Delete comment handler
  const requestDeleteComment = useCallback((commentId: string) => {
    setDeleteCommentId(commentId);
  }, []);

  const handleDeleteComment = useCallback(async () => {
    if (!deleteCommentId) return;

    try {
      await deleteComment(deleteCommentId);
      if (focusedCommentIds.includes(deleteCommentId)) {
        const remainingIds = focusedCommentIds.filter(
          id => id !== deleteCommentId
        );
        renderFocusedAndStaticDecos(remainingIds);
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Failed to delete comment',
        message: (error as Error).message || 'Please try again.',
      });
    } finally {
      setDeleteCommentId(null);
    }
  }, [
    deleteCommentId,
    deleteComment,
    focusedCommentIds,
    renderFocusedAndStaticDecos,
  ]);

  // Focus comment handler
  const handleFocusComment = useCallback(
    (comment: PeerReviewComment) => {
      renderFocusedAndStaticDecos([comment._id]);
      editorRef.current?.revealLineInCenter?.(comment.startLine);
    },
    [renderFocusedAndStaticDecos]
  );

  if (loading) return <Center>Loading…</Center>;
  if (!peerReviewAssignment) return <Center>Unable to load assignment.</Center>;
  if (!repoTree) return <Center>No repository tree found.</Center>;

  return (
    <Container fluid className={classes.wrapper}>
      <Group className={classes.header}>
        <IconArrowLeft
          onClick={() => router.push(`/courses/${id}/peer-review`)}
          className={classes.returnButton}
        />
        <IconListDetails />
        <Title order={4}>Peer Review:</Title>
        <Anchor
          href={peerReviewAssignment.repoUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Title order={4}>{peerReviewAssignment.repoName}</Title>
        </Anchor>
      </Group>

      <Group className={classes.body}>
        <Box className={classes.repositoryBox}>
          <Text className={classes.repositoryTitle}>Repository</Text>
          <ScrollArea
            className={classes.repositoryScrollArea}
            scrollbarSize={4}
          >
            {repoTree && (
              <PeerReviewFileTree
                repoNode={repoTree}
                currFile={currFile!}
                openFile={openFile}
              />
            )}
          </ScrollArea>
        </Box>
        {currFile ? (
          <Box className={classes.editorBox}>
            <Card className={classes.editorCard}>
              <Text className={classes.editorTitle}>{currFile}</Text>
              <MonacoEditor
                key={currFile}
                path={currFile}
                language={getLanguageForFile(currFile)}
                theme="vs-dark"
                value={currentCode}
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  lineHeight: 20,
                  lineNumbers: 'on',
                  selectionHighlight: false,
                  occurrencesHighlight: 'off',
                  renderLineHighlight: 'none',
                  glyphMargin: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  padding: { top: 8, bottom: 8 },
                }}
                onMount={handleEditorMount}
              />
            </Card>
          </Box>
        ) : (
          <Center>
            <Text>Select a file to view</Text>
          </Center>
        )}
        <PeerReviewCommentSidebar
          comments={comments.filter(c => c.filePath === currFile)} // Filter logic based on role is handled on BE, here we just filter by file
          focusedComments={focusedCommentIds}
          onFocusComment={handleFocusComment}
          onAddComment={handleAddComment}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={requestDeleteComment}
          onCancelComment={clearCommentDecorations}
          selectedLines={
            activeWidget
              ? { start: activeWidget.start, end: activeWidget.end }
              : null
          }
        />
        <DeleteConfirmationModal
          opened={!!deleteCommentId}
          onClose={() => setDeleteCommentId(null)}
          onConfirm={handleDeleteComment}
          onCancel={() => setDeleteCommentId(null)}
          title="Delete Comment?"
          message="Are you sure you want to delete this comment?"
        />
      </Group>
    </Container>
  );
};

export default PeerReviewDetail;
