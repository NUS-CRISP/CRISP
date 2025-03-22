import SubmissionModel, { Submission } from '../models/Submission';
import InternalAssessmentModel, {
  InternalAssessment,
} from '../models/InternalAssessment';
import {
  AnswerUnion,
  MultipleChoiceAnswer,
  MultipleResponseAnswer,
  ScaleAnswer,
  DateAnswer,
  NumberAnswer,
  TeamMemberSelectionAnswer,
  UndecidedAnswerModel,
  NumberAnswerModel,
  ScaleAnswerModel,
  MultipleChoiceAnswerModel,
  MultipleResponseAnswerModel,
  TeamMemberSelectionAnswerModel,
  DateAnswerModel,
  ShortResponseAnswerModel,
  LongResponseAnswerModel,
  AnswerModel,
} from '../models/Answer';
import {
  QuestionUnion,
  MultipleChoiceQuestion,
  MultipleResponseQuestion,
  ScaleQuestion,
  DateQuestion,
  NumberQuestion,
  NumberScoringRange,
  MultipleResponseQuestionModel,
  NumberQuestionModel,
  ScaleQuestionModel,
  MultipleChoiceQuestionModel,
  TeamMemberSelectionQuestionModel,
  DateQuestionModel,
  ShortResponseQuestionModel,
  LongResponseQuestionModel,
  UndecidedQuestionModel,
} from '../models/QuestionTypes';
import { NotFoundError, BadRequestError } from './errors';
import AccountModel from '@models/Account';
import AssessmentResultModel, { MarkEntry } from '@models/AssessmentResult';
import UserModel, { User } from '@models/User';
import { recalculateResult } from './assessmentResultService';
import CrispRole from '@shared/types/auth/CrispRole';
import CourseModel from '@models/Course';
import { ObjectId } from 'mongodb';

/**
 * Checks if an AnswerUnion is a NUSNET ID Answer.
 * @param {AnswerUnion} answer - The answer to check.
 * @returns {boolean} - True if it is a NUSNET ID Answer, false otherwise.
 */
// function isNUSNETIDAnswer(answer: AnswerUnion): answer is NUSNETIDAnswer {
//   return answer.type === 'NUSNET ID Answer';
// }

/**
 * Checks if an AnswerUnion is a NUSNET Email Answer.
 */
// function isNUSNETEmailAnswer(answer: AnswerUnion): answer is NUSNETEmailAnswer {
//   return answer.type === 'NUSNET Email Answer';
// }

/**
 * Checks if an AnswerUnion is a Team Member Selection Answer.
 */
function isTeamMemberSelectionAnswer(
  answer: AnswerUnion
): answer is TeamMemberSelectionAnswer {
  return answer.type === 'Team Member Selection Answer';
}

/**
 * Checks if a QuestionUnion is a Multiple Choice question.
 */
function isMultipleChoiceQuestion(
  question: QuestionUnion
): question is MultipleChoiceQuestion {
  return question.type === 'Multiple Choice';
}

/**
 * Checks if a QuestionUnion is a Multiple Response question.
 */
function isMultipleResponseQuestion(
  question: QuestionUnion
): question is MultipleResponseQuestion {
  return question.type === 'Multiple Response';
}

/**
 * Checks if a QuestionUnion is a Scale question.
 */
function isScaleQuestion(question: QuestionUnion): question is ScaleQuestion {
  return question.type === 'Scale';
}

/**
 * Checks if a QuestionUnion is a Short Response question.
 */
// function isShortResponseQuestion(
//   question: QuestionUnion
// ): question is ShortResponseQuestion {
//   return question.type === 'Short Response';
// }

/**
 * Checks if a QuestionUnion is a Long Response question.
 */
// function isLongResponseQuestion(
//   question: QuestionUnion
// ): question is LongResponseQuestion {
//   return question.type === 'Long Response';
// }

/**
 * Checks if a QuestionUnion is a Date question.
 */
function isDateQuestion(question: QuestionUnion): question is DateQuestion {
  return question.type === 'Date';
}

/**
 * Checks if a QuestionUnion is a Number question.
 */
function isNumberQuestion(question: QuestionUnion): question is NumberQuestion {
  return question.type === 'Number';
}

/**
 * Checks if an AnswerUnion is a Multiple Choice Answer.
 */
function isMultipleChoiceAnswer(
  answer: AnswerUnion
): answer is MultipleChoiceAnswer {
  return answer.type === 'Multiple Choice Answer';
}

/**
 * Checks if an AnswerUnion is a Multiple Response Answer.
 */
function isMultipleResponseAnswer(
  answer: AnswerUnion
): answer is MultipleResponseAnswer {
  return answer.type === 'Multiple Response Answer';
}

/**
 * Checks if an AnswerUnion is a Scale Answer.
 */
function isScaleAnswer(answer: AnswerUnion): answer is ScaleAnswer {
  return answer.type === 'Scale Answer';
}

/**
 * Checks if an AnswerUnion is a Short Response Answer.
 */
// function isShortResponseAnswer(
//   answer: AnswerUnion
// ): answer is ShortResponseAnswer {
//   return answer.type === 'Short Response Answer';
// }

