/* eslint-disable @typescript-eslint/no-explicit-any */
import InternalAssessmentModel from '../models/InternalAssessment';
import AccountModel from '../models/Account';
import ResultModel, { Result } from '../models/Result';
import CourseModel from '../models/Course';
import { NotFoundError, BadRequestError } from './errors';
import { Team } from '@models/Team';
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

export const getInternalAssessmentById = async (
  assessmentId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const assessment = await InternalAssessmentModel.findById(assessmentId)
    .populate<{
      results: Result[];
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
          path: 'marker',
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
    });

  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Filtering results based on the role and assigned marker for teaching assistants
  if (account.role === 'Teaching assistant') {
    const userId = account.user;
    assessment.results = assessment.results.filter(result =>
      result.marker?.equals(userId)
    );
  }

  // Sorting logic for individual or team-based assessments
  if (assessment.granularity === 'individual') {
    assessment.results.sort((a, b) =>
      a.marks[0].name.localeCompare(b.marks[0].name)
    );
  } else if (assessment.granularity === 'team') {
    assessment.results.sort((a, b) => {
      const teamA = a.team as unknown as Team;
      const teamB = b.team as unknown as Team;
      if (!teamA && !teamB) return 0;
      if (!teamA) return -1;
      if (!teamB) return 1;
      return teamA.number - teamB.number;
    });
    assessment.results.forEach(result => {
      result.marks.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  return assessment;
};

export const updateInternalAssessmentById = async (
  assessmentId: string,
  accountId: string,
  updateData: Record<string, unknown>
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  // Only admins or faculty members are allowed to update assessments.
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

export const deleteInternalAssessmentById = async (assessmentId: string) => {
  const assessment = await InternalAssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Delete associated results
  await ResultModel.deleteMany({ assessment: assessmentId });

  // Remove the assessment from the associated course
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

  // Delete the assessment
  await InternalAssessmentModel.findByIdAndDelete(assessmentId);
};

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

    if (existingAssessment) {
      continue; // Skip if assessment already exists
    }

    const teamSet = await TeamSetModel.findOne({
      course: courseId,
      name: teamSetName,
    }).populate({ path: 'teams', populate: ['members', 'TA'] });

    if (!teamSet) {
      console.error('Missing TeamSet data');
      continue;
    }

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

    // Locked questions
    const teamMemberSelectionQuestion = new TeamMemberSelectionQuestionModel({
      text: 'Student Selection',
      type: 'Team Member Selection',
      customInstruction: 'Select students to evaluate.',
      isLocked: true,
      isRequired: true,
    });

    // const nusnetIdQuestion = new NUSNETIDQuestionModel({
    //   text: 'Student NUSNET ID (EXXXXXXX)',
    //   type: 'NUSNET ID',
    //   shortResponsePlaceholder: 'E1234567',
    //   customInstruction: 'Enter your NUSNET ID starting with E followed by 7 digits.',
    //   isLocked: true,
    //   isRequired: true,
    // });

    // const nusnetEmailQuestion = new NUSNETEmailQuestionModel({
    //   text: 'Student NUSNET Email',
    //   type: 'NUSNET Email',
    //   shortResponsePlaceholder: 'e1234567@u.nus.edu',
    //   customInstruction: 'Enter your NUSNET email address.',
    //   isLocked: true,
    //   isRequired: true,
    // });

    await teamMemberSelectionQuestion.save();
    // await nusnetIdQuestion.save();
    // await nusnetEmailQuestion.save();

    assessment.questions = [
      teamMemberSelectionQuestion._id,
      // nusnetIdQuestion._id,
      // nusnetEmailQuestion._id,
    ];

    await assessment.save();

    const results: mongoose.Document[] = [];

    if (granularity === 'team') {
      if (!teamSet) {
        continue;
      }
      assessment.teamSet = teamSet._id;

      teamSet.teams.forEach((team: any) => {
        const initialMarks = team.members.map((member: any) => ({
          user: member.identifier,
          name: member.name,
          mark: 0,
        }));
        const result = new ResultModel({
          assessment: assessment._id,
          team: team._id,
          marker: team.TA ? team.TA._id : null,
          marks: initialMarks,
        });
        results.push(result);
      });
    } else {
      if (teamSet) {
        assessment.teamSet = teamSet._id;
        course.students.forEach((student: any) => {
          const teams: Team[] = teamSet.teams as unknown as Team[];
          const team = teams.find(t =>
            t?.members?.some(member => member._id.equals(student._id))
          );
          const marker = team?.TA ? team.TA._id : null;
          const result = new ResultModel({
            assessment: assessment._id,
            team: team ? team._id : null,
            marker,
            marks: [{ user: student.identifier, name: student.name, mark: 0 }],
          });
          results.push(result);
        });
      } else {
        course.students.forEach((student: any) => {
          const result = new ResultModel({
            assessment: assessment._id,
            team: null,
            marker: null,
            marks: [
              {
                user: student.identifier,
                name: student.name,
                mark: 0,
              },
            ],
          });
          results.push(result);
        });
      }
    }

    assessment.results = results.map(result => result._id);
    course.internalAssessments.push(assessment._id);
    newAssessments.push(assessment);
    await Promise.all(results.map(result => result.save()));

    try {
      await createAssignmentSet(
        assessment._id.toString(),
        teamSet!._id.toString()
      ); // Null checked at the start
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

/*--------------------------Questions---------------------------------------------*/
// Add a question to an internal assessment
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

  // Only admins or faculty members are allowed to add questions
  if (account.role !== 'admin' && account.role !== 'Faculty member') {
    throw new BadRequestError('Unauthorized');
  }

  const assessment = await InternalAssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Remove the temporary _id before saving
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...validQuestionData } = questionData;

  // Ensure the required fields are present
  if (!validQuestionData.type || !validQuestionData.text) {
    throw new BadRequestError('Both type and text fields are required');
  }

  // Additional validation based on question type
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
      break;
  }

  // Determine which model to use based on the question type
  let question: QuestionUnion;
  let addedMaxScore = 0;

  // Create a new question using the appropriate model
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
        addedMaxScore = validQuestionData.options!.reduce((acc, val) => {
          return acc > val.points ? acc : val.points;
        }, 0);
      }
      break;
    case 'Multiple Response':
      question = new MultipleResponseQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      if (validQuestionData.isScored) {
        addedMaxScore = validQuestionData.options!.reduce((acc, val) => {
          return val.points > 0 ? acc + val.points : acc;
        }, 0);
      }
      break;
    case 'Scale':
      question = new ScaleQuestionModel({
        ...validQuestionData,
        customInstruction: validQuestionData.customInstruction || '',
        isLocked: validQuestionData.isLocked || false,
      });
      if (validQuestionData.isScored) {
        addedMaxScore =
          validQuestionData.labels![validQuestionData.labels!.length - 1]
            .points; // Assumes last in the array is max points, labels must exist, validated in validation step.
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
          ].points; // Assumes last element of scoringRanges is max, ! operator is validated in validation step before this
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

  // Add the question to the assessment
  assessment.questions = assessment.questions || [];
  assessment.questions.push(question._id);
  assessment.questionsTotalMarks = assessment.questionsTotalMarks
    ? assessment.questionsTotalMarks + addedMaxScore
    : addedMaxScore;
  await assessment.save();

  return question;
};

