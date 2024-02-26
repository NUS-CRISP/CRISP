import { Request, Response } from 'express';
import { addAssessmentsToCourse } from '../services/assessmentService';
import {
  addMilestoneToCourse,
  addSprintToCourse,
  addStudentsToCourse,
  addTAsToCourse,
  createNewCourse,
  deleteCourseById,
  getCourseById,
  getCourseTeachingTeam,
  getCoursesForUser,
  updateCourseById,
} from '../services/courseService';
import { BadRequestError, NotFoundError } from '../services/errors';
import { addStudentsToTeam, addTAsToTeam } from '../services/teamService';
import { createTeamSet } from '../services/teamSetService';
import { getToken } from '../utils/auth';

/*----------------------------------------Course----------------------------------------*/
export const createCourse = async (req: Request, res: Response) => {
  try {
    const token = await getToken(req);
    const accountId = token.sub;

    if (!accountId) {
      res.status(400).json({ error: 'Missing authorization' });
      return;
    }

    const course = await createNewCourse(req.body, accountId);
    res
      .status(201)
      .json({ message: 'Course created successfully', _id: course._id });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error creating course:', error);
      res.status(500).json({ error: `Failed to create course` });
    }
  }
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const token = await getToken(req);
    const accountId = token.sub;

    if (!accountId) {
      res.status(400).json({ error: 'Missing authorization' });
      return;
    }
    const courses = await getCoursesForUser(accountId);
    res.status(200).json(courses);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching courses:', error);
      res.status(500).json({ error: 'Failed to fetch courses' });
    }
  }
};

export const getCourse = async (req: Request, res: Response) => {
  const token = await getToken(req);
  const accountId = token.sub;

  if (!accountId) {
    res.status(400).json({ error: 'Missing authorization' });
    return;
  }
  const courseId = req.params.id;
  try {
    const course = await getCourseById(courseId, accountId);
    res.status(200).json(course);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
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