/**
 * Checks if an AnswerUnion is a Long Response Answer.
 */
// function isLongResponseAnswer(
//   answer: AnswerUnion
// ): answer is LongResponseAnswer {
//   return answer.type === 'Long Response Answer';
// }

/**
 * Checks if an AnswerUnion is a Date Answer.
 */
function isDateAnswer(answer: AnswerUnion): answer is DateAnswer {
  return answer.type === 'Date Answer';
}

/**
 * Checks if an AnswerUnion is a Number Answer.
 */
function isNumberAnswer(answer: AnswerUnion): answer is NumberAnswer {
  return answer.type === 'Number Answer';
}

/**
 * Validates that a given set of answers matches the assessment's question types and constraints.
 * @param {InternalAssessment & { questions: QuestionUnion[] }} assessment - The full assessment, including its questions.
 * @param {AnswerUnion[]} answers - The array of answers to validate.
 *
 * @throws {BadRequestError} If any answer fails validation against the corresponding question type.
 */
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
      throw new BadRequestError(
        `Question ${questionId} not found in this assessment`
      );
    }

    if (answer.type !== question.type + ' Answer') {
      throw new BadRequestError(
        `Answer type "${answer.type}" does not match question type "${question.type}" for question ${questionId}`
      );
    }

    switch (question.type) {
      case 'NUSNET ID':
        // if (!isNUSNETIDAnswer(answer)) {
        //   throw new BadRequestError( // Here
        //     `Invalid NUSNET ID answer for question ${questionId}`
        //   );
        // }
        break;

      case 'NUSNET Email':
        // if (isNUSNETEmailAnswer(answer)) {
        //   throw new BadRequestError( // Here
        //     `Invalid NUSNET Email answer for question ${questionId}`
        //   );
        // }
        break;

      case 'Team Member Selection':
        if (isTeamMemberSelectionAnswer(answer)) {
          if (
            assessment.granularity === 'individual' &&
            answer.selectedUserIds.length > 1
          ) {
            throw new BadRequestError(
              `Only one team member can be selected for question ${questionId}`
            );
          }
        } // Else block not needed, guard statement is mostly just for type verification.
        // Q and A match already determined by guard before switch block.
        break;

      case 'Multiple Choice':
        if (
          isMultipleChoiceQuestion(question) &&
          isMultipleChoiceAnswer(answer)
        ) {
          if (!question.options.find(option => option.text === answer.value)) {
            throw new BadRequestError(
              `Invalid option selected for question ${questionId}`
            );
          }
        } // Else block not needed, guard statement is mostly just for type verification.
        // Q and A match already determined by guard before switch block.
        break;

      case 'Multiple Response':
        if (
          isMultipleResponseQuestion(question) &&
          isMultipleResponseAnswer(answer)
        ) {
          if (!Array.isArray(answer.values)) {
            throw new BadRequestError(
              `Answers for question ${questionId} must be an array`
            );
          }
          for (const val of answer.values) {
            if (!question.options.find(option => option.text === val)) {
              throw new BadRequestError(
                `Invalid option selected for question ${questionId}`
              );
            }
          }
        } // Else block not needed, guard statement is mostly just for type verification.
        // Q and A match already determined by guard before switch block.
        break;

      case 'Scale':
        if (isScaleQuestion(question) && isScaleAnswer(answer)) {
          if (answer.value < 1 || answer.value > question.scaleMax) {
            throw new BadRequestError(
              `Invalid scale value for question ${questionId}`
            );
          }
        } // Else block not needed, guard statement is mostly just for type verification.
        // Q and A match already determined by guard before switch block.
        break;

      case 'Short Response':
        // if (
        //   !(isShortResponseQuestion(question) &&
        //   isShortResponseAnswer(answer))
        // ) {
        //   throw new BadRequestError( // Here
        //     `Invalid Short Response answer for question ${questionId}`
        //   );
        // }
        break;

      case 'Long Response':
        // if (!(isLongResponseQuestion(question) && isLongResponseAnswer(answer))) {
        //   throw new BadRequestError( // Here
        //     `Invalid Long Response answer for question ${questionId}`
        //   );
        // }
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
              throw new BadRequestError(
                `Invalid date range provided for question ${questionId}`
              );
            }
          } else {
            if (!answer.value || isNaN(new Date(answer.value).getTime())) {
              throw new BadRequestError(
                `Invalid date provided for question ${questionId}`
              );
            }
          }
        } // Else block not needed, guard statement is mostly just for type verification.
        // Q and A match already determined by guard before switch block.
        break;

      case 'Number':
        if (isNumberQuestion(question) && isNumberAnswer(answer)) {
          if (typeof answer.value !== 'number') {
            throw new BadRequestError(
              `Answer for question ${questionId} must be a number`
            );
          }
          if (answer.value < 0 || answer.value > question.maxNumber) {
            throw new BadRequestError(
              `Invalid number value for question ${questionId}`
            );
          }
        } // Else block not needed, guard statement is mostly just for type verification.
        // Q and A match already determined by guard before switch block.
        break;
      case 'Undecided':
      default:
        break;
    }
  }
}

