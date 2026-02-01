import {
  PeerReviewAssignment,
  PeerReviewComment,
} from '@shared/types/PeerReview';

// API Calls for Peer Review Feature

/* ----- Peer Review Assignment API Calls ----- */
export const apiFetchPeerReviewAssignment = async (
  courseId: string,
  peerReviewAssignmentId: string
): Promise<PeerReviewAssignment | null> => {
  const peerReviewAssignmentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/assignment`;
  try {
    const response = await fetch(peerReviewAssignmentApiRoute, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch peer review assignment');
    }
    const assignment: PeerReviewAssignment = await response.json();
    return assignment;
  } catch (err) {
    console.error('Error fetching peer review assignment: ', err);
    return null;
  }
};

/* ----- Peer Review Comments API Calls ----- */

export const apiFetchComments = async (
  courseId: string,
  peerReviewAssignmentId: string
): Promise<PeerReviewComment[] | []> => {
  const getCommentsApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/comments`;
  try {
    const response = await fetch(getCommentsApiRoute, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      console.error('Error fetching comments:', response.statusText);
      return [];
    }
    const comments: PeerReviewComment[] = await response.json();
    return comments;
  } catch (err) {
    console.error('Error fetching comments: ', err);
    return [];
  }
};

export const apiAddComment = async (
  courseId: string,
  peerReviewAssignmentId: string,
  comment: Omit<
    PeerReviewComment,
    '_id' | 'peerReviewAssignmentId' | 'author' | 'createdAt' | 'updatedAt'
  >
): Promise<PeerReviewComment> => {
  const addCommentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/comments`;
  try {
    const response = await fetch(addCommentApiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
    if (!response.ok) {
      throw new Error('Failed to save comment');
    }
    const savedComment: PeerReviewComment = await response.json();
    return savedComment;
  } catch (err) {
    console.error('Error saving comment: ', err);
    throw new Error('Failed to save comment: ' + (err as Error).message);
  }
};

export const apiUpdateComment = async (
  courseId: string,
  peerReviewAssignmentId: string,
  commentId: string,
  updatedComment: string
): Promise<void> => {
  const updateCommentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/comments/${commentId}`;
  try {
    const response = await fetch(updateCommentApiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: updatedComment }),
    });
    if (!response.ok) {
      throw new Error('Failed to update comment');
    }
    return;
  } catch (err) {
    console.error('Error updating comment: ', err);
    throw new Error('Failed to update comment: ' + (err as Error).message);
  }
};

export const apiDeleteComment = async (
  courseId: string,
  peerReviewAssignmentId: string,
  commentId: string
): Promise<void> => {
  const deleteCommentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/comments/${commentId}`;
  try {
    const response = await fetch(deleteCommentApiRoute, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }
    return;
  } catch (err) {
    console.error('Error deleting comment: ', err);
    throw new Error('Failed to delete comment: ' + (err as Error).message);
  }
};

const apiFlagComment = async (
  courseId: string,
  peerReviewAssignmentId: string,
  commentId: string,
  isFlag: boolean,
  reason: string
): Promise<void> => {
  const flagCommentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/comments/${commentId}/flag`;
  try {
    const response = await fetch(flagCommentApiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagStatus: isFlag, flagReason: reason }),
    });
    if (!response.ok) {
      throw new Error('Failed to flag comment');
    }
    return;
  } catch (err) {
    console.error('Error flagging comment: ', err);
    throw new Error('Failed to flag comment: ' + (err as Error).message);
  }
};
