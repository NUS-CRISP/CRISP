import {
  PeerReviewAssignment,
  PeerReviewComment,
  PeerReviewSubmission,
} from '@shared/types/PeerReview';
import { PeerReviewGradingDTO, PeerReviewMyGradingTaskDTO } from '@shared/types/PeerReviewAssessment';

type PeerReviewAssignmentWithViewContext = PeerReviewAssignment & {
  viewContext?: {
    isReviewee?: boolean;
    isSupervisorTA?: boolean;
  };
};

// API Calls for Peer Review Feature

/* ----- Peer Review Assignment API Calls ----- */
export const apiFetchSubmissionsForAssignment = async (
  courseId: string,
  peerReviewAssignmentId: string
): Promise<PeerReviewSubmission[]> => {
  const submissionsApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/submissions`;
  try {
    const response = await fetch(submissionsApiRoute, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      console.error('Error fetching submissions');
      return [];
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching submissions: ', err);
    return [];
  }
};

export const apiTouchDraft = async (
  courseId: string,
  peerReviewAssignmentId: string
): Promise<PeerReviewSubmission | null> => {
  const touchDraftApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/submissions`;
  try {
    const response = await fetch(touchDraftApiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to touch draft');
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error touching draft: ', err);
    return null;
  }
};

export const apiSubmitReview = async (
  courseId: string,
  peerReviewAssignmentId: string
): Promise<PeerReviewSubmission | null> => {
  const submitReviewApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/submissions/submit`;
  try {
    const response = await fetch(submitReviewApiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to submit review');
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error submitting review: ', err);
    return null;
  }
};

/* ----- Peer Review Assignment API Calls ----- */
export const apiFetchPeerReviewAssignment = async (
  courseId: string,
  peerReviewAssignmentId: string
): Promise<PeerReviewAssignmentWithViewContext | null> => {
  const peerReviewAssignmentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/assignment`;
  try {
    const response = await fetch(peerReviewAssignmentApiRoute, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch peer review assignment');
    }
    const data = await response.json();
    return data;
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
      console.error('Error fetching comments');
      return [];
    }
    const data = await response.json();
    return data;
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
    | '_id'
    | 'peerReviewId'
    | 'peerReviewAssignmentId'
    | 'peerReviewSubmissionId'
    | 'author'
    | 'createdAt'
    | 'updatedAt'
    | 'authorCourseRole'
  >,
  submissionId: string
): Promise<PeerReviewComment> => {
  const addCommentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/comments`;
  try {
    const response = await fetch(addCommentApiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, submissionId }),
    });
    if (!response.ok) {
      throw new Error('Failed to save comment');
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error saving comment: ', err);
    throw new Error('Failed to save comment: ' + (err as Error).message);
  }
};

export const apiUpdateComment = async (
  courseId: string,
  peerReviewAssignmentId: string,
  commentId: string,
  updatedComment: string,
  submissionId: string
): Promise<void> => {
  const updateCommentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/comments/${commentId}`;
  try {
    const response = await fetch(updateCommentApiRoute, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: updatedComment, submissionId }),
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
  commentId: string,
  submissionId: string
): Promise<void> => {
  const deleteCommentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/comments/${commentId}`;
  try {
    const response = await fetch(deleteCommentApiRoute, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId }),
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

export const apiFlagComment = async (
  courseId: string,
  peerReviewAssignmentId: string,
  commentId: string,
  isFlag: boolean,
  reason: string
): Promise<void> => {
  const flagCommentApiRoute = `/api/peer-review/${courseId}/${peerReviewAssignmentId}/comments/${commentId}/flag`;
  try {
    const response = await fetch(flagCommentApiRoute, {
      method: 'PUT',
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

/* ----- Peer Review Assessment Grading API Calls ----- */
export const apiFetchGradingDTO = async (
  courseId: string,
  assessmentId: string,
  peerReviewSubmissionId: string
): Promise<PeerReviewGradingDTO | null> => {
  const gradingDtoApiRoute = `/api/peer-review/${courseId}/${assessmentId}/submissions/${peerReviewSubmissionId}`;
  try {
    const response = await fetch(gradingDtoApiRoute, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch grading data');
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching grading data: ', err);
    return null;
  }
};

export const apiStartGradingTask = async (
  courseId: string,
  assessmentId: string,
  peerReviewSubmissionId: string
): Promise<PeerReviewMyGradingTaskDTO | null> => {
  const startGradingApiRoute = `/api/peer-review/${courseId}/${assessmentId}/submissions/${peerReviewSubmissionId}/start-grading`;
  try {
    const response = await fetch(startGradingApiRoute, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to start grading task');
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error starting grading task: ', err);
    return null;
  }
};

export const apiSaveGradingTaskDraft = async (
  courseId: string,
  assessmentId: string,
  gradingTaskId: string,
  score: number,
  feedback: string
): Promise<PeerReviewMyGradingTaskDTO | null> => {
  const saveDraftApiRoute = `/api/peer-review/${courseId}/${assessmentId}/grading-tasks/${gradingTaskId}`;
  try {
    const response = await fetch(saveDraftApiRoute, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, feedback }),
    });
    if (!response.ok) {
      throw new Error('Failed to save grading draft');
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error saving grading draft: ', err);
    return null;
  }
};

export const apiSubmitGradingTask = async (
  courseId: string,
  assessmentId: string,
  gradingTaskId: string
): Promise<PeerReviewMyGradingTaskDTO | null> => {
  const submitGradingApiRoute = `/api/peer-review/${courseId}/${assessmentId}/grading-tasks/${gradingTaskId}/submit`;
  try {
    const response = await fetch(submitGradingApiRoute, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to submit grading task');
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error submitting grading task: ', err);
    return null;
  }
};