/**
 * Checks if the selected user IDs in a submission have not been used before
 * by the same user in the same assessment (to avoid multiple submissions between a grader and their
 * assigned teams/students).
 *
 * @param {InternalAssessment} assessment - The target assessment.
 * @param {User} user - The user creating the submission.
 * @param {string[]} targetStudentIds - The selected user IDs for the submission.
 *
 * @returns {Promise<boolean>} - True if no duplicate found, false otherwise.
 */
export const checkSubmissionUniqueness = async (
  assessment: InternalAssessment,
  user: User,
  targetStudentIds: string[]
): Promise<boolean> => {
  const userSubmissions = await SubmissionModel.find({
    assessment: assessment,
    user: user,
    deleted: { $ne: true },
  })
    .populate('answers.type')
    .populate({
      path: 'answers.selectedUserIds',
      strictPopulate: false,
    });
  const submittedUserIds = userSubmissions.flatMap(
    sub =>
      (
        sub.answers.find(
          ans => ans.type === 'Team Member Selection Answer'
        ) as TeamMemberSelectionAnswer
      ).selectedUserIds
  );
  return !submittedUserIds.find(userId =>
    targetStudentIds.find(targetId => targetId === userId)
  );
};

/**
 * Creates a new submission for a given assessment, user, and set of answers.
 *
 * @param {string} assessmentId - The ID of the assessment.
 * @param {string} userId - The ID of the user creating the submission.
 * @param {AnswerUnion[]} answers - The user's answers.
 * @param {boolean} isDraft - Whether the submission is a draft or final.
 *
 * @returns {Promise<Submission>} - The newly created Submission document.
 *
 * @throws {NotFoundError} If the user or assessment is not found.
 * @throws {BadRequestError} If validation fails or there's a data mismatch.
 * @throws {Error} For other unknown runtime or server errors (500).
 */
export const createSubmission = async (
  assessmentId: string,
  userId: string,
  answers: AnswerUnion[],
  isDraft: boolean
): Promise<Submission> => {
  const assessment = await getAssessmentWithQuestions(assessmentId);

  let user: User | null = null;
  try {
    user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('Submission creator not found');
    }
  } catch (e) {
    throw new NotFoundError('Submission creator not found');
  }

  await validateSubmissionPeriod(assessment);
  await validateAnswers(assessment, answers);
  const selectedStudentIds = (
    answers.find(
      answer => answer.type === 'Team Member Selection Answer'
    ) as TeamMemberSelectionAnswer
  ).selectedUserIds;
  await checkSubmissionUniqueness(assessment, user, selectedStudentIds);

  let totalScore = 0;

  const scoredAnswers = await Promise.all(
    answers.map(async answer => {
      const questionId = assessment.questions.find(
        q => q._id.toString() === answer.question.toString()
      ); // Guaranteed by validateAnswers()

      let question = null;
      let SaveAnswerModel = null;

      switch (answer.type) {
        case 'Number Answer':
          question = await NumberQuestionModel.findById(questionId);
          SaveAnswerModel = NumberAnswerModel;
          break;
        case 'Scale Answer':
          question = await ScaleQuestionModel.findById(questionId);
          SaveAnswerModel = ScaleAnswerModel;
          break;
        case 'Multiple Choice Answer':
          question = await MultipleChoiceQuestionModel.findById(questionId);
          SaveAnswerModel = MultipleChoiceAnswerModel;
          break;
        case 'Multiple Response Answer':
          question = await MultipleResponseQuestionModel.findById(questionId);
          SaveAnswerModel = MultipleResponseAnswerModel;
          break;
        case 'Team Member Selection Answer':
          question =
            await TeamMemberSelectionQuestionModel.findById(questionId);
          SaveAnswerModel = TeamMemberSelectionAnswerModel;
          break;
        case 'Date Answer':
          question = await DateQuestionModel.findById(questionId);
          SaveAnswerModel = DateAnswerModel;
          break;
        case 'Short Response Answer':
          question = await ShortResponseQuestionModel.findById(questionId);
          SaveAnswerModel = ShortResponseAnswerModel;
          break;
        case 'Long Response Answer':
          question = await LongResponseQuestionModel.findById(questionId);
          SaveAnswerModel = LongResponseAnswerModel;
          break;
        case 'Undecided Answer':
        default:
          question = await UndecidedQuestionModel.findById(questionId);
          SaveAnswerModel = UndecidedAnswerModel;
          break;
      }

      if (!question) {
        console.warn(`Question with ID ${answer.question} not found.`);
        return { ...answer, score: 0 };
      }

      const answerScore = await calculateAnswerScore(
        question,
        answer,
        assessment
      );
      totalScore += answerScore;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, ...scoredAnswer } = { ...answer, score: answerScore };

      const newAnswer = new SaveAnswerModel(scoredAnswer);
      await newAnswer.save();
      return newAnswer;
    })
  );

  const assignment = answers.find(
    answer => answer.type === 'Team Member Selection Answer'
  ) as TeamMemberSelectionAnswer;

  const submission = new SubmissionModel({
    assessment: assessmentId,
    user: userId,
    answers: scoredAnswers,
    isDraft,
    submittedAt: new Date(),
    score: totalScore,
    submissionReleaseNumber: assessment.releaseNumber,
  });

  await submission.save();
  for (const userId of assignment.selectedUserIds) {
    let assessmentResult = await AssessmentResultModel.findOne({
      assessment: assessmentId,
      student: userId,
    });

    if (!assessmentResult) {
      assessmentResult = new AssessmentResultModel({
        assessment: assessmentId,
        student: userId,
        marks: [],
        averageScore: 0,
      });

      await assessmentResult.save();
    }
    const newMarkEntry: MarkEntry = {
      marker: user,
      submission: submission._id,
      score: totalScore,
    };
    assessmentResult.marks.push(newMarkEntry);
    await assessmentResult.save();

    await recalculateResult(assessmentResult.id);
  }

  return submission;
};

