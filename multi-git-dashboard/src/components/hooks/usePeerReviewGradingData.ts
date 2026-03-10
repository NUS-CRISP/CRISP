import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RepoNode, PeerReviewComment } from '@shared/types/PeerReview';
import type {
  PeerReviewGradingDTO,
  PeerReviewMyGradingTaskDTO,
} from '@shared/types/PeerReviewAssessment';

import {
  apiFetchGradingDTO,
  apiStartGradingTask,
  apiSaveGradingTaskDraft,
  apiSubmitGradingTask,
} from '@/lib/peer-review/api';

import {
  fetchGithubRepoStructure,
  fetchFileContent,
  flattenTree,
} from '@/lib/peer-review/utils';

type SaveState = 'Idle' | 'Saving' | 'Saved' | 'Error';

type Args = {
  courseId: string;
  assessmentId: string;
  peerReviewSubmissionId: string;
};

export default function usePeerReviewGradingData({
  courseId,
  assessmentId,
  peerReviewSubmissionId,
}: Args) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // single source of truth from BE
  const [dto, setDto] = useState<PeerReviewGradingDTO | null>(null);

  // repo browsing
  const [repoTree, setRepoTree] = useState<RepoNode | null>(null);
  const [currFile, setCurrFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<Record<string, string>>({});

  // comments (submission-scoped)
  const [comments, setComments] = useState<PeerReviewComment[]>([]);

  // grading task
  const [myTask, setMyTask] = useState<PeerReviewMyGradingTaskDTO | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('Idle');

  // local draft fields for modal
  const [score, setScore] = useState<number | ''>('');
  const [feedback, setFeedback] = useState<string>('');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clearSaveTimer = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  };

  const refresh = useCallback(async () => {
    if (!courseId || !assessmentId || !peerReviewSubmissionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetchGradingDTO(
        courseId,
        assessmentId,
        peerReviewSubmissionId
      );
      if (!res) throw new Error('Failed to fetch grading data');
      setDto(res);

      const repoUrl = res.assignment?.repo?.repoUrl;
      if (!repoUrl) throw new Error('Missing repoUrl in grading DTO');

      const dtoComments =
        (res.comments as PeerReviewComment[] | undefined) ?? [];
      setComments(dtoComments);

      const task = res.myGradingTask;
      setMyTask(task);

      setScore(typeof task?.score === 'number' ? task!.score : '');
      setFeedback(task?.feedback ?? '');

      const tree = await fetchGithubRepoStructure(repoUrl);
      setRepoTree(tree);

      const files = flattenTree(tree);
      if (files[0]) {
        setCurrFile(files[0]);
        const content = await fetchFileContent(repoUrl, files[0]);
        setFileContent(prev => ({ ...prev, [files[0]]: content }));
      } else {
        setCurrFile(null);
      }
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load grading console');
    } finally {
      setLoading(false);
    }
  }, [courseId, assessmentId, peerReviewSubmissionId]);

  useEffect(() => {
    refresh();
    return () => clearSaveTimer();
  }, [refresh]);

  const openFile = useCallback(
    async (filePath: string) => {
      const repoUrl = dto?.assignment?.repo?.repoUrl;
      if (!repoUrl) return;

      setCurrFile(filePath);
      if (!fileContent[filePath]) {
        const content = await fetchFileContent(repoUrl, filePath);
        setFileContent(prev => ({ ...prev, [filePath]: content }));
      }
    },
    [dto, fileContent]
  );

  const currentCode = useMemo(() => {
    if (!currFile) return '// No file selected';
    return fileContent[currFile] ?? '// Loading file content...';
  }, [currFile, fileContent]);

  // ---- grading actions ----
  const startGrading = useCallback(async () => {
    setError(null);
    const t = await apiStartGradingTask(
      courseId,
      assessmentId,
      peerReviewSubmissionId
    );
    if (!t) {
      setError('Failed to start grading task');
      return null;
    }
    setMyTask(t);
    setScore(typeof t.score === 'number' ? t.score : '');
    setFeedback(t.feedback ?? '');
    setSaveState('Idle');
    return t;
  }, [courseId, assessmentId, peerReviewSubmissionId]);

  const saveDraftNow = useCallback(
    async (nextScore?: number | '', nextFeedback?: string) => {
      if (!myTask?._id) {
        setError('No grading task yet. Click "Start grading" first.');
        return null;
      }

      const s =
        typeof nextScore === 'number'
          ? nextScore
          : nextScore === ''
            ? 0
            : typeof score === 'number'
              ? score
              : 0;

      const f = typeof nextFeedback === 'string' ? nextFeedback : feedback;

      setSaveState('Saving');
      setError(null);

      const updated = await apiSaveGradingTaskDraft(
        courseId,
        assessmentId,
        myTask._id,
        s,
        f
      );

      if (!updated) {
        setSaveState('Error');
        setError('Failed to save grading draft');
        return null;
      }

      setMyTask(updated);
      setSaveState('Saved');
      return updated;
    },
    [myTask, score, feedback, courseId, assessmentId]
  );

  const scheduleSaveDraft = useCallback(
    (nextScore?: number | '', nextFeedback?: string) => {
      if (!myTask?._id || myTask.status === 'Completed') return;

      clearSaveTimer();
      setSaveState('Saving');

      saveTimerRef.current = setTimeout(() => {
        void saveDraftNow(nextScore, nextFeedback);
      }, 700);
    },
    [myTask, saveDraftNow]
  );

  const updateScore = useCallback(
    (v: number | '') => {
      setScore(v);
      scheduleSaveDraft(v, undefined);
    },
    [scheduleSaveDraft]
  );

  const updateFeedback = useCallback(
    (v: string) => {
      setFeedback(v);
      scheduleSaveDraft(undefined, v);
    },
    [scheduleSaveDraft]
  );

  const submitGrading = useCallback(async () => {
    if (!myTask?._id) {
      setError('No grading task yet. Click "Start grading" first.');
      return null;
    }

    setError(null);
    const updated = await apiSubmitGradingTask(
      courseId,
      assessmentId,
      myTask._id
    );

    if (!updated) {
      setError('Failed to submit grading');
      return null;
    }

    setMyTask(updated);
    setSaveState('Idle');
    await refresh();
    return updated;
  }, [myTask, courseId, assessmentId, refresh]);

  return {
    loading,
    error,
    dto,
    repoTree,
    currFile,
    setCurrFile,
    openFile,
    currentCode,
    comments,
    myTask,
    saveState,
    score,
    feedback,

    refresh,
    startGrading,
    setScore: updateScore,
    setFeedback: updateFeedback,
    saveDraftNow,
    submitGrading,
  };
}
