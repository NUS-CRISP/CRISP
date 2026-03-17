import {
  Container,
  Center,
  Loader,
  ScrollArea,
  Group,
  Title,
  Anchor,
  Text,
  Stack,
  Box,
  Card,
  Button,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconClipboardList,
  IconPencil,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { editor as MEditor, IDisposable } from 'monaco-editor';
import type { OnMount, Monaco } from '@monaco-editor/react';

import classes from '@styles/PeerReview.module.css';
import PeerReviewFileTree from '@/components/peer-review/PeerReviewFileTree';
import PeerReviewCommentSidebar from '@/components/peer-review/PeerReviewCommentSidebar';
import PeerReviewSummaryModal from '@/components/cards/Modals/PeerReviewSummaryModal';
import PeerReviewGradeSubmissionModal from '@/components/cards/Modals/PeerReviewGradeSubmissionModal';
import PeerReviewGradingSummaryModal from '@/components/cards/Modals/PeerReviewGradingSummaryModal';
import FlagCommentConfirmationModal from '@/components/cards/Modals/FlagCommentConfirmationModal';

import { getLanguageForFile } from '@/lib/peer-review/utils';
import { getMe } from '@/lib/auth/utils';

import usePeerReviewGradingData from '@/components/hooks/usePeerReviewGradingData';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { PeerReviewComment } from '@shared/types/PeerReview';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
});