/**
 * Updates an existing submission by its ID.
 *
 * @param {string} submissionId - The ID of the submission to update.
 * @param {string} userId - The ID of the user making the update.
 * @param {string} accountId - The account ID used for permissions check.
 * @param {AnswerUnion[]} answers - The updated array of answers.
 * @param {boolean} isDraft - Whether the updated submission is a draft or final.
 *
 * @returns {Promise<Submission>} - The updated Submission document.
 *
 * @throws {NotFoundError} If the submission, user, or related data is not found.
 * @throws {BadRequestError} If there's a validation error or user lacks permission.
 * @throws {Error} For other unknown runtime or server errors (500).
 */
export const updateSubmission = async (
  submissionId: string,
  userId: string,
  accountId: string,
  answers: AnswerUnion[],
  isDraft: boolean
): Promise<Submission> => {
  let submission: Submission | null = null;
  submission = await SubmissionModel.findById(submissionId);
  if (!submission) {
    throw new NotFoundError('Submission not found.');
  }
  if (submission.deleted) {
    throw new NotFoundError('Submission not found (Deleted).');
  }

  let user: User | null = null;
  try {
    user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('Submission updater not found');
    }
  } catch (e) {
    throw new NotFoundError('Submission updater not found');
  }

  const assessment = await getAssessmentWithQuestions(
    submission.assessment.toString()
  );

  let bypass = false;
  const account = await AccountModel.findById(accountId);
  const course = await CourseModel.findById(assessment.course);
  if (!course) throw new BadRequestError('Assessment course id invalid');
  const isCourseFaculty = course.faculty.includes(new ObjectId(userId));
  // Alternative method would be to check if account's .courseRole
  // contains this course and has faculty role in the same tuple.
  if (account && (isCourseFaculty || account.crispRole === CrispRole.Admin)) {
    bypass = true;
  }

  if (!bypass && submission.user.toString() !== userId) {
    throw new BadRequestError(
      'You do not have permission to update this submission.'
    );
  }

  await validateSubmissionPeriod(assessment);
  await validateAnswers(assessment, answers);

  if (
    !bypass &&
    !assessment.areSubmissionsEditable &&
    !submission.isDraft &&
    assessment.releaseNumber === submission.submissionReleaseNumber
  ) {
    throw new BadRequestError(
      'Submissions are not editable for this assessment'
    );
  }

  let totalScore = 0;

  await Promise.all(
    answers.map(async answer => {
      const questionId = assessment.questions.find(
        q => q._id.toString() === answer.question.toString()
      ); // Question Id exists, verified by validateAnswers()

      let question = null;
      let savedAnswer = null;

      switch (answer.type) {
        case 'Number Answer':
          question = await NumberQuestionModel.findById(questionId);
          savedAnswer = NumberAnswerModel.findById(answer.id);
          break;
        case 'Scale Answer':
          question = await ScaleQuestionModel.findById(questionId);
          savedAnswer = ScaleAnswerModel.findById(answer.id);
          break;
        case 'Multiple Choice Answer':
          question = await MultipleChoiceQuestionModel.findById(questionId);
          savedAnswer = MultipleChoiceAnswerModel.findById(answer.id);
          break;
        case 'Multiple Response Answer':
          question = await MultipleResponseQuestionModel.findById(questionId);
          savedAnswer = MultipleResponseAnswerModel.findById(answer.id);
          break;
        case 'Team Member Selection Answer':
          question =
            await TeamMemberSelectionQuestionModel.findById(questionId);
          savedAnswer = TeamMemberSelectionAnswerModel.findById(answer.id);
          break;
        case 'Date Answer':
          question = await DateQuestionModel.findById(questionId);
          savedAnswer = DateAnswerModel.findById(answer.id);
          break;
        case 'Short Response Answer':
          question = await ShortResponseQuestionModel.findById(questionId);
          savedAnswer = ShortResponseAnswerModel.findById(answer.id);
          break;
        case 'Long Response Answer':
          question = await LongResponseQuestionModel.findById(questionId);
          savedAnswer = LongResponseAnswerModel.findById(answer.id);
          break;
        case 'Undecided Answer':
        default:
          question = await UndecidedQuestionModel.findById(questionId);
          savedAnswer = UndecidedAnswerModel.findById(answer.id);
          break;
      }

      if (!question) {
        console.warn(
          `Question with ID ${answer.question} not found in assessment ${assessment.id}.`
        );
        answer.score = 0;
        return;
      }

      const answerScore = await calculateAnswerScore(
        question,
        answer,
        assessment
      );
      totalScore += answerScore;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, ...scoredAnswer } = { ...answer, score: answerScore };

      answer.score = answerScore;
      savedAnswer.model.findByIdAndUpdate(answer._id, answer);
    })
  );

  submission.answers = answers;
  submission.isDraft = isDraft;
  submission.submittedAt = new Date();
  if (submission.score !== totalScore) {
    submission.score = totalScore;
    submission.adjustedScore = undefined;
  }
  submission.submissionReleaseNumber = assessment.releaseNumber;

  await submission.save();

  const assignment = answers.find(
    answer => answer.type === 'Team Member Selection Answer'
  ) as TeamMemberSelectionAnswer;

  for (const selectedUserId of assignment.selectedUserIds) {
    console.log(selectedUserId, assessment._id);
    const assessmentResult = await AssessmentResultModel.findOne({
      assessment: assessment._id,
      student: selectedUserId,
    });

    if (!assessmentResult) {
      throw new NotFoundError(
        'No previous assessment result found. Something went wrong with the flow.'
      );
    }

    // Find existing mark entry for this submission
    const markEntryIndex = assessmentResult.marks.findIndex(
      mark => mark.submission.toString() === submission._id.toString()
    );

    if (markEntryIndex !== -1) {
      assessmentResult.marks[markEntryIndex].marker = user;
      assessmentResult.marks[markEntryIndex].score = totalScore;
    } else {
      throw new NotFoundError(
        'Mark entry for this submission not found in assessment result.'
      );
    }

    await assessmentResult.save();

    await recalculateResult(assessmentResult.id);
  }

  return submission;
};

