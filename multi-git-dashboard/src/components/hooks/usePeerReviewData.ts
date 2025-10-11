import { useCallback, useEffect, useMemo, useState } from 'react';
import { PeerReviewAssignment, PeerReviewComment, RepoNode } from '@shared/types/PeerReview';
import {
  apiFetchPeerReviewAssignment,
  apiFetchComments,
  apiAddComment,
  apiUpdateComment,
  apiDeleteComment,
} from '@/lib/peer-review/api';
import {
  fetchGithubRepoStructure,
  fetchFileContent,
  flattenTree,
} from '@/lib/peer-review/utils';

type UsePeerReviewDataArgs = {
  courseId: string;
  assignmentId: string;
};

export default function usePeerReviewData({ courseId, assignmentId }: UsePeerReviewDataArgs) {
  const [loading, setLoading] = useState(true);
  const [peerReviewAssignment, setpeerReviewAssignment] = useState<PeerReviewAssignment | null>(null);
  const [repoTree, setRepoTree] = useState<RepoNode | null>(null);
  const [currFile, setCurrFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<PeerReviewComment[]>([]);

  // Initial load of data
  useEffect(() => {
    if (!courseId || !assignmentId) { setLoading(false); return; }
    let cancelled = false;
    const initialLoad = async () => {
      try {
        setLoading(true);
        const prAssignment = await apiFetchPeerReviewAssignment(courseId, assignmentId);
        if (cancelled) return;
        const tree = await fetchGithubRepoStructure(prAssignment.repoUrl);
        if (cancelled) return;
        const comments = await apiFetchComments(courseId, assignmentId);
        if (cancelled) return;

        setpeerReviewAssignment(prAssignment);
        setRepoTree(tree);
        setComments(comments);

        const files = flattenTree(tree);
        if (files[0]) {
          setCurrFile(files[0]);
          const content = await fetchFileContent(prAssignment.repoUrl, files[0]);
          if (!cancelled) setFileContent(prev => ({ ...prev, [files[0]]: content }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    initialLoad();
    return () => { cancelled = true; };
  }, [courseId, assignmentId]);

  const openFile = useCallback(async (filePath: string) => {
    if (!peerReviewAssignment) return;
    setCurrFile(filePath);
    if (!fileContent[filePath]) {
      const content = await fetchFileContent(peerReviewAssignment.repoUrl, filePath);
      setFileContent(prev => ({ ...prev, [filePath]: content }));
    }
  }, [peerReviewAssignment, fileContent]);

  // Comments CRUD
  const refreshComments = useCallback(async () => {
    const cs = await apiFetchComments(courseId, assignmentId);
    setComments(cs);
  }, [courseId, assignmentId]);

  const addComment = useCallback(async (partial: Omit<PeerReviewComment, '_id' | 'peerReviewAssignmentId' | 'author' | 'createdAt' | 'updatedAt'>) => {
    await apiAddComment(courseId, assignmentId, partial);
    await refreshComments();
  }, [courseId, assignmentId, refreshComments]);

  const updateComment = useCallback(async (commentId: string, updated: string) => {
    await apiUpdateComment(courseId, assignmentId, commentId, updated);
    await refreshComments();
  }, [courseId, assignmentId, refreshComments]);

  const deleteComment = useCallback(async (commentId: string) => {
    await apiDeleteComment(courseId, assignmentId, commentId);
    setComments(prev => prev.filter(c => c._id !== commentId));
  }, [courseId, assignmentId]);

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
    setCurrFile,
    openFile,
    addComment,
    updateComment,
    deleteComment,
  };
}
