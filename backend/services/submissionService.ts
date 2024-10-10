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
          if (!question.options.includes(answer.value)) {
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
            if (!question.options.includes(val)) {
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

  const submission = new SubmissionModel({
    assessment: assessmentId,
    user: userId,
    answers,
    isDraft,
    submittedAt: new Date(),
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
  if (!bypass && !assessment.areSubmissionsEditable && !isDraft) {
    throw new BadRequestError('Submissions are not editable for this assessment');
  }

  submission.answers = answers;
  submission.isDraft = isDraft;
  submission.submittedAt = new Date();

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
