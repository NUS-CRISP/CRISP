/* eslint-disable @typescript-eslint/no-explicit-any */
import InternalAssessmentModel from '../models/InternalAssessment';
import AccountModel from '../models/Account';
import CourseModel from '../models/Course';
import { NotFoundError, BadRequestError } from './errors';
import mongoose, { Types } from 'mongoose';
import TeamSetModel from '@models/TeamSet';
import QuestionModel from '@models/Question';
import {
  DateQuestionModel,
  LongResponseQuestionModel,
  MultipleChoiceQuestion,
  MultipleChoiceQuestionModel,
  MultipleResponseQuestion,
  MultipleResponseQuestionModel,
  NumberQuestion,
  NumberQuestionModel,
  NUSNETEmailQuestionModel,
  NUSNETIDQuestionModel,
  QuestionUnion,
  ScaleQuestion,
  ScaleQuestionModel,
  ShortResponseQuestionModel,
  TeamMemberSelectionQuestionModel,
  UndecidedQuestionModel,
} from '@models/QuestionTypes';
import { createAssignmentSet } from './assessmentAssignmentSetService';
import AssessmentResultModel, {
  AssessmentResult,
} from '@models/AssessmentResult';
import { User } from '@models/User';

/**
 * Retrieves an internal assessment by ID.
 * Also fetches all results, but this may not be necessary as the frontend should fragment
 * the fetching of data anyway.
 *
 * TODO: Consider removing the population of results in order to follow Separation of Concerns.
 *
 * @param {string} assessmentId - The ID of the assessment to retrieve.
 * @param {string} accountId - The ID of the account requesting the assessment.
 *
 * @returns {Promise<any>} - The found assessment document. If the user is a faculty member/admin,
 *   the `results` field is also populated and sorted by student name. Otherwise,
 *   only `teamSet` and `questions` are populated.
 *
 * @throws {NotFoundError} If the account or assessment is not found.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const getInternalAssessmentById = async (
  assessmentId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  // Populates different fields depending on the user's role
  const assessment =
    account.role === 'Faculty member' || account.role === 'admin'
      ? await InternalAssessmentModel.findById(assessmentId)
          .populate<{
            results: AssessmentResult[];
          }>({
            path: 'results',
            populate: [
              {
                path: 'team',
                model: 'Team',
                populate: {
                  path: 'members',
                  model: 'User',
                },
              },
              {
                path: 'student',
                model: 'User',
              },
            ],
          })
          .populate({
            path: 'teamSet',
            populate: {
              path: 'teams',
              model: 'Team',
            },
          })
          .populate({
            path: 'questions',
          })
      : await InternalAssessmentModel.findById(assessmentId)
          .populate({
            path: 'teamSet',
            populate: {
              path: 'teams',
              model: 'Team',
            },
          })
          .populate({
            path: 'questions',
          });

  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Sorts the results by student name if user is admin/faculty
  if (account.role === 'Faculty member' || account.role === 'admin') {
    (assessment.results as AssessmentResult[]).sort((a, b) =>
      (a.student as User).name.localeCompare((b.student as User).name)
    );
  }

  return assessment;
};

/**
 * Updates an internal assessment's fields, restricted to admin or faculty members.
 *
 * @param {string} assessmentId - The ID of the assessment to update.
 * @param {string} accountId - The ID of the requesting account (must be admin or faculty).
 * @param {Record<string, unknown>} updateData - Key-value pairs of the fields to be updated.
 *
 * @returns {Promise<any>} - The updated assessment document, if successful.
 *
 * @throws {NotFoundError} If the account or assessment does not exist.
 * @throws {BadRequestError} If the user is unauthorized.
 * @throws {Error} For any other unknown runtime or Mongoose errors (500).
 */
export const updateInternalAssessmentById = async (
  assessmentId: string,
  accountId: string,
  updateData: Record<string, unknown>
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  if (account.role !== 'admin' && account.role !== 'Faculty member') {
    throw new BadRequestError('Unauthorized');
  }

  const updatedAssessment = await InternalAssessmentModel.findByIdAndUpdate(
    assessmentId,
    updateData,
    { new: true }
  );

  if (!updatedAssessment) {
    throw new NotFoundError('Assessment not found');
  }

  return updatedAssessment;
};

