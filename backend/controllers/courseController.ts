import { Request, Response } from 'express';
import { addAssessmentsToCourse } from '../services/assessmentService';
import {
  addFacultyToCourse,
  addMilestoneToCourse,
  addSprintToCourse,
  addStudentsToCourse,
  addTAsToCourse,
  createNewCourse,
  deleteCourseById,
  getAssessmentsFromCourse,
  getCourseById,
  getCourseCodeById,
  getCourseTeachingTeam,
  getCourseTimeline,
  getCoursesForUser,
  getTeamSetsFromCourse,
  getTeamSetNamesFromCourse,
  removeFacultyFromCourse,
  removeStudentsFromCourse,
  removeTAsFromCourse,
  updateCourseById,
  getPeopleFromCourse,
  updateFacultyInCourse,
  updateStudentsInCourse,
  updateTAsInCourse,
  getProjectManagementBoardFromCourse,
  getCourseJiraRegistrationStatusById,
} from '../services/courseService';
import {
  BadRequestError,
  MissingAuthorizationError,
  NotFoundError,
} from '../services/errors';
import { addStudentsToTeam, addTAsToTeam } from '../services/teamService';
import { createTeamSet } from '../services/teamSetService';
import { getAccountId } from '../utils/auth';

/*----------------------------------------Course----------------------------------------*/
export const createCourse = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);
    const course = await createNewCourse(req.body, accountId);
    res
      .status(201)
      .json({ message: 'Course created successfully', _id: course._id });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(400).json({ error: 'Missing authorization' });
    } else {
      console.error('Error creating course:', error);
      res.status(500).json({ error: 'Failed to create course' });
    }
  }
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);
    const courses = await getCoursesForUser(accountId);
    res.status(200).json(courses);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(400).json({ error: 'Missing authorization' });
    } else {
      console.error('Error fetching courses:', error);
      res.status(500).json({ error: 'Failed to fetch courses' });
    }
  }
};

export const getCourse = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const accountId = await getAccountId(req);
    const course = await getCourseById(courseId, accountId);
    res.status(200).json(course);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(400).json({ error: 'Missing authorization' });
    } else {
      console.error('Error fetching course:', error);
      res.status(500).json({ error: 'Failed to fetch course' });
    }
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    await updateCourseById(courseId, req.body);
    res.status(200).json({ message: 'Course updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error updating course:', error);
      res.status(500).json({ error: 'Failed to update course' });
    }
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    await deleteCourseById(courseId);
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error deleting course:', error);
      res.status(500).json({ error: 'Failed to delete course' });
    }
  }
};

export const getCourseCode = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const courseCode = await getCourseCodeById(courseId);
    res.status(200).json(courseCode);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting course code:', error);
      res.status(500).json({ error: 'Failed to get course code' });
    }
  }
};

/*----------------------------------------Student----------------------------------------*/
export const addStudents = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const students = req.body.items;
  try {
    await addStudentsToCourse(courseId, students);
    res
      .status(200)
      .json({ message: 'Students added to the course successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error adding students:', error);
      res.status(500).json({ error: 'Failed to add students' });
    }
  }
};

export const updateStudents = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const students = req.body.items;
  try {
    await updateStudentsInCourse(courseId, students);
    res.status(200).json({ message: 'Students updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error updating students:', error);
      res.status(500).json({ error: 'Failed to update students' });
    }
  }
};

export const removeStudents = async (req: Request, res: Response) => {
  const { id, userId } = req.params;
  try {
    await removeStudentsFromCourse(id, userId);
    res
      .status(200)
      .json({ message: 'Students removed from the course successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error removing students:', error);
      res.status(500).json({ error: 'Failed to remove students' });
    }
  }
};

/*----------------------------------------TA----------------------------------------*/
export const addTAs = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const TAs = req.body.items;
  try {
    await addTAsToCourse(courseId, TAs);
    res.status(200).json({ message: 'TAs added to the course successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error adding TAs:', error);
      res.status(500).json({ error: 'Failed to add TAs' });
    }
  }
};

export const updateTAs = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const TAs = req.body.items;
  try {
    await updateTAsInCourse(courseId, TAs);
    res.status(200).json({ message: 'TAs updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error updating TAs:', error);
      res.status(500).json({ error: 'Failed to update TAs' });
    }
  }
};

export const getTeachingTeam = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const teachingTeam = await getCourseTeachingTeam(courseId);
    res.status(200).json(teachingTeam);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching Teaching Team:', error);
      res.status(500).json({ error: 'Failed to retrieve Teaching Team' });
    }
  }
};

export const removeTAs = async (req: Request, res: Response) => {
  const { id, userId } = req.params;
  try {
    await removeTAsFromCourse(id, userId);
    res
      .status(200)
      .json({ message: 'TAs removed from the course successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error removing TAs:', error);
      res.status(500).json({ error: 'Failed to remove TAs' });
    }
  }
};

/*----------------------------------------Faculty----------------------------------------*/
export const addFaculty = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const faculty = req.body.items;
  try {
    await addFacultyToCourse(courseId, faculty);
    res
      .status(200)
      .json({ message: 'Faculty added to the course successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error adding Faculty:', error);
      res.status(500).json({ error: 'Failed to add Faculty' });
    }
  }
};

