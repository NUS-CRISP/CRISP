import { ObjectId } from 'mongodb';
import InternalAssessmentModel from '../models/InternalAssessment';
import AccountModel from '../models/Account';
import ResultModel, { Result } from '../models/Result';
import CourseModel from '../models/Course';
import { NotFoundError, BadRequestError } from './errors';
import { Team } from '@models/Team';
import mongoose, { Types } from 'mongoose';
import TeamSetModel from '@models/TeamSet';
import QuestionModel from '@models/Question';
import { DateQuestionModel, LongResponseQuestionModel, MultipleChoiceQuestionModel, MultipleResponseQuestionModel, NumberQuestionModel, QuestionUnion, ScaleQuestionModel, ShortResponseQuestionModel, UndecidedQuestionModel } from '@models/QuestionTypes';

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
  if (course && course.assessments) {
    const index = course.assessments.findIndex(id => id.equals(assessment._id));
    if (index !== -1) {
      course.assessments.splice(index, 1);
      await course.save();
    }
  }

  // Delete the assessment
  await InternalAssessmentModel.findByIdAndDelete(assessmentId);
};

export const uploadInternalAssessmentResultsById = async (
  assessmentId: string,
  results: { studentId: string; mark: number }[]
) => {
  const assessment = await InternalAssessmentModel.findById(assessmentId).populate('results');

  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  const resultMap: Record<string, number> = {};
  results.forEach(({ studentId, mark }) => {
    resultMap[studentId] = mark;
  });

  // Update marks for each result in the assessment
  for (const result of assessment.results as unknown as Result[]) {
    const userId = new ObjectId(result.marks[0]?.user); // Ensure userId is an ObjectId
    const mark = resultMap[userId.toString()];
    if (mark !== undefined) {
      result.marks[0].mark = mark;
      await result.save();
    }
  }
};

export const updateInternalAssessmentResultMarkerById = async (
  assessmentId: string,
  resultId: string,
  markerId: string
) => {
  const assessment = await InternalAssessmentModel.findById(assessmentId)
    .populate('results');

  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  const resultToUpdate = await ResultModel.findById(resultId);
  if (!resultToUpdate || !resultToUpdate.assessment.equals(new ObjectId(assessment._id))) {
    throw new NotFoundError('Result not found');
  }

  // Update the marker (ensure ObjectId conversion)
  resultToUpdate.marker = new ObjectId(markerId);
  await resultToUpdate.save();
};

