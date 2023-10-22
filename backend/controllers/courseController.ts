import { Request, Response } from 'express';
import Course from '../models/Course';
import User from '../models/User';
import Team from '../models/Team';
import TeamSet from '../models/TeamSet';
import Assessment from '../models/Assessment';
import Account from '../models/Account';

// Create a new course
export const createCourse = async (req: Request, res: Response) => {
  try {
    const newCourse = await Course.create(req.body);
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create course' });
  }
};

// Get all courses
export const getAllCourses = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch courses' });
  }
};

// Get a single course by ID
export const getCourseById = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const course = await Course.findById(courseId)
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

// Update a course by ID
export const updateCourseById = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const updatedCourse = await Course.findByIdAndUpdate(courseId, req.body, {
      new: true,
    });
    if (updatedCourse) {
      res.json(updatedCourse);
    } else {
      res.status(404).json({ error: 'Course not found' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Failed to update course' });
  }
};

// Delete a course by ID
export const deleteCourseById = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    //delete course and its teams
    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Delete corresponding teams
    await TeamSet.deleteMany({ _id: { $in: deletedCourse.teamSets } });

    // Update references in the Users (students) collection
    await User.updateMany(
      { enrolledCourses: courseId },
      { $pull: { enrolledCourses: courseId } }
    );

    return res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete course' });
  }
};

export const addStudents = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const students = req.body.items;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    for (const studentData of students) {
      const studentId = studentData.id;

      const student = await User.findOne({ orgId: studentId });
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const account = await Account.findOne({ userId: student._id });

      if (!account) {
        return res.status(404).json({ message: 'Account not found' });
      } else if (account.role !== 'Student') {
        continue;
      }

      if (!student.enrolledCourses.some((s) => s.equals(course._id))) {
        student.enrolledCourses.push(course._id);
      }
      await student.save();
      if (!course.students.some((s: any) => s.orgId === student.orgId)) {
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

export const addTeams = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const students = req.body.items;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    for (const studentData of students) {
      const student = await User.findOne({ orgId: studentData.id });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const account = await Account.findOne({ user: student._id });

      if (
        !account ||
        account.role !== 'Student' ||
        !student.enrolledCourses.some((ec) => ec._id === course._id) ||
        !course.students.some((s) => s._id == student._id) ||
        !studentData.teamSet ||
        !studentData.teamNumber
      ) {
        continue;
      }

      let teamSet = await TeamSet.findOne({
        course: course._id,
        name: studentData.teamSet,
      });
      if (!teamSet) {
        return res.status(404).json({ message: 'TeamSet not found' });
      }
      let team = await Team.findOne({
        number: studentData.teamNumber,
        teamSet: teamSet._id,
      });
      if (!team) {
        team = new Team({
          number: studentData.teamNumber,
          teamSet: teamSet._id,
          members: [],
        });
        if (!teamSet.teams) {
          teamSet.teams = [];
        }
        teamSet.teams.push(team._id);
      }
      if (team.members && !team.members.some((s) => s._id === student._id)) {
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

export const addTAs = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const TAs = req.body.items;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    for (const TAData of TAs) {
      const TAId = TAData.id;
      const account = await Account.findOne({ userId: TAId });
      const TA = await User.findOne({ id: TAId });

      if (!account || !TA) {
        return res.status(404).json({ message: 'TA not found' });
      }
      if (account.role !== 'Teaching assistant') {
        continue;
      }
      if (!TA.enrolledCourses.some((s) => s._id === course._id)) {
        TA.enrolledCourses.push(course._id);
      }
      await TA.save();
      if (!course.TAs.some((s) => s._id === TA._id)) {
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

export const addMilestone = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const { milestoneNumber, dateline, description } = req.body;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const milestone = {
      number: milestoneNumber,
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

export const addSprint = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const { sprintNumber, startDate, endDate, description } = req.body;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const sprint = {
      number: sprintNumber,
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

export const addTeamSet = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const { name } = req.body;
  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const teamSet = new TeamSet({ name, course: courseId });
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

export const addAssessment = async (req: Request, res: Response) => {
  const courseId = req.params.id;

  const {
    assessmentType,
    markType,
    frequency,
    granularity,
    teamSetName,
    formLink,
  } = req.body;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const existingAssessment = await Assessment.findOne({
      course: courseId,
      assessmentType: assessmentType,
    });

    if (existingAssessment) {
      return res.status(400).json({ message: 'Failed to add assessment' });
    }

    let teamSetID = null;
    if (granularity === 'team' && teamSetName) {
      const teamSet = await TeamSet.findOne({
        course: courseId,
        name: teamSetName,
      });
      if (!teamSet) {
        return res.status(404).json({ message: 'TeamSet not found' });
      }
      teamSetID = teamSet._id;
    }

    const assessment = new Assessment({
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

    await course.save();
    await assessment.save();

    return res
      .status(201)
      .json({ message: 'Assessment added successfully', assessment });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add assessment' });
  }
};
