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
  Button,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconListDetails,
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

import { getLanguageForFile } from '@/lib/peer-review/utils';
import { getMe } from '@/lib/auth/utils';

import usePeerReviewGradingData from '@/components/hooks/usePeerReviewGradingData';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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
  const [me, setMe] = useState<{ userId: string; userCourseRole: string } | null>(null);
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const userData = await getMe(id);
      if (userData) setMe(userData);
    })();
  }, [ready, id]);

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

  const commentsRef = useRef<any[]>([]);
  const currFileRef = useRef<string | null>(null);

  useEffect(() => {
    commentsRef.current = comments as any[];
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
    const fileComments = (commentsRef.current ?? []).filter((c: any) => c.filePath === file);

    const focusDecos = fileComments
      .filter((c: any) => focusedSet.has(c._id))
      .map((c: any) => ({
        range: new monaco.Range(c.startLine, 1, c.endLine, 1),
        options: { isWholeLine: true, className: classes.focusedCommentHighlight },
      }));

    const staticDecos = fileComments
      .filter((c: any) => !focusedSet.has(c._id))
      .map((c: any) => ({
        range: new monaco.Range(c.startLine, 1, c.endLine, 1),
        options: { isWholeLine: true, className: classes.commentedLineHint },
      }));

    focusedDecosRef.current = editor.deltaDecorations(focusedDecosRef.current, focusDecos);
    staticDecosRef.current = editor.deltaDecorations(staticDecosRef.current, staticDecos);
  }, []);

  useEffect(() => {
    if (!editorRef.current || !currFile || !currentCode) return;
    focusedDecosRef.current = editorRef.current.deltaDecorations(focusedDecosRef.current, []);
    staticDecosRef.current = editorRef.current.deltaDecorations(staticDecosRef.current, []);
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
        const fileComments = commentsRef.current.filter((c: any) => c.filePath === file);
        const clicked = fileComments.filter((c: any) => c.startLine <= line && c.endLine >= line);
        renderFocusedAndStaticDecos(clicked.map((c: any) => c._id));
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
  const [gradeOpen, setGradeOpen] = useState(false);

  if (!ready || !me) return <Center>Loading...</Center>;
  if (loading) return <Center>Loading...</Center>;

  const repo =
    (dto as any)?.repo ?? (dto as any)?.assignment?.repo ?? { repoName: '', repoUrl: '' };
  const revieweeTeam =
    (dto as any)?.revieweeTeam ?? (dto as any)?.assignment?.revieweeTeam ?? null;
  const reviewer =
    (dto as any)?.reviewer ?? null;
  const submission =
    (dto as any)?.submission ?? null;

  if (!dto || !repoTree) return <Center>Unable to load grading console.</Center>;

  const reviewerLabel = reviewer
    ? reviewer.kind === 'Team'
      ? `Team ${reviewer.teamNumber}`
      : reviewer.name
    : 'Reviewer';

  const peerReviewTitle = (dto as any)?.peerReviewTitle ?? 'Peer Review';
  const maxMarks = Number((dto as any)?.maxMarks ?? 0);

  const canStartGrading = me.userCourseRole === 'Faculty' && !myTask;
  const canGrade = !!myTask;
  
  const [savingGrade, setSavingGrade] = useState(false);
  const handleSaveGrading = async () => {
    try {
      setSavingGrade(true);

      // faculty on-demand: ensure task exists
      if (!myTask && me.userCourseRole === 'Faculty') {
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
  }
  
  const handleSubmitGrading = async () => {
    try {
      setSavingGrade(true);

      if (!myTask && me.userCourseRole === 'Faculty') {
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
      }
    } finally {
      setSavingGrade(false);
    }
  }

  return (
    <Container fluid className={classes.wrapper}>
      <Group className={classes.header} justify="space-between">
        <Group gap="xs" style={{ flexWrap: 'wrap' }}>
          <IconArrowLeft
            onClick={() => router.back()}
            className={classes.returnButton}
          />
          <IconListDetails style={{ opacity: 0.8 }} />
          <Title order={4}>{peerReviewTitle}</Title>
          <Badge variant="outline">{reviewerLabel}</Badge>
          {revieweeTeam && (
            <Badge variant="light">
              Reviewee: Team {revieweeTeam.teamNumber}
            </Badge>
          )}
          {repo?.repoUrl && (
            <Anchor href={repo.repoUrl} target="_blank" rel="noreferrer" underline="never">
              <Text fw={600}>{repo.repoName}</Text>
            </Anchor>
          )}
        </Group>

        <Group gap="xs">
          {/* Small status indicator for graders */}
          {myTask && (
            <Badge variant="light">
              Grading: {myTask.status}
            </Badge>
          )}
          {saveState !== 'Idle' && (
            <Badge
              color={
                saveState === 'Saved'
                  ? 'green'
                  : saveState === 'Saving'
                    ? 'yellow'
                    : 'red'
              }
              variant="outline"
            >
              {saveState}
            </Badge>
          )}

          <Button
            leftSection={<IconClipboardList size={16} />}
            radius="md"
            size="xs"
            fz="sm"
            h="27px"
            variant="light"
            onClick={() => setSummaryOpen(true)}
          >
            Review Summary
          </Button>

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
              Start grading
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
              Grade
            </Button>
          )}
        </Group>
      </Group>

      <Group className={classes.body}>
        <Box className={classes.repositoryBox}>
          <Text className={classes.repositoryTitle}>Repository</Text>
          <ScrollArea className={classes.repositoryScrollArea} scrollbarSize={4}>
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
          <Center>
            <Text>Select a file to view</Text>
          </Center>
        )}

        {/* Read-only */}
        <PeerReviewCommentSidebar
          user={me}
          comments={(comments ?? []).filter((c: any) => c.filePath === currFile)}
          focusedComments={focusedCommentIds}
          onFocusComment={(comment: any) => {
            renderFocusedAndStaticDecos([comment._id]);
            editorRef.current?.revealLineInCenter?.(comment.startLine);
          }}
          onAddComment={async () => false}
          onUpdateComment={async () => false}
          onDeleteComment={() => {}}
          onFlagComment={() => {}}
          onCancelComment={() => renderFocusedAndStaticDecos([])}
          selectedLines={null}
        />
      </Group>

      <PeerReviewSummaryModal
        opened={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        repoName={repo?.repoName ?? ''}
        comments={comments as any[]}
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
        task={myTask as any}
        score={score}
        feedback={feedback}
        onChangeScore={setScore}
        onChangeFeedback={setFeedback}
        saving={savingGrade}
        onSave={handleSaveGrading}
        onSubmit={handleSubmitGrading}
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