interface InternalAssessmentData {
  assessmentName: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  maxMarks?: number;
  granularity: string;
  teamSetName: string;
  gradedBy?: string;
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
      gradedBy,
    } = data;

    const existingAssessment = await InternalAssessmentModel.findOne({
      course: courseId,
      assessmentName,
    });

    if (existingAssessment) {
      continue; // Skip if assessment already exists
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
      gradedBy: gradedBy ? new ObjectId(gradedBy) : null,
      results: [],
      isReleased: false,
      questions: [],
    });
    // Add locked questions
    const nusnetIdQuestion = new ShortResponseQuestionModel({
      text: 'Student NUSNET ID (EXXXXXXX)',
      type: 'Short Response',
      shortResponsePlaceholder: 'E1234567',
      customInstruction: 'Enter your NUSNET ID starting with E followed by 7 digits.',
      isLocked: true,
    });

    const nusnetEmailQuestion = new ShortResponseQuestionModel({
      text: 'Student NUSNET Email',
      type: 'Short Response',
      shortResponsePlaceholder: 'e1234567@u.nus.edu',
      customInstruction: 'Enter your NUSNET email address.',
      isLocked: true,
    });

    await nusnetIdQuestion.save();
    await nusnetEmailQuestion.save();
    assessment.questions = [nusnetIdQuestion._id, nusnetEmailQuestion._id];

    await assessment.save();
    const results: mongoose.Document[] = [];

    const teamSet = await TeamSetModel.findOne({
      course: courseId,
      name: teamSetName,
    }).populate({ path: 'teams', populate: ['members', 'TA'] });

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
          marker: team.TA?._id,
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
          const marker = team?.TA?._id || null;
          const result = new ResultModel({
            assessment: assessment._id,
            team: team?._id,
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

  // Determine which model to use based on the question type
  let QuestionTypeModel;
  switch (validQuestionData.type) {
    case 'Multiple Choice':
      QuestionTypeModel = MultipleChoiceQuestionModel;
      break;
    case 'Multiple Response':
      QuestionTypeModel = MultipleResponseQuestionModel;
      break;
    case 'Scale':
      QuestionTypeModel = ScaleQuestionModel;
      break;
    case 'Short Response':
      QuestionTypeModel = ShortResponseQuestionModel;
      break;
    case 'Long Response':
      QuestionTypeModel = LongResponseQuestionModel;
      break;
    case 'Date':
      QuestionTypeModel = DateQuestionModel;
      break;
    case 'Number':
      QuestionTypeModel = NumberQuestionModel;
      break;
    case 'Undecided':
      QuestionTypeModel = UndecidedQuestionModel;
      break;
    default:
      QuestionTypeModel = QuestionModel;
      break;
  }

  // Create a new question using the appropriate model
  const question = new QuestionTypeModel({
    ...validQuestionData,
    customInstruction: validQuestionData.customInstruction || '',
    isLocked: validQuestionData.isLocked || false,
  });

  // Save the question
  await question.save();

  // Add the question to the assessment
  assessment.questions = assessment.questions || [];
  assessment.questions.push(question._id);
  await assessment.save();

  let savedQuestion: QuestionUnion | null;
  switch (validQuestionData.type) {
    case 'Multiple Choice':
      savedQuestion = await MultipleChoiceQuestionModel.findById(question._id);
      break;
    case 'Multiple Response':
      savedQuestion = await MultipleResponseQuestionModel.findById(question._id);
      break;
    case 'Scale':
      savedQuestion = await ScaleQuestionModel.findById(question._id);
      break;
    case 'Short Response':
      savedQuestion = await ShortResponseQuestionModel.findById(question._id);
      break;
    case 'Long Response':
      savedQuestion = await LongResponseQuestionModel.findById(question._id);
      break;
    case 'Date':
      savedQuestion = await DateQuestionModel.findById(question._id);
      break;
    case 'Number':
      savedQuestion = await NumberQuestionModel.findById(question._id);
      break;
    case 'Undecided':
      savedQuestion = await UndecidedQuestionModel.findById(question._id);
      break;
    default:
      // If type is 'Undecided' or unrecognized, use the base model
      savedQuestion = await QuestionModel.findById(question._id);
      break;
  }

  if (!savedQuestion) {
    throw new NotFoundError('Question not found after saving');
  }

  return savedQuestion as QuestionUnion;
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

  const assessment = await InternalAssessmentModel.findById(assessmentId).populate('questions');
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  return assessment.questions;
};

// Update a question by its ID
export const updateQuestionById = async (
  questionId: string,
  updateData: Partial<QuestionUnion>, // Use the QuestionUnion type for update data
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

  let updatedQuestion: QuestionUnion | null;
  switch (existingQuestion.type) {
    case 'Multiple Choice':
      updatedQuestion = await MultipleChoiceQuestionModel.findByIdAndUpdate(
        questionId,
        { ...updateData },
        { new: true }
      );
      break;

    case 'Multiple Response':
      updatedQuestion = await MultipleResponseQuestionModel.findByIdAndUpdate(
        questionId,
        { ...updateData },
        { new: true }
      );
      break;

    case 'Scale':
      updatedQuestion = await ScaleQuestionModel.findByIdAndUpdate(
        questionId,
        { ...updateData },
        { new: true }
      );
      break;

    case 'Short Response':
      updatedQuestion = await ShortResponseQuestionModel.findByIdAndUpdate(
        questionId,
        { ...updateData },
        { new: true }
      );
      break;

    case 'Long Response':
      updatedQuestion = await LongResponseQuestionModel.findByIdAndUpdate(
        questionId,
        { ...updateData },
        { new: true }
      );
      break;

    case 'Date':
      updatedQuestion = await DateQuestionModel.findByIdAndUpdate(
        questionId,
        { ...updateData },
        { new: true }
      );
      break;

    case 'Number':
      updatedQuestion = await NumberQuestionModel.findByIdAndUpdate(
        questionId,
        { ...updateData },
        { new: true }
      );
      break;

    case 'Undecided':
      updatedQuestion = await UndecidedQuestionModel.findByIdAndUpdate(
        questionId,
        { ...updateData },
        { new: true }
      );
      break;

    default:
      // Handle unknown types
      updatedQuestion = await QuestionModel.findByIdAndUpdate(
        questionId,
        { ...updateData },
        { new: true }
      );
      break;
  }

  if (!updatedQuestion) {
    throw new NotFoundError('Question not found after update');
  }

  return updatedQuestion as QuestionUnion;
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

