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
import { User } from '@shared/types/User';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import classes from '@styles/PeerReview.module.css';
import usePeerReviewData from '@/components/hooks/usePeerReviewData';
import { getLanguageForFile } from '@/lib/peer-review/utils';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const PeerReviewDetail: React.FC = () => {
  const router = useRouter();
  const { id, peerReviewAssignmentId } = router.query as {
    id: string;
    peerReviewAssignmentId: string;
  };
  
  // Ensure router is ready and params are valid
  const ready = router.isReady && typeof id === 'string' && typeof peerReviewAssignmentId === 'string';
  if (!ready) return <Center>Loading…</Center>;
  
  // Fetch peer review assignment data
  const {
    loading,
    assignment: peerReviewAssignment,
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
  
  /* ===== Refs and States for Editor and Interaction Logic ===== */
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  
  const listenerDisposablesRef = useRef<any[]>([]);
  const hoverDecoRef = useRef<string[]>([]);
  const iconDecoRef = useRef<string[]>([]);
  const dragDecosRef = useRef<string[]>([]);
  const focusedDecosRef = useRef<string[]>([]);
  
  const [focusedCommentIds, setFocusedCommentIds] = useState<string[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [overallComment, setOverallComment] = useState<string>(''); // To be implemented
    
  // Active widget state (for adding new comment)
  const [activeWidget, setActiveWidget] = useState<{
    start: number;
    end: number;
    top: number;
  } | null>(null);
  
  const activeWidgetRef = useRef<typeof activeWidget>(null);
  
  useEffect(() => {
    activeWidgetRef.current = activeWidget;
  }, [activeWidget]);
  
  // Refs to keep track of latest comments and currFile in callbacks
  const commentsRef = useRef<PeerReviewComment[]>([]);
  const currFileRef = useRef<string | null>(null);
  useEffect(() => { commentsRef.current = comments; }, [comments]);
  useEffect(() => { currFileRef.current = currFile; }, [currFile]);

  // Current User
  const { data: session } = useSession();
  const currentUser: User = session?.user as User
  
  /* ===== Helper Functions ===== */
  const renderFocusedLines = useCallback((ids: string[]) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    // Filter current file comments to only those in ids
    const target = comments
      .filter(c => c.filePath === currFile && ids.includes(c._id));

    // Replace old focused highlight
    focusedDecosRef.current = editor.deltaDecorations(focusedDecosRef.current, []);

    // If nothing to highlight, return
    if (target.length === 0) return;

    const decos = target.map(c => ({
      range: new monaco.Range(c.startLine, 1, c.endLine, 1),
      options: { isWholeLine: true, className: classes.focusedCommentHighlight },
    }));
    focusedDecosRef.current = editor.deltaDecorations([], decos);
  }, [comments, currFile, classes.focusedCommentHighlight]);

  
  const clearFocusedLines = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    focusedDecosRef.current = editor.deltaDecorations(focusedDecosRef.current, []);
    setFocusedCommentIds([]);
  }, []);
  
  const applyFocusOnLinesAndComments = useCallback((list: PeerReviewComment[]) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    // replace old focused decos
    focusedDecosRef.current = editor.deltaDecorations(focusedDecosRef.current, []);
    if (!list.length) { setFocusedCommentIds([]); return; }

    setFocusedCommentIds(list.map(c => c._id));
    const decos = list.map(c => ({
      range: new monaco.Range(c.startLine, 1, c.endLine, 1),
      options: { isWholeLine: true, className: classes.focusedCommentHighlight },
    }));
    focusedDecosRef.current = editor.deltaDecorations([], decos);
  }, [classes.focusedCommentHighlight]);
  
  useEffect(() => {
    if (!editorRef.current) return;
    focusedDecosRef.current = editorRef.current.deltaDecorations(focusedDecosRef.current, []);
    setFocusedCommentIds([]);
  }, [currFile]);
  
  
  /* ===== Editor Interaction Logic ===== */
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Dispose old listeners
    listenerDisposablesRef.current.forEach(d => d?.dispose?.());
    listenerDisposablesRef.current = [];
    
    let startLine: number | null = null;
    
    const onMouseDown = editor.onMouseDown((e: any) => {
      // 1) Click on glyph margin: start selection
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && e.target.position) {
        startLine = e.target.position.lineNumber;

        // clear focus (exclusive)
        clearFocusedLines();

        // reset transient decos
        hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, []);
        dragDecosRef.current = editor.deltaDecorations(dragDecosRef.current, []);
        iconDecoRef.current = editor.deltaDecorations([], [{
          range: new monaco.Range(startLine, 1, startLine, 1),
          options: { isWholeLine: true, glyphMarginClassName: classes.reviewLineIcon },
        }]);
        return;
      }

      // 2) Click on text: focus comment if any
      if (e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT && e.target.position) {
        const line = e.target.position.lineNumber;
        const file = currFileRef.current;
        const fileComments = commentsRef.current;

        const clicked = fileComments.filter(c => c.filePath === file && c.startLine <= line && c.endLine >= line);
        applyFocusOnLinesAndComments(clicked);
        return;
      }

      // 3) Click outside text or glyph margin: clear all
      clearFocusedLines();
    });
    
    const onMouseUp = editor.onMouseUp((e: any) => {
      if (startLine === null) return;
      
      // Cancel if not released on a line number
      if (!e.target?.position) {
        dragDecosRef.current = editor.deltaDecorations(dragDecosRef.current, []);
        iconDecoRef.current = editor.deltaDecorations(iconDecoRef.current, []);
        startLine = null;
        return;
      }
      
      // Finalize selection
      const endLine = e.target.position.lineNumber;
      const start = Math.min(startLine, endLine);
      const finish = Math.max(startLine, endLine);

      // Add final decorations
      const decos: any[] = [];
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
      dragDecosRef.current = editor.deltaDecorations(dragDecosRef.current, decos);

      const top = editor.getTopForLineNumber(finish);
      setActiveWidget({ start, end: finish, top });
      startLine = null;
    });
    
    const onMouseMove = editor.onMouseMove((e: any) => {
      // Don't do anything if dragging a selection
      if (activeWidgetRef.current) {
        hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, []);
        return;
      }
      
      // If dragging to select lines
      if (startLine !== null && e.target?.position) {
        const line = e.target.position.lineNumber;
        const start = Math.min(startLine, line);
        const finish = Math.max(startLine, line);
        const decos: any[] = [];
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
        dragDecosRef.current = editor.deltaDecorations(dragDecosRef.current, decos);
        return;
      }
      
      // If hovering over a line
      if (e.target?.position) {
        const line = e.target.position.lineNumber;
        hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, [{
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: classes.reviewLineHighlight,
            glyphMarginClassName: classes.reviewLineIcon,
          },
        }]);
      } else {
        hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, []);
      }
    });
    
    // Method to clear all comment-related decorations, expose for cancelling a comment
    editor.clearCommentDecorations = () => {
      hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, []);
      dragDecosRef.current = editor.deltaDecorations(dragDecosRef.current, []);
      iconDecoRef.current = editor.deltaDecorations(iconDecoRef.current, []);
      setActiveWidget(null);
    };

    listenerDisposablesRef.current.push(onMouseDown, onMouseUp, onMouseMove);
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => listenerDisposablesRef.current.forEach(d => d?.dispose?.());
  }, []);
  
  // Add comment handler
  const handleAddComment = useCallback(async (text: string) => {
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

      // clean up decorations + selection
      editorRef.current?.clearCommentDecorations?.();
      setActiveWidget(null);

      return true;
    } catch (error: any) {
      notifications.show({
        color: 'red',
        title: 'Failed to add comment',
        message: error?.message || 'Please try again.',
      });
      return false;
    } finally {
      setSubmittingComment(false);
    }
  },[submittingComment, activeWidget, currFile, addComment]);
  
  // Update comment handler
  const handleUpdateComment = useCallback(async (commentId: string, newComment: string) => {
    if (updatingCommentId) return false;
    if (!newComment.trim()) return false;
    
    const currComment = comments.find(c => c._id === commentId);
    if (!currComment) return false;
    if (currComment.comment === newComment) return true;
    
    try {
      setUpdatingCommentId(commentId);
      await updateComment(commentId, newComment);
      editorRef.current?.clearCommentDecorations?.();
      setActiveWidget(null);
      return true;
    } catch (error: any) {
      notifications.show({
        color: 'red',
        title: 'Failed to update comment',
        message: error?.message || 'Please try again.',
      });
      return false;
    } finally {
      setUpdatingCommentId(null);
    }
  }, [updatingCommentId, updateComment]);
  
  // Delete comment handler
  const requestDeleteComment = useCallback((commentId: string) => {
    setDeleteCommentId(commentId);
  }, []);
  
  const handleDeleteComment = useCallback(async () => {
    if (!deleteCommentId) return;
    
    try {
      await deleteComment(deleteCommentId);
      if (focusedCommentIds.includes(deleteCommentId)) {
        const remainingIds = focusedCommentIds.filter(id => id !== deleteCommentId);
        setFocusedCommentIds(remainingIds);
        renderFocusedLines(remainingIds);
      }
    } catch (error: any) {
      notifications.show({
        color: 'red',
        title: 'Failed to delete comment',
        message: error?.message || 'Please try again.',
      });
    } finally {
      setDeleteCommentId(null);
    }
  }, [deleteCommentId, deleteComment, focusedCommentIds, clearFocusedLines]);
  
  // Focus comment handler
  const handleFocusComment = useCallback((comment: PeerReviewComment) => {
    setFocusedCommentIds([comment._id]);
    renderFocusedLines([comment._id]);
    editorRef.current?.revealLineInCenter?.(comment.startLine);
  }, [renderFocusedLines]);

  if (loading) return <Center>Loading…</Center>;
  if (!peerReviewAssignment) return <Center>Unable to load assignment.</Center>;
  if (!repoTree) return <Center>No repository tree found.</Center>;
  
  return (
    <Container fluid className={classes.wrapper}>
      <Group className={classes.header} >
        <IconArrowLeft onClick={() => router.push(`/courses/${id}/peer-review`)} className={classes.returnButton} />
        <IconListDetails />
        <Title order={4}>Peer Review:</Title>
        <Anchor href={peerReviewAssignment.repoUrl} target="_blank" rel="noreferrer">
          <Title order={4}>
            {peerReviewAssignment.repoName}
          </Title>
        </Anchor>
      </Group>

      <Group className={classes.body}>
        <Box className={classes.repositoryBox}>
          <Text className={classes.repositoryTitle}>
            Repository
          </Text>
          <ScrollArea className={classes.repositoryScrollArea} scrollbarSize={4}>
            { repoTree && 
              <PeerReviewFileTree 
                repoNode={repoTree}
                currFile={currFile!}
                openFile={openFile}
              />
            }
          </ScrollArea>
        </Box>
        {currFile ? (
          <Box className={classes.editorBox}>
            <Card className={classes.editorCard}>
              <Text className={classes.editorTitle}>{currFile}</Text>
              <MonacoEditor
                path={currFile}
                language={getLanguageForFile(currFile)}
                theme="vs-dark"
                value={currentCode}
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  lineHeight: 20,
                  lineNumbers: "on",
                  selectionHighlight: false,
                  occurrencesHighlight: "off",
                  renderLineHighlight: "none",
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
          <Center >
            <Text>Select a file to view</Text>
          </Center>
        )}
        <PeerReviewCommentSidebar
          comments={comments.filter(c => c.filePath === currFile)} // Filter logic based on role is handled on BE
          focusedComments={focusedCommentIds}
          onFocusComment={handleFocusComment}
          onAddComment={handleAddComment}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={requestDeleteComment}
          onCancelComment={() => editorRef.current.clearCommentDecorations()}
          selectedLines={activeWidget ? { start: activeWidget.start, end: activeWidget.end } : null}
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