/**
 * Retrieves all submissions by a single user for a specific assessment.
 *
 * @param {string} assessmentId - The ID of the assessment.
 * @param {string} userId - The ID of the user whose submissions are requested.
 *
 * @returns {Promise<Submission[]>} - An array of the user's Submission documents.
 *
 * @throws {Error} For any unknown runtime or server errors (500).
 */
export const getSubmissionsByAssessmentAndUser = async (
  assessmentId: string,
  userId: string
): Promise<Submission[]> => {
  const submissions = await SubmissionModel.find({
    assessment: assessmentId,
    user: userId,
    deleted: { $ne: true },
  })
    .populate('answers')
    .populate('user')
    .populate('assessment');
  return submissions;
};

/**
 * Retrieves all submissions for a given assessment.
 *
 * @param {string} assessmentId - The ID of the assessment.
 * @returns {Promise<Submission[]>} - Array of Submission documents.
 *
 * @throws {Error} For any unknown runtime or server errors (500).
 */
export const getSubmissionsByAssessment = async (
  assessmentId: string
): Promise<Submission[]> => {
  const submissions = await SubmissionModel.find({
    assessment: assessmentId,
    deleted: { $ne: true },
  })
    .populate('user')
    .populate('answers');
  return submissions;
};

/**
 * Deletes a submission by ID.
 *
 * @param {string} submissionId - The ID of the submission to delete.
 * @returns {Promise<void>} - Resolves upon successful deletion.
 *
 * @throws {NotFoundError} If the submission is not found.
 * @throws {Error} For other unknown runtime or server errors (500).
 */
export const deleteSubmission = async (
  userId: string,
  submissionId: string
): Promise<void> => {
  const submission = await SubmissionModel.findById(submissionId);
  if (!submission) {
    throw new NotFoundError('Submission not found');
  }

  if (submission.deleted) {
    throw new NotFoundError('Submission not found (Deleted)');
  }

  submission.deleted = true;
  submission.deletedAt = new Date();

  await submission.save();
  console.log(
    `Submission ${submissionId} was soft-deleted by User ${userId} at ${submission.deletedAt}`
  );
};

/**
 * Soft deletes all submissions associated with a specific assessment ID.
 *
 * @param {string} userId - The ID of the user performing the deletion (for audit logging).
 * @param {string} assessmentId - The ID of the assessment whose submissions are to be deleted.
 * @returns {Promise<number>} - The number of submissions soft deleted.
 *
 * @throws {NotFoundError} If the assessment does not exist.
 * @throws {Error} For any unknown runtime or server errors (500).
 */
export const softDeleteSubmissionsByAssessmentId = async (
  userId: string,
  assessmentId: string
): Promise<number> => {
  // Validate that the assessment exists
  const assessment = await InternalAssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Perform soft deletion using updateMany for efficiency
  const result = await SubmissionModel.updateMany(
    {
      assessment: assessmentId,
      deleted: { $ne: true }, // Ensure only active submissions are targeted
    },
    {
      $set: {
        deleted: true,
        deletedAt: new Date(),
      },
    }
  );

  // Log the bulk deletion action
  console.log(
    `User ${userId} soft-deleted ${result.modifiedCount} submission(s) for Assessment ${assessmentId} at ${new Date()}`
  );

  return result.modifiedCount;
};

/**
 * Fetches an assessment (with its questions) by ID. Assumes the assesmsentId is valid.
 * Responsibility of checking assessmentId validity is for parent functions, this is
 * just a helper function.
 * @param {string} assessmentId - The ID of the assessment to fetch.
 * @returns {Promise<InternalAssessment & { questions: QuestionUnion[] }>} The assessment with questions.
 */