const PeerReviewGradingDetailPage: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId, submissionId } = router.query as {
    id: string;
    assessmentId: string;
    submissionId: string;
  };

  const ready =
    router.isReady &&
    typeof id === 'string' &&
    typeof assessmentId === 'string' &&
    typeof submissionId === 'string';

  // Current User
  const [me, setMe] = useState<{
    userId: string;
    userCourseRole: string;
  } | null>(null);
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const userData = await getMe(id);
      if (userData) setMe(userData);
    })();
  }, [ready, id]);

  const isFaculty = me?.userCourseRole === COURSE_ROLE.Faculty;
  // const isTA = me?.userCourseRole === COURSE_ROLE.TA;

  const {
    loading,
    error,
    dto,

    repoTree,
    currFile,
    openFile,
    currentCode,
    comments,

    myTask,
    saveState,
    score,
    feedback,

    startGrading,
    setScore,
    setFeedback,
    saveDraftNow,
    submitGrading,
    flagComment,
    unflagComment,
  } = usePeerReviewGradingData({
    courseId: id,
    assessmentId,
    peerReviewSubmissionId: submissionId,
  });

  /* ===== Monaco focus highlighting (read-only) ===== */
  const editorRef = useRef<MEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const listenerDisposablesRef = useRef<IDisposable[]>([]);
  const focusedDecosRef = useRef<string[]>([]);
  const staticDecosRef = useRef<string[]>([]);
  const [focusedCommentIds, setFocusedCommentIds] = useState<string[]>([]);

  const commentsRef = useRef<PeerReviewComment[]>([]);
  const currFileRef = useRef<string | null>(null);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);
  useEffect(() => {
    currFileRef.current = currFile ?? null;
  }, [currFile]);

  const renderFocusedAndStaticDecos = useCallback((focusedIds: string[]) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const file = currFileRef.current;
    if (!editor || !monaco || !file) return;

    setFocusedCommentIds(focusedIds);
    const focusedSet = new Set(focusedIds);
    const fileComments = (commentsRef.current ?? []).filter(
      c => c.filePath === file
    );

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
  }, []);

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

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    focusedDecosRef.current = [];
    staticDecosRef.current = [];
    renderFocusedAndStaticDecos([]);

    // Dispose old listeners
    listenerDisposablesRef.current.forEach(d => d?.dispose?.());
    listenerDisposablesRef.current = [];

    const onMouseDown = editor.onMouseDown((e: MEditor.IEditorMouseEvent) => {
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
      renderFocusedAndStaticDecos([]);
    });

    listenerDisposablesRef.current.push(onMouseDown);
  };

  useEffect(() => {
    return () => listenerDisposablesRef.current.forEach(d => d?.dispose?.());
  }, []);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [gradingSummaryOpen, setGradingSummaryOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const [flagCommentId, setFlagCommentId] = useState<string | null>(null);
  const [unflagCommentId, setUnflagCommentId] = useState<string | null>(null);

  if (!ready || !me || loading)
    return (
      <Center h="60vh">
        <Stack align="center" gap="xs">
          <Loader size="md" />
          <Text c="dimmed">Loading grading console...</Text>
        </Stack>
      </Center>
    );

  const repo = dto?.assignment?.repo ?? { repoName: '', repoUrl: '' };
  const revieweeTeam = dto?.assignment?.revieweeTeam ?? null;
  const reviewer = dto?.reviewer ?? null;
  const submission = dto?.submission ?? null;

  if (!dto || !repoTree)
    return (
      <Center h="60vh">
        <Stack align="center" gap={4}>
          <Text fw={600}>Unable to load grading console</Text>
          <Text c="dimmed" fz="sm">
            Please refresh and try again.
          </Text>
        </Stack>
      </Center>
    );

  const reviewerLabel = reviewer
    ? reviewer.kind === 'Team'
      ? `Team ${reviewer.teamNumber}`
      : reviewer.name
    : 'Reviewer';

  const maxMarks = Number(dto?.maxMarks ?? 0);
  const isSubmitted = submission?.status === 'Submitted';
  const peerReviewStatus = dto?.peerReviewStatus as
    | 'Upcoming'
    | 'Active'
    | 'Closed'
    | undefined;
  const isPeerReviewActive = peerReviewStatus === 'Active';

  const canStartGrading =
    isPeerReviewActive && isFaculty && !myTask && isSubmitted;
  const canGrade =
    isPeerReviewActive &&
    !!myTask &&
    (myTask.status === 'Assigned' || myTask.status === 'InProgress');
  const gradingTasks = dto?.gradingTasks ?? [];
  const canViewGradingSummary = isFaculty || myTask?.status === 'Completed';

  const gradingStatusColor =
    myTask?.status === 'Assigned'
      ? 'yellow'
      : myTask?.status === 'InProgress'
        ? 'blue'
        : 'green';

  const handleSaveGrading = async () => {
    try {
      setSavingGrade(true);

      // faculty on-demand: ensure task exists
      if (!myTask && isFaculty) {
        const t = await startGrading();
        if (!t) return;
      }

      const s = typeof score === 'number' ? score : 0;
      await saveDraftNow(s, feedback);

      notifications.show({
        color: 'yellow',
        title: 'Saved',
        message: 'Draft grading has been saved.',
      });
    } finally {
      setSavingGrade(false);
    }
  };

  const handleSubmitGrading = async () => {
    try {
      setSavingGrade(true);

      if (!myTask && isFaculty) {
        const t = await startGrading();
        if (!t) return;
      }

      const s = typeof score === 'number' ? score : 0;
      await saveDraftNow(s, feedback);
      const updated = await submitGrading();
      if (updated) {
        notifications.show({
          color: 'green',
          title: 'Submitted',
          message: 'Grade has been submitted.',
        });
        setGradeOpen(false);
        router.push(`/courses/${id}/internal-assessments/${assessmentId}`);
      }
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <Container fluid className={classes.wrapper}>
      <Group className={classes.header} justify="space-between">
        <Group gap="xs" style={{ flexWrap: 'wrap' }}>
          <IconArrowLeft
            onClick={() => router.back()}
            className={classes.returnButton}
          />
          <Title order={4}></Title>
          <Badge variant="light" color="teal" h="27px" radius="md">
            Reviewer: {reviewerLabel}
          </Badge>
          {revieweeTeam && (
            <Badge color="teal" variant="light" h="27px" radius="md">
              <Group gap="6px">
                Reviewee: Team {revieweeTeam.teamNumber}
                {repo?.repoUrl && (
                  <Anchor
                    href={repo.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    underline="never"
                  >
                    <Text fw="bold" fz="xs">
                      ({repo.repoName})
                    </Text>
                  </Anchor>
                )}
              </Group>
            </Badge>
          )}
        </Group>

        <Group gap="xs">
          {/* Submission status indicator, only when peer review is active */}
          {isPeerReviewActive && !isSubmitted && (
            <Badge variant="light" color="orange" h="27px" radius="md">
              Submission:{' '}
              {submission?.status === 'Draft' ? 'Draft' : 'Not Started'}
            </Badge>
          )}
          {/* Peer review status indicator, only when peer review is not active */}
          {peerReviewStatus && !isPeerReviewActive && (
            <Badge variant="light" color="gray" h="27px" radius="md">
              Peer Review: {peerReviewStatus} (read-only)
            </Badge>
          )}
          {/* Small status indicator for graders */}
          {saveState !== 'Idle' && (
            <Badge
              color={
                saveState === 'Saved'
                  ? 'green'
                  : saveState === 'Saving'
                    ? 'yellow'
                    : 'red'
              }
              radius="md"
              h="27px"
              variant="light"
            >
              {saveState}
            </Badge>
          )}
          {myTask && (
            <Badge
              variant="light"
              color={gradingStatusColor}
              h="27px"
              radius="md"
            >
              Grading:{' '}
              {myTask.status === 'InProgress' ? 'In Progress' : myTask.status}
            </Badge>
          )}
          <Button
            leftSection={<IconClipboardList size={16} />}
            radius="md"
            size="xs"
            fz="sm"
            h="27px"
            color="yellow"
            variant="light"
            onClick={() => setSummaryOpen(true)}
          >
            Review Summary
          </Button>

          {canViewGradingSummary && (
            <Button
              leftSection={<IconClipboardList size={16} />}
              radius="md"
              size="xs"
              fz="sm"
              h="27px"
              color="grape"
              variant="light"
              onClick={() => setGradingSummaryOpen(true)}
            >
              Grading Summary
            </Button>
          )}

          {canStartGrading && (
            <Button
              leftSection={<IconPencil size={16} />}
              radius="md"
              size="xs"
              fz="sm"
              h="27px"
              onClick={async () => {
                const t = await startGrading();
                if (!t) {
                  notifications.show({
                    color: 'red',
                    title: 'Failed to start grading',
                    message: 'Please try again.',
                  });
                  return;
                }
                notifications.show({
                  color: 'green',
                  title: 'Grading started',
                  message: 'A grading task has been created for you.',
                });
                setGradeOpen(true);
              }}
            >
              Start Grading
            </Button>
          )}

          {canGrade && (
            <Button
              radius="md"
              size="xs"
              fz="sm"
              h="27px"
              onClick={() => setGradeOpen(true)}
            >
              Submit Grade
            </Button>
          )}
        </Group>
      </Group>

      <Group className={classes.body}>
        <Box className={classes.repositoryBox}>
          <Text className={classes.repositoryTitle}>Repository</Text>
          <ScrollArea
            className={classes.repositoryScrollArea}
            scrollbarSize={4}
          >
            <PeerReviewFileTree
              repoNode={repoTree}
              currFile={currFile!}
              openFile={openFile}
            />
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
          <Center style={{ flex: 1, minHeight: 420 }}>
            <Stack align="center" gap={4}>
              <Text fw={600}>Select a file to view</Text>
              <Text c="dimmed" fz="sm">
                Choose a file from the repository tree to open it.
              </Text>
            </Stack>
          </Center>
        )}

        {/* Read-only */}
        <PeerReviewCommentSidebar
          user={me}
          comments={(comments ?? []).filter(c => c.filePath === currFile)}
          focusedComments={focusedCommentIds}
          onFocusComment={comment => {
            renderFocusedAndStaticDecos([comment._id]);
            editorRef.current?.revealLineInCenter?.(comment.startLine);
          }}
          onAddComment={async () => false}
          onUpdateComment={async () => false}
          onDeleteComment={() => {}}
          onFlagComment={commentId => setFlagCommentId(commentId)}
          onUnflagComment={commentId => setUnflagCommentId(commentId)}
          onCancelComment={() => renderFocusedAndStaticDecos([])}
          selectedLines={null}
          canEditComments={false}
        />
      </Group>

      <PeerReviewSummaryModal
        opened={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        repoName={repo?.repoName ?? ''}
        comments={comments}
        onNavigate={(filePath, line) => {
          openFile(filePath);
          setTimeout(() => {
            editorRef.current?.revealLineInCenter?.(line);
          }, 200);
        }}
      />

      <PeerReviewGradeSubmissionModal
        opened={gradeOpen}
        onClose={() => setGradeOpen(false)}
        maxMarks={maxMarks}
        task={myTask}
        score={score}
        feedback={feedback}
        onChangeScore={setScore}
        onChangeFeedback={setFeedback}
        saving={savingGrade}
        onSave={handleSaveGrading}
        onSubmit={handleSubmitGrading}
      />

      <PeerReviewGradingSummaryModal
        opened={gradingSummaryOpen}
        onClose={() => setGradingSummaryOpen(false)}
        maxMarks={maxMarks}
        tasks={gradingTasks}
        isFaculty={isFaculty}
      />

      <FlagCommentConfirmationModal
        opened={!!flagCommentId}
        onClose={() => setFlagCommentId(null)}
        onCancel={() => setFlagCommentId(null)}
        title="Flag Comment?"
        onConfirm={async (reason: string) => {
          if (!flagCommentId) return;
          try {
            await flagComment(flagCommentId, reason);
          } catch {
            notifications.show({
              color: 'red',
              title: 'Failed to flag comment',
              message: 'Please try again.',
            });
          } finally {
            setFlagCommentId(null);
          }
        }}
      />

      <FlagCommentConfirmationModal
        opened={!!unflagCommentId}
        onClose={() => setUnflagCommentId(null)}
        onCancel={() => setUnflagCommentId(null)}
        title="Unflag Comment?"
        confirmLabel="Unflag"
        confirmColor="blue"
        onConfirm={async (reason: string) => {
          if (!unflagCommentId) return;
          try {
            await unflagComment(unflagCommentId, reason);
          } catch {
            notifications.show({
              color: 'red',
              title: 'Failed to unflag comment',
              message: 'Please try again.',
            });
          } finally {
            setUnflagCommentId(null);
          }
        }}
      />

      {error && (
        <Box style={{ position: 'fixed', bottom: 16, left: 16, right: 16 }}>
          <Card withBorder>
            <Group justify="space-between">
              <Text c="red">{error}</Text>
              <Button variant="light" onClick={() => router.reload()}>
                Reload
              </Button>
            </Group>
          </Card>
        </Box>
      )}
    </Container>
  );
};

export default PeerReviewGradingDetailPage;
