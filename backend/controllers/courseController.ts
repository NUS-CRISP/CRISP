import { Request, Response } from 'express';
import CourseModel from '../models/Course';
import UserModel from '../models/User';
import TeamModel from '../models/Team';
import TeamSetModel from '../models/TeamSet';
import AssessmentModel from '../models/Assessment';

/*----------------------------------------Course----------------------------------------*/
export const createCourse = async (req: Request, res: Response) => {
  try {
    const newCourse = await CourseModel.create(req.body);
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create course' });
  }
};

export const getAllCourses = async (_req: Request, res: Response) => {
  try {
    const courses = await CourseModel.find();
    res.json(courses);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch courses' });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const course = await CourseModel.findById(courseId)
      .populate('faculty')
      .populate('TAs')
      .populate('students')
      .populate({
        path: 'teamSets',
        populate: {
          path: 'teams',
          populate: [
            {
              path: 'members',
            },
            {
              path: 'TA',
            },
          ],
        },
      })
      .populate({
        path: 'assessments',
        populate: {
          path: 'teamSet',
        },
      });
    if (course) {
      res.json(course);
    } else {
      res.status(404).json({ error: 'Course not found' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch course' });
  }
};

export const updateCourseById = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const updatedCourse = await CourseModel.findByIdAndUpdate(
      courseId,
      req.body,
      {
        new: true,
      }
    );
    if (updatedCourse) {
      res.json(updatedCourse);
    } else {
      res.status(404).json({ error: 'Course not found' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Failed to update course' });
  }
};

export const deleteCourseById = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const deletedCourse = await CourseModel.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await TeamModel.deleteMany({ teamSet: { $in: deletedCourse.teamSets } });

    await TeamSetModel.deleteMany({ _id: { $in: deletedCourse.teamSets } });

    await UserModel.updateMany(
      { enrolledCourses: courseId },
      { $pull: { enrolledCourses: courseId } }
    );

    return res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete course' });
  }
};

/*----------------------------------------Student----------------------------------------*/
export const addStudents = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const students = req.body.items;

  try {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    for (const studentData of students) {
      const studentId = studentData.identifier;

      let student = await UserModel.findOne({ identifier: studentId });
      if (!student) {
        student = new UserModel({
          name: studentData.name,
          identifier: studentId,
          email: studentData.email,
          enrolledCourses: [],
          gitHandle: studentData.gitHandle,
          role: 'Student',
        });
      }
      if (student.role !== 'Student') {
        continue;
      }
      if (!student.enrolledCourses.includes(course._id)) {
        student.enrolledCourses.push(course._id);
      }
      await student.save();
      if (!course.students.includes(student._id)) {
        course.students.push(student._id);
      }
    }

    await course.save();

    return res
      .status(200)
      .json({ message: 'Students added to the course successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add students' });
  }
};

/*----------------------------------------TA----------------------------------------*/
export const addTAs = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const TAs = req.body.items;

  try {
    const course = await CourseModel.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    for (const TAData of TAs) {
      const TAId = TAData.identifier;
      let TA = await UserModel.findOne({ identifier: TAId });
      if (!TA) {
        TA = new UserModel({
          name: TAData.name,
          identifier: TAId,
          email: TAData.email,
          role: 'Teaching assistant',
          enrolledCourses: [],
        });
      }
      if (TA.role !== 'Teaching assistant') {
        continue;
      }
      if (!TA.enrolledCourses.includes(course._id)) {
        TA.enrolledCourses.push(course._id);
      }
      await TA.save();
      if (!course.TAs.includes(TA._id)) {
        course.TAs.push(TA._id);
      }
    }

    await course.save();

    return res
      .status(200)
      .json({ message: 'TAs added to the course successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add TAs' });
  }
};

/*----------------------------------------TeamSet----------------------------------------*/
export const addTeamSet = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const { name } = req.body;
  try {
    const course = await CourseModel.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const teamSet = new TeamSetModel({ name, course: courseId });
    course.teamSets.push(teamSet._id);
    await course.save();
    await teamSet.save();

    return res
      .status(201)
      .json({ message: 'Team set created successfully', teamSet });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create team set' });
  }
};

