// services/submissionService.ts

import SubmissionModel, { Submission } from '../models/Submission';
import InternalAssessmentModel, { InternalAssessment } from '../models/InternalAssessment';
import {
  AnswerUnion,
  MultipleChoiceAnswer,
  MultipleResponseAnswer,
  ScaleAnswer,
  ShortResponseAnswer,
  LongResponseAnswer,
  DateAnswer,
  NumberAnswer,
  NUSNETEmailAnswer,
  NUSNETIDAnswer,
  TeamMemberSelectionAnswer,
} from '../models/Answer';
import {
  QuestionUnion,
  MultipleChoiceQuestion,
  MultipleResponseQuestion,
  ScaleQuestion,
  ShortResponseQuestion,
  LongResponseQuestion,
  DateQuestion,
  NumberQuestion,
  NumberScoringRange,
  MultipleResponseQuestionModel,
  NumberQuestionModel,
  ScaleQuestionModel,
  MultipleChoiceQuestionModel,
} from '../models/QuestionTypes';
import { NotFoundError, BadRequestError } from './errors';
import AccountModel from '@models/Account';

// Type guards for questions
function isNUSNETIDAnswer(answer: AnswerUnion): answer is NUSNETIDAnswer {
  return answer.type === 'NUSNET ID';
}

function isNUSNETEmailAnswer(answer: AnswerUnion): answer is NUSNETEmailAnswer {
  return answer.type === 'NUSNET Email';
}

function isTeamMemberSelectionAnswer(answer: AnswerUnion): answer is TeamMemberSelectionAnswer {
  return answer.type === 'Team Member Selection';
}

function isMultipleChoiceQuestion(question: QuestionUnion): question is MultipleChoiceQuestion {
  return question.type === 'Multiple Choice';
}

function isMultipleResponseQuestion(question: QuestionUnion): question is MultipleResponseQuestion {
  return question.type === 'Multiple Response';
}

function isScaleQuestion(question: QuestionUnion): question is ScaleQuestion {
  return question.type === 'Scale';
}

function isShortResponseQuestion(question: QuestionUnion): question is ShortResponseQuestion {
  return question.type === 'Short Response';
}

function isLongResponseQuestion(question: QuestionUnion): question is LongResponseQuestion {
  return question.type === 'Long Response';
}

function isDateQuestion(question: QuestionUnion): question is DateQuestion {
  return question.type === 'Date';
}

function isNumberQuestion(question: QuestionUnion): question is NumberQuestion {
  return question.type === 'Number';
}

// Type guards for answers
function isMultipleChoiceAnswer(answer: AnswerUnion): answer is MultipleChoiceAnswer {
  return answer.type === 'Multiple Choice';
}

function isMultipleResponseAnswer(answer: AnswerUnion): answer is MultipleResponseAnswer {
  return answer.type === 'Multiple Response';
}

function isScaleAnswer(answer: AnswerUnion): answer is ScaleAnswer {
  return answer.type === 'Scale';
}

function isShortResponseAnswer(answer: AnswerUnion): answer is ShortResponseAnswer {
  return answer.type === 'Short Response';
}

function isLongResponseAnswer(answer: AnswerUnion): answer is LongResponseAnswer {
  return answer.type === 'Long Response';
}

function isDateAnswer(answer: AnswerUnion): answer is DateAnswer {
  return answer.type === 'Date';
}

function isNumberAnswer(answer: AnswerUnion): answer is NumberAnswer {
  return answer.type === 'Number';
}

