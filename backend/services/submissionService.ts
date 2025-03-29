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
  NUSNETIDAnswerModel,
  NUSNETEmailAnswerModel,
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
  NUSNETIDQuestionModel,
  NUSNETEmailQuestionModel,
} from '../models/QuestionTypes';
import { NotFoundError, BadRequestError } from './errors';
import AccountModel from '@models/Account';
import AssessmentResultModel, { MarkEntry } from '@models/AssessmentResult';
import UserModel, { User } from '@models/User';
import { recalculateResult } from './assessmentResultService';
import CrispRole from '@shared/types/auth/CrispRole';
import CourseModel from '@models/Course';

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
    assessment: assessment._id,
    user: user._id,
    deleted: { $ne: true },
  }).populate('answers.selectedUserIds');

  const tmsAnswers = userSubmissions.flatMap(s =>
    s.answers.filter(a => a.type === 'Team Member Selection Answer')
  ) as TeamMemberSelectionAnswer[];

  const submittedUserIds = tmsAnswers.flatMap(a =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a
      .toObject()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .selectedUserIds.map((uid: { toString: () => any }) => uid.toString())
  );

  const targetStudentIdsAsStrings = targetStudentIds.map(id => id.toString());

  const isUnique = !submittedUserIds.some(existing =>
    targetStudentIdsAsStrings.includes(existing)
  );

  return isUnique;
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

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundError('Submission creator not found');
  }

  // We always need a Team Member Selection Answer, even in a draft.
  const tmsAnswer = answers.find(
    ans => ans.type === 'Team Member Selection Answer'
  ) as TeamMemberSelectionAnswer;

  if (!tmsAnswer) {
    throw new BadRequestError(
      'A Team Member Selection Answer is required for all submissions (including drafts).'
    );
  }

  // If isDraft, skip normal validation and scoring. Otherwise proceed as before.
  if (!isDraft) {
    // Only check if the assessment is open for submission if not a draft
    await validateSubmissionPeriod(assessment);

    // Run full validation on all answers (will throw if invalid).
    await validateAnswers(assessment, answers);
  }

  // Check for uniqueness of selected members (optional to do for drafts; up to you)
  const selectedStudentIds = tmsAnswer.selectedUserIds;
  const isUnique = await checkSubmissionUniqueness(
    assessment,
    user,
    selectedStudentIds
  );
  if (!isUnique) {
    throw new BadRequestError(
      'Selected user/team already has an existing submission/draft.'
    );
  }

  let totalScore = 0;
  const scoredAnswers = [];

  if (isDraft) {
    // Skip scoring: just store the answers with score = 0
    for (const answer of answers) {
      const question = assessment.questions.find(
        q => q._id.toString() === answer.question.toString()
      );
      if (!question) continue;
      const { Model } = await getAnswerModelForTypeForCreation(
        answer.type,
        question._id.toString()
      );
      const newAnswer = new Model({
        ...answer,
        score: 0,
      });
      await newAnswer.save();
      scoredAnswers.push(newAnswer);
    }
  } else {
    // If final, do normal scoring
    for (const answer of answers) {
      const question = assessment.questions.find(
        q => q._id.toString() === answer.question.toString()
      ); // Guaranteed by validateAnswers()
      const { Model, question: savedQuestion } =
        await getAnswerModelForTypeForCreation(
          answer.type,
          question!._id.toString()
        ); // Assume the data in the assessment above is valid, so question should always be findable.
      const answerScore = await calculateAnswerScore(
        savedQuestion!,
        answer,
        assessment
      );
      totalScore += answerScore;

      const newAnswer = new Model({
        ...answer,
        score: answerScore,
      });
      await newAnswer.save();
      scoredAnswers.push(newAnswer);
    }
  }

  // Create the submission document
  const submission = new SubmissionModel({
    assessment: assessmentId,
    user: userId,
    answers: scoredAnswers,
    isDraft,
    submittedAt: new Date(),
    score: isDraft ? 0 : totalScore, // If draft => 0, else => totalScore
    submissionReleaseNumber: assessment.releaseNumber,
  });
  await submission.save();

  // If it is not a draft, update the AssessmentResult for each selected user
  for (const selUserId of selectedStudentIds) {
    let assessmentResult = await AssessmentResultModel.findOne({
      assessment: assessmentId,
      student: selUserId,
    });

    if (!assessmentResult) {
      assessmentResult = new AssessmentResultModel({
        assessment: assessmentId,
        student: selUserId,
        marks: [],
        averageScore: 0,
      });
      await assessmentResult.save();
    }

    if (!isDraft) {
      const newMarkEntry: MarkEntry = {
        marker: user,
        submission: submission._id,
        score: totalScore,
      };
      assessmentResult.marks.push(newMarkEntry);
      await assessmentResult.save();

      await recalculateResult(assessmentResult.id);
    }
  }

  return submission;
};