async function getAssessmentWithQuestions(
  assessmentId: string
): Promise<InternalAssessment & { questions: QuestionUnion[] }> {
  const assessmentDoc =
    await InternalAssessmentModel.findById(assessmentId).populate('questions');

  const assessment = assessmentDoc!.toObject() as InternalAssessment & {
    questions: QuestionUnion[];
  };
  return assessment;
}

/**
 * Validates that the current time is within the assessment's submission period.
 * @param {InternalAssessment} assessment - The assessment to check.
 * @throws {BadRequestError} If submissions are not open at this time.
 */
async function validateSubmissionPeriod(
  assessment: InternalAssessment
): Promise<void> {
  const now = new Date();
  if (
    assessment.startDate > now ||
    (assessment.endDate && assessment.endDate < now)
  ) {
    throw new BadRequestError(
      'Assessment is not open for submissions at this time'
    );
  }
}

/**
 * Adjusts the score of a submission by ID by updating the adjustedScore field.
 * Does not actually change the score field, which is meant to always be the
 * total score of the submission.
 *
 * @param {string} submissionId - The ID of the submission to adjust.
 * @param {number} adjustedScore - The new adjusted score.
 * @returns {Promise<Submission>} - The updated Submission object.
 *
 * @throws {NotFoundError} If the submission does not exist.
 * @throws {BadRequestError} If the adjusted score is invalid.
 * @throws {Error} For any unknown runtime or server errors (500).
 */
export const adjustSubmissionScore = async (
  submissionId: string,
  adjustedScore: number
): Promise<Submission> => {
  const submission = await SubmissionModel.findById(submissionId);
  if (!submission) {
    throw new NotFoundError('Submission not found.');
  }

  if (submission.deleted) {
    throw new NotFoundError('Submission not found (Deleted).');
  }

  if (adjustedScore < 0) {
    throw new BadRequestError('Adjusted score cannot be negative.');
  }

  submission.adjustedScore = adjustedScore;

  await submission.save();
  return submission;
};

/* --------------------------------------SCORING---------------------------------------------- */

/**
 * Calculates the score for a single answer based on the question configuration and assessment settings.
 *
 * @param {QuestionUnion} question - The question associated with the user's answer. Can be mongoose
 * document or Javascript object. It will be normalized within this function.
 * @param {AnswerUnion} answer - The user's answer. Can be mongoose
 * document or Javascript object. It will be normalized within this function.
 * @param {InternalAssessment} assessment - The full assessment object (used for scaling factor).
 * @returns {Promise<number>} - The calculated score for this answer.
 *
 * @throws {Error} For any unforeseen runtime or scoring errors.
 */
export const calculateAnswerScore = async (
  inputQuestion: QuestionUnion,
  inputAnswer: AnswerUnion,
  assessment: InternalAssessment
): Promise<number> => {
  const question =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (inputQuestion as any).toObject === 'function'
      ? inputQuestion.toObject()
      : inputQuestion;
  const answer =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (inputAnswer as any).toObject === 'function'
      ? inputAnswer.toObject()
      : inputAnswer;
  const scalingFactor =
    assessment.maxMarks === 0 || !assessment.scaleToMaxMarks
      ? 1
      : !assessment.questionsTotalMarks || assessment.questionsTotalMarks === 0
        ? 1
        : assessment.maxMarks / assessment.questionsTotalMarks;
  switch (question.type) {
    case 'Multiple Choice':
      return (
        calculateMultipleChoiceScore(
          question as MultipleChoiceQuestion,
          answer as MultipleChoiceAnswer
        ) * scalingFactor
      );
    case 'Multiple Response':
      return (
        calculateMultipleResponseScore(
          question as MultipleResponseQuestion,
          answer as MultipleResponseAnswer
        ) * scalingFactor
      );
    case 'Scale':
      return (
        calculateScaleScore(question as ScaleQuestion, answer as ScaleAnswer) *
        scalingFactor
      );
    case 'Number':
      return (
        calculateNumberScore(
          question as NumberQuestion,
          answer as NumberAnswer
        ) * scalingFactor
      );
    default:
      // For question types that don't have scoring, return 0
      return 0;
  }
};

/**
 * Calculates the score for a Multiple Choice answer.
 *
 * @param {MultipleChoiceQuestion} question - The Multiple Choice question.
 * @param {MultipleChoiceAnswer} answer - The user's answer to that question.
 * @returns {number} - The calculated score for the answer.
 */
const calculateMultipleChoiceScore = (
  question: MultipleChoiceQuestion,
  answer: MultipleChoiceAnswer
): number => {
  if (!question.isScored) return 0;

  const selectedOption = question.options.find(
    option => option.text === answer.value
  );
  return selectedOption ? selectedOption.points : 0; // Should be guaranteed to exist by guards from parent functions.
};

/**
 * Calculates the score for a Multiple Response answer considering partial/penalized/negative scoring.
 *
 * @param {MultipleResponseQuestion} question - The Multiple Response question.
 * @param {MultipleResponseAnswer} answer - The Multiple Response answer.
 * @returns {number} - The calculated score (could be negative if allowNegative is true).
 */