async function validateAnswers(
  assessment: InternalAssessment & { questions: QuestionUnion[] },
  answers: AnswerUnion[]
) {
  const questionMap = new Map<string, QuestionUnion>();
  for (const question of assessment.questions) {
    questionMap.set(question._id.toString(), question);
  }

  for (const answer of answers) {
    const questionId = answer.question.toString();
    const question = questionMap.get(questionId);

    if (!question) {
      throw new BadRequestError(`Question ${questionId} not found in this assessment`);
    }

    if (answer.type !== question.type) {
      throw new BadRequestError(
        `Answer type "${answer.type}" does not match question type "${question.type}" for question ${questionId}`
      );
    }

    switch (question.type) {

      case 'NUSNET ID':
        if (isNUSNETIDAnswer(answer)) {
          if (typeof answer.value !== 'string') {
            throw new BadRequestError(`Answer for question ${questionId} must be a string`);
          }
          // Optionally, add validation for NUSNET ID format
        } else {
          throw new BadRequestError(`Invalid NUSNET ID answer for question ${questionId}`);
        }
        break;

      case 'NUSNET Email':
        if (isNUSNETEmailAnswer(answer)) {
          if (typeof answer.value !== 'string') {
            throw new BadRequestError(`Answer for question ${questionId} must be a string`);
          }
          // Optionally, add validation for NUSNET Email format
        } else {
          throw new BadRequestError(`Invalid NUSNET Email answer for question ${questionId}`);
        }
        break;

      case 'Team Member Selection':
        if (isTeamMemberSelectionAnswer(answer)) {
          if (!Array.isArray(answer.selectedUserIds)) {
            throw new BadRequestError(`Answers for question ${questionId} must be an array`);
          }
          // Validate based on assessment granularity
          if (assessment.granularity === 'individual' && answer.selectedUserIds.length > 1) {
            throw new BadRequestError(`Only one team member can be selected for question ${questionId}`);
          }
        } else {
          throw new BadRequestError(`Invalid Team Member Selection answer for question ${questionId}`);
        }
        break;

      case 'Multiple Choice':
        if (isMultipleChoiceQuestion(question) && isMultipleChoiceAnswer(answer)) {
          if (!question.options.find((option) => option.text === answer.value)) {
            throw new BadRequestError(`Invalid option selected for question ${questionId}`);
          }
        } else {
          throw new BadRequestError(`Invalid Multiple Choice answer for question ${questionId}`);
        }
        break;

      case 'Multiple Response':
        if (isMultipleResponseQuestion(question) && isMultipleResponseAnswer(answer)) {
          if (!Array.isArray(answer.values)) {
            throw new BadRequestError(`Answers for question ${questionId} must be an array`);
          }
          for (const val of answer.values) {
            if (!question.options.find((option) => option.text === val)) {
              throw new BadRequestError(`Invalid option selected for question ${questionId}`);
            }
          }
        } else {
          throw new BadRequestError(`Invalid Multiple Response answer for question ${questionId}`);
        }
        break;

      case 'Scale':
        if (isScaleQuestion(question) && isScaleAnswer(answer)) {
          if (answer.value < 1 || answer.value > question.scaleMax) {
            throw new BadRequestError(`Invalid scale value for question ${questionId}`);
          }
        } else {
          throw new BadRequestError(`Invalid Scale answer for question ${questionId}`);
        }
        break;

      case 'Short Response':
        if (isShortResponseQuestion(question) && isShortResponseAnswer(answer)) {
          if (typeof answer.value !== 'string') {
            throw new BadRequestError(`Answer for question ${questionId} must be a string`);
          }
        } else {
          throw new BadRequestError(`Invalid Short Response answer for question ${questionId}`);
        }
        break;

      case 'Long Response':
        if (isLongResponseQuestion(question) && isLongResponseAnswer(answer)) {
          if (typeof answer.value !== 'string') {
            throw new BadRequestError(`Answer for question ${questionId} must be a string`);
          }
        } else {
          throw new BadRequestError(`Invalid Long Response answer for question ${questionId}`);
        }
        break;

      case 'Date':
        if (isDateQuestion(question) && isDateAnswer(answer)) {
          if (question.isRange) {
            if (
              !answer.startDate ||
              !answer.endDate ||
              isNaN(new Date(answer.startDate).getTime()) ||
              isNaN(new Date(answer.endDate).getTime())
            ) {
              throw new BadRequestError(`Invalid date range provided for question ${questionId}`);
            }
          } else {
            if (!answer.value || isNaN(new Date(answer.value).getTime())) {
              throw new BadRequestError(`Invalid date provided for question ${questionId}`);
            }
          }
        } else {
          throw new BadRequestError(`Invalid Date answer for question ${questionId}`);
        }
        break;

      case 'Number':
        if (isNumberQuestion(question) && isNumberAnswer(answer)) {
          if (typeof answer.value !== 'number') {
            throw new BadRequestError(`Answer for question ${questionId} must be a number`);
          }
          if (answer.value < 0 || answer.value > question.maxNumber) {
            throw new BadRequestError(`Invalid number value for question ${questionId}`);
          }
        } else {
          throw new BadRequestError(`Invalid Number answer for question ${questionId}`);
        }
        break;

      default:
        throw new BadRequestError(`Unsupported question type for question ${questionId}`);
    }
  }
}