/*----------------------------------------Team----------------------------------------*/
export const addStudentToTeams = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const students = req.body.items;

  try {
    const course = await CourseModel.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    for (const studentData of students) {
      const studentId = studentData.identifier;

      const student = await UserModel.findOne({ identifier: studentId });
      if (
        !student ||
        student.role !== 'Student' ||
        !student.enrolledCourses.includes(course._id) ||
        !course.students.includes(student._id) ||
        !studentData.teamSet ||
        !studentData.teamNumber
      ) {
        return res.status(400).json({ message: 'Invalid Student' });
      }

      let teamSet = await TeamSetModel.findOne({
        course: course._id,
        name: studentData.teamSet,
      });
      if (!teamSet) {
        return res.status(404).json({ message: 'TeamSet not found' });
      }
      let team = await TeamModel.findOne({
        number: studentData.teamNumber,
        teamSet: teamSet._id,
      });
      if (!team) {
        team = new TeamModel({
          number: studentData.teamNumber,
          teamSet: teamSet._id,
          members: [],
        });
        teamSet.teams.push(team._id);
      }
      if (!team.members.includes(student._id)) {
        team.members.push(student._id);
      }
      await team.save();
      await teamSet.save();
    }

    await course.save();

    return res
      .status(200)
      .json({ message: 'Students added to teams successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add students to teams' });
  }
};

/*----------------------------------------Milestone----------------------------------------*/
export const addMilestone = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const { milestoneNumber, dateline, description } = req.body;

  try {
    const course = await CourseModel.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const milestone = {
      milestoneNumber,
      dateline,
      description,
    };
    course.milestones.push(milestone);
    await course.save();

    return res
      .status(201)
      .json({ message: 'Milestone added successfully', milestone });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add milestone' });
  }
};

/*----------------------------------------Sprint----------------------------------------*/
export const addSprint = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const { sprintNumber, startDate, endDate, description } = req.body;

  try {
    const course = await CourseModel.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const sprint = {
      sprintNumber,
      startDate,
      endDate,
      description,
    };

    course.sprints.push(sprint);
    await course.save();

    return res
      .status(201)
      .json({ message: 'Sprint added successfully', sprint });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add sprint' });
  }
};

/*----------------------------------------Assessment----------------------------------------*/
export const addAssessments = async (req: Request, res: Response) => {
  const courseId = req.params.id;

  const assessments = req.body.items;

  if (!Array.isArray(assessments) || assessments.length === 0) {
    return res
      .status(400)
      .json({ message: 'Invalid or empty assessments data' });
  }

  try {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const newAssessments = [];
    for (let assessmentData of assessments) {
      const {
        assessmentType,
        markType,
        frequency,
        granularity,
        teamSetName,
        formLink,
      } = assessmentData;

      const existingAssessment = await AssessmentModel.findOne({
        course: courseId,
        assessmentType: assessmentType,
      });

      if (existingAssessment) {
        continue;
      }

      let teamSetID = null;
      if (granularity === 'team') {
        if (teamSetName === null || teamSetName == '') {
          continue;
        }
        const teamSet = await TeamSetModel.findOne({
          course: courseId,
          name: teamSetName,
        });
        if (!teamSet) {
          continue;
        }
        teamSetID = teamSet._id;
      }

      const assessment = new AssessmentModel({
        course: courseId,
        assessmentType,
        markType,
        result: [],
        frequency,
        granularity,
        teamSet: teamSetID,
        formLink,
      });

      course.assessments.push(assessment._id);
      newAssessments.push(assessment);
    }

    if (newAssessments.length === 0) {
      return res.status(400).json({ message: 'Failed to add any assessments' });
    }

    await Promise.all([
      course.save(),
      ...newAssessments.map(assessment => assessment.save()),
    ]);

    return res
      .status(201)
      .json({ message: 'Assessments added successfully', newAssessments });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add assessments' });
  }
};