/**
 * A small helper to get the correct Mongoose model for each answer type.
 */
async function getAnswerModelForTypeForCreation(
  type: string,
  questionId: string
) {
  let question = null;
  let Model = null;
  switch (type) {
    case 'Number Answer':
      question = await NumberQuestionModel.findById(questionId);
      Model = NumberAnswerModel;
      return { Model, question };
    case 'NUSNET ID Answer':
      question = await NUSNETIDQuestionModel.findById(questionId);
      Model = NUSNETIDAnswerModel;
      return { Model, question };
    case 'NUSNET Email Answer':
      question = await NUSNETEmailQuestionModel.findById(questionId);
      Model = NUSNETEmailAnswerModel;
      return { Model, question };
    case 'Scale Answer':
      question = await ScaleQuestionModel.findById(questionId);
      Model = ScaleAnswerModel;
      return { Model, question };
    case 'Multiple Choice Answer':
      question = await MultipleChoiceQuestionModel.findById(questionId);
      Model = MultipleChoiceAnswerModel;
      return { Model, question };
    case 'Multiple Response Answer':
      question = await MultipleResponseQuestionModel.findById(questionId);
      Model = MultipleResponseAnswerModel;
      return { Model, question };
    case 'Team Member Selection Answer':
      question = await TeamMemberSelectionQuestionModel.findById(questionId);
      Model = TeamMemberSelectionAnswerModel;
      return { Model, question };
    case 'Date Answer':
      question = await DateQuestionModel.findById(questionId);
      Model = DateAnswerModel;
      return { Model, question };
    case 'Short Response Answer':
      question = await ShortResponseQuestionModel.findById(questionId);
      Model = ShortResponseAnswerModel;
      return { Model, question };
    case 'Long Response Answer':
      question = await LongResponseQuestionModel.findById(questionId);
      Model = LongResponseAnswerModel;
      return { Model, question };
    default:
      question = await UndecidedQuestionModel.findById(questionId);
      Model = UndecidedAnswerModel;
      return { Model, question };
  }
}

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
  const initIsDraft = submission.isDraft;
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
  const isCourseFaculty =
    course.faculty.filter(f => f === account!.user).length !== 0;
  if (account && (isCourseFaculty || account.crispRole === CrispRole.Admin)) {
    bypass = true;
  }

  if (!bypass && submission.user.toString() !== userId) {
    throw new BadRequestError(
      'You do not have permission to update this submission.'
    );
  }

  const assignment = answers.find(
    ans => ans.type === 'Team Member Selection Answer'
  ) as TeamMemberSelectionAnswer;
  if (!assignment) {
    throw new BadRequestError('Team Member Selection Answer is required');
  }

  const savedAssignment = submission.answers.find(
    ans => ans.type === 'Team Member Selection Answer'
  ) as TeamMemberSelectionAnswer; // We just assume the one in the database is valid.

  if (savedAssignment) {
    for (const memberId of assignment.selectedUserIds) {
      if (
        savedAssignment
          .toObject()
          .selectedUserIds.some(
            (uid: string) => uid.toString() !== memberId.toString()
          )
      ) {
        throw new BadRequestError('Selected team/users should not change');
      }
    }
  }

  if (!isDraft) {
    await validateSubmissionPeriod(assessment);
    await validateAnswers(assessment, answers);
  }

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

  // Always re-grade to get the latest score in submission.score,
  // even if isDraft == true
  let totalScore = 0;

  await Promise.all(
    answers.map(async answer => {
      const question = assessment.questions.find(
        q => q._id.toString() === answer.question.toString()
      );

      if (!question) {
        throw new BadRequestError('Question referenced in answer not found');
      }
      const questionId = question._id;

      // Re-grade
      const questionDoc = await getQuestionDoc(
        questionId.toString(),
        answer.type
      );
      const savedAnswer = getAnswerModelForTypeForUpdate(
        answer.type,
        answer._id
      );
      const answerScore = await calculateAnswerScore(
        questionDoc!,
        answer,
        assessment
      );
      totalScore += answerScore;

      // Save the updated answer doc (with new score)
      answer.score = answerScore;
      await savedAnswer.model.findByIdAndUpdate(answer._id, answer);
    })
  );

  // Update the submission object itself
  submission.answers = answers;
  submission.isDraft = isDraft;
  submission.submittedAt = new Date();

  // If the total score changed, reset any manual adjustedScore
  if (submission.score !== totalScore) {
    submission.score = totalScore;
    submission.adjustedScore = undefined;
  }
  submission.submissionReleaseNumber = assessment.releaseNumber;

  await submission.save();

  for (const selectedUserId of assignment.selectedUserIds) {
    const assessmentResult = await AssessmentResultModel.findOne({
      assessment: assessment._id,
      student: selectedUserId,
    });

    if (!assessmentResult) {
      throw new NotFoundError(
        'No previous assessment result found. Something went wrong with the flow.'
      );
    }

    if (isDraft) return submission;
    const markEntryIndex = assessmentResult.marks.findIndex(
      mark => mark.submission.toString() === submission._id.toString()
    );

    if (markEntryIndex !== -1) {
      assessmentResult.marks[markEntryIndex].marker = user;
      assessmentResult.marks[markEntryIndex].score = totalScore;
    } else if (!initIsDraft) {
      throw new NotFoundError(
        'Mark entry for this submission not found in assessment result.'
      );
    } else {
      // If no MarkEntry yet, push a new one
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

/**
 * Simple utility that returns the correct question doc from the DB
 * given the question id and answer type.
 */
async function getQuestionDoc(
  questionId: QuestionUnion | string,
  answerType: string
) {
  switch (answerType) {
    case 'Number Answer':
      return NumberQuestionModel.findById(questionId);
    case 'NUSNET ID Answer':
      return NUSNETIDQuestionModel.findById(questionId);
    case 'NUSNET Email Answer':
      return NUSNETEmailQuestionModel.findById(questionId);
    case 'Scale Answer':
      return ScaleQuestionModel.findById(questionId);
    case 'Multiple Choice Answer':
      return MultipleChoiceQuestionModel.findById(questionId);
    case 'Multiple Response Answer':
      return MultipleResponseQuestionModel.findById(questionId);
    case 'Team Member Selection Answer':
      return TeamMemberSelectionQuestionModel.findById(questionId);
    case 'Date Answer':
      return DateQuestionModel.findById(questionId);
    case 'Short Response Answer':
      return ShortResponseQuestionModel.findById(questionId);
    case 'Long Response Answer':
      return LongResponseQuestionModel.findById(questionId);
    default:
      return UndecidedQuestionModel.findById(questionId);
  }
}

/**
 * Simple utility that returns the correct Answer Model for creation / updates.
 */
function getAnswerModelForTypeForUpdate(answerType: string, answerId: string) {
  switch (answerType) {
    case 'Number Answer':
      return NumberAnswerModel.findById(answerId);
    case 'NUSNET ID Answer':
      return NUSNETIDAnswerModel.findById(answerId);
    case 'NUSNET Email Answer':
      return NUSNETEmailAnswerModel.findById(answerId);
    case 'Scale Answer':
      return ScaleAnswerModel.findById(answerId);
    case 'Multiple Choice Answer':
      return MultipleChoiceAnswerModel.findById(answerId);
    case 'Multiple Response Answer':
      return MultipleResponseAnswerModel.findById(answerId);
    case 'Team Member Selection Answer':
      return TeamMemberSelectionAnswerModel.findById(answerId);
    case 'Date Answer':
      return DateAnswerModel.findById(answerId);
    case 'Short Response Answer':
      return ShortResponseAnswerModel.findById(answerId);
    case 'Long Response Answer':
      return LongResponseAnswerModel.findById(answerId);
    default:
      return UndecidedAnswerModel.findById(answerId);
  }
}

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