export const createSubmission = async (
  assessmentId: string,
  userId: string,
  answers: AnswerUnion[],
  isDraft: boolean
): Promise<Submission> => {
  const assessment = await getAssessmentWithQuestions(assessmentId);

  await validateSubmissionPeriod(assessment);
  await validateAnswers(assessment, answers);

  // Calculate the total score
  let totalScore = 0;

  // Calculate score for each answer and assign it to the answer's `score` field
  const scoredAnswers = await Promise.all(
    answers.map(async (answer) => {
      const questionId = assessment.questions.find((q) => q._id.toString() === answer.question.toString());
      if (!questionId) {
        // Handle the case where the question is not found
        console.warn(`Question with ID ${answer.question} not found in assessment ${assessmentId}.`);
        return { ...answer, score: 0 };
      }

      let question = null;

      switch (answer.type) {
        case 'Number':
          question = await NumberQuestionModel.findById(questionId);
          break;
        case 'Scale':
          question = await ScaleQuestionModel.findById(questionId);
          break;
        case 'Multiple Choice':
          question = await MultipleChoiceQuestionModel.findById(questionId);
          break;
        case 'Multiple Response':
          question = await MultipleResponseQuestionModel.findById(questionId);
          break;
        default:
          return { ...answer, score: 0 };
      }

      if (!question) {
        console.warn(`Question with ID ${answer.question} not found in assessment ${assessmentId}.`);
        return { ...answer, score: 0 };
      }
      // Calculate the score for this answer based on the question type
      const answerScore = await calculateAnswerScore(question, answer);
      totalScore += answerScore;

      // Assign the score to the answer
      return { ...answer, score: answerScore };
    })
  );

  // Create the submission with the calculated score
  const submission = new SubmissionModel({
    assessment: assessmentId,
    user: userId,
    answers: scoredAnswers,
    isDraft,
    submittedAt: new Date(),
    score: totalScore,
  });

  await submission.save();
  return submission;
};

// Update an existing submission (by submission ID)
export const updateSubmission = async (
  submissionId: string,
  userId: string,
  accountId: string,
  answers: AnswerUnion[],
  isDraft: boolean
): Promise<Submission> => {
  const submission = await SubmissionModel.findById(submissionId);
  if (!submission) {
    throw new NotFoundError('Submission not found.');
  }

  let bypass = false;
  const account = await AccountModel.findById(accountId);
  if (account && (account.role === 'Faculty member' || account.role === 'admin')) {
    bypass = true;
  }

  // Ensure the submission belongs to the user or a admin/faculty member is editing the submission
  if (!bypass && submission.user.toString() !== userId) {
    throw new BadRequestError('You do not have permission to update this submission.');
  }

  const assessment = await getAssessmentWithQuestions(submission.assessment.toString());

  await validateSubmissionPeriod(assessment);
  await validateAnswers(assessment, answers);

  // Check if submissions are editable
  if (!bypass && !assessment.areSubmissionsEditable && !submission.isDraft) {
    throw new BadRequestError('Submissions are not editable for this assessment');
  }

  let totalScore = 0;

  // Recalculate the score based on new answers
  await Promise.all(
    answers.map(async (answer) => {
      const questionId = assessment.questions.find((q) => q._id.toString() === answer.question.toString());
      if (!questionId) {
        console.warn(`Question with ID ${answer.question} not found in assessment ${assessment.id}.`);
        answer.score = 0; // Set score to 0 if the question is not found
        return;
      }

      let question = null;

      switch (answer.type) {
        case 'Number':
          question = await NumberQuestionModel.findById(questionId);
          break;
        case 'Scale':
          question = await ScaleQuestionModel.findById(questionId);
          break;
        case 'Multiple Choice':
          question = await MultipleChoiceQuestionModel.findById(questionId);
          break;
        case 'Multiple Response':
          question = await MultipleResponseQuestionModel.findById(questionId);
          break;
        default:
          answer.score = 0; // For unsupported question types, set score to 0
          return;
      }

      if (!question) {
        console.warn(`Question with ID ${answer.question} not found in assessment ${assessment.id}.`);
        answer.score = 0; // Set score to 0 if the question is not found
        return;
      }

      // Calculate the score for this answer based on the question type
      const answerScore = await calculateAnswerScore(question, answer);
      totalScore += answerScore;

      // Directly update the answer's score
      answer.score = answerScore;
    })
  );

  // Update submission fields
  submission.answers = answers; // No need to create new objects; just use the modified answers
  submission.isDraft = isDraft;
  submission.submittedAt = new Date();
  submission.score = totalScore;
  submission.adjustedScore = undefined; // Remove any existing adjusted score

  await submission.save();
  return submission;
};

