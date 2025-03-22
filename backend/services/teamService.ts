import CourseRole from '@shared/types/auth/CourseRole';
import AccountModel from '../models/Account';
import CourseModel from '../models/Course';
import TeamModel, { Team } from '../models/Team';
import TeamSetModel from '../models/TeamSet';
import UserModel from '../models/User';
import { BadRequestError, NotFoundError } from './errors';
import { getTeamSetsByCourseId } from './teamSetService';

export const getTeamsByCourseId = async (courseId: string) => {
  const teamSets = await getTeamSetsByCourseId(courseId);

  // Get unique teams from all team sets
  const teams = new Set<Team>();
  for (const teamSet of teamSets) {
    if (!teamSet.teams) continue;
    for (const team of teamSet.teams) {
      teams.add(team);
    }
  }

  return Array.from(teams);
};

export const getTeamsByTAIdAndCourseId = async (
  taId: string,
  courseId: string
) => {
  const teams = await getTeamsByCourseId(courseId);
  return teams.filter(team => team.TA?._id.equals(taId));
};

export const deleteTeamById = async (teamId: string) => {
  const team = await TeamModel.findById(teamId);
  if (!team) {
    throw new NotFoundError('Team not found');
  }
  const teamSet = await TeamSetModel.findById(team.teamSet);
  if (teamSet && teamSet.teams) {
    const index = teamSet.teams.indexOf(team._id);
    if (index !== -1) {
      teamSet.teams.splice(index, 1);
    }
    await teamSet.save();
  }
  await TeamModel.findByIdAndDelete(teamId);
};

export const updateTeamById = async (teamId: string, updateData: any) => {
  const updatedTeam = await TeamModel.findByIdAndUpdate(teamId, updateData, {
    new: true,
  });
  if (!updatedTeam) {
    throw new NotFoundError('Team not found');
  }
};

export const addStudentsToTeam = async (courseId: string, students: any[]) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const studentData of students) {
    const studentId = studentData.identifier;
    const student = await UserModel.findOne({ identifier: studentId });
    if (!student) {
      throw new NotFoundError('Student not found');
    }
    const account = await AccountModel.findOne({ user: student._id });
    if (
      !account ||
      account.courseRoles.filter(r => r.course === courseId).length === 0 ||
      account.courseRoles.filter(r => r.course === courseId)[0].courseRole !==
        CourseRole.Student ||
      !student.enrolledCourses.includes(course._id) ||
      !course.students.some(s => s._id.equals(student._id)) ||
      !studentData.teamSet ||
      !studentData.teamNumber
    ) {
      throw new BadRequestError('Invalid Student' + account + student + studentData);
    }
    const teamSet = await TeamSetModel.findOne({
      course: course._id,
      name: studentData.teamSet,
    });
    if (!teamSet) {
      throw new NotFoundError('TeamSet not found');
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
    if (team.members && !team.members.some(s => s._id === student._id)) {
      team.members.push(student._id);
    }
    await team.save();
    await teamSet.save();
  }
  await course.save();
};

export const addTAsToTeam = async (courseId: string, tas: any[]) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const taData of tas) {
    const taId = taData.identifier;
    const ta = await UserModel.findOne({ identifier: taId });
    if (!ta) {
      throw new NotFoundError('TA not found');
    }
    const account = await AccountModel.findOne({ user: ta._id });
    if (
      !account ||
      account.courseRoles.filter(r => r.course === courseId).length === 0 ||
      account.courseRoles.filter(r => r.course === courseId)[0].courseRole !==
        CourseRole.TA ||
      !ta.enrolledCourses.includes(course._id) ||
      !course.TAs.some(t => t._id.equals(ta._id)) ||
      !taData.teamSet ||
      !taData.teamNumber
    ) {
      throw new BadRequestError('Invalid TA');
    }
    const teamSet = await TeamSetModel.findOne({
      course: course._id,
      name: taData.teamSet,
    });
    if (!teamSet) {
      throw new NotFoundError('TeamSet not found');
    }
    let team = await TeamModel.findOne({
      number: taData.teamNumber,
      teamSet: teamSet._id,
    });
    if (!team) {
      team = new TeamModel({
        number: taData.teamNumber,
        teamSet: teamSet._id,
        members: [],
        TA: null,
      });
      teamSet.teams.push(team._id);
    }
    team.TA = ta._id;
    await team.save();
    await teamSet.save();
  }
  await course.save();
};

export const removeMembersById = async (teamId: string, userId: string) => {
  const team = await TeamModel.findById(teamId).populate('members');
  if (!team) {
    throw new NotFoundError('Team not found');
  }
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  team.members = team.members?.filter(member => !member._id.equals(user._id));
  await team.save();
};
