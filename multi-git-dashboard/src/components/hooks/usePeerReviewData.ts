import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PeerReviewAssignment,
  PeerReviewComment,
  PeerReviewSubmission,
  RepoNode,
} from '@shared/types/PeerReview';
import {
  apiFetchPeerReviewAssignment,
  apiFetchComments,
  apiAddComment,
  apiUpdateComment,
  apiDeleteComment,
  apiFlagComment,
  apiFetchSubmissionsForAssignment,
  apiTouchDraft,
  apiSubmitReview,
} from '@/lib/peer-review/api';
import {
  fetchGithubRepoStructure,
  fetchFileContent,
  flattenTree,
} from '@/lib/peer-review/utils';
import CourseRole from '@shared/types/auth/CourseRole';

type UsePeerReviewDataArgs = {
  courseId: string;
  assignmentId: string;
  userCourseRole?: string;
};

export default function usePeerReviewData({
  courseId,
  assignmentId,
  userCourseRole,
}: UsePeerReviewDataArgs) {
  const [loading, setLoading] = useState(true);
  const [peerReviewAssignment, setPeerReviewAssignment] =
    useState<PeerReviewAssignment | null>(null);
  const [repoTree, setRepoTree] = useState<RepoNode | null>(null);
  const [currFile, setCurrFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<PeerReviewComment[]>([]);
  
  const [submission, setSubmission] = useState<PeerReviewSubmission | null>(null);
  const [saveState, setSaveState] = useState<'Idle' | 'Saving' | 'Saved' | 'Error'>('Idle');
  const [canEdit, setCanEdit] = useState(false);
  const touchDraftTimer = useRef<NodeJS.Timeout | null>(null);
  
  const scheduleTouchDraft = useCallback(() => {
    if (!canEdit) return;
    if (touchDraftTimer.current) clearTimeout(touchDraftTimer.current);

    touchDraftTimer.current = setTimeout(async () => {
      try {
        setSaveState('Saving');
        const updated = await apiTouchDraft(courseId, assignmentId);
        setSubmission(updated);
        setSaveState('Saved');
      } catch {
        setSaveState('Error');
      }
    }, 900);
  }, [canEdit, courseId, assignmentId]);

  // Initial load of data
  useEffect(() => {
    if (!courseId || !assignmentId || !userCourseRole) {
      setLoading(false);
      return;
    }
    
    let cancelled = false;
    const initialLoad = async () => {
      try {
        setLoading(true);
        const prAssignment = await apiFetchPeerReviewAssignment(
          courseId,
          assignmentId
        );
        if (cancelled) return;
        
        const submissions: PeerReviewSubmission[] = await apiFetchSubmissionsForAssignment(courseId, assignmentId);
        if (cancelled) return;
        const mySubmission = userCourseRole === CourseRole.Student ? (submissions?.[0] ?? null) : null;
        setSubmission(mySubmission);
        setCanEdit((userCourseRole === CourseRole.Student || userCourseRole === CourseRole.Faculty) && mySubmission?.status !== 'Submitted');
        
        const tree = await fetchGithubRepoStructure(
          prAssignment?.repoUrl ?? ''
        );
        if (cancelled) return;
        
        const comments = await apiFetchComments(courseId, assignmentId);
        if (cancelled) return;
        
        setPeerReviewAssignment(prAssignment);
        setRepoTree(tree);
        setComments(comments);

        const files = flattenTree(tree);
        if (files[0]) {
          setCurrFile(files[0]);
          const content = await fetchFileContent(
            prAssignment?.repoUrl ?? '',
            files[0]
          );
          if (!cancelled)
            setFileContent(prev => ({ ...prev, [files[0]]: content }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    initialLoad();
    return () => {
      cancelled = true;
      if (touchDraftTimer.current) clearTimeout(touchDraftTimer.current);
    };
  }, [courseId, assignmentId, userCourseRole]);

  const openFile = useCallback(
    async (filePath: string) => {
      if (!peerReviewAssignment) return;
      setCurrFile(filePath);
      if (!fileContent[filePath]) {
        const content = await fetchFileContent(
          peerReviewAssignment.repoUrl,
          filePath
        );
        setFileContent(prev => ({ ...prev, [filePath]: content }));
      }
    },
    [peerReviewAssignment, fileContent]
  );

  // Comments CRUD
  const refreshComments = useCallback(async () => {
    const cs = await apiFetchComments(courseId, assignmentId);
    setComments(cs);
  }, [courseId, assignmentId]);

  const addComment = useCallback(
    async (
      partial: Omit<
        PeerReviewComment,
        '_id' | 'peerReviewId' | 'peerReviewAssignmentId' | 'peerReviewSubmissionId' | 'author' | 'createdAt' | 'updatedAt' | 'authorCourseRole'
      >
    ) => {
      if (!canEdit) throw new Error('Read-only');
      await apiAddComment(courseId, assignmentId, partial, submission?._id || '');
      scheduleTouchDraft();
      await refreshComments();
    },
    [canEdit, courseId, assignmentId, refreshComments, submission]
  );

  const updateComment = useCallback(
    async (commentId: string, updated: string) => {
      if (!canEdit) throw new Error('Read-only');
      await apiUpdateComment(courseId, assignmentId, commentId, updated, submission?._id || '');
      scheduleTouchDraft();
      await refreshComments();
    },
    [canEdit, scheduleTouchDraft, courseId, assignmentId, refreshComments]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!canEdit) throw new Error('Read-only');
      await apiDeleteComment(courseId, assignmentId, commentId, submission?._id || '');
      scheduleTouchDraft();
      setComments(prev => prev.filter(c => c._id !== commentId));
    },
    [canEdit, scheduleTouchDraft, courseId, assignmentId]
  );
  
  const flagComment = useCallback(
    async (commentId: string, flagReason: string) => {
      await apiFlagComment(courseId, assignmentId, commentId, true, flagReason);
      await refreshComments();
    },
    [courseId, assignmentId]
  );
  
  const unflagComment = useCallback(
    async (commentId: string, unflagReason: string) => {
      await apiFlagComment(courseId, assignmentId, commentId, false, unflagReason);
      await refreshComments();
    },
    [courseId, assignmentId]
  );
  
  const submitReview = useCallback(
    async () => {
      if (!canEdit) throw new Error('Read-only');
      await apiSubmitReview(courseId, assignmentId);
      const updated = await apiFetchSubmissionsForAssignment(courseId, assignmentId);
      const mySubmission = userCourseRole === CourseRole.Student ? (updated?.[0] ?? null) : null;
      setSubmission(mySubmission);
      setCanEdit(false);
    }, [canEdit, courseId, assignmentId, userCourseRole]
  );

  const currentCode = useMemo(() => {
    if (!currFile) return '// No file selected';
    return fileContent[currFile] ?? '// Loading file content...';
  }, [currFile, fileContent]);

  return {
    loading,
    peerReviewAssignment,
    repoTree,
    currFile,
    comments,
    currentCode,
    submission,
    canEdit,
    saveState,
    
    setCurrFile,
    openFile,
    addComment,
    updateComment,
    deleteComment,
    flagComment,
    unflagComment,
    submitReview
  };
}