// Get submissions by assessment and user
export const getSubmissionsByAssessmentAndUser = async (
  assessmentId: string,
  userId: string
): Promise<Submission[]> => {
  const submissions = await SubmissionModel.find({ assessment: assessmentId, user: userId })
    .populate('answers')
    .populate('user')
    .populate('assessment');
  return submissions;
};

export const getSubmissionsByAssessment = async (assessmentId: string): Promise<Submission[]> => {
  const submissions = await SubmissionModel.find({ assessment: assessmentId })
    .populate('user')
    .populate('answers');
  return submissions;
};

export const deleteSubmission = async (submissionId: string): Promise<void> => {
  const submission = await SubmissionModel.findById(submissionId);
  if (!submission) {
    throw new NotFoundError('Submission not found');
  }
  await SubmissionModel.findByIdAndDelete(submissionId);
};

async function getAssessmentWithQuestions(assessmentId: string) {
  const assessmentDoc = await InternalAssessmentModel.findById(assessmentId).populate('questions');
  if (!assessmentDoc) {
    throw new NotFoundError('Assessment not found');
  }

  const assessment = assessmentDoc.toObject() as InternalAssessment & {
    questions: QuestionUnion[];
  };
  return assessment;
}

async function validateSubmissionPeriod(assessment: InternalAssessment) {
  const now = new Date();
  if (assessment.startDate > now || (assessment.endDate && assessment.endDate < now)) {
    throw new BadRequestError('Assessment is not open for submissions at this time');
  }
}


/**
 * Adjusts the score of a submission.
 * @param submissionId - The ID of the submission to adjust.
 * @param adjustedScore - The new adjusted score.
 * @returns The updated Submission object.
 */
export const adjustSubmissionScore = async (
  submissionId: string,
  adjustedScore: number
): Promise<Submission> => {
  const submission = await SubmissionModel.findById(submissionId);
  if (!submission) {
    throw new NotFoundError('Submission not found.');
  }

  // Optionally, add validation to ensure adjustedScore is within acceptable limits
  if (adjustedScore < 0) {
    throw new BadRequestError('Adjusted score cannot be negative.');
  }

  submission.adjustedScore = adjustedScore;

  await submission.save();
  return submission;
};

/* --------------------------------------SCORING---------------------------------------------- */

/**
 * Calculates the score for a single answer based on the question configuration.
 * @param question The question associated with the answer.
 * @param answer The user's answer.
 * @returns The score for this answer.
 */
export const calculateAnswerScore = async (question: QuestionUnion, answer: AnswerUnion): Promise<number> => {
  switch (question.type) {
    case 'Multiple Choice':
      return calculateMultipleChoiceScore(question as MultipleChoiceQuestion, answer as MultipleChoiceAnswer);
    case 'Multiple Response':
      return calculateMultipleResponseScore(question as MultipleResponseQuestion, answer as MultipleResponseAnswer);
    case 'Scale':
      return calculateScaleScore(question as ScaleQuestion, answer as ScaleAnswer);
    case 'Number':
      return calculateNumberScore(question as NumberQuestion, answer as NumberAnswer);
    // Add cases for other question types if they have scoring
    default:
      // For question types that don't have scoring, return 0
      return 0;
  }
};

/**
 * Calculates the score for a Multiple Choice answer.
 */
const calculateMultipleChoiceScore = (question: MultipleChoiceQuestion, answer: MultipleChoiceAnswer): number => {
  if (!question.isScored) return 0;

  const selectedOption = question.options.find((option) => option.text === answer.value);
  if (selectedOption) {
    return selectedOption.points;
  }
  return 0;
};

