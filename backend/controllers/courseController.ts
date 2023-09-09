import { Request, Response } from 'express';
import CourseModel from '../models/Course';
import UserModel from '../models/User';
import TeamModel from '../models/Team';

// Create a new course
export const createCourse = async (req: Request, res: Response) => {
  try {
    const newCourse = await CourseModel.create(req.body);
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create course' });
  }
};

// Get all courses
export const getAllCourses = async (_req: Request, res: Response) => {
  try {
    const courses = await CourseModel.find();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Get a single course by ID
export const getCourseById = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const course = await CourseModel.findById(courseId)
    .populate('students')
    .populate({
      path : 'teams',
      populate : {
        path : 'students'
      }
    });
    if (course) {
      res.json(course);
    } else {
      res.status(404).json({ error: 'Course not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

// Update a course by ID
export const updateCourseById = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  try {
    const updatedCourse = await CourseModel.findByIdAndUpdate(courseId, req.body, {
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
    const deletedCourse = await CourseModel.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Delete corresponding teams
    await TeamModel.deleteMany({ _id: { $in: deletedCourse.teams } });

    // Update references in the Users (students) collection
    await UserModel.updateMany({ enrolledCourses: courseId }, { $pull: { enrolledCourses: courseId } });

    return res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete course' });
  }
};

// Add students to a course by course ID
export const addStudentsToCourse = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const students = req.body.items;
  try {
    const course = await CourseModel.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    for (const studentData of students) {

      const studentId = studentData.id;
      let newStudent = false;

      let student = await UserModel.findOne({ id: studentId });
 
      if (!student) {
        newStudent = true;
        student = new UserModel(studentData);
      }
      if (!student.enrolledCourses.includes(course._id)) {
        student.enrolledCourses.push(course._id)
      }
      await student.save();

      if (!course.students.includes(student._id)) {
        course.students.push(student._id);
      }

      if (newStudent) {
        let team = await TeamModel.findOne({ teamNumber: studentData.teamNumber });
        if (!team) {
          team = new TeamModel({teamNumber : studentData.teamNumber});
        }
        if (!team.students.includes(student._id)) {
          team.students.push(student._id)
        }
        await team.save();
        if (!course.teams.includes(team._id)) {
          course.teams.push(team._id);
        }
      }
    }

    await course.save();

    return res.status(200).json({ message: 'Students added to the course successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add students' });
  }
};