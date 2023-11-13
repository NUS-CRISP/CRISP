import { Request, Response } from 'express';
import mongoose from 'mongoose';

import Role from '../../shared/types/auth/Role';
import Account from '../models/Account';
import Assessment from '../models/Assessment';
import Course from '../models/Course';
import Result from '../models/Result';
import Team from '../models/Team';
import TeamSet from '../models/TeamSet';
import User, { User as IUser } from '../models/User';

/*----------------------------------------Course----------------------------------------*/
export const createCourse = async (req: Request, res: Response) => {
  try {
    const newCourse = await Course.create(req.body);
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create course' });
  }
};

export const getAllCourses = async (_req: Request, res: Response) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch courses' });
  }
};

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
          populate: ['members', 'TA'],
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

export const deleteCourseById = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await Team.deleteMany({ teamSet: { $in: deletedCourse.teamSets } });

    await TeamSet.deleteMany({ _id: { $in: deletedCourse.teamSets } });

    await User.updateMany(
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
    const course = await Course.findById(courseId)
      .populate<{ students: IUser[] }>('students')
      .exec();

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    for (const studentData of students) {
      const studentId = studentData.identifier;
      let student = await User.findOne({ identifier: studentId });
      if (!student) {
        student = new User({
          identifier: studentId,
          name: studentData.name,
          enrolledCourses: [],
          gitHandle: studentData.gitHandle ?? null,
        });

        await student.save();

        const newAccount = new Account({
          email: studentData.email,
          role: Role.Student,
          isApproved: false,
          user: student._id,
        });
        await newAccount.save();
      } else {
        const studentAccount = await Account.findOne({ user: student._id });
        if (studentAccount && studentAccount.role !== Role.Student) {
          continue;
        }
      }
      if (!student.enrolledCourses.includes(course._id)) {
        student.enrolledCourses.push(course._id);
      }
      
      await student.save();

      if (!course.students.some(s => s.identifier === student?.identifier)) {
        course.students.push(student);
      }
    }

    await course.save();

    return res
      .status(200)
      .json({ message: 'Students added to the course successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Failed to add students: ' +  message});
  }
};

/*----------------------------------------TA----------------------------------------*/
export const addTAs = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const TAs = req.body.items;

  try {
    const course = await Course.findById(courseId)
      .populate<{ TAs: IUser[] }>('TAs')
      .exec();

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    for (const TAData of TAs) {
      const TAId = TAData.identifier;
      let TA = await User.findOne({ identifier: TAId });
      if (!TA) {
        TA = new User({
          identifier: TAId,
          name: TAData.name,
          enrolledCourses: [],
          gitHandle: TAData.gitHandle ?? null,
        });

        await TA.save();

        const newAccount = new Account({
          email: TAData.email,
          role: Role.TA,
          isApproved: false,
          user: TA._id,
        });

        newAccount.save();
      } else {
        const TAAccount = await Account.findOne({ user: TA._id });
        if (TAAccount && TAAccount.role !== 'Teaching assistant') {
          continue;
        }
      }

      if (!TA.enrolledCourses.includes(course._id)) {
        TA.enrolledCourses.push(course._id);
      }

      await TA.save();

      if (!course.TAs.some(ta => ta.identifier === TA?.identifier)) {
        course.TAs.push(TA);
      }
    }

    await course.save();

    return res
      .status(200)
      .json({ message: 'TAs added to the course successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Failed to add TAs: ' +  message});
  }
};

/*----------------------------------------TeamSet----------------------------------------*/
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Failed to create team set' + message });
  }
};