const calculateMultipleResponseScore = (
  question: MultipleResponseQuestion,
  answer: MultipleResponseAnswer
): number => {
  if (!question.isScored) return 0;

  const chosenOptions = answer.values
    .map(value => question.options.find(opt => opt.text === value))
    .filter((opt): opt is (typeof question.options)[number] => Boolean(opt));

  const correctOptions = question.options.filter(o => o.points > 0);
  const allCorrectChosen = correctOptions.every(co =>
    answer.values.includes(co.text)
  );
  const chosenHasIncorrect = chosenOptions.some(o => o.points <= 0);

  // No partial marks => must have perfect selection (all correct, no incorrect).
  if (!question.allowPartialMarks) {
    if (!allCorrectChosen || chosenHasIncorrect) {
      return 0;
    } else {
      // Perfect answer
      const perfectScore = chosenOptions.reduce((acc, o) => acc + o.points, 0);
      return Math.max(perfectScore, 0);
    }
  }

  // Partial marks allowed => sum all chosen options' points
  let score = chosenOptions.reduce((acc, o) => acc + o.points, 0);

  if (!question.areWrongAnswersPenalized) {
    // No penalty => clamp at 0 if negative
    score = Math.max(score, 0);
  } else {
    // Wrong answers penalized => if negative scoring is not allowed, clamp to 0
    if (!question.allowNegative) {
      score = Math.max(score, 0);
    }
  }

  return score;
};

/**
 * Calculates the score for a Scale answer via interpolation between labeled breakpoints.
 *
 * @param {ScaleQuestion} question - The Scale question object.
 * @param {ScaleAnswer} answer - The user's Scale answer.
 * @returns {number} - The calculated score based on the user's scale selection.
 */
const calculateScaleScore = (
  question: ScaleQuestion,
  answer: ScaleAnswer
): number => {
  if (!question.isScored) return 0;

  const { value: answerValue } = answer;
  const { labels } = question;

  // Sort labels by their 'value' to ensure correct interpolation
  const sortedLabels = [...labels].sort((a, b) => a.value - b.value);

  // Check edge cases
  if (answerValue <= sortedLabels[0].value) {
    return sortedLabels[0].points;
  }
  if (answerValue >= sortedLabels[sortedLabels.length - 1].value) {
    return sortedLabels[sortedLabels.length - 1].points;
  }

  let interpolatedPoints = 0;

  for (let i = 0; i < sortedLabels.length - 1; i++) {
    const current = sortedLabels[i];
    const next = sortedLabels[i + 1];

    // No need to check current, already checked by first edge case.
    if (answerValue === next.value) return next.points;
    // Linear interpolation
    if (answerValue > current.value && answerValue < next.value) {
      const slope =
        (next.points - current.points) / (next.value - current.value);
      interpolatedPoints =
        current.points + slope * (answerValue - current.value);
      break;
    }
  }

  return interpolatedPoints;
};

/**
 * Calculates the score for a Number answer.
 * Direct method => proportional to maxNumber and maxPoints.
 * Range method => assigns points based on predefined scoringRanges.
 *
 * @param {NumberQuestion} question - The Number question object.
 * @param {NumberAnswer} answer - The user's numeric answer.
 * @returns {number} - The calculated score.
 */
const calculateNumberScore = (
  question: NumberQuestion,
  answer: NumberAnswer
): number => {
  if (!question.isScored) return 0;

  const { value: answerValue } = answer;
  const { maxNumber, scoringMethod, maxPoints, scoringRanges } = question;

  if (scoringMethod === 'direct') {
    if (maxNumber === 0) {
      return 0;
    }
    return (answerValue / maxNumber) * maxPoints!;
  } else {
    // if (scoringMethod === 'range' && scoringRanges && scoringRanges.length > 0) {
    const sortedRanges = [...scoringRanges!].sort(
      (a, b) => a.minValue - b.minValue
    );

    const matchingRange = sortedRanges.find(
      range => answerValue >= range.minValue && answerValue <= range.maxValue
    );
    if (matchingRange) {
      return matchingRange.points;
    }

    let lowerRange: NumberScoringRange | null = null;
    let higherRange: NumberScoringRange | null = null;

    for (const range of sortedRanges) {
      if (
        range.maxValue < answerValue &&
        (!lowerRange || range.minValue > lowerRange.maxValue)
      ) {
        lowerRange = range;
      } else if (
        range.minValue > answerValue &&
        (!higherRange || range.maxValue < higherRange.minValue)
      ) {
        higherRange = range;
      }
    }
    if (lowerRange && !higherRange) {
      // Above highest given range, full marks
      return lowerRange.points;
    }
    if (!lowerRange && higherRange) {
      // Lower than lowest given range, interpolate with 0.
      const lowerMax = 0;
      const lowerPoints = 0;
      const { minValue: higherMin, points: higherPoints } = higherRange;
      const slope = (higherPoints - lowerPoints) / (higherMin - lowerMax);
      return lowerPoints + slope * (answerValue - lowerMax);
    }
    // if (lowerRange && higherRange) {
    const { maxValue: lowerMax, points: lowerPoints } = lowerRange!;
    const { minValue: higherMin, points: higherPoints } = higherRange!;
    const slope = (higherPoints - lowerPoints) / (higherMin - lowerMax);
    return lowerPoints + slope * (answerValue - lowerMax);
    // !lowerRange && !higherRange is impossible
  }
};

