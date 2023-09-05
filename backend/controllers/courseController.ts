import { Request, Response } from 'express';
import CourseModel from '../models/Course';
import StudentModel from '../models/Student';
import mongoose from 'mongoose';
import { Student } from '../../multi-git-dashboard/src/types/user';

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
    .populate('students');
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
    const deletedCourse = await CourseModel.findByIdAndDelete(courseId);
    if (deletedCourse) {
      res.json({ message: 'Course deleted successfully' });
    } else {
      res.status(404).json({ error: 'Course not found' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete course' });
  }
};

// Add students to a course by course ID
export const addStudentsToCourse = async (req: Request, res: Response) => {
  const courseId = req.params.id;
  const studentData = req.body;
  try {
    const course = await CourseModel.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const studentId = studentData._id;

    let student = await StudentModel.findById(studentId);

    if (!student) {
      student = new StudentModel(studentData);
      await student.save();
    } else {
      await StudentModel.findByIdAndUpdate(studentId, studentData, { new: true });
    }

    const studentObjectId = mongoose.Types.ObjectId.createFromHexString(studentId);

    if (!course.students.includes(studentObjectId)) {
      course.students.push(studentObjectId);
    }

    await course.save();

    return res.status(200).json({ message: 'Students added to the course successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add students' });
  }
};