/**
 * Deletes an internal assessment along with all associated results,
 * and detaches it from its parent course.
 *
 * @param {string} assessmentId - The ID of the assessment to delete.
 *
 * @returns {Promise<void>} - Resolves when deletion is complete.
 *
 * @throws {NotFoundError} If the assessment does not exist.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const deleteInternalAssessmentById = async (assessmentId: string) => {
  const assessment = await InternalAssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Delete associated results
  await AssessmentResultModel.deleteMany({ assessment: assessmentId });

  // Remove the assessment reference from its parent course
  const course = await CourseModel.findById(assessment.course);
  if (course && course.internalAssessments) {
    const index = course.internalAssessments.findIndex(id =>
      id.equals(assessment._id)
    );
    if (index !== -1) {
      course.internalAssessments.splice(index, 1);
      await course.save();
    }
  }

  // Finally, delete the assessment itself
  await InternalAssessmentModel.findByIdAndDelete(assessmentId);
};

/**
 * Bulk-creates multiple internal assessments for a given course,
 * generating initial AssessmentResult documents and linking to a specified TeamSet if available.
 * Used for CSV uploading. As of 26/12/2024, the frontend typically sends one at a time,
 * but this function can handle multiple.
 *
 * @param {string} courseId - The ID of the course to which assessments will be added.
 * @param {InternalAssessmentData[]} assessmentsData - Array of assessment data objects.
 *
 * @description
 *  - If an assessment with the same name exists in the course, creation is skipped for that one.
 *  - A default locked "Team Member Selection" question is created for each new assessment.
 *  - Result documents are created for each student in the course, linking them to the new assessment.
 *  - Attempts to automatically generate an assignment set via `createAssignmentSet`.
 *
 * @returns {Promise<void>} - Resolves after all assessments are added or throws if none were added.
 *
 * @throws {BadRequestError} If `assessmentsData` is empty or if none of the assessments could be added.
 * @throws {NotFoundError} If the specified course does not exist.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
interface InternalAssessmentData {
  assessmentName: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  maxMarks?: number;
  granularity: string;
  teamSetName: string;
  areSubmissionsEditable: boolean;
}
export const addInternalAssessmentsToCourse = async (
  courseId: string,
  assessmentsData: InternalAssessmentData[]
) => {
  if (!Array.isArray(assessmentsData) || assessmentsData.length === 0) {
    throw new BadRequestError('Invalid or empty internal assessments data');
  }

  const course = await CourseModel.findById(courseId).populate('students');
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const newAssessments: mongoose.Document[] = [];

  for (const data of assessmentsData) {
    const {
      assessmentName,
      description,
      startDate,
      endDate,
      maxMarks,
      granularity,
      teamSetName,
      areSubmissionsEditable,
    } = data;

    const existingAssessment = await InternalAssessmentModel.findOne({
      course: courseId,
      assessmentName,
    });

    // Skip creation if an assessment with the same name already exists
    if (existingAssessment) {
      continue;
    }

    const teamSet = await TeamSetModel.findOne({
      course: courseId,
      name: teamSetName,
    }).populate({ path: 'teams', populate: ['members', 'TA'] });

    if (!teamSet) {
      console.error('Missing TeamSet data');
      continue;
    }

    // Create the internal assessment
    const assessment = new InternalAssessmentModel({
      course: courseId,
      assessmentName,
      description,
      startDate,
      endDate,
      maxMarks,
      granularity,
      teamSet: null,
      areSubmissionsEditable,
      results: [],
      isReleased: false,
      questions: [],
    });

    // Create a locked "Team Member Selection" question
    const teamMemberSelectionQuestion = new TeamMemberSelectionQuestionModel({
      text: 'Student Selection',
      type: 'Team Member Selection',
      customInstruction: 'Select students to evaluate.',
      isLocked: true,
      isRequired: true,
    });
    await teamMemberSelectionQuestion.save();

    // Assign the question to the assessment
    assessment.questions = [teamMemberSelectionQuestion._id];
    await assessment.save();

    // Create result documents for each student
    const results: mongoose.Document[] = [];
    assessment.teamSet = teamSet._id;
    course.students.forEach((student: any) => {
      const result = new AssessmentResultModel({
        assessment: assessment._id,
        student,
        marks: [],
        averageScore: 0,
      });
      results.push(result);
    });

    assessment.results = results.map(result => result._id);
    course.internalAssessments.push(assessment._id);
    newAssessments.push(assessment);
    await Promise.all(results.map(result => result.save()));

    // Attempt to create the assignment set
    try {
      await createAssignmentSet(
        assessment._id.toString(),
        teamSet._id.toString()
      );
    } catch (error) {
      console.error(
        `Failed to create AssessmentAssignmentSet for assessment ${assessment._id}:`,
        error
      );
    }
  }

  if (newAssessments.length === 0) {
    throw new BadRequestError('Failed to add any internal assessments');
  }

  await course.save();
  await Promise.all(newAssessments.map(assessment => assessment.save()));
};

/*-------------------------- Questions ---------------------------------------------*/