// Get all questions for an internal assessment
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

// Update a question by its ID
export const updateQuestionById = async (
  questionId: string,
  updateData: Partial<QuestionUnion>,
  accountId: string
): Promise<QuestionUnion> => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  // Only admins or faculty members are allowed to update questions
  if (account.role !== 'admin' && account.role !== 'Faculty member') {
    throw new BadRequestError('Unauthorized');
  }

  const existingQuestion = await QuestionModel.findById(questionId);
  if (!existingQuestion) {
    throw new NotFoundError('Question not found');
  }

  // Prevent updates to locked questions
  if (existingQuestion.isLocked) {
    throw new BadRequestError('Cannot modify a locked question');
  }

  // Prevent changing the question type
  if (updateData.type && updateData.type !== existingQuestion.type) {
    throw new BadRequestError('Cannot change the type of an existing question');
  }

  // Determine which model to use based on the question type
  let updatedQuestion: QuestionUnion | null;
  let currentScore = 0;
  let updatedScore = 0;

  // Update the question using the appropriate model
  switch (existingQuestion.type) {
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
    case 'Team Member Selection':
      updatedQuestion =
        await TeamMemberSelectionQuestionModel.findByIdAndUpdate(
          questionId,
          updateData,
          { new: true }
        );
      break;
    case 'Multiple Choice':
      currentScore = (
        existingQuestion as MultipleChoiceQuestion
      ).options.reduce((acc, val) => {
        return acc > val.points ? acc : val.points;
      }, 0);
      updatedScore = (updateData as MultipleChoiceQuestion).options.reduce(
        (acc, val) => {
          return acc > val.points ? acc : val.points;
        },
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
      ).options.reduce((acc, val) => {
        return val.points > 0 ? acc + val.points : acc;
      }, 0);
      updatedScore = (updateData as MultipleResponseQuestion).options.reduce(
        (acc, val) => {
          return val.points > 0 ? acc + val.points : acc;
        },
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

  if (currentScore !== updatedScore) {
    // Find the assessment that contains this question
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

// Delete a question from an internal assessment
export const deleteQuestionById = async (
  assessmentId: string,
  questionId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  // Only admins or faculty members are allowed to delete questions
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

/*------------------------------Release-Form-------------------------------*/
export const releaseInternalAssessmentById = async (
  assessmentId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  // Only admins or faculty members are allowed to release assessments
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

export const recallInternalAssessmentById = async (
  assessmentId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  // Only admins or faculty members are allowed to recall assessments
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