/*----------------------------------------Team----------------------------------------*/
export const addStudentsToTeams = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const students = req.body.items;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    for (const studentData of students) {
      const studentId = studentData.identifier;

      const student = await User.findOne({ identifier: studentId });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const account = await Account.findOne({ user: student._id });

      if (
        !account ||
        account.role !== 'Student' ||
        !student.enrolledCourses.includes(course._id) ||
        !course.students.some(s => s._id.equals(student._id)) ||
        !studentData.teamSet ||
        !studentData.teamNumber
      ) {
        return res.status(400).json({ message: 'Invalid Student' });
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

      if (team.members && !team.members.some(s => s._id === student._id)) {
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Failed to add students to teams: ' + message });
  }
};

export const addTAsToTeams = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const tas = req.body.items;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    for (const taData of tas) {
      const taId = taData.identifier;

      const ta = await User.findOne({ identifier: taId });

      if (!ta) {
        return res.status(404).json({ message: 'TA not found' });
      }
      console.error(1);
      const account = await Account.findOne({ user: ta._id });
      console.error(2);
      console.error(!account);
      console.error(account?.role !== 'Teaching assistant');
      console.error(!ta.enrolledCourses.includes(course._id));
      console.error(!course.TAs.some(t => t._id.equals(ta._id)));
      console.error(!taData.teamSet);
      console.error(!taData.teamNumber);
      if (
        !account ||
        account.role !== 'Teaching assistant' ||
        !ta.enrolledCourses.includes(course._id) ||
        !course.TAs.some(t => t._id.equals(ta._id)) ||
        !taData.teamSet ||
        !taData.teamNumber
      ) {
        console.error(3);
        return res.status(400).json({ message: 'Invalid TA' });
      }
      console.error(4);
      let teamSet = await TeamSet.findOne({
        course: course._id,
        name: taData.teamSet,
      });
      if (!teamSet) {
        return res.status(404).json({ message: 'TeamSet not found' });
      }
      let team = await Team.findOne({
        number: taData.teamNumber,
        teamSet: teamSet._id,
      });
      if (!team) {
        team = new Team({
          number: taData.teamNumber,
          teamSet: teamSet._id,
          members: [],
          TA: null,
        });
        if (!teamSet.teams) {
          teamSet.teams = [];
        }
        teamSet.teams.push(team._id);
      }
      team.TA = ta._id;

      await team.save();
      await teamSet.save();
    }

    await course.save();

    return res.status(200).json({ message: 'TAs added to teams successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Failed to add TAs to teams: ' + message });
  }
};

/*----------------------------------------Milestone----------------------------------------*/
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Failed to add milestone: ' + message});
  }
};

/*----------------------------------------Sprint----------------------------------------*/
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Failed to add sprint: ' + message });
  }
};

/*----------------------------------------Assessment----------------------------------------*/
export const addAssessments = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const assessments = req.body.items;

  if (!Array.isArray(assessments) || assessments.length === 0) {
    return res.status(400).json({ message: 'Invalid or empty assessments data' });
  }

  try {
    const course = await Course.findById(courseId).populate('students');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const newAssessments: mongoose.Document[] = [];
    for (let assessmentData of assessments) {
      const { assessmentType, markType, frequency, granularity, teamSetName, formLink } = assessmentData;

      const existingAssessment = await Assessment.findOne({ course: courseId, assessmentType });
      if (existingAssessment) continue; 
      const assessment = new Assessment({
        course: courseId,
        assessmentType,
        markType,
        results: [],
        frequency,
        granularity,
        teamSet: null,
        formLink
      });

      await assessment.save();

      const results: mongoose.Document[] = [];
      if (granularity === 'team') {
        const teamSet = await TeamSet.findOne({ course: courseId, name: teamSetName })
        .populate('teams')
        .populate('members')
        .populate('TA');

        if (!teamSet) continue;
        assessment.teamSet = teamSet._id;

        // Create a result object for each team
        teamSet.teams.forEach((team: any) => {
          const initialMarks = team.members.map((member: any) => ({
            userId: member.identifier,
            mark: 0
          }));
          const result = new Result({
            assessment: assessment._id,
            team: team._id,
            marker: team.TA?._id,
            marks: initialMarks
          });
          results.push(result);
        });
      } else {
        // Create a result object for each student
        course.students.forEach((student: any) => {
          const result = new Result({
            assessment: assessment._id,
            team: null,
            marker: null,
            marks: [{
              userId: student.identifier,
              mark: 0
            }]
          });
          results.push(result);
        });
      }
      assessment.results = results.map(result => result._id);

      course.assessments.push(assessment._id);
      newAssessments.push(assessment);
      await Promise.all(results.map(result => result.save()));
    }

    if (newAssessments.length === 0) {
      return res.status(400).json({ message: 'Failed to add any assessments' });
    }

    await Promise.all([
      course.save(),
      ...newAssessments.map(assessment => assessment.save())
    ]);

    return res.status(201).json({ message: 'Assessments added successfully', newAssessments });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Failed to add assessments: ' + message });
  }
};
