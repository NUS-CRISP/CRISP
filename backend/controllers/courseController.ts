import { Request, Response } from 'express';
import CourseModel from '../models/Course';
import StudentModel, { CourseDetailsModel, Student } from '../models/Student';

// Create a new course
export const createCourse = async (req: Request, res: Response) => {
  try {
    console.log(req.body)
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
    const course = await CourseModel.findById(courseId);
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
      return res.status(404).json({ error: 'Course not found' });
    }

    const students: Student[] = [];
    for (const studentInfo of studentData) {
      // Find or create a student using the StudentModel
      let student = await StudentModel.findById(studentInfo._id);
      if (!student) {
        student = new StudentModel({ name: studentInfo.name , _id: studentInfo._id, email: studentInfo.email });
        await student.save();
      }
      console.log(student)
      const courseDetails = new CourseDetailsModel({
        courseId: courseId,
        gitHandle: studentInfo.gitHandle,
        teamNumber: studentInfo.teamNumber
      });
      await courseDetails.save();

      // Issue here with student not saving new course details
      student.courseDetails[courseId] = courseDetails;

      await student.save();
      
      console.log(student.courseDetails)
      console.log(courseDetails)
      students.push(student);
    }

    course.students.push(...students);
    const updatedCourse = await course.save();
    res.json(updatedCourse);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add students to course' });
    console.log(error);
  }
};