export const updateFaculty = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const faculty = req.body.items;
  try {
    await updateFacultyInCourse(courseId, faculty);
    res.status(200).json({ message: 'Faculty updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error updating Faculty:', error);
      res.status(500).json({ error: 'Failed to update Faculty' });
    }
  }
};

export const removeFaculty = async (req: Request, res: Response) => {
  const { id, userId } = req.params;
  try {
    await removeFacultyFromCourse(id, userId);
    res
      .status(200)
      .json({ message: 'Faculty removed from the course successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error removing faculty:', error);
      res.status(500).json({ error: 'Failed to remove Faculty' });
    }
  }
};

/*----------------------------------------People----------------------------------------*/
export const getPeople = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const people = await getPeopleFromCourse(courseId);
    res.status(200).json(people);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching people:', error);
      res.status(500).json({ error: 'Failed to retrieve people' });
    }
  }
};

/*----------------------------------------TeamSet----------------------------------------*/
export const addTeamSet = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const { name } = req.body;
  try {
    await createTeamSet(courseId, name);
    res.status(201).json({ message: 'Team set created successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error creating team set:', error);
      res.status(500).json({ error: 'Failed to create team set' });
    }
  }
};

export const getTeamSets = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  const courseId = req.params.id;
  try {
    const teamSets = await getTeamSetsFromCourse(accountId, courseId);
    res.status(200).json(teamSets);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(400).json({ error: 'Missing authorization' });
    } else {
      console.error('Error getting team sets:', error);
      res.status(500).json({ error: 'Failed to get team sets' });
    }
  }
};

export const getTeamSetsNames = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const teamSetNames = await getTeamSetNamesFromCourse(courseId);
    res.status(200).json(teamSetNames);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting team sets name:', error);
      res.status(500).json({ error: 'Failed to get team set names' });
    }
  }
};

/*----------------------------------------Team----------------------------------------*/
export const addStudentsToTeams = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const students = req.body.items;
  try {
    await addStudentsToTeam(courseId, students);
    res.status(200).json({ message: 'Students added to teams successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error adding students to teams:', error);
      res.status(500).json({ error: 'Failed to add students to teams' });
    }
  }
};

export const addTAsToTeams = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const tas = req.body.items;
  try {
    await addTAsToTeam(courseId, tas);
    res.status(200).json({ message: 'TAs added to teams successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error adding TAs to teams:', error);
      res.status(500).json({ error: 'Failed to add TAs to teams' });
    }
  }
};

/*----------------------------------------Milestone----------------------------------------*/
export const addMilestone = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const milestoneData = req.body;
  try {
    await addMilestoneToCourse(courseId, milestoneData);
    res.status(201).json({ message: 'Milestone added successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error adding milestone:', error);
      res.status(500).json({ error: 'Failed to add milestone' });
    }
  }
};

/*----------------------------------------Sprint----------------------------------------*/
export const addSprint = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const sprintData = req.body;
  try {
    await addSprintToCourse(courseId, sprintData);
    res.status(201).json({ message: 'Sprint added successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error adding sprint:', error);
      res.status(500).json({ error: 'Failed to add sprint' });
    }
  }
};

/*----------------------------------------Timeline----------------------------------------*/
export const getTimeline = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const timeline = await getCourseTimeline(courseId);
    res.status(200).json(timeline);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching timeline:', error);
      res.status(500).json({ error: 'Failed to retrieve timeline' });
    }
  }
};

/*----------------------------------------Assessment----------------------------------------*/
export const addAssessments = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const assessments = req.body.items;
  try {
    await addAssessmentsToCourse(courseId, assessments);
    res.status(201).json({ message: 'Assessments added successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error adding assessments:', error);
      res.status(500).json({ error: 'Failed to add assessments' });
    }
  }
};

export const getAssessments = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const assessments = await getAssessmentsFromCourse(courseId);
    res.status(200).json(assessments);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting assessments:', error);
      res.status(500).json({ error: 'Failed to get assessments' });
    }
  }
};

/*------------------------------------Project Management------------------------------------*/
export const getProjectManagementBoard = async (
  req: Request,
  res: Response
) => {
  const accountId = await getAccountId(req);
  if (!accountId) {
    res.status(400).json({ error: 'Missing authorization' });
    return;
  }
  const courseId = req.params.id;
  try {
    const projectManagementBoard = await getProjectManagementBoardFromCourse(
      accountId,
      courseId
    );
    res.status(200).json(projectManagementBoard);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting project management boards:', error);
      res
        .status(500)
        .json({ error: 'Failed to get project management boards' });
    }
  }
};

export const getCourseJiraRegistrationStatus = async (
  req: Request,
  res: Response
) => {
  const courseId = req.params.id;
  try {
    const jiraRegistrationStatus =
      await getCourseJiraRegistrationStatusById(courseId);
    res.status(200).json(jiraRegistrationStatus);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting Jira registration status:', error);
      res.status(500).json({ error: 'Failed to get Jira registration status' });
    }
  }
};