/**
 * Creates and saves a new question for an internal assessment,
 * validating question types and updating the assessment's total marks if scored.
 *
 * @param {string} assessmentId - The ID of the assessment to which the question is added.
 * @param {Partial<QuestionUnion>} questionData - The question content, including type, text, etc.
 * @param {string} accountId - The ID of the account adding this question (must be admin or faculty).
 *
 * @returns {Promise<QuestionUnion>} - The created question document.
 *
 * @throws {NotFoundError} If the account or assessment is not found.
 * @throws {BadRequestError} If the user is unauthorized or the question data is invalid.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const addQuestionToAssessment = async (
  assessmentId: string,
  questionData: Partial<QuestionUnion>,
  accountId: string
): Promise<QuestionUnion> => {
  console.log(questionData);
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  if (account.role !== 'admin' && account.role !== 'Faculty member') {
    throw new BadRequestError('Unauthorized');
  }

  const assessment = await InternalAssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Remove _id if present (avoiding collisions with Mongo)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...validQuestionData } = questionData;

  if (!validQuestionData.type || !validQuestionData.text) {
    throw new BadRequestError('Both type and text fields are required');
  }

  // Validate certain question fields by type
  switch (validQuestionData.type) {
    case 'Multiple Choice':
      if (
        !Array.isArray(validQuestionData.options) ||
        validQuestionData.options.length === 0
      ) {
        throw new BadRequestError(
          'Options are required for Multiple Choice questions'
        );
      }
      if (validQuestionData.isScored) {
        for (const option of validQuestionData.options) {
          if (typeof option.points !== 'number') {
            throw new BadRequestError(
              'Each option must have a points value when scoring is enabled'
            );
          }
        }
      }
      break;
    case 'Multiple Response':
      if (
        !Array.isArray(validQuestionData.options) ||
        validQuestionData.options.length === 0
      ) {
        throw new BadRequestError(
          'Options are required for Multiple Response questions'
        );
      }
      if (validQuestionData.isScored) {
        for (const option of validQuestionData.options) {
          if (typeof option.points !== 'number') {
            throw new BadRequestError(
              'Each option must have a points value when scoring is enabled'
            );
          }
        }
        if (typeof validQuestionData.allowNegative !== 'boolean') {
          throw new BadRequestError(
            'allowNegative must be specified when scoring is enabled for Multiple Response questions'
          );
        }
      }
      break;
    case 'Scale':
      if (typeof validQuestionData.scaleMax !== 'number') {
        throw new BadRequestError('scaleMax is required for Scale questions');
      }
      if (
        !Array.isArray(validQuestionData.labels) ||
        validQuestionData.labels.length < 2
      ) {
        throw new BadRequestError(
          'At least two labels are required for Scale questions'
        );
      }
      if (validQuestionData.isScored) {
        for (const label of validQuestionData.labels) {
          if (typeof label.points !== 'number') {
            throw new BadRequestError(
              'Each label must have a points value when scoring is enabled'
            );
          }
        }
      }
      break;
    case 'Number':
      if (typeof validQuestionData.maxNumber !== 'number') {
        throw new BadRequestError('maxNumber is required for Number questions');
      }
      if (validQuestionData.isScored) {
        if (!validQuestionData.scoringMethod) {
          throw new BadRequestError(
            'scoringMethod is required when scoring is enabled for Number questions'
          );
        }
        if (validQuestionData.scoringMethod === 'direct') {
          if (typeof validQuestionData.maxPoints !== 'number') {
            throw new BadRequestError(
              'maxPoints is required for direct scoring method'
            );
          }
        } else if (validQuestionData.scoringMethod === 'range') {
          if (
            !Array.isArray(validQuestionData.scoringRanges) ||
            validQuestionData.scoringRanges.length === 0
          ) {
            throw new BadRequestError(
              'scoringRanges are required for range scoring method'
            );
          }
          for (const range of validQuestionData.scoringRanges) {
            if (
              typeof range.minValue !== 'number' ||
              typeof range.maxValue !== 'number' ||
              typeof range.points !== 'number'
            ) {
              throw new BadRequestError(
                'Each scoring range must have minValue, maxValue, and points'
              );
            }
          }
        }
      }
      break;
    default:
      // Other question types do not require specialized validation here
      break;
  }

  let question: QuestionUnion;
  let addedMaxScore = 0;

  // Instantiate the appropriate question model based on the type
  switch (validQuestionData.type) {
    case 'NUSNET ID':
      question = new NUSNETIDQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      break;
    case 'NUSNET Email':
      question = new NUSNETEmailQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      break;
    case 'Team Member Selection':
      question = new TeamMemberSelectionQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      break;
    case 'Multiple Choice':
      question = new MultipleChoiceQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      if (validQuestionData.isScored) {
        addedMaxScore = validQuestionData.options!.reduce(
          (acc, val) => (acc > val.points ? acc : val.points),
          0
        );
      }
      break;
    case 'Multiple Response':
      question = new MultipleResponseQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      if (validQuestionData.isScored) {
        addedMaxScore = validQuestionData.options!.reduce(
          (acc, val) => (val.points > 0 ? acc + val.points : acc),
          0
        );
      }
      break;
    case 'Scale':
      question = new ScaleQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      if (validQuestionData.isScored) {
        // Assumes that the highest-value label is last in the array
        addedMaxScore =
          validQuestionData.labels![validQuestionData.labels!.length - 1]
            .points;
      }
      break;
    case 'Short Response':
      question = new ShortResponseQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      break;
    case 'Long Response':
      question = new LongResponseQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      break;
    case 'Date':
      question = new DateQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      break;
    case 'Number':
      question = new NumberQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      if (
        validQuestionData.isScored &&
        validQuestionData.scoringMethod === 'direct'
      ) {
        addedMaxScore = validQuestionData.maxPoints!;
      }
      if (
        validQuestionData.isScored &&
        validQuestionData.scoringMethod === 'range'
      ) {
        addedMaxScore =
          validQuestionData.scoringRanges![
            validQuestionData.scoringRanges!.length - 1
          ].points;
      }
      break;
    case 'Undecided':
    default:
      question = new UndecidedQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      break;
  }

  // Save the question
  await question.save();

  // Update the assessment's question list and total marks
  assessment.questions = assessment.questions || [];
  assessment.questions.push(question._id);
  assessment.questionsTotalMarks = assessment.questionsTotalMarks
    ? assessment.questionsTotalMarks + addedMaxScore
    : addedMaxScore;
  await assessment.save();

  return question;
};

/**
 * Retrieves all questions belonging to a particular assessment,
 * ensuring the requesting account is valid.
 *
 * @param {string} assessmentId - The ID of the assessment whose questions to retrieve.
 * @param {string} accountId - The ID of the account for authorization checks.
 *
 * @returns {Promise<QuestionUnion[]>} - An array of question documents for the specified assessment.
 *
 * @throws {NotFoundError} If the account or assessment is not found.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const getQuestionsByAssessmentId = async (
  assessmentId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const assessment =
    await InternalAssessmentModel.findById(assessmentId).populate('questions');
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  return assessment.questions;
};

/**
 * Updates a specific question, potentially modifying its text, options, or scoring,
 * while preventing certain changes like altering the question type or editing locked questions.
 *
 * @param {string} questionId - The ID of the question to update.
 * @param {Partial<QuestionUnion>} updateData - The fields to update.
 * @param {string} accountId - The ID of the requesting account.
 *
 * @returns {Promise<QuestionUnion>} - The updated question document.
 *
 * @throws {NotFoundError} If the account or question is not found.
 * @throws {BadRequestError} If the question is locked, user is unauthorized, or if the type is changed.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const updateQuestionById = async (
  questionId: string,
  updateData: Partial<QuestionUnion>,
  accountId: string
): Promise<QuestionUnion> => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  if (account.role !== 'admin' && account.role !== 'Faculty member') {
    throw new BadRequestError('Unauthorized');
  }

  const existingQuestion = await QuestionModel.findById(questionId);
  if (!existingQuestion) {
    throw new NotFoundError('Question not found');
  }

  if (existingQuestion.isLocked) {
    throw new BadRequestError('Cannot modify a locked question');
  }

  // Prevent changing the question type
  if (updateData.type && updateData.type !== existingQuestion.type) {
    throw new BadRequestError('Cannot change the type of an existing question');
  }

  let updatedQuestion: QuestionUnion | null;
  let currentScore = 0;
  let updatedScore = 0;

  // Adjust scoring logic based on question type
  switch (existingQuestion.type) {
    case 'Multiple Choice':
      currentScore = (
        existingQuestion as MultipleChoiceQuestion
      ).options.reduce((acc, val) => (acc > val.points ? acc : val.points), 0);
      updatedScore = (updateData as MultipleChoiceQuestion).options.reduce(
        (acc, val) => (acc > val.points ? acc : val.points),
        0
      );
      updatedQuestion = await MultipleChoiceQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    case 'Multiple Response':
      currentScore = (
        existingQuestion as MultipleResponseQuestion
      ).options.reduce(
        (acc, val) => (val.points > 0 ? acc + val.points : acc),
        0
      );
      updatedScore = (updateData as MultipleResponseQuestion).options.reduce(
        (acc, val) => (val.points > 0 ? acc + val.points : acc),
        0
      );
      updatedQuestion = await MultipleResponseQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    case 'Scale':
      currentScore = (existingQuestion as ScaleQuestion).labels[
        (existingQuestion as ScaleQuestion).labels.length - 1
      ].points;
      updatedScore = (updateData as ScaleQuestion).labels[
        (updateData as ScaleQuestion).labels.length - 1
      ].points;
      updatedQuestion = await ScaleQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    case 'Number':
      if (
        (existingQuestion as NumberQuestion).isScored &&
        (existingQuestion as NumberQuestion).scoringMethod === 'direct'
      ) {
        currentScore = (existingQuestion as NumberQuestion).maxPoints!;
      }
      if (
        (updateData as NumberQuestion).isScored &&
        (updateData as NumberQuestion).scoringMethod === 'direct'
      ) {
        updatedScore = (updateData as NumberQuestion).maxPoints!;
      }
      if (
        (existingQuestion as NumberQuestion).isScored &&
        (existingQuestion as NumberQuestion).scoringMethod === 'range'
      ) {
        currentScore = (existingQuestion as NumberQuestion).scoringRanges![
          (existingQuestion as NumberQuestion).scoringRanges!.length - 1
        ].points;
      }
      if (
        (updateData as NumberQuestion).isScored &&
        (updateData as NumberQuestion).scoringMethod === 'range'
      ) {
        updatedScore = (updateData as NumberQuestion).scoringRanges![
          (updateData as NumberQuestion).scoringRanges!.length - 1
        ].points;
      }
      updatedQuestion = await NumberQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    case 'Short Response':
      updatedQuestion = await ShortResponseQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    case 'Long Response':
      updatedQuestion = await LongResponseQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    case 'Date':
      updatedQuestion = await DateQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    case 'Team Member Selection':
      updatedQuestion =
        await TeamMemberSelectionQuestionModel.findByIdAndUpdate(
          questionId,
          updateData,
          { new: true }
        );
      break;
    case 'NUSNET ID':
      updatedQuestion = await NUSNETIDQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    case 'NUSNET Email':
      updatedQuestion = await NUSNETEmailQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    case 'Undecided':
      updatedQuestion = await UndecidedQuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
    default:
      updatedQuestion = await QuestionModel.findByIdAndUpdate(
        questionId,
        updateData,
        { new: true }
      );
      break;
  }

  if (!updatedQuestion) {
    throw new NotFoundError('Question not found after update');
  }

  // If scoring changed, update the total marks in the related assessment
  if (currentScore !== updatedScore) {
    const assessment = await InternalAssessmentModel.findOne({
      questions: questionId,
    });

    if (assessment) {
      assessment.questionsTotalMarks = assessment.questionsTotalMarks
        ? assessment.questionsTotalMarks - currentScore + updatedScore
        : updatedScore - currentScore;
      await assessment.save();
    }
  }

  return updatedQuestion;
};

/**
 * Removes a question from an assessment after ensuring it is not locked,
 * then updates the assessment’s questions list accordingly.
 *
 * @param {string} assessmentId - The ID of the assessment that contains the question.
 * @param {string} questionId - The ID of the question to remove.
 * @param {string} accountId - The ID of the requesting account (must be admin or faculty).
 *
 * @returns {Promise<void>} - Resolves when the question is successfully removed.
 *
 * @throws {NotFoundError} If the account, assessment, or question is not found.
 * @throws {BadRequestError} If the question is locked or the user is unauthorized.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const deleteQuestionById = async (
  assessmentId: string,
  questionId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  if (account.role !== 'admin' && account.role !== 'Faculty member') {
    throw new BadRequestError('Unauthorized');
  }

  const assessment = await InternalAssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  const question = await QuestionModel.findById(questionId);
  if (!question) {
    throw new NotFoundError('Question not found');
  }

  if (question.isLocked) {
    throw new BadRequestError('Cannot delete a locked question');
  }

  const questionIndex = assessment.questions?.findIndex(
    (qId: Types.ObjectId) => qId.toString() === questionId
  );
  if (questionIndex === undefined || questionIndex === -1) {
    throw new NotFoundError('Question not associated with this assessment');
  }

  assessment.questions?.splice(questionIndex, 1);
  await assessment.save();

  await QuestionModel.findByIdAndDelete(questionId);
};

/*------------------------------ Release-Form -------------------------------*/