/**
 * Calculates the score for a Multiple Response answer.
 */
const calculateMultipleResponseScore = (question: MultipleResponseQuestion, answer: MultipleResponseAnswer): number => {
  if (!question.isScored) return 0;

  let score = 0;
  for (const value of answer.values) {
    const option = question.options.find((opt) => opt.text === value);
    if (option) {
      score += option.points;
    }
  }
  return score;
};

/**
 * Calculates the score for a Scale answer.
 * Implements linear interpolation for values between defined scale breakpoints.
 */
const calculateScaleScore = (question: ScaleQuestion, answer: ScaleAnswer): number => {
  if (!question.isScored) return 0;

  const { value: answerValue } = answer;
  const { labels } = question;

  // Sort labels by scale value to ensure proper ordering
  const sortedLabels = [...labels].sort((a, b) => a.value - b.value);

  // Edge Cases: If answerValue is below the first breakpoint or above the last.
  // Should not happen since the first and last breakpoints are fixed as min and max values.
  if (answerValue <= sortedLabels[0].value) {
    return sortedLabels[0].points;
  }
  if (answerValue >= sortedLabels[sortedLabels.length - 1].value) {
    return sortedLabels[sortedLabels.length - 1].points;
  }

  // Iterate through sortedLabels to find the two breakpoints for interpolation
  for (let i = 0; i < sortedLabels.length - 1; i++) {
    const current = sortedLabels[i];
    const next = sortedLabels[i + 1];

    if (answerValue === current.value) {
      return current.points;
    }
    if (answerValue === next.value) {
      return next.points;
    }
    if (answerValue > current.value && answerValue < next.value) {
      // Perform linear interpolation
      const slope = (next.points - current.points) / (next.value - current.value);
      const interpolatedPoints = current.points + slope * (answerValue - current.value);
      return interpolatedPoints;
    }
  }

  // If no matching range is found, return 0 as a fallback
  return 0;
};

/**
 * Calculates the score for a Number answer.
 * Supports both direct and range-based scoring with interpolation.
 */
const calculateNumberScore = (question: NumberQuestion, answer: NumberAnswer): number => {
  if (!question.isScored) return 0;

  const { value: answerValue } = answer;
  const { maxNumber, scoringMethod, maxPoints, scoringRanges } = question;

  if (scoringMethod === 'direct') {
    if (maxNumber === 0) {
      // Avoid division by zero
      return 0;
    }
    // Direct scoring: (value / maxNumber) * maxPoints
    const directScore = (answerValue / maxNumber) * (maxPoints || 0);
    return directScore;
  }

  if (scoringMethod === 'range' && scoringRanges && scoringRanges.length > 0) {
    // Ensure scoringRanges are sorted by minValue
    const sortedRanges = [...scoringRanges].sort((a, b) => a.minValue - b.minValue);

    // Find the range that includes the answerValue
    const matchingRange = sortedRanges.find(
      (range) => answerValue >= range.minValue && answerValue <= range.maxValue
    );

    if (matchingRange) {
      return matchingRange.points;
    }

    // If no matching range, perform interpolation
    // Find the closest lower and higher ranges
    let lowerRange: NumberScoringRange | null = null;
    let higherRange: NumberScoringRange | null = null;

    for (const range of sortedRanges) {
      if (range.maxValue < answerValue) {
        lowerRange = range;
      } else if (range.minValue > answerValue) {
        higherRange = range;
        break;
      }
    }

    if (lowerRange && higherRange) {
      const { maxValue: lowerMax, points: lowerPoints } = lowerRange;
      const { minValue: higherMin, points: higherPoints } = higherRange;

      const slope = (higherPoints - lowerPoints) / (higherMin - lowerMax);
      const interpolatedPoints = lowerPoints + slope * (answerValue - lowerMax);
      return interpolatedPoints;
    }

    // If only lowerRange exists (answerValue > all ranges)
    if (lowerRange && !higherRange) {
      // Assign the points of the last range
      return lowerRange.points;
    }

    // If only higherRange exists (answerValue < all ranges)
    if (!lowerRange && higherRange) {
      // Assign the points of the first range
      return higherRange.points;
    }
  }

  // If scoringMethod is 'None' or unrecognized, return 0
  return 0;
};
