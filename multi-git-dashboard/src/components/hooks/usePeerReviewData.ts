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
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';

type UsePeerReviewDataArgs = {
  courseId: string;
  assignmentId: string;
  userCourseRole?: string;
};

type PeerReviewAssignmentWithViewContext = PeerReviewAssignment & {
  viewContext?: {
    isReviewee?: boolean;
    isSupervisorTA?: boolean;
  };
};

export default function usePeerReviewData({
  courseId,
  assignmentId,
  userCourseRole,
}: UsePeerReviewDataArgs) {
  const [loading, setLoading] = useState(true);
  const [peerReviewAssignment, setPeerReviewAssignment] =
    useState<PeerReviewAssignmentWithViewContext | null>(null);
  const [repoTree, setRepoTree] = useState<RepoNode | null>(null);
  const [currFile, setCurrFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<PeerReviewComment[]>([]);

  const [submission, setSubmission] = useState<PeerReviewSubmission | null>(
    null
  );
  const [saveState, setSaveState] = useState<
    'Idle' | 'Saving' | 'Saved' | 'Error'
  >('Idle');
  const [canEdit, setCanEdit] = useState(false);
  const [isReviewee, setIsReviewee] = useState(false);
  const [isSupervisorTA, setIsSupervisorTA] = useState(false);
  const touchDraftTimer = useRef<NodeJS.Timeout | null>(null);

  const scheduleTouchDraft = useCallback(() => {
    if (!canEdit) return;
    if (
      userCourseRole === COURSE_ROLE.Faculty ||
      (userCourseRole === COURSE_ROLE.TA && isSupervisorTA)
    )
      return;
    if (touchDraftTimer.current) clearTimeout(touchDraftTimer.current);

    touchDraftTimer.current = setTimeout(async () => {
      try {
        setSaveState('Saving');
        const updated = await apiTouchDraft(courseId, assignmentId);
        if (updated) setSubmission(updated);
        setSaveState('Saved');
      } catch {
        setSaveState('Error');
      }
    }, 900);
  }, [canEdit, courseId, assignmentId, userCourseRole, isSupervisorTA]);

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

        const viewContext = prAssignment?.viewContext;
        const revieweeView = Boolean(viewContext?.isReviewee);
        const supervisorView = Boolean(viewContext?.isSupervisorTA);
        setIsReviewee(revieweeView);
        setIsSupervisorTA(supervisorView);

        const submissions: PeerReviewSubmission[] =
          await apiFetchSubmissionsForAssignment(courseId, assignmentId);
        if (cancelled) return;
        const mySubmission =
          userCourseRole === COURSE_ROLE.Student
            ? (submissions?.[0] ?? null)
            : userCourseRole === COURSE_ROLE.TA && !supervisorView
              ? (submissions?.[0] ?? null)
              : null;
        setSubmission(mySubmission);
        const canEditNow = (() => {
          if (userCourseRole === COURSE_ROLE.Faculty) return true;
          if (revieweeView) return false;
          if (userCourseRole === COURSE_ROLE.TA && supervisorView) return true;
          if (userCourseRole === COURSE_ROLE.TA) {
            return Boolean(mySubmission && mySubmission.status !== 'Submitted');
          }
          if (userCourseRole === COURSE_ROLE.Student) {
            return Boolean(mySubmission && mySubmission.status !== 'Submitted');
          }
          return false;
        })();
        setCanEdit(canEditNow);

        const repoUrl = prAssignment?.repoUrl;
        if (!repoUrl) {
          throw new Error('Repository URL not found for this assignment.');
        }

        const tree = await fetchGithubRepoStructure(repoUrl, prAssignment?.commitOrTag);
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
            files[0],
            prAssignment?.commitOrTag
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
          filePath,
          peerReviewAssignment.commitOrTag
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
        | '_id'
        | 'peerReviewId'
        | 'peerReviewAssignmentId'
        | 'peerReviewSubmissionId'
        | 'author'
        | 'createdAt'
        | 'updatedAt'
        | 'authorCourseRole'
      >
    ) => {
      if (!canEdit) throw new Error('Read-only');
      await apiAddComment(
        courseId,
        assignmentId,
        partial,
        submission?._id || ''
      );
      scheduleTouchDraft();
      await refreshComments();
    },
    [canEdit, courseId, assignmentId, refreshComments, submission]
  );

  const updateComment = useCallback(
    async (commentId: string, updated: string) => {
      if (!canEdit) throw new Error('Read-only');
      await apiUpdateComment(
        courseId,
        assignmentId,
        commentId,
        updated,
        submission?._id || ''
      );
      scheduleTouchDraft();
      await refreshComments();
    },
    [
      canEdit,
      scheduleTouchDraft,
      courseId,
      assignmentId,
      refreshComments,
      submission,
    ]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!canEdit) throw new Error('Read-only');
      await apiDeleteComment(
        courseId,
        assignmentId,
        commentId,
        submission?._id || ''
      );
      scheduleTouchDraft();
      setComments(prev => prev.filter(c => c._id !== commentId));
    },
    [canEdit, scheduleTouchDraft, courseId, assignmentId, submission]
  );

  const flagComment = useCallback(
    async (commentId: string, flagReason: string) => {
      // Optimistic update: show the badge immediately
      setComments(prev =>
        prev.map(c =>
          c._id === commentId
            ? { ...c, isFlagged: true, flagReason, unflaggedAt: undefined }
            : c
        )
      );
      await apiFlagComment(courseId, assignmentId, commentId, true, flagReason);
      await refreshComments();
    },
    [courseId, assignmentId, refreshComments, setComments]
  );

  const unflagComment = useCallback(
    async (commentId: string, unflagReason: string) => {
      // Optimistic update: stamp unflaggedAt so the badge disappears immediately
      setComments(prev =>
        prev.map(c =>
          c._id === commentId
            ? { ...c, unflagReason, unflaggedAt: new Date() }
            : c
        )
      );
      await apiFlagComment(
        courseId,
        assignmentId,
        commentId,
        false,
        unflagReason
      );
      await refreshComments();
    },
    [courseId, assignmentId, refreshComments, setComments]
  );

  const submitReview = useCallback(async () => {
    if (!canEdit) throw new Error('Read-only');
    await apiSubmitReview(courseId, assignmentId);
    const updated = await apiFetchSubmissionsForAssignment(
      courseId,
      assignmentId
    );
    const mySubmission =
      userCourseRole === COURSE_ROLE.Student
        ? (updated?.[0] ?? null)
        : userCourseRole === COURSE_ROLE.TA && !isSupervisorTA
          ? (updated?.[0] ?? null)
          : null;
    setSubmission(mySubmission);
    setCanEdit(false);
  }, [canEdit, courseId, assignmentId, userCourseRole, isSupervisorTA]);

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
    isReviewee,
    isSupervisorTA,

    setCurrFile,
    openFile,
    addComment,
    updateComment,
    deleteComment,
    flagComment,
    unflagComment,
    submitReview,
  };
}