/**
 * Regrades an existing submission by recalculating the score of each answer
 * and updating any associated AssessmentResults accordingly.
 *
 * @param {string} submissionId - The ID of the submission to regrade.
 * @returns {Promise<Submission>} - The updated Submission document with recalculated scores.
 *
 * @throws {NotFoundError} If the submission or associated user/assessment is not found.
 * @throws {BadRequestError} If a validation check fails during regrading.
 * @throws {Error} For any unknown runtime or server errors (500).
 */
export const regradeSubmission = async (submissionId: string) => {
  const submission =
    await SubmissionModel.findById(submissionId).populate('answers');
  if (!submission) {
    throw new NotFoundError(`Submission with ID ${submissionId} not found`);
  }

  if (submission.deleted) {
    return submission;
  }

  const user = await UserModel.findById(submission.user);
  if (!user) {
    throw new NotFoundError('Submission creator not found');
  }

  const assessment = await getAssessmentWithQuestions(
    submission.assessment.toString()
  );

  let totalScore = 0;
  let assignment = null;
  for (const answer of submission.answers) {
    const questionId = assessment.questions.find(
      q => q._id.toString() === answer.question.toString()
    );
    if (!questionId) {
      console.warn(
        `Question with ID ${answer.question} not found in assessment ${assessment._id}.`
      );
      await AnswerModel.findByIdAndDelete(answer._id);
      continue;
    }

    let question = null;
    let savedAnswer = null;

    switch (answer.type) {
      case 'Number Answer':
        question = await NumberQuestionModel.findById(questionId);
        savedAnswer = NumberAnswerModel.findById(answer.id);
        break;
      case 'Scale Answer':
        question = await ScaleQuestionModel.findById(questionId);
        savedAnswer = ScaleAnswerModel.findById(answer.id);
        break;
      case 'Multiple Choice Answer':
        question = await MultipleChoiceQuestionModel.findById(questionId);
        savedAnswer = MultipleChoiceAnswerModel.findById(answer.id);
        break;
      case 'Multiple Response Answer':
        question = await MultipleResponseQuestionModel.findById(questionId);
        savedAnswer = MultipleResponseAnswerModel.findById(answer.id);
        break;
      case 'Team Member Selection Answer':
        question = await TeamMemberSelectionQuestionModel.findById(questionId);
        savedAnswer = TeamMemberSelectionAnswerModel.findById(answer.id);
        assignment = (await TeamMemberSelectionAnswerModel.findById(
          answer.id
        )) as unknown as TeamMemberSelectionAnswer;
        break;
      case 'Date Answer':
        question = await DateQuestionModel.findById(questionId);
        savedAnswer = DateAnswerModel.findById(answer.id);
        break;
      case 'Short Response Answer':
        question = await ShortResponseQuestionModel.findById(questionId);
        savedAnswer = ShortResponseAnswerModel.findById(answer.id);
        break;
      case 'Long Response Answer':
        question = await LongResponseQuestionModel.findById(questionId);
        savedAnswer = LongResponseAnswerModel.findById(answer.id);
        break;
      case 'Undecided Answer':
      default:
        question = await UndecidedQuestionModel.findById(questionId);
        savedAnswer = UndecidedAnswerModel.findById(answer.id);
        break;
    }

    if (!question) {
      console.warn(
        `Question with ID ${answer.question} not found in assessment ${assessment.id}.`
      );
      answer.score = 0;
      continue;
    }
    const answerScore: number = await calculateAnswerScore(
      question,
      answer,
      assessment
    );
    totalScore += answerScore;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, ...scoredAnswer } = { ...answer, score: answerScore };

    savedAnswer.model.findByIdAndUpdate(answer._id, answer);
  }

  if (!assignment || !assignment.selectedUserIds) {
    throw new BadRequestError('Missing Team Member Selection Answer');
  }

  submission.score = totalScore;
  submission.adjustedScore = undefined;
  submission.submittedAt = new Date();

  await submission.save();

  for (const selectedUserId of assignment.selectedUserIds) {
    const assessmentResult = await AssessmentResultModel.findOne({
      assessment: assessment._id,
      student: selectedUserId,
    });

    if (!assessmentResult) {
      throw new NotFoundError(
        `No assessment result found for student ${selectedUserId} in assessment ${assessment._id}`
      );
    }

    const markEntryIndex = assessmentResult.marks.findIndex(
      mark => mark.submission.toString() === submission._id.toString()
    );

    if (markEntryIndex !== -1) {
      assessmentResult.marks[markEntryIndex].marker = user;
      assessmentResult.marks[markEntryIndex].score = totalScore;
    } else {
      assessmentResult.marks.push({
        marker: user,
        submission: submission._id,
        score: totalScore,
      });
    }

    await assessmentResult.save();
    await recalculateResult(assessmentResult.id);
  }

  return submission;
};