/**
 * Marks an assessment as released (isReleased = true),
 * making it accessible to graders (e.g., TAs, faculty).
 *
 * @param {string} assessmentId - The ID of the assessment to release.
 * @param {string} accountId - The ID of the user performing the release (must be admin or faculty).
 *
 * @returns {Promise<any>} - The updated assessment document.
 *
 * @throws {NotFoundError} If the account or assessment is not found.
 * @throws {BadRequestError} If the user is unauthorized.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const releaseInternalAssessmentById = async (
  assessmentId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  if (account.role !== 'admin' && account.role !== 'Faculty member') {
    throw new BadRequestError('Unauthorized');
  }

  const updatedAssessment = await InternalAssessmentModel.findByIdAndUpdate(
    assessmentId,
    { isReleased: true },
    { new: true }
  );

  if (!updatedAssessment) {
    throw new NotFoundError('Assessment not found');
  }

  return updatedAssessment;
};

/**
 * Reverts an assessment's release status (isReleased = false),
 * making it invisible to graders.
 *
 * @param {string} assessmentId - The ID of the assessment to recall.
 * @param {string} accountId - The ID of the user performing the recall (must be admin or faculty).
 *
 * @returns {Promise<any>} - The updated assessment document.
 *
 * @throws {NotFoundError} If the account or assessment is not found.
 * @throws {BadRequestError} If the user is unauthorized.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const recallInternalAssessmentById = async (
  assessmentId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  if (account.role !== 'admin' && account.role !== 'Faculty member') {
    throw new BadRequestError('Unauthorized');
  }

  const updatedAssessment = await InternalAssessmentModel.findByIdAndUpdate(
    assessmentId,
    { isReleased: false },
    { new: true }
  );

  if (!updatedAssessment) {
    throw new NotFoundError('Assessment not found');
  }

  return updatedAssessment;
};
